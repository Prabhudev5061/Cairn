---
title: Project Cairn Architecture
aliases: [Cairn System Design, Cairn Architecture]
tags: [project/cairn, architecture, typescript, electron]
---

# Project Cairn Architecture

Cairn is built around a secure multi-process Electron foundation where markdown files on disk remain the absolute source of truth.

## Architectural Layers

1. **Main Process (`src/main/`)**:
   - Manages atomic file operations via `safeWriteNote`.
   - Runs the reactive in-memory indexer (`VaultIndexer`).
   - Hooks into `@parcel/watcher` with 100ms debouncing.
2. **Preload Layer (`src/preload/`)**:
   - Sandboxed `contextBridge` exposing strictly typed IPC methods.
3. **Renderer Process (`src/renderer/`)**:
   - React 19 UI with CodeMirror 6 editor engine.
   - Live Preview decorations via `livePreviewPlugin`.
   - KaTeX math formula rendering via `MathWidget`.
   - Autocomplete provider and modal Vim keybindings.

## Knowledge Graph & Search Integration

Incoming links are indexed automatically. The system routes graph queries through the [[Central Research Hub]].

Core stress test tokens:
- High-frequency index keyword: `NEURAL-NEXUS`
- Apex hub alias: `ALPHA-OMEGA-CORE`

Related references:
- [[Vim Keybinding Engine]]
- [[Guides/Obsidian Migration Guide]]
- [[Research/Graph Theory and Network Topologies]]
