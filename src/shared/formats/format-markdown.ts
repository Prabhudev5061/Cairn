import {
  parseBlocks,
  parseFrontmatter,
  parseHeadings,
  parseTags,
  parseWikilinks
} from '../linking/parser';
import type { FormatMetadata, FormatPlugin } from './types';

export const markdownPlugin: FormatPlugin = {
  id: 'markdown',
  name: 'Markdown',
  extensions: ['.md', '.markdown'],
  defaultExtension: '.md',
  contentType: 'text/markdown',
  badgeLabel: 'MD',
  iconName: 'file-text',
  parseMetadata: (content: string, filePath: string): FormatMetadata => {
    const filename = filePath.split('/').pop() || filePath;
    const baseTitle = filename.replace(/\.(md|markdown)$/i, '');

    const { frontmatter } = parseFrontmatter(content);
    const headings = parseHeadings(content);
    const blocks = parseBlocks(content);
    const links = parseWikilinks(content);
    const tags = parseTags(content);

    return {
      title: baseTitle,
      headings,
      blocks,
      links,
      tags,
      aliases: frontmatter?.aliases ?? []
    };
  }
};
