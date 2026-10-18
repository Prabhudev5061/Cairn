# PHASE 3: Linking and Index (Wikilinks, Backlinks, Shortest Path Resolution, Tags, Search)

## Context
Phase 1 (Walking skeleton: file tree, watcher, safe atomic I/O, tabs) and Phase 2 (Live-preview editor, KaTeX, autocomplete, Vim mode) are complete and tested.
Read `AGENTS.md`, `GEMINI.md`, `PROGRESS.md`, `.agents/rules/*`, `.agents/workflows/*`, and `docs/06-UI-DESIGN-BRIEF.md`.
All work must maintain strict Obsidian compatibility, cross-platform parity (Windows and Linux), Electron security, and zero file corruption.

## Goal
Implement the core hyperlinking and indexing system of Cairn: Obsidian-compatible wikilinks (`[[target]]`, `[[target|alias]]`, `[[target#heading]]`, `[[target#^block]]`, `![[embed]]`), case-insensitive shortest-unique-path resolution, YAML frontmatter aliases and tags, reactive in-memory index cached in `.cairn/`, click-to-navigate links in live preview, wikilink autocomplete, live backlinks panel in the right sidebar, vault full-text search in the activity rail, and link refactoring when notes are renamed.

## Tasks

1. **Obsidian Link Resolution Contract (`src/shared/linking/`)**
   - Implement pure parser for wikilinks and embeds:
     - `[[note]]`, `[[note|alias]]`, `[[note#heading]]`, `[[note#^block]]`, `![[image.png]]`, `![[note]]`.
   - Implement heading slugification matching Obsidian anchor resolution.
   - Implement YAML frontmatter extraction (parsing `aliases: [...]`, `tags: [...]`).
   - Implement tag extraction (`#tag`, nested `#parent/child`, ignoring `#` inside code blocks/math).
   - Implement link resolution algorithm:
     - Case-insensitive matching (Obsidian behavior, handling Linux case-sensitive filesystems gracefully).
     - Shortest unique path resolution: matches note by filename regardless of folder depth unless ambiguous, in which case path prefixes disambiguate.
     - Extension handling: defaults to `.md` if omitted; preserves media extensions for embeds.

2. **Reactive Vault Indexer (`src/main/indexer/`)**
   - Build a high-performance in-memory index service:
     - Tracks notes, frontmatter aliases, headings, block IDs, outgoing links, incoming backlinks, and tags.
     - Disposable cache stored in `<vault>/.cairn/index.json`. Rebuilt automatically if missing, corrupted, or on initial vault open.
     - Incremental re-indexing: hooks into `@parcel/watcher` events from `src/main/vault/watcher.ts`. When a single file changes, only that file's tokens and link graph edges are re-computed.
   - Fast full-text and metadata search engine over indexed notes and headings.

3. **IPC Channels for Linking, Backlinks, and Search (`src/shared/ipc.ts`)**
   - Channels:
     - `index:get-backlinks`: returns all incoming references to a given note with surrounding context snippets.
     - `index:search`: query search across note titles, aliases, headings, and note contents.
     - `index:get-graph-data`: returns nodes and edges (also establishes data contract for Phase 4 Graph View).
     - `vault:rename-note-refactor`: renames a note and updates all incoming `[[old-name]]` wikilinks across other notes in the vault atomically without altering formatting or unknown syntax.
   - Expose methods typed in `src/preload/index.ts` and handle them in `src/main/index.ts`.

4. **Live-Preview Wikilink Decorator & Navigation (`src/renderer/components/editor/`)**
   - CodeMirror extension for wikilinks:
     - Conceals brackets `[[...]]` and displays clean styled link label (or alias) when cursor is outside.
     - Distinguishes unresolved / broken links with muted styling.
     - Reveals raw `[[target|alias]]` text when the caret moves onto the link.
     - `Mod+Click` (and `Enter` in Vim normal mode) navigates to the target note, opening it in an editor tab.
     - If the target note does not exist yet, prompts or automatically creates `target.md` and opens it.
   - Autocomplete enhancements:
     - Typing `[[` triggers fuzzy note suggestions (with alias and folder badges).
     - Typing `[[note#` triggers heading suggestions.
     - Typing `#` on a new word triggers vault tag suggestions.

5. **Right Panel: Backlinks & References (`src/renderer/components/sidebar/BacklinksPanel.tsx`)**
   - Replace the right panel placeholder with a reactive **Backlinks** inspector.
   - Displays:
     - Linked mentions: notes containing explicit `[[wikilinks]]` to the active note, grouped by note with line snippets.
     - Unlinked mentions: notes mentioning the note title or aliases without brackets.
   - Clicking any mention opens that note and scrolls to / selects the reference line.

6. **Activity Rail: Search Panel (`src/renderer/components/sidebar/SearchPanel.tsx`)**
   - Enable the Search icon in the Activity Rail to toggle between File Tree and Search View.
   - Search input with keyboard navigation (`Up`/`Down`/`Enter`) and instant debounce.
   - Results show matching note title, path, match count, and line snippets with highlighted matches.

7. **Link Refactoring on Rename**
   - When a note is renamed in the file tree or command palette, query the index for incoming links.
   - Safely update `[[old]]` -> `[[new]]` in all referencing files using atomic file writes (`src/main/vault/io.ts`), preserving line endings (LF/CRLF) and BOM byte-for-byte.

8. **Tests & Verification**
   - Unit tests:
     - Link parsing, heading anchors, block IDs, and alias extraction.
     - Case-insensitive shortest unique path resolution algorithm.
     - Incremental index updates on file change/delete.
     - Link refactoring text transformations.
   - Playwright E2E tests:
     - Open note with `[[nested-note]]`, click link to navigate to nested note tab.
     - Autocomplete `[[` and select note from popup.
     - Verify Backlinks panel displays incoming references with snippets.
     - Search vault for keyword, click result to open note.
     - Rename note and verify link in referencing note updates.

9. **ADR & Documentation**
   - Author `docs/adr/0003-linking-and-index.md`.
   - Update `PROGRESS.md` with new features, status, dependencies, and test metrics.

## Constraints
- **Obsidian compatibility**: Never reformat files. Preserve line endings (CRLF/LF) and BOM byte-for-byte. Shortest-unique-path matching must match Obsidian's exact behavior.
- **Renderer isolation**: Renderer never reads or writes disk directly. All index queries and note modifications flow through typed IPC to the main process.
- **Cross-platform**: Paths stored internally are vault-relative with forward slashes. Link resolution must be case-insensitive on both Linux (case-sensitive fs) and Windows (NTFS).
- **Security**: No `eval`, no remote resources, strict CSP compliance.

## Acceptance
- `[[note]]` and `[[note|alias]]` resolve correctly across different folders using shortest unique path.
- In the live preview editor, wikilinks render as clean links when unfocused and reveal source on focus.
- `Mod+Click` navigates to target note. If missing, creating the note works.
- Typing `[[` suggests vault notes.
- Right panel Backlinks view displays all incoming mentions with snippets.
- Renaming a note updates incoming `[[links]]` across the vault without corrupting non-link text.
- `pnpm check` (typecheck + lint + unit tests) passes with 0 errors.
- `pnpm test:e2e` passes with 0 errors.

## Deliver
1. Implementation plan with ordered execution steps.
2. Verified implementation code in `src/shared/`, `src/main/`, `src/renderer/`, and tests in `tests/`.
3. Architecture decision record `docs/adr/0003-linking-and-index.md`.
4. Updated `PROGRESS.md`.
