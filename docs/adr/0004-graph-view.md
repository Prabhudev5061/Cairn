# ADR 0004: Interactive Force-Directed Graph View (Global & Local), Physics Cooldown, and Subgraph Filtering

## Status
Accepted

## Context
A core capability of Cairn is navigating notes as a linked knowledge graph. Users need both:
1. **Global Graph View**: A full workspace canvas displaying all notes and connections across the vault, allowing high-level topology exploration, tag filtering, folder scoping, orphan suppression, and search highlighting.
2. **Local Graph Inspector**: A focused panel in the right sidebar displaying the immediate neighbor network of the currently active note up to 1–3 degrees of separation.

### Constraints & Requirements
- **Performance & 0% Idle CPU**: Desktop note-taking apps must not drain laptop battery. The graph simulation must settle and stop rendering completely once layout equilibrium is reached, without running continuous `requestAnimationFrame` loops when idle.
- **Aesthetic Consistency**: Dark-first palette matching `tokens.css`, crisp HiDPI typography (Inter), responsive node hover tooltips, and highlighted connection trails.
- **Keyboard-First & Instant Navigation**: Clicking a node immediately opens the note in the editor; `Mod+G` toggles the global view.
- **Security & Sandboxing**: All graph data originates from the main process indexer via typed IPC (`window.cairn.getGraphData()`). Zero direct filesystem access in the renderer.

## Decision

### 1. HTML5 2D Canvas Rendering Engine (`force-graph`)
We selected `force-graph` (approved in `AGENTS.md` stack) for high-performance 2D Canvas rendering:
- **Canvas vs SVG/DOM**: Canvas scales efficiently to thousands of nodes and links with minimal DOM footprint and memory overhead.
- **Custom HiDPI Node & Edge Rendering**: Implemented `nodeCanvasObject` and `nodePointerAreaPaint` to draw crisp circles, white accent rings for selected/hovered nodes, scaled text labels, and hit-testing on the canvas color tracker.
- **Link Highlights & Dimming**: When hovering a node, non-connected nodes and edges are gracefully dimmed (`opacity: 0.15`), while connected links and neighbors are highlighted with accent colors (`var(--accent-primary)`).

### 2. Physics Cooldown & 0% Idle CPU Strategy
To guarantee zero battery drain when idle:
- **`cooldownTicks(200)` and `cooldownTime(4000)`**: The D3 force simulation runs for at most 200 ticks or 4 seconds, then stops.
- **`autoPauseRedraw(true)`**: Once the simulation stops and no pointer interaction is active, redrawing is paused completely.
- **Window Blur/Focus Listeners**: Animation frames are explicitly paused when the application window loses focus (`pauseAnimation()`) and resumed on focus (`resumeAnimation()`).
- **Clean Destruction**: On component unmount, `_destructor()` terminates event listeners and cancels any pending animation frame requests.

### 3. Pure Subgraph Extraction and Filtering (`src/shared/linking/graph.ts`)
Graph algorithms are pure functions implemented in `src/shared/linking/graph.ts` for clean testability across Node.js unit tests and browser environments:
- **`filterGraph(data, filters)`**: Filters nodes by search query, selected tags, folder prefixes, and orphan state (`degree === 0`), returning an induced subgraph with valid edges.
- **`extractLocalSubgraph(data, rootPath, depth)`**: Performs a breadth-first search (BFS) starting from `rootPath` up to `depth` hops (1, 2, or 3), returning only visited nodes and their internal links.
- **`assignNodeColors(nodes)`**: Computes deterministic color assignments based on a hash of the node's primary tag or top-level folder, using a curated dark-mode palette (`GRAPH_PALETTE`).

### 4. Zustand State & Layout Architecture
- **`useGraphStore` (`src/renderer/stores/graphStore.ts`)**: Tracks raw graph data, active filter options, display settings (node size, link distance, text labels), and local graph depth.
- **`useLayoutStore` (`src/renderer/stores/layoutStore.ts`)**:
  - `activeCenterView`: toggles between `'editor'` and `'graph'`.
  - `activeRightTab`: toggles between `'backlinks'` and `'localGraph'`.
- **Keyboard Shortcut (`Mod+G`)**: Registered in `commandRegistry` to toggle between editor and global graph view.

### 5. UI Integration
- **`GlobalGraphView` (`src/renderer/components/graph/GlobalGraphView.tsx`)**: Replaces center editor panel when opened. Features a floating translucent HUD controls card for search, orphan filtering, tag filtering, node sizing, and link distance.
- **`LocalGraphPanel` (`src/renderer/components/sidebar/LocalGraphPanel.tsx`)**: Embedded in the right panel alongside Backlinks with depth selector buttons (1, 2, 3 hops) and empty state placeholders.

## Consequences

### Positive
- **Smooth 60 FPS Performance**: Fast Canvas rendering with responsive interaction even on large vaults.
- **0% Idle CPU**: The app does not consume CPU cycles when nodes reach equilibrium or when the window is blurred.
- **Intuitive Discovery**: Users can spot knowledge clusters, orphans, and central hubs at a glance.
- **Consistent Keyboard Workflow**: Seamless transition between graph navigation and note editing.

### Negative / Trade-offs
- Text labels rendered on canvas do not allow native text selection (mitigated by instant click-to-open and hover tooltips).
