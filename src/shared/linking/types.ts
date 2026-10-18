/**
 * Types for Obsidian-compatible wikilinks, indexing, and search.
 */

export interface ParsedWikilink {
  /** Full raw link text, e.g. [[My Note#Heading|Alias]] or ![[embed.png]] */
  raw: string;
  /** The target note or file name/path without anchors or aliases, e.g. "My Note" */
  target: string;
  /** Anchor/subpath target if specified (without # or ^), e.g. "Heading" or "blockid" */
  subpath: string | null;
  /** Whether the subpath refers to a heading or a block reference */
  subpathType: 'heading' | 'block' | null;
  /** Custom display text/alias if specified after pipe, e.g. "Alias" */
  alias: string | null;
  /** Whether this is an embed starting with exclamation mark ![[...]] */
  isEmbed: boolean;
  /** Start character offset in document */
  from: number;
  /** End character offset in document */
  to: number;
}

export interface ParsedHeading {
  /** Raw heading text without markdown hashes */
  text: string;
  /** Normalized anchor slug matching Obsidian heading resolution */
  slug: string;
  /** Heading level 1-6 */
  level: number;
  /** 1-indexed line number */
  line: number;
  /** Start character offset */
  offset: number;
}

export interface ParsedBlock {
  /** Block identifier, e.g. "abc123" from ^abc123 */
  id: string;
  /** 1-indexed line number */
  line: number;
  /** Start character offset */
  offset: number;
}

export interface ParsedFrontmatter {
  /** List of note aliases defined in YAML frontmatter */
  aliases: string[];
  /** List of tags defined in YAML frontmatter */
  tags: string[];
  /** Raw frontmatter block string */
  raw: string;
}

export interface NoteIndexEntry {
  /** Vault-relative path with forward slashes, e.g. "folder/note.md" */
  path: string;
  /** Filename without .md extension, e.g. "note" */
  title: string;
  /** File modification timestamp in ms */
  mtime: number;
  /** File size in bytes */
  size: number;
  /** Aliases from frontmatter */
  aliases: string[];
  /** Tags from frontmatter and inline #tags */
  tags: string[];
  /** Headings found in note */
  headings: ParsedHeading[];
  /** Block references found in note */
  blocks: ParsedBlock[];
  /** Outgoing wikilinks extracted from note */
  links: ParsedWikilink[];
  /** File format type if multi-format */
  format?: 'markdown' | 'org' | 'typst' | 'asciidoc';
}

export interface BacklinkItem {
  /** Source note vault-relative path containing the link */
  sourcePath: string;
  /** Target note vault-relative path being referenced */
  targetPath: string;
  /** 1-indexed line number of mention */
  line: number;
  /** Surrounding text snippet context */
  snippet: string;
  /** Alias used in the link if any */
  alias: string | null;
  /** Subpath used in the link if any */
  subpath: string | null;
}

export interface SearchMatch {
  line: number;
  snippet: string;
  matchIndex: number;
  length: number;
}

export interface SearchResultItem {
  /** Vault-relative path */
  path: string;
  /** Note title */
  title: string;
  /** List of text matches within the note */
  matches: SearchMatch[];
}

export interface GraphNode {
  /** Vault-relative path with forward slashes, e.g. "folder/note.md" */
  id: string;
  /** Vault-relative path with forward slashes, e.g. "folder/note.md" */
  path: string;
  /** Note title without .md */
  title: string;
  /** Relative sizing weight (e.g. Math.max(1, degree)) */
  val: number;
  /** Tags from frontmatter and inline #tags */
  tags: string[];
  /** Whether the note has degree === 0 */
  isOrphan: boolean;
  /** Total incoming + outgoing connections */
  degree: number;
  /** File format type if multi-format */
  format?: 'markdown' | 'org' | 'typst' | 'asciidoc';
  /** Category or accent color */
  color?: string;
  /** Simulation coordinates populated by force simulation */
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface GraphFilterOptions {
  searchQuery?: string;
  selectedTags?: string[];
  selectedFolders?: string[];
  hideOrphans?: boolean;
}
