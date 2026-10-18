import { describe, expect, it } from 'vitest';
import {
  parseBlocks,
  parseFrontmatter,
  parseHeadings,
  parseTags,
  parseWikilinks,
  slugifyHeading
} from '../../src/shared/linking/parser';
import { refactorWikilinksInContent } from '../../src/shared/linking/refactor';
import { resolveWikilink } from '../../src/shared/linking/resolver';
import { NoteIndexEntry, ParsedWikilink } from '../../src/shared/linking/types';

describe('Frontmatter, Headings, and Tags Parser', () => {
  it('parses YAML frontmatter aliases and tags in various formats', () => {
    const doc = `---
aliases: [Alpha, Beta]
tags:
  - project/active
  - important
---
# Main Content
Some text here.`;

    const { frontmatter, bodyOffset } = parseFrontmatter(doc);
    expect(frontmatter).not.toBeNull();
    expect(frontmatter?.aliases).toEqual(['Alpha', 'Beta']);
    expect(frontmatter?.tags).toEqual(['project/active', 'important']);
    expect(bodyOffset).toBeGreaterThan(0);
  });

  it('handles documents without frontmatter', () => {
    const doc = '# Just a Heading\nNo frontmatter here.';
    const { frontmatter, bodyOffset } = parseFrontmatter(doc);
    expect(frontmatter).toBeNull();
    expect(bodyOffset).toBe(0);
  });

  it('slugifies headings matching Obsidian anchors', () => {
    expect(slugifyHeading('Section 1: Quick Start!')).toBe('section-1-quick-start');
    expect(slugifyHeading('Deeply Nested / Sub-Topic')).toBe('deeply-nested-sub-topic');
  });

  it('extracts headings while ignoring code blocks', () => {
    const doc = `# Title
Some text
\`\`\`markdown
# Ignored Header in Code
\`\`\`
## Section Two
### Sub Section`;

    const headings = parseHeadings(doc);
    expect(headings.length).toBe(3);
    expect(headings[0]?.text).toBe('Title');
    expect(headings[0]?.level).toBe(1);
    expect(headings[1]?.text).toBe('Section Two');
    expect(headings[1]?.level).toBe(2);
    expect(headings[2]?.text).toBe('Sub Section');
    expect(headings[2]?.level).toBe(3);
  });

  it('extracts block references at the ends of lines', () => {
    const doc = `This is a paragraph with a block reference. ^my-block-123

Another normal line.`;

    const blocks = parseBlocks(doc);
    expect(blocks.length).toBe(1);
    expect(blocks[0]?.id).toBe('my-block-123');
  });

  it('extracts inline tags and merges with frontmatter', () => {
    const doc = `---
tags: [frontmatter-tag]
---
Here is an #inline-tag and a nested #category/subcat tag.
Do not match # or #123 invalid tags.`;

    const tags = parseTags(doc);
    expect(tags).toContain('frontmatter-tag');
    expect(tags).toContain('inline-tag');
    expect(tags).toContain('category/subcat');
    expect(tags).not.toContain('123');
  });
});

describe('Wikilink Parsing and Resolution', () => {
  it('parses standard wikilinks, aliases, headings, and block references', () => {
    const doc = `
Check out [[welcome]] and [[My Note|Alias Note]].
Also see [[Guide#Installation]] and [[Data#^block-id]].
Here is an image ![[screenshot.png]].
\`\`\`
[[ignored link in code]]
\`\`\`
`;

    const links = parseWikilinks(doc);
    expect(links.length).toBe(5);

    expect(links[0]?.target).toBe('welcome');
    expect(links[0]?.alias).toBeNull();
    expect(links[0]?.isEmbed).toBe(false);

    expect(links[1]?.target).toBe('My Note');
    expect(links[1]?.alias).toBe('Alias Note');

    expect(links[2]?.target).toBe('Guide');
    expect(links[2]?.subpath).toBe('Installation');
    expect(links[2]?.subpathType).toBe('heading');

    expect(links[3]?.target).toBe('Data');
    expect(links[3]?.subpath).toBe('block-id');
    expect(links[3]?.subpathType).toBe('block');

    expect(links[4]?.target).toBe('screenshot.png');
    expect(links[4]?.isEmbed).toBe(true);
  });

  it('resolves links case-insensitively using shortest unique path', () => {
    const allFiles = [
      'welcome.md',
      'notes/deeply/nested-note.md',
      'folder-a/conflict.md',
      'folder-b/conflict.md'
    ];

    const link1: ParsedWikilink = {
      raw: '[[WELcome]]',
      target: 'WELcome',
      subpath: null,
      subpathType: null,
      alias: null,
      isEmbed: false,
      from: 0,
      to: 11
    };

    const res1 = resolveWikilink(link1, 'notes/deeply/nested-note.md', allFiles);
    expect(res1.exists).toBe(true);
    expect(res1.resolvedPath).toBe('welcome.md');

    // Shortest path unique match
    const link2: ParsedWikilink = {
      raw: '[[nested-note]]',
      target: 'nested-note',
      subpath: null,
      subpathType: null,
      alias: null,
      isEmbed: false,
      from: 0,
      to: 15
    };
    const res2 = resolveWikilink(link2, 'welcome.md', allFiles);
    expect(res2.exists).toBe(true);
    expect(res2.resolvedPath).toBe('notes/deeply/nested-note.md');

    // Disambiguate by folder sibling
    const link3: ParsedWikilink = {
      raw: '[[conflict]]',
      target: 'conflict',
      subpath: null,
      subpathType: null,
      alias: null,
      isEmbed: false,
      from: 0,
      to: 12
    };
    const resSibling = resolveWikilink(link3, 'folder-a/other.md', allFiles);
    expect(resSibling.exists).toBe(true);
    expect(resSibling.resolvedPath).toBe('folder-a/conflict.md');
  });

  it('resolves internal same-file anchors [[#Heading]]', () => {
    const link: ParsedWikilink = {
      raw: '[[#Intro]]',
      target: '',
      subpath: 'Intro',
      subpathType: 'heading',
      alias: null,
      isEmbed: false,
      from: 0,
      to: 10
    };

    const res = resolveWikilink(link, 'welcome.md', ['welcome.md']);
    expect(res.exists).toBe(true);
    expect(res.resolvedPath).toBe('welcome.md');
    expect(res.subpath).toBe('Intro');
  });

  it('resolves links via frontmatter aliases', () => {
    const allFiles = ['projects/project-x.md'];
    const indexMap = new Map<string, NoteIndexEntry>();
    indexMap.set('projects/project-x.md', {
      path: 'projects/project-x.md',
      title: 'project-x',
      mtime: 12345,
      size: 100,
      aliases: ['PX', 'Project Phoenix'],
      tags: [],
      headings: [],
      blocks: [],
      links: []
    });

    const link: ParsedWikilink = {
      raw: '[[Project Phoenix]]',
      target: 'Project Phoenix',
      subpath: null,
      subpathType: null,
      alias: null,
      isEmbed: false,
      from: 0,
      to: 19
    };

    const res = resolveWikilink(link, 'notes.md', allFiles, indexMap);
    expect(res.exists).toBe(true);
    expect(res.resolvedPath).toBe('projects/project-x.md');
  });
});

describe('Wikilink Refactoring on Note Rename', () => {
  it('updates target note references while preserving aliases and subpaths', () => {
    const content = `Link to [[Old Note]] and [[Old Note|My Alias]].
Also [[Old Note#Section 1]] and ![[Old Note]].
Unrelated link to [[Other Note]].`;

    const { updated, newContent } = refactorWikilinksInContent(content, 'Old Note', 'New Note');
    expect(updated).toBe(true);
    expect(newContent).toContain('[[New Note]]');
    expect(newContent).toContain('[[New Note|My Alias]]');
    expect(newContent).toContain('[[New Note#Section 1]]');
    expect(newContent).toContain('![[New Note]]');
    expect(newContent).toContain('[[Other Note]]');
  });

  it('preserves CRLF line endings when refactoring', () => {
    const content = 'First line\r\nSee [[Old Note]] here\r\nThird line';
    const { updated, newContent } = refactorWikilinksInContent(content, 'Old Note', 'Renamed Note');
    expect(updated).toBe(true);
    expect(newContent).toBe('First line\r\nSee [[Renamed Note]] here\r\nThird line');
  });
});
