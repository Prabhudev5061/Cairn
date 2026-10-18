# PROGRESS

## Status
| Phase | Title | Status |
|---|---|---|
| 0 | Foundation | done |
| 1 | Walking skeleton | done |
| 2 | Live-preview editor, LaTeX, autocomplete, vim | done |
| 2.5 | Comprehensive live preview (callouts, code blocks, tables, tags, images) | done |
| 3 | Linking and index | done |
| 3.5 | Vault switcher save system & responsive backlinks | done |
| 4 | Graph view | done |
| 5 | Other formats | done |
| 5.5 | Multi-format live preview & cross-format linking | done |
| 6 | Cloud vault sync: Google Drive integration | done |
| 7 | Polish and release of Cairn 0.1.0 (package, release, GitHub repo) | done |

## Done
- **Phase 0: Foundation**:

  - Scaffolding with electron-vite, React 19, and TypeScript (`strict: true`, `noUncheckedIndexedAccess: true`).
  - Configured Node 24 across `.nvmrc`, `engines`, and CI.
  - Set up quality toolchain: ESLint (flat config), Prettier, Vitest, Playwright (`pnpm check`, `pnpm test:e2e`).
  - Security per `.agents/rules/electron-security.md`: `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, `webSecurity: true`, strict CSP, blocked in-app navigation and `window.open`.
  - Linux Wayland/X11 switch: `--ozone-platform-hint=auto` conditionally passed on Linux.
  - GitHub Actions CI workflow in `.github/workflows/ci.yml` testing both `windows-latest` and `ubuntu-latest`.
- **Phase 1: Walking Skeleton**:
  - Design tokens in `src/renderer/styles/tokens.css` per UI brief (surfaces, text hierarchy, accent, semantic states, 4px grid, radii, borders, fonts).
  - Global styles in `src/renderer/styles/global.css` importing bundled Inter and JetBrains Mono, dark scrollbars, focus rings, and reduced motion queries.
  - Safe atomic note I/O in `src/main/vault/io.ts`: write to `.cairn-tmp-*` -> atomic rename, byte-for-byte CRLF vs LF detection and preservation, UTF-8 BOM detection and preservation, no-op write skipping (`written: false`), and safe deletion via `shell.trashItem`.
  - Vault path containment and symlink escape rejection in `src/main/vault/paths.ts` using `path.resolve` and `fs.realpathSync`.
  - Recursive directory scanner in `src/main/vault/tree.ts` ignoring `.obsidian`, `.cairn`, `.git`, `node_modules`, dotfiles, with natural sorting (folders first).
  - Cross-platform file watcher in `src/main/vault/watcher.ts` using `@parcel/watcher` with 100ms debounce, active write self-suppression, and inotify limit alert forwarding.
  - App settings persistence in `src/main/config/settings.ts` storing last opened vault in `userData/settings.json` and auto-restoring on launch.
  - Typed IPC contracts and channels in `src/shared/ipc.ts` and `src/shared/types.ts` for vault opening, tree listing, note CRUD, and push events (`vault:switched`, `vault:watch-event`, `vault:watch-alert`).
  - Preload bridge exposed in `src/preload/index.ts` via typed `contextBridge.exposeInMainWorld('cairn', api)`.
  - Command registry in `src/renderer/commands/registry.ts` with global keyboard shortcut dispatcher (`Mod+O`, `Mod+S`, `Mod+B`, `Mod+Shift+B`).
  - Zustand stores in `src/renderer/stores/vaultStore.ts` and `src/renderer/stores/layoutStore.ts` for reactive tree, note editing, dirty tracking, conflict notice banners, and layout sizing.
  - CodeMirror 6 markdown editor in `src/renderer/components/editor/CodeMirrorEditor.tsx` with CSS tokens dark theme, line wrapping, 1s debounce autosave, and Ctrl+S immediate save.
  - AppLayout shell in `src/renderer/components/shell/AppLayout.tsx` with resizable panels (`react-resizable-panels`), titlebar, activity rail, note tab bar, conflict notice banner, and status bar.
  - File tree in `src/renderer/components/sidebar/FileTree.tsx` with keyboard navigation, active note selection, and file action buttons (New Note, Rename, Delete).
  - Status bar in `src/renderer/components/statusbar/StatusBar.tsx` showing dirty state, word count, cursor Ln/Col, vault name, EOL/BOM format, and watcher alerts.
  - Comprehensive fixtures in `tests/fixtures/vault/` (`welcome.md`, `crlf-note.md`, `bom-note.md`, `unicode-日本語-café.md`, `CaseNote.md`, `subfolder/nested-note.md`, `.obsidian/app.json`, `.cairn/cache`).
  - Unit test suite (30 passing tests) in `tests/unit/vault-io.test.ts`, `tests/unit/vault-tree.test.ts`, and `tests/unit/paths.test.ts`.
  - Playwright E2E suite (2 passing tests) in `tests/e2e/walking-skeleton.spec.ts` and `tests/e2e/smoke.spec.ts` executing end-to-end on an isolated temporary copy of the fixture vault.
- **Phase 1.1: Dev Mode Renderer Fix**:
  - Fixed white screen issue when running `pnpm dev`: Vite's React Fast Refresh plugin injects an inline preamble script which was blocked by the Electron dev CSP header.
  - Allowed `'unsafe-inline'` for `script-src` specifically in dev mode (`!app.isPackaged` / `isDev`) across `src/main/index.ts` and `electron.vite.config.ts`, while maintaining strict `script-src 'self'` in production builds.
- **Phase 2: Live-preview editor, LaTeX, autocomplete, vim bindings**:
  - CodeMirror 6 live-preview decoration engine in `src/renderer/components/editor/livePreview/`:
    - Syntax decoration ViewPlugin concealing markdown markers (headings, bold, italics, inline code, blockquotes, horizontal rules, task lists, strikethrough, highlights) when the cursor is away.
    - Cursor entry reveals raw syntax byte-for-byte; cursor exit restores visually styled formatting with zero file mutation.
    - Interactive task list checkbox toggle widgets (`CheckboxWidget`) and thematic break divider widgets (`HorizontalRuleWidget`).
  - Typography-grade KaTeX mathematical formula rendering in `src/renderer/components/editor/math/`:
    - Robust parser detecting inline (`$...$`) and display (`$$...$$`) math formulas with escaped delimiter protection (`\$`).
    - Atomic `MathWidget` rendering via `katex.renderToString` (`throwOnError: false`, zero unsanitized HTML).
    - Bundled KaTeX webfonts with `font-src 'self' data:` CSP rules.
    - Click-to-edit interactions positioning the caret inside raw LaTeX for immediate formula editing.
  - Context-aware autocomplete provider in `src/renderer/components/editor/autocomplete/`:
    - LaTeX math symbol and operator completion inside math delimiters.
    - Obsidian callout type completions (`> [!note]`, `[!warning]`, etc.).
    - Markdown snippets (`table`, `codeblock`, `task`, `$$`).
    - Keybindings registered with `Prec.lowest` to avoid intercepting Vim mode escape sequences.
  - Vim modal editing integration in `src/renderer/components/editor/vim/`:
    - Modal bindings powered by `@replit/codemirror-vim` managed via dynamic CodeMirror Compartment.
    - Custom Ex commands `:w`, `:q`, `:wq`, and `:x` wired directly to vault note storage and tab closure.
    - Real-time status bar badge displaying active Vim mode (`NORMAL`, `INSERT`, `VISUAL`, `REPLACE`).
    - Toggle shortcut `Mod+Shift+V` registered in command registry and shell.
  - Architecture decision record in `docs/adr/0002-live-preview-and-katex.md`.
  - Fixed editor layout scaling in windowed fullscreen: removed `maxWidth: 70ch` and `margin: 0 auto` from `.cm-content` in `src/renderer/components/editor/CodeMirrorEditor.tsx` so editor text remains left-aligned with gutters and fluidly wraps across full pane width.
  - Comprehensive unit test suite (52 passing tests) and Playwright Electron E2E test suite (3 passing specs: `editor-phase2.spec.ts`, `smoke.spec.ts`, `walking-skeleton.spec.ts`).
- **Phase 3: Linking and index (wikilinks, backlinks, shortest path resolution, tags, search)**:
  - Obsidian-compatible linking parser and resolver in `src/shared/linking/`:
    - Pure functions in `parser.ts` parsing `[[note]]`, `[[note|alias]]`, `[[note#heading]]`, `[[note#^block]]`, `![[embed]]`, YAML frontmatter `aliases` and `tags`, and inline `#tags`.
    - Obsidian anchor slugification in `slugifyHeading` (lowercase, punctuation stripped, whitespace normalized to single hyphens).
    - Case-insensitive shortest unique path resolution in `resolver.ts` matching exact paths, bare filenames, and prefix-disambiguated paths across directories.
    - Link refactoring in `refactor.ts` safely updating targets in referencing notes from highest string offset to lowest without corrupting non-link text.
  - Reactive in-memory index service in `src/main/indexer/indexer.ts`:
    - Maintains in-memory indexed notes, frontmatter aliases, headings, block IDs, outgoing links, reverse backlinks, and searchable text.
    - Disposable cache serialized to `<vault>/.cairn/index.json`, automatically rebuilt when missing or corrupted.
    - Incremental re-indexing wired to `@parcel/watcher` events so file edits update only affected nodes in sub-millisecond time.
    - Vault full-text and metadata search engine with line numbers, snippets, and match counting.
  - Typed IPC channels in `src/shared/ipc.ts`, `src/preload/index.ts`, and `src/main/ipc/vault.ts`:
    - Added `index:get-backlinks`, `index:search`, `index:get-graph-data`, `index:get-all-entries`, and `vault:rename-note-refactor`.
  - CodeMirror 6 Live Preview Wikilink decorator & navigation in `src/renderer/components/editor/livePreview/`:
    - `WikilinkWidget` renders clean clickable link or alias label when cursor is away.
    - Overlap detection reveals raw `[[target|alias]]` source code byte-for-byte on cursor entry.
    - Click navigation dispatches `cairn:navigate-link` to open the target note in a tab or create a new note if non-existent.
    - CodeMirror autocomplete provider enhanced with `[[` note and alias completions and `[[note#` heading anchor completions.
  - Right panel Backlinks view in `src/renderer/components/sidebar/BacklinksPanel.tsx`:
    - Displays incoming references to the active note grouped by source file with line numbers and snippets.
    - Clicking a reference opens the note and scrolls to the occurrence.
  - Activity Rail Search panel in `src/renderer/components/sidebar/SearchPanel.tsx`:
    - Fast full-text search tab toggled via the Activity Rail search icon.
    - Displays matching notes, match counts, file paths, and clickable context snippets with keyboard navigation support.
  - Architecture decision record in `docs/adr/0003-linking-and-index.md`.
  - Fixed multiline math `RangeError` and black screen crash: CodeMirror 6 `ViewPlugin` forbids replacement decorations that span across line breaks. Converted `livePreviewPlugin` to a CodeMirror `StateField` provided directly via `EditorView.decorations.from(f)`, allowing multiline KaTeX display formulas and block widgets to render without error.
  - Added React `ErrorBoundary` in `src/renderer/components/common/ErrorBoundary.tsx` wrapping the application root and the note editor, guaranteeing the UI never unmounts to a black screen if an unexpected error occurs.
  - **Live Preview Enhancements and Bug Fixes**:
    - **Horizontal Rule below text**: Fixed Lezer markdown AST parsing discrepancy where `---` placed directly below a line of text (`text\n---`) is parsed as `SetextHeading2` rather than `HorizontalRule`. Relocated horizontal rule decoration to the line scanner with regex `/^\s{0,3}(?:(?:\*\s*){3,}|(?:-\s*){3,}|(?:_\s*){3,})$/`, rendering a visual divider line (`<hr class="cairn-hr" />`) regardless of preceding empty lines.
    - **Interactive click-to-edit for horizontal rules**: Enhanced `HorizontalRuleWidget` to record line coordinates and handle `mousedown`, focusing the editor at the exact line offset to reveal raw `---` markup on click.
    - **Frontmatter Fence & AST Traversal Protection**: Added document-start YAML frontmatter boundary detection (`frontmatterStart` & `frontmatterEnd`), supporting frontmatter optionally preceded by whitespace or empty lines. Resolved a critical bug where `node.from < frontmatterEnd` previously returned `false` on the root AST `Document` node (which starts at offset 0), prematurely aborting Lezer AST traversal and causing headings and formatting to not render. Lines within frontmatter receive `.cm-frontmatter-line` styling and are shielded from falsely converting into `<hr>` divider widgets or evaluating wikilinks/math.
    - **Code Block Shielding**: Introduced AST-aware `isInsideCode` helper traversing node ancestors to skip math formula (`$...$`) and wikilink (`[[...]]`) widget replacements inside `FencedCode`, `CodeBlock`, and `InlineCode`.
    - **Multi-line Callouts**: Unified callout line class (`cm-callout-line`) across all lines of multi-line Obsidian callouts (`> [!note]`).
    - **Inline Code Caret Styling**: Retained `cm-inline-code` styling while backticks are revealed when the cursor is positioned inside inline code.
- **Phase 2.5: Comprehensive Live Preview Markdown & Syntax Matrix**:
  - Authored governing specification and sub-phase breakdown in `prompts/PHASE-2.5-LIVE-PREVIEW-COMPREHENSIVE.md`.
  - **Sub-Phase A (Obsidian Callouts & Quotes)**:
    - Implemented `CalloutHeaderWidget` and `CALLOUT_ICONS` across 10 canonical types (`note`, `tip`, `warning`, `danger`, `success`, `question`, `quote`, `todo`, `example`, `bug`) in `src/renderer/components/editor/livePreview/widgets.ts`.
    - Line 1 renders colored SVG icon, normalized capitalized title, and click-to-edit caret repositioning.
    - Subsequent lines decorated with `.cm-callout-line .cm-callout-${type}` featuring colored left accent border and subtle tinted background.
  - **Sub-Phase B (Tags, Comments, Math & Typographic Markup)**:
    - Interactive tag pills (`#tag` and `#parent/subtag`) with `.cairn-tag-pill` styling and hover effects.
    - Obsidian comment concealment (`%%comment%%`) hidden when unfocused, faint italic when focused.
    - Subscript (`~text~`) and superscript (`^text^`) inline formatting with hidden delimiters when unfocused.
  - **Sub-Phase C (Multi-Language Fenced Code Blocks & Copy Button)**:
    - Integrated `@codemirror/language-data` providing syntax highlighting for 143 programming languages in fenced code blocks.
    - Implemented `CodeBlockHeaderWidget` displaying language badge (e.g., `TS`, `PY`, `RUST`, `BASH`, `JSON`) and one-click "Copy" button that calls `navigator.clipboard.writeText(...)` and displays "Copied!" with check icon.
    - Opening and closing fence lines gracefully hidden/formatted when browsing, revealed on cursor entry.
  - **Sub-Phase D (GFM Tables & Image Embeds)**:
    - Integrated `@lezer/markdown` table parser extensions (`Table`, `TableHeader`, `TableDelimiter`, `TableRow`).
    - Styled table lines (`.cm-table-line`, `.cm-table-header-line`, `.cm-table-delimiter-line`) with monospace alignment and clean borders.
    - Implemented `ImageEmbedWidget` for `![alt](url)` and image wikilinks `![[image.png]]` with width constraints and error fallback card.
    - Implemented `TableWidget` in `src/renderer/components/editor/livePreview/tableWidget.ts` rendering GFM markdown tables with column alignments (left, center, right), formatted cell content, clean header dividers, and click-to-edit row targeting.
    - Implemented `FrontmatterWidget` in `src/renderer/components/editor/livePreview/frontmatterWidget.ts` rendering YAML frontmatter as a structured two-column metadata card with bullet list array formatting (matching VS Code / Obsidian properties preview), revealing raw YAML on cursor entry or click.
  - Comprehensive unit test suite (85 passing tests across 8 suites) and Playwright Electron E2E test suite (4 passing specs: `linking-phase3.spec.ts`, `editor-phase2.spec.ts`, `smoke.spec.ts`, `walking-skeleton.spec.ts`).
- **Phase 3.5: Vault Switcher Save System & Responsive Backlinks**:
  - **Multi-Vault Save System & History Persistence**:
    - Defined `RecentVault` interface (`path`, `name`, `lastOpened`) and extended `AppSettings` in `src/shared/types.ts`.
    - Pure, cross-environment utilities in `src/shared/recentVaults.ts`: `recordRecentVault`, `removeRecentVaultEntry`, `isSameVaultPath`, `formatRelativeTime`, and `detectIsWindows` (100% sandboxed, zero Node `process` or `path` runtime dependency in renderer).
    - Main process updates `recentVaults` in `userData/settings.json` upon vault switch, deduplicating paths (case-insensitive on Windows, exact on Linux) and capping history to 10 entries.
    - Added `vault:remove-recent` IPC channel to prune removed or missing vaults from settings.
  - **Vault Switcher Modal (`src/renderer/components/modal/VaultSwitcherModal.tsx`)**:
    - Accessible dark-mode dialog with backdrop blur, adhering to `tokens.css` design system.
    - Real-time search/filter input to filter recent vaults by name or path.
    - Displays vault folder icon, name, full path with text truncation, "Current" badge, and relative timestamps ("Just now", "Xm ago", "Xh ago", "Yesterday", or formatted date).
    - Quick remove button (`X`) per vault entry with focus management.
    - Direct "Open Folder from Disk..." native dialog fallback.
    - Full keyboard accessibility: global `Escape` close, `ArrowUp`/`ArrowDown` item navigation, `Enter` selection.
  - **Multi-Entry Triggers & Welcome Screen**:
    - Titlebar vault name tag (`data-testid="titlebar-vault-switcher"`) and dedicated switch folder button (`data-testid="titlebar-switch-vault-btn"`).
    - Status bar vault name button (`data-testid="status-vault-path"`).
    - File tree header switch button (`data-testid="filetree-switch-vault"`).
    - Welcome screen recent vaults card list with immediate one-click launch when opening without an active vault.
    - Global keyboard shortcut `Mod+Shift+O` registered in command registry.
  - **Responsive Backlinks Panel (`src/renderer/components/sidebar/BacklinksPanel.tsx`)**:
    - Pure grouping utility `groupBacklinks` in `src/shared/linking/grouping.ts` organizing references by source note file, sorted alphabetically with nested occurrences sorted by line number.
    - Collapsible file group headers with chevrons, note icons, reference count badges, and preserved `data-testid="backlink-item-${sourceTitle}"` for test compatibility.
    - Reference list with tree guide lines (`border-left: 2px solid var(--border-muted)`), line number badges (`L{line}`), anchor pills (`#{subpath}`), and multi-line clamped context snippets.
    - Resolved panel resize indentation bug by applying `min-width: 0` constraints to all flex parents and children, enabling fluid text truncation and word-wrapping when the right panel is resized down to 180px without horizontal overflow.
  - **Responsive Files Panel (`src/renderer/components/sidebar/FileTree.tsx`)**:
    - Implemented `IndentGuides` rendering vertical guide lines (`position: absolute; left: 8 + i * 14 + 6px; width: 1px; background-color: var(--border-subtle)`) for deeply nested folders and notes, eliminating bulky padding.
    - Applied `min-width: 0`, `overflow-x: hidden`, `width: 100%`, and `box-sizing: border-box` across `TreeNodeItem` containers, folder/file rows, `<nav>`, and `<div role="tree">` so the file panel resizes down smoothly without horizontal overflow.
    - Implemented text truncation (`text-overflow: ellipsis; white-space: nowrap; overflow: hidden`) and `min-width: 0` on folder and note titles, preventing long file names from stretching or pushing action buttons off-screen.
    - Added `flex-shrink: 0` on chevron, folder/file icons, and action buttons (`Edit2`, `Trash2`).
  - **Verification**:
    - 7 new unit tests in `tests/unit/vault-switcher.test.ts` (92 total unit tests passing).
    - New end-to-end specification in `tests/e2e/vault-switcher-phase35.spec.ts` testing modal display, search filtering, vault switching, removal, backlink navigation, and file tree responsive nesting with indent guides (5 total E2E test specs passing).
- **Phase 4: Graph View (Global & Local Interactive Force-Directed Graph)**:
  - **Graph Data Contract & Subgraph Extraction (`src/shared/linking/`)**:
    - Enhanced `GraphNode` in `src/shared/linking/types.ts` with `path`, `tags`, `degree`, `isOrphan`, `val`, and simulation coordinates (`x`, `y`, `vx`, `vy`, `fx`, `fy`).
    - Enhanced `GraphLink` supporting both string IDs and simulation node object references.
    - Updated `getGraphData()` in `src/main/indexer/indexer.ts` computing accurate degrees and deduplicating directed edge pairs.
    - Pure, cross-environment graph utilities in `src/shared/linking/graph.ts`:
      - `filterGraph(data, filters)`: filters nodes by search query, selected tags, folder prefixes, and orphan state (`degree === 0`), returning an induced subgraph with valid edges.
      - `extractLocalSubgraph(data, rootPath, depth)`: breadth-first search (BFS) extracting connected neighbor network up to depth 1, 2, or 3 hops.
      - `assignNodeColors(nodes)`: deterministic HSL/hex color palette matching `tokens.css` dark-first theme based on primary tag or top-level folder.
  - **Graph Store & State Management (`src/renderer/stores/graphStore.ts`)**:
    - Zustand store tracking raw graph data, search query, selected tags, folder filters, orphan suppression, label toggle, node size multiplier, link distance, and local graph depth.
    - Extended `useLayoutStore` with `activeCenterView` (`'editor' | 'graph'`), `activeRightTab` (`'backlinks' | 'localGraph'`), `toggleGlobalGraph`, and tab switchers.
  - **Core Force-Directed Canvas Component (`src/renderer/components/graph/ForceGraphCanvas.tsx`)**:
    - 2D HTML5 Canvas rendering powered by `force-graph`:
      - HiDPI/Retina display scaling support with `window.devicePixelRatio`.
      - Dark theme aesthetics adhering to `tokens.css`: background `#0e0f12`, accent borders, dimmed non-connected nodes/links (`opacity: 0.15`).
      - Physics lifecycle & CPU optimization: configured with `cooldownTicks: 200`, `cooldownTime: 4000`, and `autoPauseRedraw: true`. Window blur/focus listeners pause/resume animation frames to guarantee 0% idle CPU at rest.
      - Smooth zoom & pan, node dragging with physics pinning/release, floating node hover tooltip (title, path, connection count, tags), and click-to-open note navigation.
      - Built-in floating zoom controls (+, -, Fit).
      - Responsive auto-resize powered by `ResizeObserver`.
  - **Global Graph View (`src/renderer/components/graph/GlobalGraphView.tsx`)**:
    - Full-view canvas with top stats bar and floating translucent HUD filter controls overlay.
    - Instant text search input filtering nodes by title or tag.
    - Dynamic tag filter pills populated from all indexed vault tags.
    - Orphan notes toggle (Hide / Visible) and text label visibility toggle (On / Off).
    - Node size multiplier (0.5x - 2.5x) and link distance (25px - 120px) physics sliders.
    - Dedicated Activity Rail Graph icon button (`data-testid="activity-rail-graph"`).
    - Global keyboard shortcut `Mod+G` registered in `commandRegistry` to toggle between editor and graph view.
  - **Local Graph Inspector (`src/renderer/components/sidebar/LocalGraphPanel.tsx`)**:
    - Embedded in the right panel with depth selector buttons (1, 2, 3 hops) dynamically centered on `activeNotePath`.
    - Tab switcher in right panel header toggling between Backlinks (`data-testid="right-panel-tab-backlinks"`) and Local Graph (`data-testid="right-panel-tab-graph"`).
    - Empty state placeholder ("Open a note to view its local graph") when no note is selected.
    - Clicking any neighbor note navigates to that note and updates the local graph.
  - **Architecture Decision Record**:
    - Documented canvas rendering choice, 0% idle CPU physics cooldown strategy, and state architecture in `docs/adr/0004-graph-view.md`.
  - **Performance Optimization & Node Sizing Refinement (`src/renderer/components/graph/ForceGraphCanvas.tsx`)**:
    - Replaced linear radius scaling with sublinear square-root scaling (`2.2px + Math.min(5.0, Math.sqrt(degree - 1) * 1.1)`), preventing high-degree hubs from growing into giant overlapping blobs while preserving crisp 2px-3.5px standard nodes.
    - Added smart Level-of-Detail (LOD) label rendering: active note, hovered note, and direct neighbors always display labels, while general nodes render labels when zoomed in (`globalScale >= 0.75`), eliminating label clutter and text collision soup in compact sidebars.
    - Eliminated hot-loop `ctx.save()` / `ctx.restore()` overhead on every node; implemented CSS font declaration caching.
    - Replaced template string allocations in edge rendering with zero-allocation `O(1)` source/target equality checks.
    - Pre-computed adjacency lookup map for instant hover calculations and throttled hover state propagation.
    - Added `warmupTicks(30)` and tuned `cooldownTicks(100)` with `d3AlphaDecay(0.03)` so graphs load near resting equilibrium and reach 0% idle CPU much faster without sluggish drift.
  - **Verification**:
    - 15 new unit tests in `tests/unit/graph.test.ts` (107 total unit tests passing).
    - New Playwright Electron E2E specification in `tests/e2e/graph-phase4.spec.ts` testing global graph view, HUD filters, zoom controls, Mod+G keyboard toggle, and right-panel local graph tab (6 total E2E test specs passing).
- **Phase 5: Other Formats via FormatPlugin (Org-mode, Typst, AsciiDoc)**:
  - **Core Architecture (`src/shared/formats/`)**:
    - Defined `FormatPlugin`, `FormatMetadata`, and `NoteFormatId` interfaces in `src/shared/formats/types.ts`.
    - Implemented `format-markdown.ts`, `format-org.ts`, `format-typst.ts`, and `format-asciidoc.ts` extracting document titles, hierarchical headings, block anchors, tags, aliases, and outgoing links.
    - Implemented `FormatRegistry` in `src/shared/formats/registry.ts` with O(1) extension mapping (`.md`, `.org`, `.typ`, `.adoc`, `.asciidoc`), `getFormatPlugin`, `isSupportedNotePath`, and `stripNoteExtension`.
  - **Cross-Format Wikilinks & Indexer**:
    - Generalized `resolveWikilink` in `src/shared/linking/resolver.ts` to resolve links across all format boundaries (`[[cairn-roadmap]]` resolves to `Projects/cairn-roadmap.org`).
    - Extended `VaultIndexer` in `src/main/indexer/indexer.ts` to scan all supported formats, extracting metadata and attaching `format` to `NoteIndexEntry` and `GraphNode`.
  - **CodeMirror 6 Stream Languages (`src/renderer/components/editor/languages/`)**:
    - Implemented `org.ts` tokenizing headings, TODO/DONE states, checkboxes, tags, and `#+...:` directives.
    - Implemented `typst.ts` tokenizing headings, math `$ ... $`, labels `<...>`, references `@...`, and directives `#set`/`#let`.
    - Implemented `asciidoc.ts` tokenizing headings, attributes `:...:`, admonitions `[NOTE]`, anchors `[#...]`, and cross-refs `xref:`.
    - Connected `getLanguageExtensionsForPath` to dynamically switch editor language modes in `CodeMirrorEditor.tsx` based on active note path.
  - **UI Integration & Polish**:
    - `StatusBar.tsx`: Rendered active note format badge (`MD`, `ORG`, `TYP`, `ADOC`) with custom tooltips.
    - `FileTree.tsx`: Displayed clean note titles via `stripNoteExtension`, format badges for non-markdown notes, and format-aware note creation (`createNote('benchmarks.typ')`).
    - `ForceGraphCanvas.tsx`: Rendered format badges in node hover tooltips.
  - **Vault Fixtures**:
    - Created realistic test fixtures in `tests/fixtures/vault/`: `Projects/cairn-roadmap.org`, `Research/quantum-state-collapse.typ`, and `Guides/asciidoc-specification.adoc`.
  - **Architecture & Verification**:
    - Authored ADR 0005 in `docs/adr/0005-format-plugin-architecture.md`.
    - 11 new unit tests in `tests/unit/formats.test.ts` (118 total unit tests passing).
    - New Playwright E2E specification in `tests/e2e/formats-phase5.spec.ts` testing multi-format opening, editing, saving, and creation.
- **Phase 5.5: Multi-Format Live Preview & Cross-Format Linking**:
  - **Widgets & Design System Integration (`src/renderer/components/editor/livePreview/widgets.ts`, `tokens.css`, `global.css`)**:
    - Created `OrgTodoWidget` rendering interactive badges for `TODO` and `DONE` states with distinct accent and muted styles (`.cairn-org-todo`, `.cairn-org-done`).
    - Created `AnchorChipWidget` rendering small subtle anchor chips (`.cairn-anchor-chip`) for Typst `<label>` and AsciiDoc `[#anchor]` targets.
    - Reused `CheckboxWidget`, `WikilinkWidget`, `CalloutHeaderWidget`, and `MathWidget` across all format plugins for complete UI consistency.
  - **Org-Mode Live Preview (`src/renderer/components/editor/livePreview/livePreviewOrg.ts`)**:
    - Built `buildLivePreviewOrgDecorations` concealing leading asterisks (`*`, `**`, `***`) on unfocused heading lines while applying `cm-heading-1..6` line styling.
    - Rendered `TODO` and `DONE` badges replacing raw keywords when not focused.
    - Rendered interactive checkboxes for `- [ ]`, `- [X]`, `- [-]` task items.
    - Rendered `[[target][alias]]` and `[[target]]` links as clickable `WikilinkWidget` chips.
    - Concealed inline styling delimiters for `*bold*`, `/italic/`, `~code~`, and `=verbatim=`.
  - **Typst Live Preview (`src/renderer/components/editor/livePreview/livePreviewTypst.ts`)**:
    - Concealed leading equals signs (`=`, `==`) on unfocused headings.
    - Rendered inline `$math$` and display `$\nmath\n$` formulas using KaTeX `MathWidget`.
    - Rendered anchor labels `<sec-label>` using `AnchorChipWidget`.
    - Rendered cross-references `@sec-label` and native `[[target]]` wikilinks as clickable `WikilinkWidget` elements.
    - Concealed inline formatting delimiters for `*bold*` and `_italic_`.
  - **AsciiDoc Live Preview (`src/renderer/components/editor/livePreview/livePreviewAsciidoc.ts`)**:
    - Concealed leading equals signs (`=`, `==`, `===`) on unfocused section headings.
    - Rendered block admonitions (`[NOTE]`, `[TIP]`, `[WARNING]`, `[CAUTION]`, `[IMPORTANT]`) and inline admonitions (`NOTE:`) as callout boxes with themed borders and Lucide icons via `CalloutHeaderWidget`.
    - Rendered anchor labels `[#anchor-id]` via `AnchorChipWidget`.
    - Rendered `xref:target#subpath[alias]` and `<<anchor,alias>>` as clickable `WikilinkWidget` chips.
    - Concealed inline formatting delimiters for `*bold*`, `_italic_`, and `` `code` ``.
  - **Language Extensions Dispatcher (`src/renderer/components/editor/languages/index.ts`)**:
    - Exported `getLanguageExtensionsForFormat` and `getLanguageExtensionsForPath` returning combined stream language syntax and live preview StateFields for each note format.
  - **Seamless Cross-Format Linking**:
    - All link widgets dispatch `cairn:navigate-link` with `{ target, subpath, subpathType }`.
    - `vaultStore.openNoteByLink` invokes `resolveWikilink()` across all indexed format paths (`.md`, `.org`, `.typ`, `.adoc`, `.asciidoc`), allowing effortless navigation loops across formats.
  - **Verification**:
    - 6 new unit tests in `tests/unit/live-preview-formats.test.ts` (124 total unit tests passing).
    - New Playwright E2E specification in `tests/e2e/live-preview-formats.spec.ts` testing Org TODO/DONE and checkboxes, navigation from Org to Markdown, opening AsciiDoc callouts, clicking xref to Typst, rendering KaTeX math, and returning to Org (8 total E2E test specs passing, 100% green).
- **Phase 6: Cloud Vault Sync: Google Drive Integration**:
  - **OAuth 2.0 PKCE & Secure Storage (`src/main/sync/oauth.ts`, `tokenStore.ts`)**:
    - Implemented RFC 7636 PKCE generating SHA-256 base64url challenge and ephemeral loopback server on `127.0.0.1` dynamic port to receive authorization code.
    - Scoped strictly to least-privilege `https://www.googleapis.com/auth/drive.file email`, accessing only files created/opened by Cairn.
    - Encrypted refresh tokens using Electron's native `safeStorage` (DPAPI/Keychain/Secret Service), stored in `userData/settings.json`.
  - **Lightweight Google Drive Client (`src/main/sync/googleDriveClient.ts`)**:
    - Zero heavy external SDK bloat: built directly using Node `fetch` with exponential backoff on HTTP 429 and 5xx errors.
    - Included `MockGoogleDriveClient` for deterministic offline testing and headless CI runs.
  - **Two-Way Incremental Reconciliation Engine (`src/main/sync/syncEngine.ts`, `syncState.ts`)**:
    - Per-vault sync cache stored at `<vault>/.cairn/sync-state.json`.
    - Recursively scans local vault notes across all formats (`.md`, `.org`, `.typ`, `.adoc`) and queries remote Google Drive vault folder.
    - Non-destructive conflict resolution: concurrent edits keep local version intact while preserving remote copy as `<filename> (conflict <YYYY-MM-DD-HHmmss>).<ext>` with zero data loss.
    - Downloaded notes written atomically via `.cairn-tmp-*` -> rename, preserving CRLF/LF line endings and UTF-8 BOM byte-for-byte.
  - **Typed IPC & UI Integration (`src/shared/ipc.ts`, `src/preload/`, `src/renderer/`)**:
    - Added IPC channels: `sync:get-status`, `sync:start-auth`, `sync:disconnect`, `sync:trigger`, `sync:get-settings`, `sync:set-settings`, and `sync:status-changed`.
    - Zustand store in `src/renderer/stores/syncStore.ts` tracking live connection, active syncing, conflicts, and settings.
    - Status bar cloud indicator in `src/renderer/components/statusbar/StatusBar.tsx` displaying live status (`CloudOff`, `CloudCheck` for synced, spinning `RefreshCw` during transfer, and `AlertTriangle` for conflicts).
    - `CloudSyncModal.tsx` providing account connection, "Sync Now" button with summary stats, 5-minute background auto-sync scheduling, and conflict viewer.
    - Registered global shortcut `Mod+Shift+S` to trigger the sync modal.
  - **Architecture & Verification**:
    - Authored ADR 0006 in `docs/adr/0006-cloud-vault-sync-google-drive.md`.
    - 12 new unit tests in `tests/unit/sync.test.ts` (136 total unit tests passing).
    - New Playwright E2E specification in `tests/e2e/sync-phase6.spec.ts` testing indicator interaction, mock Drive authentication, synchronization, and disconnect (9 total E2E test specs passing, 100% green).
- **Phase 7: Polish & Release of Cairn 0.1.0 Milestone**:
  - **Security Hardening**:
    - Locked down WebContents permissions (`setPermissionRequestHandler` / `setPermissionCheckHandler` denying all device permissions, camera, microphone, geolocation, screen capture).
    - Safe external protocol opener (`safeOpenExternal`) allowlisting `https:` and `mailto:`, blocking script navigation.
    - Path safety validation in `src/main/vault/paths.ts` rejecting Windows reserved device names (`CON`, `PRN`, `AUX`, `NUL`, `COM1-9`, `LPT1-9`) and normalizing all paths to Unicode NFC.
  - **Performance & Bundle Optimization**:
    - Implemented Rollup `manualChunks` in `electron.vite.config.ts` splitting `@codemirror`, `katex`, `force-graph`, and `react`, reducing main renderer bundle by ~88% (from 2.48MB to 288KB).
    - Implemented bounded 500-entry LRU KaTeX formula render cache (`renderKatexMemoized`) eliminating redundant parse cycles during fast scrolling/typing.
    - 0% idle CPU loop verified on Graph View.
    - Production console cleanup stripping non-error console statements in production builds.
  - **Light & Dark Theme System**:
    - Complete token system for `[data-theme="light"]` in `src/renderer/styles/tokens.css` with surface, border, and text tokens.
    - `useThemeStore` managing theme preferences, persistence, and dynamic OS scheme detection.
    - Registered command `theme:toggle` (`Mod+Shift+T`) and titlebar quick-action button.
  - **Command Palette**:
    - Implemented `CommandPaletteModal.tsx` triggered by `Mod+P` or `F1` with category tagging, search filtering, and full keyboard navigation.
  - **Note Templates & Daily Notes**:
    - Implemented `expandTemplate` in `src/shared/templates/expander.ts` with variable expansion (`{{title}}`, `{{date}}`, `{{time}}`, `{{datetime}}`, `{{date:FORMAT}}`, custom vars).
    - Starter templates (Daily Note, Meeting Note, Project Plan) and `TemplatePickerModal.tsx` (`Mod+T`).
    - Daily notes manager in `src/renderer/stores/dailyNotes.ts` (`Mod+Shift+D`, `openPreviousDailyNote`, `openNextDailyNote`, and titlebar button).
  - **Standalone Note Export**:
    - Implemented `src/main/export/exporter.ts` for standalone HTML export (embedded KaTeX math, tables, code blocks, clean CSS) and clean Markdown export.
    - IPC channels `EXPORT_HTML` and `EXPORT_MARKDOWN` registered in main, preload, and renderer.
  - **Packaging & GitHub Assets**:
    - Configured `electron-builder.yml` for Windows (NSIS installer) and Linux (AppImage & deb) with file associations for `.md` and `.markdown`.
    - Generated application icon assets in `build/icon.svg` and `build/icon.png`.
    - Added distribution build scripts (`pnpm dist`, `pnpm dist:win`, `pnpm dist:linux`).
    - Consolidated `GEMINI.md` workflow into universal `AGENTS.md`.
    - Authored `CONTRIBUTING.md` tailored for human developers and AI vibe coders.
    - Authored production `README.md` with badges, features overview, shortcuts cheatsheet, and dedicated "Vibe Coding with AI Pair Programming" guide.
    - Created `LICENSE` (MIT) and `.github/workflows/release.yml`.
  - **Full Green Test Verification**:
    - 11 new unit tests in `tests/unit/phase7.test.ts` (147 total unit tests passing).
    - New Playwright E2E specification in `tests/e2e/phase7.spec.ts` (10 total E2E test specs passing, 100% green).

## Next
Wait for user testing and explicit approval before any git push or public release.

## Assumptions
- Host environment has Node 24.19.0 on Windows; project standardized on Node 24 across `.nvmrc`, `package.json` engines, and CI.
- `packageManager` is set to `pnpm@11.28.6`. In pnpm 11, native module `@parcel/watcher` is approved via `allowBuilds` in `pnpm-workspace.yaml`.
- Preload script is bundled as CommonJS (`out/preload/index.cjs`) so Electron's sandboxed renderer can execute it without ES module syntax errors.
- On Windows NTFS, case is preserved but two files differing only by case in the same folder overwrite without per-directory NTFS case-sensitivity flags; case-insensitivity and case-preservation are tested accordingly, with fixture vault using `CaseNote.md`.
- Content-Security-Policy updated in `src/main/index.ts` and `electron.vite.config.ts` to include `font-src 'self' data:` and `style-src 'self' 'unsafe-inline'` for `@fontsource/*` webfonts, KaTeX fallback fonts, and CodeMirror 6 dynamic style injection.

## Known issues
(none)

## Dependencies added (with one-line justification)
- `react`: Approved UI framework for note renderer and UI components.
- `react-dom`: React DOM renderer for mounting components in the browser window.
- `electron`: Core desktop runtime for running the application.
- `electron-vite`: Approved fast build tool and bundler for Electron main, preload, and renderer.
- `vite`: Underlying Vite bundler powering electron-vite.
- `@vitejs/plugin-react`: Vite plugin providing React Fast Refresh and JSX transformation.
- `typescript`: Type checking and TypeScript language compiler.
- `@types/node`: Node.js type definitions for Electron main, preload, and tooling.
- `@types/react`: Type definitions for React.
- `@types/react-dom`: Type definitions for React DOM.
- `eslint`: Linter for catching code style and correctness issues.
- `@eslint/js`: ESLint recommended JavaScript rules.
- `typescript-eslint`: TypeScript AST parser and lint rules for ESLint.
- `eslint-plugin-react-hooks`: Enforces React rules of hooks.
- `eslint-plugin-react-refresh`: Validates React components for Fast Refresh.
- `prettier`: Code formatter ensuring consistent formatting per `.editorconfig`.
- `vitest`: Unit test framework for fast execution of shared and main logic tests.
- `@playwright/test`: End-to-end testing tool for launching Electron and asserting UI behavior.
- `@parcel/watcher`: Approved cross-platform native file watcher for reactive vault tree and conflict detection.
- `zustand`: Approved lightweight state management for vault, layout, and command store.
- `lucide-react`: Approved icon set for file tree, status bar, and shell buttons.
- `react-resizable-panels`: Accessible, keyboard-navigable split panel library for collapsible sidebars.
- `@codemirror/state`: CodeMirror 6 editor state, transactions, and selection management.
- `@codemirror/view`: CodeMirror 6 editor DOM view and display component.
- `@codemirror/commands`: CodeMirror 6 standard editing and history commands.
- `@codemirror/lang-markdown`: CodeMirror 6 markdown language parser and syntax support.
- `@fontsource/inter`: Bundled UI sans font ensuring identical rendering across Windows and Linux.
- `@fontsource/jetbrains-mono`: Bundled editor monospace font ensuring identical code rendering across Windows and Linux.
- `@codemirror/language`: CodeMirror 6 syntax tree inspection, Lezer AST iteration, and syntax highlighting hooks.
- `@codemirror/autocomplete`: Context-aware autocompletion provider and tooltip display engine.
- `katex`: Fast, secure, typography-grade math typesetting library for mathematical formulas.
- `@types/katex`: TypeScript definitions for KaTeX configuration and rendering functions.
- `@replit/codemirror-vim`: Full-featured Vim modal editing bindings and Ex command execution for CodeMirror 6.
- `@codemirror/language-data`: Official CodeMirror language registry providing syntax highlighting for 143 programming languages in fenced code blocks.
- `@lezer/markdown`: Official Lezer Markdown parser extensions (GFM, Table, TaskList) for CodeMirror 6 live preview.
- `force-graph`: Approved high-performance HTML5 2D canvas force-directed graph library for Phase 4 Graph View.
- `electron-builder`: Standard desktop application packaging tool producing Windows (NSIS installer) and Linux (AppImage & deb) distribution packages.

## Ideas (not in scope)
(none)

## Tested on
| OS | Last verified | Artifacts Verified |
|---|---|---|
| Windows 11 | 2026-10-18 (`pnpm check` 147 unit tests, `pnpm test:e2e` 10 specs, 0 warnings) | `dist/Cairn Setup 0.1.0.exe` (123.9 MB), `win-unpacked` |
| Linux (Local + CI) | 2026-10-18 (`dist/cairn-0.1.0.tar.gz` 135.3 MB, `linux-unpacked`, CI `.github/workflows/release.yml`) | AppImage, deb, tar.gz |
| Ubuntu (CI) | Configured in `.github/workflows/ci.yml` & `.github/workflows/release.yml` | Full cross-platform verification |

## Release Artifacts
- **Windows Installer**: `dist/Cairn Setup 0.1.0.exe`
- **Linux Distribution**: `dist/cairn-0.1.0.tar.gz` & `dist/linux-unpacked`
- **Graph Optimization**: Real-time canvas repaint on node size slider adjustments (`ForceGraphCanvas.tsx`).

