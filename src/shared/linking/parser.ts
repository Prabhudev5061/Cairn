import {
  ParsedBlock,
  ParsedFrontmatter,
  ParsedHeading,
  ParsedWikilink
} from './types';

/**
 * Normalizes heading text into an anchor slug matching Obsidian's convention.
 * e.g. "My Heading 1!" -> "my-heading-1"
 */
export function slugifyHeading(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\w\s\u00C0-\u024F\u1E00-\u1EFF-]/g, '')
    .replace(/\s+/g, '-');
}

/**
 * Extracts and parses YAML frontmatter at the beginning of a document.
 * Safely parses aliases and tags without external heavy dependencies.
 */
export function parseFrontmatter(content: string): {
  frontmatter: ParsedFrontmatter | null;
  bodyOffset: number;
} {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n(?:---|\.\.\.)(?:\r?\n|$)/);
  if (!match || match[1] === undefined) {
    return { frontmatter: null, bodyOffset: 0 };
  }

  const rawYaml = match[1];
  const bodyOffset = match[0].length;

  const aliases: string[] = [];
  const tags: string[] = [];

  // Parse key-values line-by-line
  const lines = rawYaml.split(/\r?\n/);
  let currentKey: 'aliases' | 'tags' | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Check for inline array: aliases: [a, b, c]
    const inlineAliases = trimmed.match(/^aliases\s*:\s*\[(.*?)\]$/i);
    if (inlineAliases && inlineAliases[1] !== undefined) {
      currentKey = null;
      inlineAliases[1]
        .split(',')
        .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean)
        .forEach((a) => aliases.push(a));
      continue;
    }

    // Check for inline tags: tags: [foo, bar]
    const inlineTags = trimmed.match(/^tags\s*:\s*\[(.*?)\]$/i);
    if (inlineTags && inlineTags[1] !== undefined) {
      currentKey = null;
      inlineTags[1]
        .split(',')
        .map((s) => s.trim().replace(/^['"]|['"]$/g, '').replace(/^#/, ''))
        .filter(Boolean)
        .forEach((t) => tags.push(t));
      continue;
    }

    // Check for single line key-value: aliases: My Alias
    const singleAlias = trimmed.match(/^aliases\s*:\s*(.+)$/i);
    if (singleAlias && singleAlias[1] && !singleAlias[1].startsWith('[')) {
      currentKey = 'aliases';
      const val = singleAlias[1].trim().replace(/^['"]|['"]$/g, '');
      if (val) aliases.push(val);
      continue;
    }

    // Check for single line key-value: tags: my-tag
    const singleTag = trimmed.match(/^tags\s*:\s*(.+)$/i);
    if (singleTag && singleTag[1] && !singleTag[1].startsWith('[')) {
      currentKey = 'tags';
      const val = singleTag[1].trim().replace(/^['"]|['"]$/g, '').replace(/^#/, '');
      if (val) tags.push(val);
      continue;
    }

    // Check for start of list: aliases:
    if (/^aliases\s*:\s*$/i.test(trimmed)) {
      currentKey = 'aliases';
      continue;
    }

    // Check for start of list: tags:
    if (/^tags\s*:\s*$/i.test(trimmed)) {
      currentKey = 'tags';
      continue;
    }

    // Check for list item: - value
    const listItem = trimmed.match(/^-\s*(.+)$/);
    if (listItem && listItem[1] && currentKey) {
      const val = listItem[1].trim().replace(/^['"]|['"]$/g, '');
      if (currentKey === 'aliases') {
        aliases.push(val);
      } else if (currentKey === 'tags') {
        tags.push(val.replace(/^#/, ''));
      }
      continue;
    }

    // Any other key resets currentKey
    if (/^[a-zA-Z0-9_-]+\s*:/i.test(trimmed)) {
      currentKey = null;
    }
  }

  return {
    frontmatter: {
      aliases: Array.from(new Set(aliases)),
      tags: Array.from(new Set(tags)),
      raw: rawYaml
    },
    bodyOffset
  };
}

/**
 * Extracts headings from markdown content, avoiding code blocks.
 */
export function parseHeadings(content: string): ParsedHeading[] {
  const headings: ParsedHeading[] = [];
  const lines = content.split(/\r?\n/);
  let currentOffset = 0;
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const lineNum = i + 1;

    // Track fenced code blocks
    if (/^(```|~~~)/.test(line.trim())) {
      inCodeBlock = !inCodeBlock;
      currentOffset += line.length + 1;
      continue;
    }

    if (!inCodeBlock) {
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch && headingMatch[1] && headingMatch[2]) {
        const level = headingMatch[1].length;
        const text = headingMatch[2].trim();
        headings.push({
          text,
          slug: slugifyHeading(text),
          level,
          line: lineNum,
          offset: currentOffset
        });
      }
    }

    currentOffset += line.length + 1;
  }

  return headings;
}

/**
 * Extracts block references (^blockid) found at the ends of lines.
 */
export function parseBlocks(content: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  const lines = content.split(/\r?\n/);
  let currentOffset = 0;
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const lineNum = i + 1;

    if (/^(```|~~~)/.test(line.trim())) {
      inCodeBlock = !inCodeBlock;
      currentOffset += line.length + 1;
      continue;
    }

    if (!inCodeBlock) {
      const blockMatch = line.match(/\s+\^([a-zA-Z0-9_-]+)\s*$/);
      if (blockMatch && blockMatch[1]) {
        blocks.push({
          id: blockMatch[1],
          line: lineNum,
          offset: currentOffset + (line.lastIndexOf('^') || 0)
        });
      }
    }

    currentOffset += line.length + 1;
  }

  return blocks;
}

/**
 * Extracts all [[wikilinks]] and ![[embeds]] from markdown content.
 */
export function parseWikilinks(content: string): ParsedWikilink[] {
  const links: ParsedWikilink[] = [];
  const wikilinkRegex = /(!?\[\[([^\]\r\n]+)\]\])/g;

  // Mask out code blocks and inline code to prevent false positives
  let match: RegExpExecArray | null;

  while ((match = wikilinkRegex.exec(content)) !== null) {
    const fullMatch = match[1];
    const inner = match[2];
    if (!fullMatch || !inner) continue;

    const from = match.index;
    const to = from + fullMatch.length;
    const isEmbed = fullMatch.startsWith('!');

    // Check if inside a code block
    const prefix = content.slice(0, from);
    const codeBlockCount = (prefix.match(/(^|\n)(```|~~~)/g) || []).length;
    if (codeBlockCount % 2 === 1) {
      continue;
    }

    // Split target from alias by pipe |
    const pipeIndex = inner.indexOf('|');
    let targetWithSubpath = pipeIndex >= 0 ? inner.slice(0, pipeIndex) : inner;
    const alias = pipeIndex >= 0 ? inner.slice(pipeIndex + 1).trim() : null;

    targetWithSubpath = targetWithSubpath.trim();

    let target = targetWithSubpath;
    let subpath: string | null = null;
    let subpathType: 'heading' | 'block' | null = null;

    if (targetWithSubpath.includes('#^')) {
      const parts = targetWithSubpath.split('#^');
      target = (parts[0] ?? '').trim();
      subpath = (parts[1] ?? '').trim();
      subpathType = 'block';
    } else if (targetWithSubpath.includes('#')) {
      const parts = targetWithSubpath.split('#');
      target = (parts[0] ?? '').trim();
      subpath = (parts[1] ?? '').trim();
      subpathType = 'heading';
    }

    links.push({
      raw: fullMatch,
      target,
      subpath,
      subpathType,
      alias,
      isEmbed,
      from,
      to
    });
  }

  return links;
}

/**
 * Extracts all inline tags (#tag and #nested/tag) and merges with frontmatter tags.
 */
export function parseTags(content: string): string[] {
  const { frontmatter } = parseFrontmatter(content);
  const tagSet = new Set<string>(frontmatter?.tags ?? []);

  // Match tags starting with # followed by a letter, containing letters, numbers, hyphens, underscores, or slashes
  const tagRegex = /(?:^|\s)#([a-zA-Z][a-zA-Z0-9_-]*(?:\/[a-zA-Z0-9_-]+)*)(?=\s|$|[.,;:!?])/g;

  let match: RegExpExecArray | null;
  while ((match = tagRegex.exec(content)) !== null) {
    const tag = match[1];
    if (tag) {
      tagSet.add(tag);
    }
  }

  return Array.from(tagSet);
}
