# PHASE 2: Live-preview editor, KaTeX, autocomplete, vim bindings

## Context
Phase 1 is complete: the walking skeleton runs with a dark-themed app shell, safe atomic file I/O, tree navigation, reactive watcher, and basic CodeMirror 6 markdown editing (`src/renderer/components/editor/CodeMirrorEditor.tsx`).
Read `AGENTS.md`, `GEMINI.md`, `PROGRESS.md`, all `.agents/rules/*`, `.agents/workflows/*`, and `docs/06-UI-DESIGN-BRIEF.md`.
Use plan mode and wait for approval before making large changes.

## Goal
Transform the editor into an Obsidian-style live-preview environment where markdown syntax marks hide when the cursor is away, LaTeX math (`$inline$` and `$$block$$`) renders live via KaTeX widgets, completions assist with markdown syntax and LaTeX commands, and optional Vim keybindings (@replit/codemirror-vim) provide modal navigation with ex-commands (`:w`, `:q`) and status bar feedback.

## Tasks
1. **Live-preview decoration engine (`src/renderer/components/editor/livePreview/`).**
   - Implement a CodeMirror 6 extension using AST syntax tree inspection (`@codemirror/language` / Lezer markdown).
   - Hide or de-emphasize markdown markup tokens (headers `#`, bold `**`, italic `*`, strikethrough `~~`, highlight `==`, inline code backticks, blockquote markers `>`) when the selection/cursor does not intersect that line or token range.
   - Reveal raw markdown syntax seamlessly when the cursor moves onto the line or token, preserving intuitive typing and editing.
   - Style headers with proportional typography, code blocks with background panels, and horizontal rules (`---`) as styled dividers.
   - Render interactive checkbox widgets for `- [ ]` and `- [x]` task lists.

2. **KaTeX math integration (`src/renderer/components/editor/math/`).**
   - Parse inline math (`$formula$`) and display math (`$$formula$$`) in the editor.
   - Render mathematical formulas using KaTeX (`katex.renderToString` with `{ throwOnError: false }`).
   - Use CodeMirror `WidgetType` to replace math expressions with rendered KaTeX DOM when the cursor is outside the expression.
   - When the cursor enters the math range, reveal raw LaTeX for immediate editing.
   - Bundle `katex.min.css` and required fonts into the renderer bundle, ensuring CSP in `src/main/index.ts` remains strict and satisfied.

3. **Autocomplete provider (`src/renderer/components/editor/autocomplete/`).**
   - Integrate `@codemirror/autocomplete`.
   - Provide context-aware completions:
     - LaTeX command autocompletions (e.g. `\frac`, `\sqrt`, `\alpha`, `\beta`, `\sum`, `\int`, `\mathbb`, `\partial`) triggered after typing `\` inside math boundaries.
     - Markdown callout completions (e.g. `[!note]`, `[!tip]`, `[!warning]`, `[!important]`, `[!caution]`) triggered after `> [!`.
     - Standard markdown snippets (e.g. table templates, math blocks).

4. **Vim mode & ex commands (`src/renderer/components/editor/vim/`).**
   - Integrate `@replit/codemirror-vim`.
   - Add a configurable setting/toggle for Vim mode in `layoutStore` or app settings, with shortcut command `Toggle Vim Mode`.
   - Register custom Vim ex commands: `:w` (saves active note via vault store), `:q` (closes note if not dirty), `:wq` / `:x` (saves and closes).
   - Expose current Vim mode (`NORMAL`, `INSERT`, `VISUAL`, `REPLACE`) to `StatusBar` via a dedicated badge/indicator.

5. **Fixtures and tests.**
   - Add fixture note with mixed markdown syntax, callouts, task lists, inline math, and display math to `tests/fixtures/vault/`.
   - Unit tests:
     - KaTeX widget rendering and error handling.
     - Live preview token visibility computation (hides when cursor away, reveals when cursor inside).
     - LaTeX completion source filtering.
   - Playwright E2E tests:
     - Verify KaTeX renders math elements (`.katex`) in the editor DOM.
     - Verify typing markdown (bold, headers) collapses tokens when moving away.
     - Verify Vim mode toggling, mode indicator in status bar, and `:w` command saving note.

6. **Documentation & Polish.**
   - Add ADR `docs/adr/0002-live-preview-and-katex.md` covering CodeMirror decoration architecture and KaTeX rendering strategy.
   - Update `PROGRESS.md` with all new dependencies, justifications, and verification results.

## Constraints
- **Obsidian compatibility**: Do not mutate or clean up the underlying markdown file text. Files on disk remain plain markdown.
- **Security**: KaTeX `renderToString` is the only permitted HTML generator; no `dangerouslySetInnerHTML` with raw user content. Keep strict CSP.
- **Performance**: Decorations must update efficiently using viewport and syntax tree ranges; no full-document synchronous re-renders on every keystroke.
- **Cross-platform**: Keybindings and font rendering must behave identically on Windows and Linux.
- **Dependencies**: Add only `@codemirror/language`, `@codemirror/autocomplete`, `katex`, `@types/katex`, `@replit/codemirror-vim`. Justify each in `PROGRESS.md`.

## Acceptance
- Opening a note with `$E = mc^2$` and `$$\sum_{i=1}^n i = \frac{n(n+1)}{2}$$` renders visually formatted math. Moving cursor into the formula reveals raw LaTeX.
- Markdown headers, bold, italics, highlights, and inline code conceal syntax when cursor is elsewhere, and reveal on cursor focus.
- Task checkboxes can be clicked or toggled.
- Typing `\` inside math displays LaTeX autocompletions.
- Toggling Vim mode activates Vim keybindings, displays current mode in the status bar, and handles `:w` without errors.
- `pnpm check` (typecheck + lint + unit tests) passes with zero errors and zero warnings.
- `pnpm test:e2e` passes.

## Deliver
1. Implementation plan approved before code modification.
2. Complete Phase 2 code and tests committed.
3. Updated `PROGRESS.md` and ADR `docs/adr/0002-live-preview-and-katex.md`.
4. Verification report per `GEMINI.md`.
