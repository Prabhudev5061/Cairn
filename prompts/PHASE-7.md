# PHASE 7: Polish, Security Hardening, Optimization & Release of Cairn 0.1.0

## Context
Phases 0 through 6 have established a complete, stable, cross-platform foundation for Cairn:
- **Phase 0 & 1**: Electron + electron-vite scaffolding, context isolation, atomic note I/O, `@parcel/watcher`, resizable panels, and file tree.
- **Phase 2 & 2.5**: CodeMirror 6 live-preview editor, KaTeX math typesetting, Vim modal editing, autocomplete, tables, code highlighting, callouts, and frontmatter.
- **Phase 3 & 3.5**: Obsidian-compatible wikilinks, shortest-path resolver, reactive in-memory indexer, backlinks panel, vault switcher, and full-text search.
- **Phase 4**: Interactive 2D canvas force-directed graph view (global & local) with compact labels, sublinear scaling, and physics cooldown.
- **Phase 5 & 5.5**: Multi-format support (Markdown, Org-mode, Typst, AsciiDoc), format-specific live preview decorators, and cross-format wikilink navigation.
- **Phase 6**: Offline-first two-way Google Drive cloud vault sync with PKCE OAuth 2.0, `safeStorage` credential encryption, non-destructive conflict handling, Google Drive for Desktop zero-setup integration, and live status bar indicator.

All 136 unit tests pass, and all 9 Playwright Electron E2E test suites pass with 100% green coverage. In Phase 7, we bring Cairn to its official **0.1.0 release milestone**: empowering users with high-efficiency productivity features (Command Palette, Themes, Templates, Daily Notes, HTML/Markdown Export), robust security hardening, code and runtime performance optimizations, and production packaging (electron-builder installers for Windows and Linux, GitHub release workflow, and complete open-source documentation).

---

## Goal
Deliver a polished, secure, and optimized production-ready release of Cairn 0.1.0 featuring:
- A fuzzy-searchable Command Palette (`Mod+P`),
- Instant Light/Dark theme switching with accessible low-fatigue tokens,
- Note Templates with date/time variable expansion and Daily Notes (`Mod+Shift+D`),
- Standalone HTML/Markdown document export with embedded math typesetting,
- Comprehensive security hardening (permission lockdown, Windows reserved device name validation, strict protocol sanitization),
- Code and bundle optimizations (Rollup vendor code-splitting, KaTeX formula render cache, 0% idle CPU physics),
- Automated cross-platform electron-builder packaging (NSIS for Windows, AppImage & deb for Linux), and a full open-source GitHub release setup.

---

## Tasks

### 1. Command Palette (`src/renderer/components/modal/CommandPaletteModal.tsx`, `src/renderer/commands/`)
- Implement a modal Command Palette accessible via `Mod+P` (and `F1`):
  - Fuzzy / prefix search filtering all commands registered in `src/renderer/commands/registry.ts`.
  - Category groupings: `Vault`, `Note`, `Theme`, `Sync`, `View`, `Export`, `Editor`.
  - Keyboard navigation: `ArrowUp`, `ArrowDown`, `Enter` to execute, `Escape` to close.
  - Displays command title, category badge, and bound keyboard shortcut tags.
  - Register all primary app actions:
    - Open Note, New Note, Save Note, Close Tab
    - Switch Vault (`Mod+Shift+O`), Open Vault in Google Drive
    - Toggle Theme (`theme:toggle`), Toggle Vim Mode (`Mod+Shift+V`)
    - Open Graph View (`Mod+G`), Open Search Panel, Open Backlinks Panel
    - Cloud Sync (`Mod+Shift+S`)
    - Today's Daily Note (`Mod+Shift+D`), Previous Daily Note, Next Daily Note
    - Insert Template (`template:insert`)
    - Export to HTML (`export:html`), Export to Markdown (`export:markdown`)

### 2. Light & Dark Theme System (`src/renderer/styles/tokens.css`, `src/shared/types.ts`)
- Implement accessible Light Theme tokens in `src/renderer/styles/tokens.css` under `[data-theme="light"]`:
  - Curated, low-fatigue palette: neutral crisp surfaces (`#f8fafc`, `#ffffff`, `#f1f5f9`), high-contrast dark text (`#0f172a`, `#475569`), calibrated syntax highlighting, and preserved indigo accent.
  - Theme state stored in `AppSettings.theme` (`'dark' | 'light' | 'system'`) and persisted in `userData/settings.json`.
  - Listen for OS color scheme changes if set to `'system'` via `window.matchMedia('(prefers-color-scheme: dark)')`.
  - Add `themeStore.ts` managing active theme and setting `document.documentElement.setAttribute('data-theme', theme)`.
  - Register `theme:toggle` command in the registry.

### 3. Note Templates System (`src/shared/templates/`, `src/renderer/components/modal/`)
- Implement template expansion engine in `src/shared/templates/expander.ts`:
  - Variable expansion: `{{title}}`, `{{date}}` (YYYY-MM-DD), `{{time}}` (HH:mm), `{{datetime}}`, `{{yesterday}}`, `{{tomorrow}}`.
  - Support templates stored in `<vault>/.cairn/templates/*.md` (or configured folder).
  - Provide built-in fallback templates if directory is empty (e.g. `Daily Note`, `Meeting Note`, `Project Plan`).
- Create `TemplatePickerModal.tsx` and register `template:insert` command:
  - Select template from list and insert expanded text at active editor cursor position.

### 4. Daily Notes Workflow (`src/shared/`, `src/renderer/stores/`, `src/renderer/commands/`)
- Implement daily note manager:
  - Shortcut `Mod+Shift+D` opens or creates today's daily note named `YYYY-MM-DD.md` (or configured format).
  - Automatically applies `Daily Note` template if available.
  - Commands `daily:prev` and `daily:next` to navigate sequentially between daily notes.
  - Vault-relative storage configured in `AppSettings.dailyNotesFolder` (defaults to vault root).

### 5. Document Export Engine (`src/main/export/`, `src/shared/ipc.ts`)
- Implement note exporter in main process `src/main/export/exporter.ts`:
  - **Export to HTML**: Generates a self-contained, standalone single-file HTML document:
    - Embedded clean CSS typography and dark/light print-friendly styling.
    - Embedded KaTeX math typesetting (rendered via `katex.renderToString`).
    - Task list checkboxes, tables, blockquotes, and fenced code styling.
    - Zero external network dependencies.
  - **Export to Markdown**: Saves note copy to user-selected destination.
  - Native file destination picker via Electron `dialog.showSaveDialog`.
  - Typed IPC channels: `export:html` and `export:markdown`.

### 6. Security Hardening & Input Sanitization (`src/main/`, `src/main/vault/paths.ts`)
- **Permission Request Lockdown**:
  - In `src/main/index.ts`, explicitly deny all runtime permissions (camera, microphone, geolocation, notifications, USB, bluetooth, screen-share) via `session.defaultSession.setPermissionRequestHandler` and `setPermissionCheckHandler`.
- **Windows Reserved Filenames & Unicode NFC Validation**:
  - In `src/main/vault/paths.ts`, sanitize and reject Windows reserved device filenames (`CON`, `PRN`, `AUX`, `NUL`, `COM1-9`, `LPT1-9`) regardless of file extension.
  - Enforce Unicode NFC normalization across all paths and filenames to ensure cross-platform consistency between Windows and Linux.
- **External Protocol Allowlist**:
  - Enforce strict protocol allowlist (`https:`, `http:`, `mailto:`) with URL parsing validation before passing to `shell.openExternal`.
- **CSP Verification**:
  - Ensure strict CSP in production builds with zero unsanitized HTML injections.

### 7. Code & Runtime Performance Optimization (`electron.vite.config.ts`, `src/renderer/`)
- **Rollup Vendor Code-Splitting**:
  - In `electron.vite.config.ts`, configure `manualChunks` to split the monolithic 2.48MB renderer bundle into granular vendor chunks (`vendor-react`, `vendor-codemirror`, `vendor-katex`, `vendor-graph`).
  - Accelerates cold start load time, lowers initial memory parse overhead, and improves caching.
- **KaTeX Formula Memoization Cache**:
  - In `src/renderer/components/editor/math/`, implement a fast in-memory render cache (e.g. 500 entries) for `katex.renderToString`.
  - Eliminates redundant KaTeX AST parsing for recurring math expressions (e.g. `$x$`, `$n$`, `$$...$$`) during rapid editor scrolling and keystrokes.
- **Production Console & Dead Code Stripping**:
  - Ensure Terser / ESBuild drops debug `console.log` statements in packaged production builds (`drop: ['console', 'debugger']`).
- **Graph Cooldown Enforcement**:
  - Verify `force-graph` animation loop completely suspends (0% CPU) when stabilized or hidden.

### 8. Packaging & Distribution (`electron-builder`)
- Add and configure `electron-builder`:
  - `electron-builder.yml` configuration:
    - AppId: `app.cairn.notes`, Product Name: `Cairn`.
    - **Windows**: NSIS installer (`.exe`) + portable executable, 64-bit architecture.
    - **Linux**: AppImage + `.deb` package with desktop integration and icon associations.
    - File associations: `.md`, `.markdown`.
  - Add build scripts to `package.json`: `pnpm dist:win`, `pnpm dist:linux`, `pnpm dist`.
  - Generate app icon assets in `build/` (SVG, 256x256 PNG, ICO).

### 9. Documentation, Release Workflow, Vibe Coding Guide & Agent Consolidation
- **Universal Agent Guide (`AGENTS.md`)**:
  - Consolidate builder workflows, prompt authoring templates, and verification guidelines from `GEMINI.md` into `AGENTS.md`.
  - Make `AGENTS.md` the canonical, model-agnostic guide for any AI coding assistant (Antigravity, Cursor, Claude Code, GitHub Copilot, Codex) and human pair programmers.
- **Author `CONTRIBUTING.md`**:
  - Welcoming contribution guide for open-source contributors and vibe coders.
  - Details how to set up dev environment, run `pnpm check`, author phase prompts in `prompts/`, add IPC channels, and adhere to Cairn's non-negotiables.
- **Dedicated `README.md` Section: "Vibe Coding with AI Pair Programming"**:
  - Highlight Cairn's agent-friendly architecture: clean typed IPC contracts, zero fs in renderer, atomic file I/O, and rich test fixtures.
  - Explain how vibe coders can clone the repo and immediately start building features using `AGENTS.md` with their preferred AI coding tool.
- **Open-Source Release Setup**:
  - `LICENSE`: MIT License.
  - `.github/workflows/release.yml`: GitHub Actions workflow building and publishing Windows NSIS and Linux AppImage release assets when a tag `v*.*.*` is pushed.

---

## Constraints
- **Preserve Non-Negotiables**: Notes remain plain text on local disk. Zero file corruption or unexpected reformats.
- **Zero Breaking Changes**: All existing tests (136 unit tests, 9 E2E specs) must continue to pass 100% green without modification.
- **Strict Theme Tokens**: Zero hardcoded hex colors in components; everything uses CSS variables from `tokens.css`.
- **Offline & Secure**: Export and templates require zero network calls. Sandboxed renderer with no direct Node.js or fs access.
- **Bundle Footprint**: Minimize new dependencies; leverage native Node.js and existing bundled libraries.
- **Cross-Platform**: Packaging and shortcuts (`Mod` = `Ctrl` on Windows/Linux) work identically across targets.

---

## Acceptance Criteria
- [ ] Command Palette opens on `Mod+P` / `F1`, supports keyboard navigation and filtering, and executes registered commands.
- [ ] Theme toggling dynamically switches between Dark and Light tokens without restarting or unmounting the editor.
- [ ] Template engine parses and replaces `{{title}}`, `{{date}}`, and `{{time}}` variables cleanly.
- [ ] `Mod+Shift+D` instantly opens or creates today's daily note.
- [ ] Standalone HTML export outputs valid self-contained HTML with math formulas rendered.
- [ ] Electron session denies all device permissions, and `paths.ts` rejects Windows reserved filenames and enforces NFC normalization.
- [ ] Rollup splits vendor chunks, reducing main bundle size; KaTeX formula cache accelerates repeated formula rendering.
- [ ] `pnpm build` bundles successfully, and `electron-builder` configuration validates.
- [ ] Universal `AGENTS.md` and `CONTRIBUTING.md` guide open-source vibe coders with clear AI pair-programming instructions.
- [ ] Unit tests pass for template engine, theme settings, security path checks, and export utilities.
- [ ] Playwright E2E spec verifies Command Palette, Theme toggle, and Daily Note flows.
- [ ] `pnpm check` and `pnpm test:e2e` pass with 100% green tests.

---

## Deliverables
1. `src/renderer/components/modal/CommandPaletteModal.tsx` and updated `src/renderer/commands/registry.ts`.
2. Light theme tokens in `src/renderer/styles/tokens.css` and theme store integration.
3. Template manager and daily notes logic in `src/shared/templates/` and `src/renderer/components/modal/TemplatePickerModal.tsx`.
4. Document export service in `src/main/export/` with typed IPC channels.
5. Security enhancements in `src/main/index.ts` and `src/main/vault/paths.ts`.
6. Performance optimizations in `electron.vite.config.ts` and `src/renderer/components/editor/math/`.
7. `electron-builder.yml` and release scripts in `package.json`.
8. Consolidated `AGENTS.md`, welcoming `CONTRIBUTING.md`, comprehensive `README.md` with Vibe Coding guide, and `LICENSE`.
9. `.github/workflows/release.yml` automated GitHub Release workflow.
10. Unit tests in `tests/unit/phase7.test.ts` and E2E specs in `tests/e2e/phase7.spec.ts`.
11. Updated `PROGRESS.md` and `docs/05-ROADMAP.md`.
