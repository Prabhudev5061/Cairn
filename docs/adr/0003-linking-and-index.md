# ADR 0003: Obsidian-Compatible Linking, In-Memory Indexer, and Live Preview Navigation

## Status
Accepted

## Context
Cairn requires complete Obsidian compatibility for note linking and knowledge retrieval:
1. Wikilinks (`[[target]]`, `[[target|alias]]`, `[[target#heading]]`, `[[target#^block]]`) and embeds (`![[embed]]`) must resolve transparently across directories.
2. Link resolution must follow Obsidian's case-insensitive, shortest-unique-path algorithm, operating consistently across both Windows (NTFS) and Linux (ext4/btrfs).
3. The editor must render wikilinks as clean interactive elements in Live Preview mode when unfocused, expanding to raw source when the cursor enters, and supporting click-to-navigate.
4. Backlinks and full-text search must be fast, reactive, and live-updated as files are edited or created.
5. Renaming a note must automatically refactor incoming wikilinks across the vault without corrupting line endings (CRLF vs LF), BOMs, or formatting.
6. Renderer process security must remain strict: all indexing and file operations stay in the main process, accessed via typed IPC.

## Decision

### 1. Pure Linking Parser and Resolver (`src/shared/linking/`)
We implemented pure, side-effect-free parsing and resolution functions in `src/shared/linking/` shared by main and renderer:
- **`parseWikilink`**: Extracts target, anchor type (heading `#` vs block `^`), anchor text, alias, and embed flag (`!`).
- **`slugifyHeading`**: Standardizes heading text into Obsidian-compatible anchors (lowercase, punctuation stripped, consecutive whitespace collapsed to single hyphens).
- **`resolveWikilink`**:
  - Implements Obsidian's shortest-unique-path strategy: matches exact vault-relative path first, then base filename (case-insensitively), and resolves ambiguous matches via path suffix matching.
  - Automatically appends `.md` when resolving notes, while preserving media extensions (`.png`, `.svg`, etc.) for embeds.
- **`parseNoteContent`**: Extracts YAML frontmatter (`aliases`, `tags`), headings with levels and line numbers, block identifiers (`^block-id`), outgoing wikilinks, and inline `#tags` (ignoring hashes inside code blocks and math delimiters).

### 2. In-Memory Reactive Indexer Service (`src/main/indexer/indexer.ts`)
- **Architecture**: The Electron main process maintains a high-speed in-memory index (`NoteIndexEntry` map and reverse `backlinks` map).
- **Disposable Cache**: The index is serialized to `<vault>/.cairn/index.json`. On startup, the cache is validated against file timestamps (`mtime`). Any missing, corrupted, or stale entries are parsed and cached. The entire `.cairn/` cache is disposable and never modifies user notes.
- **Incremental Updates**: The indexer hooks into `@parcel/watcher` events (`src/main/vault/watcher.ts`). When a single note is modified, only that note's tokens and reverse backlink graph are updated in memory and debounced to disk, achieving sub-millisecond indexing times.
- **Full-Text & Metadata Search**: Built-in substring and regex search over note titles, aliases, headings, and note body lines with context snippet extraction and hit counting.

### 3. Typed IPC Contracts (`src/shared/ipc.ts`)
Added typed IPC channels:
- `index:get-backlinks`: Returns all incoming references to a note with line numbers and snippets.
- `index:search`: Returns search matches with highlight offsets and match counts.
- `index:get-graph-data`: Returns node-link graph data (notes, links, tags) for backlinks and Phase 4 Graph View.
- `index:get-all-entries`: Returns full index snapshot for autocomplete.
- `vault:rename-note-refactor`: Renames a note and atomically updates all incoming wikilinks across referencing files.

### 4. Live Preview Wikilink Decorator & Navigation
- **`WikilinkWidget`**: CodeMirror 6 `WidgetType` replaces `[[target|alias]]` text with a clickable `.cairn-wikilink` element displaying the target or alias label.
- **Cursor Expansion**: Uses `selectionOverlaps` to hide syntax only when the cursor is outside. When the cursor moves into the link range, the widget is removed and raw characters are exposed for direct editing.
- **Click Navigation**: Clicking the widget dispatches a `cairn:navigate-link` DOM event, opening the target note in a tab (or creating it if it does not yet exist).
- **Autocomplete (`cairnCompletionSource`)**: Async CodeMirror autocomplete provider triggered on `[[` (suggesting notes and aliases) and `[[note#` (suggesting headings within the referenced note).

### 5. Atomic Link Refactoring (`src/shared/linking/refactor.ts`)
- When a note is renamed, the indexer finds all incoming references.
- For each referencing note, link targets matching the old path or filename are replaced from highest string offset to lowest (`b.from - a.from`), ensuring byte offsets remain valid.
- Updates are written to disk using `safeWriteNote`, guaranteeing that line endings (CRLF/LF) and UTF-8 BOM are preserved byte-for-byte.

### 6. User Interface Panels
- **Backlinks Panel (`src/renderer/components/sidebar/BacklinksPanel.tsx`)**: Placed in the right sidebar. Reactively displays incoming references grouped by source note with line numbers and surrounding context snippets.
- **Search Panel (`src/renderer/components/sidebar/SearchPanel.tsx`)**: Embedded in the left sidebar with an Activity Rail toggle between File Tree and Search. Supports debounced queries, match counts, and jump-to-line navigation.

## Consequences

### Positive
- **Obsidian Compatibility**: Complete parity with Obsidian link syntax, alias resolution, heading anchors, and case-insensitive matching.
- **Zero File Corruption**: File line endings, BOM, formatting, and non-link text are untouched during editing and rename refactoring.
- **Blazing Performance**: In-memory index provides sub-millisecond search and backlink queries without database locking or external server dependencies.
- **Security**: Strict Electron sandbox and context isolation maintained; renderer never touches the filesystem.

### Negative / Trade-offs
- In-memory index stores note text for search; for extremely large vaults (100,000+ notes), memory footprint may grow, at which point SQLite FTS5 indexer can be introduced as a drop-in replacement without altering the shared IPC contract.
