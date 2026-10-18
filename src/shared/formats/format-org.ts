import { slugifyHeading } from '../linking/parser';
import type { ParsedBlock, ParsedHeading, ParsedWikilink } from '../linking/types';
import type { FormatMetadata, FormatPlugin } from './types';

export const orgPlugin: FormatPlugin = {
  id: 'org',
  name: 'Org-mode',
  extensions: ['.org'],
  defaultExtension: '.org',
  contentType: 'text/org',
  badgeLabel: 'ORG',
  iconName: 'list-todo',
  parseMetadata: (content: string, filePath: string): FormatMetadata => {
    const filename = filePath.split('/').pop() || filePath;
    let title = filename.replace(/\.org$/i, '');

    const lines = content.split(/\r?\n/);
    const headings: ParsedHeading[] = [];
    const blocks: ParsedBlock[] = [];
    const links: ParsedWikilink[] = [];
    const tagSet = new Set<string>();
    const aliases: string[] = [];

    let offset = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      const trimmed = line.trim();

      // 1. Title detection (#+TITLE: ...)
      const titleMatch = trimmed.match(/^#\+title:\s*(.+)$/i);
      if (titleMatch && titleMatch[1]) {
        title = titleMatch[1].trim();
      }

      // 2. File tags detection (#+FILETAGS: :tag1:tag2:)
      const filetagsMatch = trimmed.match(/^#\+filetags:\s*(.+)$/i);
      if (filetagsMatch && filetagsMatch[1]) {
        const rawTags = filetagsMatch[1].split(':').map((t) => t.trim()).filter(Boolean);
        for (const t of rawTags) {
          tagSet.add(t.startsWith('#') ? t.slice(1).toLowerCase() : t.toLowerCase());
        }
      }

      // 3. Aliases detection (#+ROAM_ALIAS: "alias" or #+ALIAS: alias)
      const aliasMatch = trimmed.match(/^#\+(?:roam_alias|alias):\s*(.+)$/i);
      if (aliasMatch && aliasMatch[1]) {
        const rawAliases = aliasMatch[1].match(/"([^"]+)"|([^\s,]+)/g) || [];
        for (const a of rawAliases) {
          const cleaned = a.replace(/^["']|["']$/g, '').trim();
          if (cleaned) aliases.push(cleaned);
        }
      }

      // 4. Heading detection (* Heading :tag1:tag2:)
      const headingMatch = line.match(/^(\*{1,6})\s+(.+)$/);
      if (headingMatch && headingMatch[1] && headingMatch[2]) {
        const level = headingMatch[1].length;
        let headingText = headingMatch[2].trim();

        // Check for trailing tags :tag1:tag2:
        const trailingTagsMatch = headingText.match(/\s+:([a-zA-Z0-9_@#%:]+):$/);
        if (trailingTagsMatch && trailingTagsMatch[1]) {
          const tags = trailingTagsMatch[1].split(':').filter(Boolean);
          for (const t of tags) {
            tagSet.add(t.startsWith('#') ? t.slice(1).toLowerCase() : t.toLowerCase());
          }
          headingText = headingText.slice(0, trailingTagsMatch.index).trim();
        }

        // Clean out TODO / DONE keywords from slug and text if present
        const cleanedHeadingText = headingText.replace(/^(?:TODO|DONE|WAITING|CANCELLED)\s+/, '');
        const slug = slugifyHeading(cleanedHeadingText);

        headings.push({
          text: cleanedHeadingText,
          slug,
          level,
          line: i + 1,
          offset
        });
      }

      // 5. Named block anchors (#+NAME: blockid or <<blockid>>)
      const blockNameMatch = trimmed.match(/^#\+name:\s*([a-zA-Z0-9_-]+)/i);
      if (blockNameMatch && blockNameMatch[1]) {
        blocks.push({
          id: blockNameMatch[1],
          line: i + 1,
          offset
        });
      }
      const inlineAnchorMatch = trimmed.match(/<<([a-zA-Z0-9_-]+)>>/);
      if (inlineAnchorMatch && inlineAnchorMatch[1]) {
        blocks.push({
          id: inlineAnchorMatch[1],
          line: i + 1,
          offset
        });
      }

      // 6. Links: [[target][description]] or [[target]]
      const linkRegex = /\[\[([^\]]+)\](?:\[([^\]]*)\])?\]/g;
      let m: RegExpExecArray | null;
      while ((m = linkRegex.exec(line)) !== null) {
        const rawTarget = m[1]?.trim() || '';
        const alias = m[2]?.trim() || null;

        // Skip pure URL links (http, https, ftp, mailto)
        if (/^(?:https?|ftp|mailto):/i.test(rawTarget)) {
          continue;
        }

        // Clean file: prefix if present (e.g. file:note.org or file:./sub/note.md)
        let cleanedTarget = rawTarget.replace(/^file:/i, '');

        // Parse subpath (#heading or ::*heading or ::blockid)
        let subpath: string | null = null;
        let subpathType: 'heading' | 'block' | null = null;

        if (cleanedTarget.includes('::*')) {
          const parts = cleanedTarget.split('::*');
          cleanedTarget = parts[0]?.trim() || '';
          subpath = parts[1]?.trim() || null;
          subpathType = 'heading';
        } else if (cleanedTarget.includes('::')) {
          const parts = cleanedTarget.split('::');
          cleanedTarget = parts[0]?.trim() || '';
          subpath = parts[1]?.trim() || null;
          subpathType = 'block';
        } else if (cleanedTarget.includes('#')) {
          const parts = cleanedTarget.split('#');
          cleanedTarget = parts[0]?.trim() || '';
          subpath = parts[1]?.trim() || null;
          subpathType = subpath?.startsWith('^') ? 'block' : 'heading';
          if (subpath?.startsWith('^')) {
            subpath = subpath.slice(1);
          }
        }

        // Add link if target is not empty
        if (cleanedTarget) {
          links.push({
            raw: m[0],
            target: cleanedTarget,
            subpath,
            subpathType,
            alias,
            isEmbed: false,
            from: offset + m.index,
            to: offset + m.index + m[0].length
          });
        }
      }

      offset += line.length + 1; // +1 for newline
    }

    return {
      title,
      headings,
      blocks,
      links,
      tags: Array.from(tagSet),
      aliases
    };
  }
};
