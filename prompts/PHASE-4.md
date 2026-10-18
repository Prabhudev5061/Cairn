# PHASE 4: Graph View (Global & Local Interactive Force-Directed Graph)

## Context
Phases 0 through 3.5 are complete, tested, and green:
- **Phase 0**: Foundation (electron-vite, React 19, TS strict, ESLint, Playwright, cross-platform CI).
- **Phase 1**: Walking skeleton (safe atomic I/O, `@parcel/watcher`, tree navigation, tabs, layout shell).
- **Phase 2 & 2.5**: Live-preview editor (KaTeX, CodeMirror 6 StateField widgets, Vim mode, callouts, tables, code blocks, frontmatter card).
- **Phase 3**: Linking and indexing (wikilinks, shortest-path resolution, YAML tags/aliases, reactive indexer, backlinks panel, search panel, rename link refactoring).
- **Phase 3.5**: Vault switcher modal, recent vaults persistence, responsive backlinks panel, and responsive file tree with nesting indent guides.

The IPC data contract `index:get-graph-data` is already declared in `src/shared/ipc.ts` and returns `{ nodes, links }`.
`force-graph` is approved in the project stack defined in `AGENTS.md`.

## Goal
Implement a high-performance, keyboard-first interactive Graph View in Cairn consisting of both a **Global Graph View** (full workspace canvas with search, tag filters, orphan toggle, and physics controls) and a **Local Graph Inspector** (in the right panel, showing immediate connected neighbors of the active note up to depth 1–3). The graph renders on an HTML5 2D canvas with smooth force physics, auto-cooldown to 0% idle CPU, node color-coding from `tokens.css`, rich hover tooltips, and instant click-to-open note navigation.

## Tasks

1. **Graph Data Contract & Subgraph Extraction (`src/shared/linking/`)**
   - Enhance `GraphNode` in `src/shared/linking/types.ts`:
     - Add `path: string` (vault-relative path).
     - Add `tags: string[]` (note tags).
     - Add `isOrphan: boolean` (degree === 0).
     - Add `degree: number` (total inbound + outbound links).
   - Update `getGraphData()` in `src/main/indexer/indexer.ts` to populate these enriched properties.
   - Implement pure graph utilities in `src/shared/linking/graph.ts`:
     - `filterGraph(data, filters)`: applies text query, selected tags, folder filters, and orphan toggle.
     - `extractLocalSubgraph(data, rootPath, depth)`: extracts nodes and links within `depth` (1, 2, or 3) hops from `rootPath`.
     - `assignNodeColors(nodes)`: assigns deterministic color accents from `tokens.css` based on top-level folder or primary tag.

2. **Graph Store & State Management (`src/renderer/stores/graphStore.ts`)**
   - Define Zustand graph store tracking:
     - `graphData: GraphData | null`.
     - Filters: `searchQuery: string`, `selectedTags: string[]`, `selectedFolders: string[]`, `hideOrphans: boolean`.
     - Physics settings: `linkDistance: number`, `chargeStrength: number`, `nodeSizeMultiplier: number`.
     - Display options: `showLabels: boolean`, `localGraphDepth: number`.
     - Highlight state: `hoveredNodeId: string | null`, `neighborNodeIds: Set<string>`, `connectedLinkIds: Set<string>`.
     - Fetch action: calls `window.cairn.getGraphData()`, refreshing whenever vault index updates.

3. **Core Interactive Force-Directed Canvas (`src/renderer/components/graph/ForceGraphCanvas.tsx`)**
   - Implement 2D HTML5 Canvas force simulation powered by `force-graph` (or D3 force 2D canvas):
     - HiDPI/Retina display scaling support (`window.devicePixelRatio`).
     - Dark-first aesthetic adhering to `tokens.css`:
       - Background: `var(--bg-app)`.
       - Nodes: `var(--accent-primary)` by default, or color-coded by tag/directory.
       - Edges: `var(--border-subtle)` (0.8px line width).
       - Active/Hovered node: `var(--accent-hover)`, with adjacent edges highlighted at `var(--accent-primary)` (1.5px) and non-connected nodes/links dimmed (`opacity: 0.15`).
       - Labels: rendered below nodes in Inter font (`var(--font-sans)`, `var(--text-secondary)`, fontSize scaled with zoom level).
     - Physics lifecycle & CPU optimization:
       - Configured with `cooldownTicks: 200` and `cooldownTime: 4000` so the force simulation stops running once nodes settle.
       - Simulation pauses when window is blurred or canvas unmounts, guaranteeing 0% idle CPU usage.
     - Interactions:
       - Zoom & Pan: smooth mouse wheel zoom and canvas drag.
       - Node Drag: drag individual nodes with physics pinning/release.
       - Node Hover: cursor turns to pointer, displays interactive floating tooltip with note title, path, connection count, and tags.
       - Node Click: immediately opens the note in an editor tab (`openNote(node.id)`) and closes graph modal if in modal mode.
     - Clean resize handling with `ResizeObserver`.

4. **Global Graph View & Control Toolbar (`src/renderer/components/graph/GlobalGraphView.tsx`)**
   - Full-view canvas with floating HUD controls overlay:
     - **Search filter**: instant debounce text search highlighting matching nodes.
     - **Tag filter**: multi-select tag pills from indexed vault tags.
     - **Orphan toggle**: toggle button to hide/show unconnected notes.
     - **Display controls**: toggle node labels on/off, adjust node sizing and link distance.
     - **Zoom controls**: Zoom In (`+`), Zoom Out (`-`), Center/Fit (`Reset`).
   - Integration points:
     - Activity Rail: add a dedicated **Graph** icon button (`data-testid="activity-rail-graph"`).
     - Global Keyboard Shortcut: register `Mod+G` in `registry.ts` to open or toggle the Global Graph view.
     - Command Palette integration.

5. **Local Graph Inspector (`src/renderer/components/sidebar/LocalGraphPanel.tsx`)**
   - Add a tabbed switcher or collapsible section in the Right Panel:
     - Toggle between **Backlinks** (`data-testid="right-panel-tab-backlinks"`) and **Local Graph** (`data-testid="right-panel-tab-graph"`).
   - Dynamically centers on the active note (`activeNotePath`):
     - Displays the central note with accent highlight and immediate neighbors.
     - Depth selector buttons (`1`, `2`, `3` hops).
     - Clicking any neighbor note switches the active note and re-centers the local graph.
     - Displays empty placeholder ("Open a note to view its local graph") when no note is open.

6. **Unit & E2E Testing**
   - Unit tests (`tests/unit/graph.test.ts`):
     - Filter logic (search query, tag filtering, folder filtering, orphan suppression).
     - Local subgraph extraction algorithm across depth 1, 2, and 3.
     - Node degree and connection counting.
     - Tag-based color mapping determinism.
   - Playwright Electron E2E tests (`tests/e2e/graph-phase4.spec.ts`):
     - Click Activity Rail Graph icon or press `Mod+G` to open the Global Graph view.
     - Verify graph canvas mounts (`data-testid="graph-canvas"`).
     - Test search filter: entering a query filters/highlights nodes.
     - Test orphan toggle: toggling hide orphans updates visible node set.
     - Click a node on canvas: asserts the editor tab opens the clicked note.
     - Open Right Panel Local Graph tab: asserts local graph canvas displays active note and its linked neighbors.

7. **Documentation & Architecture**
   - Author ADR: `docs/adr/0004-graph-view.md` documenting canvas rendering choice, physics cooldown strategy, and state architecture.
   - Update `PROGRESS.md` with completed features, dependencies, test metrics, and status.

## Constraints
- **Stack compliance**: Use `force-graph` as approved in `AGENTS.md`. Do not introduce unapproved third-party libraries.
- **Aesthetics**: Dark-first, dense creative tool feel matching `tokens.css`. Use CSS tokens for all HUD controls and canvas color palettes.
- **Security & Sandboxing**: All graph data queries pass through typed IPC (`window.cairn.getGraphData()`). Zero filesystem access in the renderer.
- **Performance**: Canvas must employ physics cooldown to ensure CPU drops to 0% when the graph reaches equilibrium. No continuous requestAnimationFrame loops when idle.
- **Cross-platform**: Internal node IDs are vault-relative paths with forward slashes (`folder/note.md`).

## Acceptance
- Global Graph displays all notes and links in the vault with interactive force physics.
- Local Graph in the right panel displays the active note and its neighbors at depth 1-3.
- Hovering a node highlights adjacent edges and shows a metadata tooltip.
- Clicking a node navigates directly to that note in the editor.
- Search filter, tag filter, and orphan toggle dynamically update the rendered graph.
- Force simulation cools down and stops, preserving 0% CPU at rest.
- `pnpm check` (typecheck + lint + unit tests) passes with 0 errors.
- `pnpm test:e2e` passes with all specs including `graph-phase4.spec.ts`.

## Deliver
- `prompts/PHASE-4.md`
- `src/shared/linking/graph.ts`
- `src/renderer/stores/graphStore.ts`
- `src/renderer/components/graph/ForceGraphCanvas.tsx`
- `src/renderer/components/graph/GlobalGraphView.tsx`
- `src/renderer/components/sidebar/LocalGraphPanel.tsx`
- `tests/unit/graph.test.ts`
- `tests/e2e/graph-phase4.spec.ts`
- `docs/adr/0004-graph-view.md`
- Updated `PROGRESS.md`
