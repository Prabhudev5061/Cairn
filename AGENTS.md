# Cairn: Agent & Contributor Guide (canonical, shared by all agents & vibe coders)

Cairn is a keyboard-first, Obsidian-compatible markdown note-taking desktop app
with live preview, LaTeX math, vim bindings, wikilinks, dynamic graph view, cloud sync, and offline-first performance.
Targets: **Windows and Linux are both first-class.** macOS is not a goal.

## 👥 Collaboration Roles
- **AI Pair Programmer (Antigravity / Claude / Cursor / Copilot)**: Autonomous planner & builder. Reads this file. Plans, authors prompts in `prompts/`, follows non-negotiables, and builds high-quality code.
- **The Human (Owner / Vibe Coder)**: Product visionary, architecture reviewer, and tester. Final say on scope, aesthetic taste, and feature acceptance.

## 🛠️ Stack (Approved Architecture)
- **Runtime**: Electron + electron-vite (Node 24, pnpm 11)
- **Frontend**: React 19 + TypeScript (strict mode + `noUncheckedIndexedAccess`)
- **Editor**: CodeMirror 6 (+ `@replit/codemirror-vim` + custom live preview syntax decorations)
- **Math**: KaTeX (with 500-entry LRU memoization cache)
- **State**: Zustand (modular reactive stores)
- **Visualization**: `force-graph` (2D Canvas with 0% idle CPU loop)
- **Filesystem & Watcher**: `@parcel/watcher` (event-driven, inotify-tolerant)
- **Packaging**: `electron-builder` (NSIS installer for Windows, AppImage & deb for Linux)
- **Testing**: Vitest (unit tests) + Playwright (Electron end-to-end integration tests)

## ⚡ Canonical Commands
| Task | Command | Description |
|---|---|---|
| Dev | `pnpm dev` | Launch Electron app with Hot Module Replacement |
| Build | `pnpm build` | Compile main, preload, and code-split renderer bundles |
| Typecheck | `pnpm typecheck` | Strict TypeScript check across node and web targets |
| Lint | `pnpm lint` | ESLint verification (0 warnings permitted) |
| Unit tests | `pnpm test` | Run Vitest unit suite |
| E2E tests | `pnpm test:e2e` | Run complete Playwright Electron integration specs |
| Check All | `pnpm check` | Typecheck + Lint + Unit tests (mandatory before commit) |
| Package Dist | `pnpm dist` | Build production installer and executable packages |

## 📁 Source Layout
```
src/
├── main/         # Electron main process (vault service, watcher, export, menus, security)
├── preload/      # Minimal typed contextBridge API contract. No business logic here.
├── renderer/     # React UI (components, editor, commands, modals, stores, styles)
│   ├── commands/ # Keyboard command registry and shortcuts
│   ├── components/
│   │   ├── editor/   # CodeMirror editor, live preview decorations, math widgets
│   │   ├── graph/    # Global and local dynamic interactive graph views
│   │   ├── modal/    # Command palette, vault switcher, templates, cloud sync
│   │   └── shell/    # App layout, statusbar, file tree, backlinks
│   ├── stores/       # Zustand stores (vault, layout, theme, sync, dailyNotes)
│   └── styles/       # Design tokens (dark & light theme variables, typography)
├── shared/       # Pure functions, template expander, typed IPC contracts (ipc.ts)
tests/
├── fixtures/     # Sample vaults, markdown files with CRLF/BOM/wikilinks/LaTeX
├── unit/         # Vitest unit test suites
└── e2e/          # Playwright Electron integration specs
docs/             # Architecture, decisions (adr/), setup guides, UI design brief
prompts/          # Phased feature prompts (PHASE-1 through PHASE-7)
```

## 🛡️ Non-Negotiables (Zero-Tolerance Rules)
1. **Files are the source of truth.** Notes are plain text `.md` on disk. Cache and index live strictly in `<vault>/.cairn/`.
2. **Obsidian compatible.** Never write to or tamper with `.obsidian/`. Never reformat, normalize, or corrupt a user's note on open. Preserve line endings (LF/CRLF), BOM, YAML frontmatter, and unknown syntax byte-for-byte unless explicitly edited.
3. **Renderer never touches the filesystem.** All disk access goes through strictly typed IPC channels declared in `src/shared/ipc.ts`.
4. **Untrusted renderer paths.** Main process resolves every path with `resolveInsideVault` and rejects path traversal, symlink escapes, Windows reserved device names (`CON`, `PRN`, `AUX`, `NUL`, `COM1-9`, `LPT1-9`), and normalizes Unicode to NFC.
5. **Cross-platform from line one.** Linux and Windows are co-equal tier-1 targets. Internal paths use vault-relative forward slashes. Case-insensitive link resolution matches Obsidian on case-sensitive filesystems.
6. **No new dependency without justification.** Document one-line rationale in `PROGRESS.md` before adding packages.
7. **Strict Scope Control.** Build strictly what the active prompt specifies. Extra ideas go to `PROGRESS.md` under "Ideas", never speculative feature creep.

## 🎯 Obsidian Compatibility Contract
Cairn natively parses and renders:
- Wikilinks: `[[note]]`, `[[note|alias]]`, `[[note#heading]]`, `[[note#^block]]`, `![[embed]]`
- Syntax: Tags (`#tag`), YAML Frontmatter (`---`), Callouts (`> [!note]`), Highlights (`==text==`), Comments (`%%text%%`), Tasks (`- [ ]` / `- [x]`)
- Math: `$inline$` and `$$display$$` LaTeX math formulas rendered with KaTeX
- Formats: Extended support for Org-mode (`.org`), Typst (`.typ`), and AsciiDoc (`.adoc`)

## 🤖 Vibe Coding & Agent Workflow
Every phase and major feature adheres to the standard 3-step loop:

### 1. Plan & Prompt Mode
- Read `AGENTS.md`, `PROGRESS.md`, and relevant architecture docs in `docs/`.
- Author or refine the prompt in `prompts/PHASE-N.md` (Context, Goal, Tasks, Constraints, Acceptance Criteria).
- Present an implementation plan: files to touch, execution order, tests, and potential risks.

### 2. Builder Mode
- Work in verifiable, atomic increments.
- Run `pnpm check` regularly. Always fix root causes; never silence compiler or linter errors.
- Return typed result objects `{ ok: true, value } | { ok: false, error }` across IPC boundaries instead of throwing uncaught exceptions.
- Zero dead code or unhandled debug logs.

### 3. Verification & Definition of Done
Follow `.agents/workflows/finish-task.md`:
1. `pnpm check` (typecheck + lint + 147+ unit tests) passes 100% locally.
2. `pnpm test:e2e` (all 10+ Playwright Electron specs) passes 100%.
3. `PROGRESS.md` updated with completed items, next steps, and assumptions.
4. Final report delivered with concise summary, key files touched, and how to verify.

