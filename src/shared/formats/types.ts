import type { ParsedBlock, ParsedHeading, ParsedWikilink } from '../linking/types';

export type NoteFormatId = 'markdown' | 'org' | 'typst' | 'asciidoc';

export interface FormatMetadata {
  title: string;
  headings: ParsedHeading[];
  blocks: ParsedBlock[];
  links: ParsedWikilink[];
  tags: string[];
  aliases: string[];
}

export interface FormatPlugin {
  id: NoteFormatId;
  name: string;
  extensions: string[];
  defaultExtension: string;
  contentType: string;
  badgeLabel: string;
  iconName: 'file-text' | 'list-todo' | 'file-code' | 'cpu';
  parseMetadata: (content: string, filePath: string) => FormatMetadata;
}
