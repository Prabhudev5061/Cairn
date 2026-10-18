# ADR 0005: Multi-Format Architecture via FormatPlugin (Org-mode, Typst, AsciiDoc) and CodeMirror 6 Stream Languages

## Status
Accepted

## Context
While Markdown remains the canonical default for notes in Cairn, advanced technical authors, researchers, and scientific note-takers rely on specialized markup formats:
1. **Emacs Org-mode (`.org`)**: Outlining, hierarchical task tracking (`TODO`/`DONE`), properties, tags, and `#+TITLE:` / `#+FILETAGS:` directives.
2. **Typst (`.typ`)**: Modern, high-performance typesetting and mathematical authoring with `#set`, `#let`, labels `<label>`, and `@references`.
3. **AsciiDoc (`.adoc`, `.asciidoc`)**: Enterprise technical documentation with `= Title`, `== Section`, admonitions (`[NOTE]`, `[TIP]`), and attributes (`:tags:`).

### Constraints & Non-Negotiables
- **Zero File Mutation or Reformatting**: Files remain plain text on disk. Never normalize or rewrite syntax on open. Preserve BOM, line endings (LF/CRLF), and syntax byte-for-byte on atomic save.
- **Cross-Format Bidirectional Wikilinks**: Wikilinks (`[[target]]`) work transparently across all supported formats without requiring explicit extension if unique, or with explicit extension for disambiguation.
- **Zero Unvetted External Dependencies**: Do not bundle heavy, complex external language grammars; leverage `@codemirror/language`'s built-in `StreamLanguage.define` and lightweight TypeScript tokenizers.
- **Universal Knowledge Graph & Index**: All formats must participate identically in search, backlink discovery, and knowledge graph visualization with unified `NoteIndexEntry` metadata.

---

## Decision

### 1. Unified `FormatPlugin` Interface (`src/shared/formats/`)
We established an extensible `FormatPlugin` interface in `src/shared/formats/types.ts`:
```ts
export type NoteFormatId = 'markdown' | 'org' | 'typst' | 'asciidoc';

export interface FormatPlugin {
  readonly id: NoteFormatId;
  readonly name: string;
  readonly extensions: string[];
  readonly defaultExtension: string;
  readonly contentType: string;
  readonly badgeLabel: string;
  readonly iconName: 'file-text' | 'list-todo' | 'file-code' | 'cpu';
  parseMetadata: (content: string, filePath: string) => FormatMetadata;
}
```
Every format supplies a pure `parseMetadata(content, filePath)` function that extracts:
- `title`: Extracted from `#+TITLE:`, `#set document(title: "...")`, `= Title`, or `# Heading` fallback.
- `headings`: Standardized hierarchy with level numbers, titles, and slugs.
- `blocks`: Block identifiers (Org custom IDs, Typst `<labels>`, AsciiDoc `[#anchors]` / `[[anchors]]`, Markdown `^block`).
- `links`: Outgoing links (Wikilinks, Typst `@refs`, AsciiDoc `xref:`, Org `[[target][desc]]`).
- `tags`: Clean, normalized tag strings (`['planning', 'dev']`).
- `aliases`: Recognized aliases from frontmatter or Org `#+ROAM_ALIAS:` / `#+ALIAS:`.

### 2. Format Registry & File Extension Routing (`src/shared/formats/registry.ts`)
- `FormatRegistry` provides O(1) extension mapping across `.md`, `.org`, `.typ`, `.adoc`, and `.asciidoc`.
- `getFormatPlugin(filePath)` returns the appropriate plugin (defaulting to Markdown).
- `isSupportedNotePath(filePath)` replaces hardcoded `.md` checks throughout vault scanning, file tree filtering, and note creation.
- `stripNoteExtension(filePath)` strips any supported extension cleanly for note titles and linking.

### 3. Cross-Format Link Resolution (`src/shared/linking/resolver.ts`)
`resolveWikilink` was generalized to support multi-format targets:
1. Target without extension (e.g. `[[cairn-roadmap]]`) matches across all supported extensions (`cairn-roadmap.org`, `cairn-roadmap.typ`, `cairn-roadmap.adoc`, `cairn-roadmap.md`).
2. If multiple candidates exist across formats without explicit extension, Markdown (`.md`) is prioritized.
3. Sibling proximity in the same folder takes precedence for disambiguation.
4. Explicit extensions (e.g. `[[quantum-state-collapse.typ]]`) resolve directly.

### 4. Dynamic CodeMirror 6 Syntax Modes (`src/renderer/components/editor/languages/`)
Using `@codemirror/language`'s `StreamLanguage.define`:
- **`org.ts`**: Tokenizes Org headings `*`, tags `:tag:`, states `TODO`/`DONE`, checkboxes `[ ]`/`[X]`, directives `#+...:`, and code blocks.
- **`typst.ts`**: Tokenizes Typst headings `=`, mathematical expressions `$ ... $`, labels `<...>`, references `@...`, and directives `#set`, `#let`, `#show`.
- **`asciidoc.ts`**: Tokenizes AsciiDoc headings `=`, attributes `:...:`, admonitions `[NOTE]`, anchors `[#...]`, and cross-refs `xref:`.
- **Dynamic Extensions**: `getLanguageExtensionsForPath(activeNotePath)` dynamically supplies the right syntax mode to CodeMirror 6. For Markdown, it keeps the full rich Markdown parser and Live Preview decorations.

### 5. UI Integration & Visual Badges
- **StatusBar**: Displays active note format badge (`MD`, `ORG`, `TYP`, `ADOC`) with tooltip and accent styling.
- **FileTree**: Displays clean stripped note titles, format badges for non-markdown notes, and allows creating notes with custom extensions (`experiment.typ`).
- **Graph View**: Populates `format` property on `GraphNode`, displaying format pill badges in node hover tooltips.

---

## Consequences

### Positive
- **Extensible Format Ecosystem**: New text formats can be introduced simply by implementing `FormatPlugin` without touching main process IPC or UI plumbing.
- **Zero Bundler Overhead**: Zero external dependencies added; built entirely with native TypeScript tokenizers and `@codemirror/language`'s stream mode.
- **True Obsidian Compatibility**: Obsidian-style wikilinking, alias matching, and shortest-path resolution function identically across format boundaries.
- **Cross-Platform Safe**: Preserves CRLF/LF line endings and UTF-8 BOM on atomic write regardless of format.

### Negative / Trade-offs
- Live Preview decorations currently focus on Markdown; non-markdown formats utilize high-contrast CodeMirror 6 stream syntax highlighting.
