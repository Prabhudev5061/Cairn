import { describe, expect, it } from 'vitest';
import { asciidocPlugin } from '../../src/shared/formats/format-asciidoc';
import { markdownPlugin } from '../../src/shared/formats/format-markdown';
import { orgPlugin } from '../../src/shared/formats/format-org';
import { typstPlugin } from '../../src/shared/formats/format-typst';
import {
  ALL_FORMAT_PLUGINS,
  getFormatPlugin,
  getSupportedExtensions,
  isSupportedNotePath,
  stripNoteExtension
} from '../../src/shared/formats/registry';
import { resolveWikilink } from '../../src/shared/linking/resolver';
import type { NoteIndexEntry } from '../../src/shared/linking/types';

describe('Format Plugins & Multi-Format Parsing', () => {
  describe('FormatRegistry', () => {
    it('registers markdown, org, typst, and asciidoc plugins', () => {
      const ids = ALL_FORMAT_PLUGINS.map((p) => p.id);
      expect(ids).toContain('markdown');
      expect(ids).toContain('org');
      expect(ids).toContain('typst');
      expect(ids).toContain('asciidoc');
    });

    it('identifies file extensions correctly', () => {
      expect(getFormatPlugin('notes/test.md').id).toBe('markdown');
      expect(getFormatPlugin('notes/test.org').id).toBe('org');
      expect(getFormatPlugin('notes/test.typ').id).toBe('typst');
      expect(getFormatPlugin('notes/test.adoc').id).toBe('asciidoc');
      expect(getFormatPlugin('notes/test.asciidoc').id).toBe('asciidoc');
      expect(getFormatPlugin('notes/unknown.txt').id).toBe('markdown'); // default fallback
    });

    it('returns supported extensions list', () => {
      const exts = getSupportedExtensions();
      expect(exts).toContain('.md');
      expect(exts).toContain('.org');
      expect(exts).toContain('.typ');
      expect(exts).toContain('.adoc');
      expect(exts).toContain('.asciidoc');
    });

    it('checks supported note paths and strips extensions accurately', () => {
      expect(isSupportedNotePath('folder/doc.org')).toBe(true);
      expect(isSupportedNotePath('folder/doc.typ')).toBe(true);
      expect(isSupportedNotePath('folder/doc.adoc')).toBe(true);
      expect(isSupportedNotePath('folder/image.png')).toBe(false);

      expect(stripNoteExtension('folder/doc.org')).toBe('folder/doc');
      expect(stripNoteExtension('folder/paper.typ')).toBe('folder/paper');
      expect(stripNoteExtension('folder/spec.asciidoc')).toBe('folder/spec');
      expect(stripNoteExtension('folder/note.md')).toBe('folder/note');
    });
  });

  describe('Markdown Parser (format-markdown)', () => {
    it('parses headings, links, and frontmatter via standard parser', () => {
      const content = `---
aliases: [Test Note]
---
# Welcome Heading
Check out [[cairn-roadmap]] and #planning.
`;
      const meta = markdownPlugin.parseMetadata(content, 'test.md');
      expect(meta.title).toBe('test');
      expect(meta.headings[0]?.text).toBe('Welcome Heading');
      expect(meta.aliases).toContain('Test Note');
      expect(meta.tags).toContain('planning');
      expect(meta.links[0]?.target).toBe('cairn-roadmap');
    });
  });

  describe('Org-Mode Parser (format-org)', () => {
    it('parses headings, tags, TODO states, and wikilinks', () => {
      const orgContent = `#+TITLE: Project Tracker
#+FILETAGS: :project:cairn:

* Top Level Objective
This links to [[overview][Overview Note]] and raw [[research-log]].

** TODO Implement multi-format parser :dev:urgent:
- [ ] Write test cases
- [X] Define interfaces

** DONE Initial design review :mgmt:
See [[welcome]] for general architecture.
`;
      const meta = orgPlugin.parseMetadata(orgContent, 'projects/tracker.org');

      expect(meta.title).toBe('Project Tracker');
      expect(meta.tags).toContain('project');
      expect(meta.tags).toContain('cairn');
      expect(meta.tags).toContain('dev');
      expect(meta.tags).toContain('urgent');
      expect(meta.tags).toContain('mgmt');

      expect(meta.headings.length).toBe(3);
      expect(meta.headings[0]?.level).toBe(1);
      expect(meta.headings[0]?.text).toBe('Top Level Objective');
      expect(meta.headings[1]?.level).toBe(2);
      expect(meta.headings[1]?.text).toBe('Implement multi-format parser');

      expect(meta.links.length).toBe(3);
      expect(meta.links[0]?.target).toBe('overview');
      expect(meta.links[0]?.alias).toBe('Overview Note');
      expect(meta.links[1]?.target).toBe('research-log');
      expect(meta.links[2]?.target).toBe('welcome');
    });
  });

  describe('Typst Parser (format-typst)', () => {
    it('parses typst document title, headings, labels, and links', () => {
      const typContent = `#set document(title: "Quantum Simulation Engine", author: "Physicist")

= Introduction <sec-intro>
We study phase transitions. See [[math-foundations]] for algebra.

== System Hamiltonian <sec-hamiltonian>
Equation formulation here.

== References
Check @sec-intro and #link("https://example.com")[External Link] as well as [[lab-results#final]].
`;
      const meta = typstPlugin.parseMetadata(typContent, 'papers/quantum.typ');

      expect(meta.title).toBe('Quantum Simulation Engine');
      expect(meta.headings.length).toBe(3);
      expect(meta.headings[0]?.text).toBe('Introduction');
      expect(meta.headings[0]?.level).toBe(1);
      expect(meta.headings[1]?.text).toBe('System Hamiltonian');
      expect(meta.headings[1]?.level).toBe(2);

      expect(meta.blocks.some((b) => b.id === 'sec-intro')).toBe(true);
      expect(meta.blocks.some((b) => b.id === 'sec-hamiltonian')).toBe(true);

      expect(meta.links.length).toBe(2);
      expect(meta.links[0]?.target).toBe('math-foundations');
      expect(meta.links[1]?.target).toBe('lab-results');
      expect(meta.links[1]?.subpath).toBe('final');
    });
  });

  describe('AsciiDoc Parser (format-asciidoc)', () => {
    it('parses document title, section headings, tags attribute, anchors, and cross-refs', () => {
      const adocContent = `= Technical Specification
Author Name
:tags: architecture, backend, performance

== Overview [#sec-overview]
This document specifies Cairn core layout.

=== Subsystem Details [[sec-details]]
Refer to xref:quantum.typ#sec-intro[Quantum Paper] and internal [[roadmap#q3]].
`;
      const meta = asciidocPlugin.parseMetadata(adocContent, 'docs/spec.adoc');

      expect(meta.title).toBe('Technical Specification');
      expect(meta.tags).toContain('architecture');
      expect(meta.tags).toContain('backend');
      expect(meta.tags).toContain('performance');

      expect(meta.headings.length).toBe(3);
      expect(meta.headings[0]?.text).toBe('Technical Specification');
      expect(meta.headings[0]?.level).toBe(1);
      expect(meta.headings[1]?.text).toBe('Overview');
      expect(meta.headings[1]?.level).toBe(2);

      expect(meta.blocks.some((b) => b.id === 'sec-overview')).toBe(true);
      expect(meta.blocks.some((b) => b.id === 'sec-details')).toBe(true);

      expect(meta.links.length).toBe(2);
      expect(meta.links[0]?.target).toBe('quantum.typ');
      expect(meta.links[0]?.subpath).toBe('sec-intro');
      expect(meta.links[1]?.target).toBe('roadmap');
      expect(meta.links[1]?.subpath).toBe('q3');
    });
  });

  describe('Cross-Format Wikilink Resolution', () => {
    const allFiles = [
      'welcome.md',
      'Projects/cairn-roadmap.org',
      'Research/quantum-state-collapse.typ',
      'Guides/asciidoc-specification.adoc',
      'Guides/intro.md'
    ];

    const indexMap = new Map<string, NoteIndexEntry>([
      [
        'Projects/cairn-roadmap.org',
        {
          path: 'Projects/cairn-roadmap.org',
          title: 'cairn-roadmap',
          mtime: 1000,
          size: 500,
          aliases: ['Roadmap 2026'],
          tags: ['planning'],
          headings: [],
          blocks: [],
          links: [],
          format: 'org'
        }
      ]
    ]);

    it('resolves wikilinks targeting non-markdown notes without explicit extension', () => {
      const res = resolveWikilink(
        { raw: '[[cairn-roadmap]]', target: 'cairn-roadmap', subpath: null, subpathType: null, alias: null, isEmbed: false, from: 0, to: 0 },
        'welcome.md',
        allFiles,
        indexMap
      );
      expect(res.exists).toBe(true);
      expect(res.resolvedPath).toBe('Projects/cairn-roadmap.org');
    });

    it('resolves wikilinks with explicit extensions across formats', () => {
      const resTyp = resolveWikilink(
        { raw: '[[quantum-state-collapse.typ]]', target: 'quantum-state-collapse.typ', subpath: null, subpathType: null, alias: null, isEmbed: false, from: 0, to: 0 },
        'welcome.md',
        allFiles,
        indexMap
      );
      expect(resTyp.exists).toBe(true);
      expect(resTyp.resolvedPath).toBe('Research/quantum-state-collapse.typ');

      const resAdoc = resolveWikilink(
        { raw: '[[asciidoc-specification.adoc]]', target: 'asciidoc-specification.adoc', subpath: null, subpathType: null, alias: null, isEmbed: false, from: 0, to: 0 },
        'welcome.md',
        allFiles,
        indexMap
      );
      expect(resAdoc.exists).toBe(true);
      expect(resAdoc.resolvedPath).toBe('Guides/asciidoc-specification.adoc');
    });

    it('resolves alias linking to an org note', () => {
      const res = resolveWikilink(
        { raw: '[[Roadmap 2026]]', target: 'Roadmap 2026', subpath: null, subpathType: null, alias: null, isEmbed: false, from: 0, to: 0 },
        'welcome.md',
        allFiles,
        indexMap
      );
      expect(res.exists).toBe(true);
      expect(res.resolvedPath).toBe('Projects/cairn-roadmap.org');
    });
  });
});
