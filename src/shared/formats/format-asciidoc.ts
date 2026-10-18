import { slugifyHeading } from '../linking/parser';
import type { ParsedBlock, ParsedHeading, ParsedWikilink } from '../linking/types';
import type { FormatMetadata, FormatPlugin } from './types';

export const asciidocPlugin: FormatPlugin = {
  id: 'asciidoc',
  name: 'AsciiDoc',
  extensions: ['.adoc', '.asciidoc'],
  defaultExtension: '.adoc',
  contentType: 'text/asciidoc',
  badgeLabel: 'ADOC',
  iconName: 'file-code',
  parseMetadata: (content: string, filePath: string): FormatMetadata => {
    const filename = filePath.split('/').pop() || filePath;
    let title = filename.replace(/\.(adoc|asciidoc)$/i, '');

    const lines = content.split(/\r?\n/);
    const headings: ParsedHeading[] = [];
    const blocks: ParsedBlock[] = [];
    const links: ParsedWikilink[] = [];
    const tagSet = new Set<string>();
    const aliases: string[] = [];

    let offset = 0;
    let foundDocTitle = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      const trimmed = line.trim();

      // 1. Document title: = Title (level 0 heading at start of doc)
      if (!foundDocTitle && /^=\s+([^=].*)$/.test(trimmed)) {
        const m = trimmed.match(/^=\s+([^=].*)$/);
        if (m && m[1]) {
          title = m[1].trim();
          foundDocTitle = true;
          headings.push({
            text: title,
            slug: slugifyHeading(title),
            level: 1,
            line: i + 1,
            offset
          });
          offset += line.length + 1;
          continue;
        }
      }

      // 2. Attributes: :title: ..., :tags: tag1, tag2
      const attrMatch = trimmed.match(/^:([a-zA-Z0-9_-]+):\s*(.*)$/);
      if (attrMatch && attrMatch[1]) {
        const attrName = attrMatch[1].toLowerCase();
        const attrVal = attrMatch[2]?.trim() || '';

        if (attrName === 'title' && !foundDocTitle && attrVal) {
          title = attrVal;
          foundDocTitle = true;
        } else if ((attrName === 'tags' || attrName === 'keywords') && attrVal) {
          const rawTags = attrVal.split(/[,;\s]+/).filter(Boolean);
          for (const t of rawTags) {
            tagSet.add(t.startsWith('#') ? t.slice(1).toLowerCase() : t.toLowerCase());
          }
        }
      }

      // 3. Section Headings: == Level 1, === Level 2, etc.
      const headingMatch = trimmed.match(/^(=+)\s+(.+)$/);
      if (headingMatch && headingMatch[1] && headingMatch[2]) {
        const equalsCount = headingMatch[1].length;
        // AsciiDoc == is level 2, === is level 3, etc.
        const level = Math.min(6, Math.max(1, equalsCount));
        let headingText = headingMatch[2].trim();

        // Extract inline anchor if present, e.g. == Overview [#sec-overview]
        const inlineAnchor = headingText.match(/(?:\[\[([a-zA-Z0-9_-]+)\]\]|\[#([a-zA-Z0-9_-]+)\])/);
        if (inlineAnchor) {
          const anchorId = inlineAnchor[1] || inlineAnchor[2];
          if (anchorId) {
            blocks.push({
              id: anchorId,
              line: i + 1,
              offset
            });
          }
          headingText = headingText
            .replace(/(?:\[\[[a-zA-Z0-9_-]+\]\]|\[#[a-zA-Z0-9_-]+\])/g, '')
            .trim();
        }

        const slug = slugifyHeading(headingText);

        headings.push({
          text: headingText,
          slug,
          level,
          line: i + 1,
          offset
        });
      }

      // 4. Block anchors: [[anchor-id]] or [#anchor-id]
      const blockAnchor = trimmed.match(/^(?:\[\[([a-zA-Z0-9_-]+)\]\]|\[#([a-zA-Z0-9_-]+)\])$/);
      if (blockAnchor) {
        const id = blockAnchor[1] || blockAnchor[2];
        if (id) {
          blocks.push({
            id,
            line: i + 1,
            offset
          });
        }
      }

      // 5. Cross-reference links: xref:target[label] or <<target,label>>
      const xrefRegex = /xref:([^#[\]]+)(?:#([^#[\]]+))?\[([^\]]*)\]/g;
      let xm: RegExpExecArray | null;
      while ((xm = xrefRegex.exec(line)) !== null) {
        const target = xm[1]?.trim() || '';
        const subpath = xm[2]?.trim() || null;
        const alias = xm[3]?.trim() || null;

        if (target && !/^(?:https?|ftp|mailto):/i.test(target)) {
          links.push({
            raw: xm[0],
            target,
            subpath,
            subpathType: subpath ? 'heading' : null,
            alias,
            isEmbed: false,
            from: offset + xm.index,
            to: offset + xm.index + xm[0].length
          });
        }
      }

      const internalRefRegex = /<<([^,>#]+)(?:#([^,>]+))?(?:,([^>]+))?>>/g;
      let im: RegExpExecArray | null;
      while ((im = internalRefRegex.exec(line)) !== null) {
        const target = im[1]?.trim() || '';
        const subpath = im[2]?.trim() || null;
        const alias = im[3]?.trim() || null;

        if (target) {
          links.push({
            raw: im[0],
            target,
            subpath,
            subpathType: subpath ? 'heading' : null,
            alias,
            isEmbed: false,
            from: offset + im.index,
            to: offset + im.index + im[0].length
          });
        }
      }

      // 6. Standard Obsidian-style wikilinks [[target|alias]]
      const wikilinkRegex = /(!)?\[\[([^\]|#^]+)(?:#([^\]|^|]+))?(?:\^([^\]|]+))?(?:\|([^\]]+))?\]\]/g;
      let wm: RegExpExecArray | null;
      while ((wm = wikilinkRegex.exec(line)) !== null) {
        const target = wm[2]?.trim() || '';
        // In AsciiDoc, [[id]] is used for anchor definitions, which are blocks rather than outgoing links
        if (target && !blocks.some((b) => b.id === target)) {
          const subpathHeading = wm[3]?.trim() || null;
          const subpathBlock = wm[4]?.trim() || null;
          links.push({
            raw: wm[0],
            target,
            subpath: subpathBlock || subpathHeading,
            subpathType: subpathBlock ? 'block' : subpathHeading ? 'heading' : null,
            alias: wm[5]?.trim() || null,
            isEmbed: Boolean(wm[1]),
            from: offset + wm.index,
            to: offset + wm.index + wm[0].length
          });
        }
      }

      offset += line.length + 1;
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
