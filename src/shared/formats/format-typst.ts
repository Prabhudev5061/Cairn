import { slugifyHeading } from '../linking/parser';
import type { ParsedBlock, ParsedHeading, ParsedWikilink } from '../linking/types';
import type { FormatMetadata, FormatPlugin } from './types';

export const typstPlugin: FormatPlugin = {
  id: 'typst',
  name: 'Typst',
  extensions: ['.typ'],
  defaultExtension: '.typ',
  contentType: 'text/typst',
  badgeLabel: 'TYP',
  iconName: 'cpu',
  parseMetadata: (content: string, filePath: string): FormatMetadata => {
    const filename = filePath.split('/').pop() || filePath;
    let title = filename.replace(/\.typ$/i, '');

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

      // 1. Title detection: #set document(title: "...")
      const docTitleMatch = trimmed.match(/#set\s+document\s*\([^)]*title:\s*["']([^"']+)["']/i);
      if (docTitleMatch && docTitleMatch[1]) {
        title = docTitleMatch[1].trim();
      }

      // 2. Keywords / tags detection: #set document(keywords: ("tag1", "tag2"))
      const keywordsMatch = trimmed.match(/#set\s+document\s*\([^)]*keywords:\s*\(([^)]+)\)/i);
      if (keywordsMatch && keywordsMatch[1]) {
        const rawKw = keywordsMatch[1].match(/["']([^"']+)["']/g) || [];
        for (const kw of rawKw) {
          const cleaned = kw.replace(/^["']|["']$/g, '').trim();
          if (cleaned) {
            tagSet.add(cleaned.startsWith('#') ? cleaned.toLowerCase() : `#${cleaned.toLowerCase()}`);
          }
        }
      }

      // 3. Headings: = Heading 1, == Heading 2, etc.
      const headingMatch = line.match(/^(=+)\s+(.+)$/);
      if (headingMatch && headingMatch[1] && headingMatch[2]) {
        const level = Math.min(6, headingMatch[1].length);
        let headingText = headingMatch[2].trim();

        // Check for trailing label <sec-label>
        const labelMatch = headingText.match(/\s+<([a-zA-Z0-9_-]+)>$/);
        if (labelMatch && labelMatch[1]) {
          blocks.push({
            id: labelMatch[1],
            line: i + 1,
            offset
          });
          headingText = headingText.slice(0, labelMatch.index).trim();
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

      // 4. Standalone labels / blocks: <block-id>
      const standaloneLabel = trimmed.match(/^<([a-zA-Z0-9_-]+)>$/);
      if (standaloneLabel && standaloneLabel[1]) {
        blocks.push({
          id: standaloneLabel[1],
          line: i + 1,
          offset
        });
      }

      // 5. Wikilinks [[target|alias]]
      const wikilinkRegex = /(!)?\[\[([^\]|#^]+)(?:#([^\]|^|]+))?(?:\^([^\]|]+))?(?:\|([^\]]+))?\]\]/g;
      let wm: RegExpExecArray | null;
      while ((wm = wikilinkRegex.exec(line)) !== null) {
        const target = wm[2]?.trim() || '';
        if (target) {
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

      // 6. Typst #link("target")[alias]
      const typstLinkRegex = /#link\s*\(\s*["']([^"']+)["']\s*\)(?:\[([^\]]*)\])?/g;
      let lm: RegExpExecArray | null;
      while ((lm = typstLinkRegex.exec(line)) !== null) {
        const rawTarget = lm[1]?.trim() || '';
        const alias = lm[2]?.trim() || null;

        if (rawTarget && !/^(?:https?|ftp|mailto):/i.test(rawTarget)) {
          links.push({
            raw: lm[0],
            target: rawTarget,
            subpath: null,
            subpathType: null,
            alias,
            isEmbed: false,
            from: offset + lm.index,
            to: offset + lm.index + lm[0].length
          });
        }
      }

      // 7. Inline tags (#tagname)
      const inlineTagRegex = /(?:^|\s)(#[a-zA-Z][a-zA-Z0-9_/-]*)(?=\s|$|[.,;:!?])/g;
      let tm: RegExpExecArray | null;
      while ((tm = inlineTagRegex.exec(line)) !== null) {
        const tag = tm[1]?.trim();
        // Ignore typst keywords like #set, #let, #show, #link, #import, #include
        if (
          tag &&
          !/^(?:#set|#let|#show|#link|#import|#include|#page|#align|#text|#box|#block|#rect|#circle)$/i.test(
            tag
          )
        ) {
          tagSet.add(tag.toLowerCase());
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
