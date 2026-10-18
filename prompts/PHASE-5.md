# PHASE 5: Other Formats via FormatPlugin (Org-mode, Typst, AsciiDoc)

## Context
Phases 0 through 4 are complete, fully tested, and green in CI:
- **Phase 0**: Scaffolding, security baseline, typed IPC, Vitest & Playwright, dual-platform CI (Windows & Linux).
- **Phase 1**: Walking skeleton, safe atomic file I/O, `@parcel/watcher`, file tree, layout shell.
- **Phase 2 & 2.5**: CodeMirror 6 live-preview editor, KaTeX math typesetting, Vim modal editing, autocomplete, GFM tables, fenced code highlighting, callouts, and frontmatter cards.
- **Phase 3 & 3.5**: Obsidian-compatible wikilinks, shortest-path resolver, reactive vault indexer, backlinks panel, vault search, vault switcher save system, and responsive layout.
- **Phase 4**: Interactive 2D canvas force-directed graph view (global & local), zero-overlap compact labels, sublinear degree scaling, and 0% idle CPU physics cooldown.

Currently, Cairn exclusively scans and indexes `.md` files. In Phase 5, we introduce a pluggable, typed **FormatPlugin** architecture that extends Cairn to support **Org-mode (`.org`)**, **Typst (`.typ`)**, and **AsciiDoc (`.adoc`, `.asciidoc`)** while preserving all non-negotiables: files are the source of truth, zero file corruption, atomic saves, cross-format wikilinking, and unified graph indexing.

## Goal
Enable seamless multi-format note-taking in Cairn by introducing the `FormatPlugin` system. Users can create, browse, edit, and link `.org`, `.typ`, and `.adoc` notes alongside `.md` files. Each format receives tailored syntax highlighting, live-preview decorations (such as Org TODO badges and Typst math), format-specific file tree badges, and status bar indicators. Wikilinks resolve cross-format (`[[my-note]]` matches `my-note.org` or `my-note.typ`), and all notes seamlessly participate in the vault index, search, backlinks, and graph view. Realistic test fixture files (`.org`, `.typ`, `.adoc`) will be created in the vault fixture to test all formats end-to-end.

## Tasks

1. **FormatPlugin Architecture & Registry (`src/shared/formats/`)**
   - Define `FormatPlugin` interface in `src/shared/formats/types.ts`:
     - `id`: `'markdown' | 'org' | 'typst' | 'asciidoc'`
     - `name`: Display name (`'Markdown'`, `'Org-mode'`, `'Typst'`, `'AsciiDoc'`)
     - `extensions`: File extensions (e.g. `['.org']`, `['.typ']`, `['.adoc', '.asciidoc']`)
     - `defaultExtension`: Primary extension (e.g. `'.org'`)
     - `icon`: Identifier for format badge icon
     - `parseMetadata(content: string, filePath: string)`: Extracts title, headings, blocks, tags, aliases, and outgoing wikilinks.
   - Implement `FormatRegistry` in `src/shared/formats/registry.ts`:
     - `getFormatPlugin(path: string): FormatPlugin` (falls back to Markdown for `.md` or unknown).
     - `getSupportedExtensions(): string[]` (`['.md', '.markdown', '.org', '.typ', '.adoc', '.asciidoc']`).
     - `isSupportedNote(path: string): boolean`.

2. **Format Parsers & Link Extractors (`src/shared/formats/`)**
   - **Markdown (`format-markdown.ts`)**: Wraps existing Obsidian-compatible parser.
   - **Org-mode (`format-org.ts`)**:
     - Extracts title from `#+TITLE: ...` or first heading or filename.
     - Headings: `* Heading 1`, `** Heading 2`, etc.
     - Tags: `:tag1:tag2:` on heading lines and `#+FILETAGS: ...`.
     - Links: `[[target]]`, `[[target][label]]`, and Obsidian-style `[[wikilink]]`.
     - TODO states: `TODO`, `DONE` keywords.
   - **Typst (`format-typst.ts`)**:
     - Extracts title from `#set document(title: "...")` or `= Title` or filename.
     - Headings: `= Heading 1`, `== Heading 2`, `=== Heading 3`.
     - Links: `@ref`, `#link("target")[label]`, and `[[wikilink]]`.
     - Tags: Inline `#tag` and metadata labels.
     - Math: `$inline$` and `$ block $`.
   - **AsciiDoc (`format-asciidoc.ts`)**:
     - Extracts title from `= Document Title` or filename.
     - Headings: `== Section 1`, `=== Section 2`, etc.
     - Links: `xref:target[label]`, `<<target,label>>`, and `[[wikilink]]`.
     - Tags: `:tags: tag1, tag2` or inline tags.

3. **Vault Tree, IO, & Indexer Integration (`src/main/`)**
   - Update `shouldIncludeFile` in `src/main/vault/tree.ts` to include all supported format extensions.
   - Update `src/main/vault/io.ts` ensuring atomic writes and line-ending preservation apply uniformly to all formats.
   - Update `VaultIndexer` in `src/main/indexer/indexer.ts`:
     - Scan and watch `.org`, `.typ`, `.adoc` alongside `.md`.
     - Delegate metadata extraction to `getFormatPlugin(path).parseMetadata(...)`.
     - Update `resolveWikilink` to resolve cross-format links with shortest unique path (e.g. `[[research]]` resolves to `research.org` or `research.typ` if unique).
   - Ensure graph view data (`getGraphData()`) nodes include format type badge/metadata.

4. **CodeMirror 6 Multi-Language Editor Extensions (`src/renderer/components/editor/`)**
   - Implement stream-based language grammars in `src/renderer/components/editor/languages/`:
     - Org-mode language grammar (`StreamLanguage.define(orgMode)`) highlighting headings, tags, blocks, and TODO states.
     - Typst language grammar (`StreamLanguage.define(typstMode)`) highlighting headings, code, labels, and math.
     - AsciiDoc language grammar (`StreamLanguage.define(asciidocMode)`) highlighting section titles, admonitions, and attributes.
   - In `CodeMirrorEditor.tsx`:
     - Manage a dynamic language `Compartment`.
     - When switching active note, reconfigure editor extensions based on the file's format:
       - Markdown -> full Markdown GFM + live preview widgets.
       - Org-mode -> Org stream language + Org TODO badges & checkbox widgets.
       - Typst -> Typst stream language + KaTeX math widget.
       - AsciiDoc -> AsciiDoc stream language + admonition badge widgets.

5. **UI & File Tree Polish (`src/renderer/`)**
   - Distinct file icons in `FileTree.tsx`:
     - `.md`: Markdown document icon.
     - `.org`: Org icon (with subtle amber badge).
     - `.typ`: Typst icon (with subtle cyan badge).
     - `.adoc`: AsciiDoc icon (with subtle emerald badge).
   - New Note modal / creation buttons:
     - Provide format picker or recognize entered extension (`note.org`, `note.typ`, `note.adoc`, default `note.md`).
   - Status bar:
     - Display active format name badge (e.g. `Org`, `Typst`, `AsciiDoc`, `Markdown`) alongside Ln/Col and encoding.

6. **Generate Realistic Sample Test Fixtures (`tests/fixtures/vault/`)**
   - Create `tests/fixtures/vault/formats/project-plan.org`: Realistic Org-mode note with `#+TITLE:`, headings, TODO/DONE states, `:planning:` tags, and cross-format links to `welcome.md` and `paper.typ`.
   - Create `tests/fixtures/vault/formats/paper.typ`: Realistic Typst note with `#set document(title: "...")`, math formulas `$E=mc^2$`, code snippets, and wikilinks to `project-plan.org`.
   - Create `tests/fixtures/vault/formats/spec.adoc`: Realistic AsciiDoc note with `= Specification Title`, admonition blocks (`NOTE:`, `TIP:`), section anchors, and links to `welcome.md`.

7. **Architecture Decision Record (`docs/adr/0005-format-plugin-architecture.md`)**
   - Document the format plugin architecture, extension points, zero-dependency parser design, and cross-format link resolution strategy.

## Constraints
- **Strict Non-Negotiables**:
  - Never alter, normalize, or corrupt existing user files. Preserve line endings, BOM, and formatting byte-for-byte.
  - Sandboxed renderer: all file system interactions go through typed IPC to the main process.
  - Zero unvetted dependencies: leverage existing `@codemirror/language` `StreamLanguage` and pure TypeScript parsers.
  - Full cross-platform parity on Windows (case-insensitive path checks) and Linux.

## Acceptance Criteria
- [ ] Notes with extensions `.org`, `.typ`, `.adoc` appear in the file tree and can be created, opened, edited, renamed, and deleted.
- [ ] Saving `.org`, `.typ`, and `.adoc` files preserves line endings (LF/CRLF) and UTF-8 BOM atomically without corruption.
- [ ] Format-specific syntax highlighting and live-preview decorations activate dynamically based on active file extension in CodeMirror 6.
- [ ] Cross-format wikilinks work seamlessly (e.g. a Markdown note links to an Org note via `[[my-org-note]]` and navigates on click).
- [ ] The vault indexer, backlinks panel, search panel, and graph view index and display `.org`, `.typ`, and `.adoc` notes seamlessly.
- [ ] `tests/fixtures/vault/formats/` contains sample `.org`, `.typ`, and `.adoc` files properly linked together.
- [ ] `pnpm check` (typecheck + lint + unit tests) passes with 0 errors and 0 warnings.
- [ ] `pnpm test:e2e` passes with a dedicated Phase 5 test spec (`tests/e2e/formats-phase5.spec.ts`).

## Deliverables
- `src/shared/formats/`: `types.ts`, `registry.ts`, `format-markdown.ts`, `format-org.ts`, `format-typst.ts`, `format-asciidoc.ts`.
- `src/renderer/components/editor/languages/`: Stream grammars for Org, Typst, and AsciiDoc.
- Sample notes in `tests/fixtures/vault/formats/`.
- Updated `src/main/vault/tree.ts`, `src/main/indexer/indexer.ts`, `src/shared/linking/resolver.ts`.
- Updated `FileTree.tsx`, `CodeMirrorEditor.tsx`, `StatusBar.tsx`.
- `docs/adr/0005-format-plugin-architecture.md`.
- `tests/unit/formats.test.ts` & `tests/e2e/formats-phase5.spec.ts`.
- Updated `PROGRESS.md`.
