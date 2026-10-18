# Cairn 🏔️

> **A keyboard-first, Obsidian-compatible, local-first markdown note-taking desktop app** with live preview, LaTeX math, Vim bindings, wikilinks, dynamic graph visualization, and multi-format document support.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux-lightgrey.svg)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb)](https://react.dev/)
[![Electron](https://img.shields.io/badge/Electron-44-47848F)](https://www.electronjs.org/)
[![Tests](https://img.shields.io/badge/tests-147%20passed%20%7C%2010%20e2e-brightgreen)](tests/)

---

## 🌟 Why Cairn?

Cairn is engineered around three uncompromising tenets:
1. **Your Files Are Sovereign**: Your notes are plain text on your local disk. No proprietary databases, no vendor lock-in. You own your data forever.
2. **Obsidian Compatibility**: Drop Cairn into any Obsidian vault—it reads wikilinks, headings, blocks, embeds, tags, frontmatter, and callouts seamlessly. It never writes to `.obsidian/` and never reformats your files on open.
3. **Speed & Ergonomics**: Dense, distraction-free "creative tool" feel. Everything is reachable by keyboard. Sub-second cold startup, 0% CPU idle usage, and zero lag typing.

---

## ✨ Features at a Glance

### ✍️ Live Preview & LaTeX Math
- **Hybrid WYSIWYG**: Headings, lists, blockquotes, callouts, tasks, and marks render inline while remaining instantly editable.
- **KaTeX Mathematics**: Inline math `$E = mc^2$` and display math `$$\int_0^\infty e^{-x^2} dx$$` rendered with an intelligent LRU memoization cache for lag-free scrolling.
- **Vim Mode**: Optional full modal vim keybindings powered by `@replit/codemirror-vim`.

### 🕸️ Interactive Knowledge Graph
- **Global Graph View (`Mod+G`)**: Dynamic, physics-driven force graph visualizing note connections and orphaned ideas.
- **Local Graph & Backlinks**: Inspect 1-hop and 2-hop neighborhoods in the dockable right panel.
- **Performance Optimized**: Simulation automatically sleeps when forces stabilize, consuming **0% CPU at idle**.

### 📄 Multi-Format Document Support
- Beyond standard Markdown, Cairn natively supports and parses:
  - **Org-Mode (`.org`)**: `* Headings`, `#+TITLE:`, `[[link]]`
  - **Typst (`.typ`)**: `= Headings`, `#let` blocks, `[markup]`
  - **AsciiDoc (`.adoc`)**: `= Document Titles`, `xref:link[]`, `*bold*`
- Cross-format linking: Link seamlessly between `.md`, `.org`, `.typ`, and `.adoc` notes!

### ⚡ Command Palette & Productivity
- **Command Palette (`Mod+P` / `F1`)**: Search and execute any application action with keyboard navigation.
- **Daily Notes (`Mod+Shift+D`)**: Instant jump or creation of today's journal note with automatic date formatting (`YYYY-MM-DD.md`).
- **Template System (`Mod+T`)**: Insert customizable templates with variable expansion (`{{title}}`, `{{date}}`, `{{time}}`, `{{datetime}}`).
- **Light & Dark Theme (`Mod+Shift+T`)**: Seamless theme switching with system OS preference detection.

### 📤 Standalone Export
- **Export to HTML (`Mod+Shift+H`)**: Single-file, standalone HTML document with embedded CSS and rendered KaTeX formulas—shareable with anyone without dependencies.
- **Export to Markdown (`Mod+Shift+M`)**: Clean export preserving YAML frontmatter and formatting.

### ☁️ Cloud Vault Sync
- Connect to Google Drive to synchronize notes across devices while retaining local files as the source of truth.

---

## ⌨️ Essential Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| <kbd>Mod</kbd> + <kbd>P</kbd> or <kbd>F1</kbd> | Open Command Palette |
| <kbd>Mod</kbd> + <kbd>O</kbd> | Open Folder as Vault |
| <kbd>Mod</kbd> + <kbd>Shift</kbd> + <kbd>O</kbd> | Switch Recent Vault |
| <kbd>Mod</kbd> + <kbd>S</kbd> | Save Active Note |
| <kbd>Mod</kbd> + <kbd>B</kbd> | Toggle Left Sidebar |
| <kbd>Mod</kbd> + <kbd>Shift</kbd> + <kbd>B</kbd> | Toggle Right Panel (Backlinks / Local Graph) |
| <kbd>Mod</kbd> + <kbd>G</kbd> | Toggle Global Knowledge Graph |
| <kbd>Mod</kbd> + <kbd>Shift</kbd> + <kbd>D</kbd> | Open or Create Today's Daily Note |
| <kbd>Mod</kbd> + <kbd>T</kbd> | Insert Note Template |
| <kbd>Mod</kbd> + <kbd>Shift</kbd> + <kbd>T</kbd> | Toggle Light / Dark Theme |
| <kbd>Mod</kbd> + <kbd>Shift</kbd> + <kbd>V</kbd> | Toggle Vim Keybindings |
| <kbd>Mod</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd> | Open Cloud Sync Modal |
| <kbd>Mod</kbd> + <kbd>Shift</kbd> + <kbd>H</kbd> | Export Active Note to Standalone HTML |

*(Note: <kbd>Mod</kbd> corresponds to <kbd>Ctrl</kbd> on Windows & Linux)*

---

## 🤖 Built for Vibe Coding & AI Pair Programming

Cairn was built from its very first commit using **spec-driven AI pair programming**. 

If you are a **vibe coder** using tools like **Google Antigravity, Cursor, Claude Code, GitHub Copilot, or Aider**, Cairn was literally made for you:

1. **AI Instruction Manual**: [AGENTS.md](file:///d:/Note-taking%20app/cairn/AGENTS.md) contains all architecture rules, strict non-negotiables, IPC protocols, and coding conventions. Whenever you open an AI session, just say:
   > *"Read AGENTS.md before planning or modifying code."*
2. **Phase Prompts**: Look at [`prompts/`](file:///d:/Note-taking%20app/cairn/prompts/) to see how every major feature was planned, constrained, and delivered with measurable acceptance criteria.
3. **Rigorous Test Suite**: Never guess if your AI broke something. A single command verifies the entire codebase:
   ```bash
   pnpm check     # Typecheck + Lint + 147 Unit Tests
   pnpm test:e2e  # 10 Playwright Electron Integration Specs
   ```

Want to contribute a feature? Check out [CONTRIBUTING.md](file:///d:/Note-taking%20app/cairn/CONTRIBUTING.md) to get started!

---

## 🛠️ Architecture & Tech Stack

```
src/
├── main/       # Electron Main: Vault service, file watcher, safe IPC handlers, export
├── preload/    # Electron Preload: Isolated contextBridge typed API
├── renderer/   # React 19 UI: CodeMirror 6, Force Graph, Zustand stores, tokens
└── shared/     # Pure shared logic: Path resolvers, template expanders, IPC contracts
```

- **Frontend**: React 19, TypeScript strict mode, Zustand
- **Editor**: CodeMirror 6, `@replit/codemirror-vim`, Lezer parser
- **Math**: KaTeX (LRU memoized)
- **Visualization**: `force-graph` (HTML5 Canvas)
- **Filesystem**: `@parcel/watcher` (C++ inotify / Windows ReadDirectoryChangesW)
- **Bundler**: `electron-vite` (Rollup vendor code-splitting)
- **Packaging**: `electron-builder` (NSIS, AppImage, deb)

---

## 💻 Local Development

### Requirements
- **Node.js**: `v24.x` (see `.nvmrc`)
- **pnpm**: `v11.x`

### Setup
```bash
# Clone the repository
git clone https://github.com/your-username/cairn.git
cd cairn

# Install dependencies
pnpm install

# Run the app in development mode
pnpm dev

# Run all checks (typecheck, lint, unit tests)
pnpm check

# Run end-to-end integration tests
pnpm test:e2e

# Build production installers
pnpm dist
```

---

## 📄 License

Cairn is open-source software licensed under the [MIT License](LICENSE).
