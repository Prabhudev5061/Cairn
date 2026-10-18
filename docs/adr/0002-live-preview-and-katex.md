# ADR 0002: Live Preview Decoration Architecture and KaTeX Math Rendering Strategy

## Status
Accepted

## Context
Cairn is a keyboard-first, Obsidian-compatible markdown note-taking desktop application. A core requirement is a fluid, distraction-free "Live Preview" editing experience:
1. Markdown formatting markup (headings, bold, italic, inline code, blockquotes, horizontal rules, task lists, strikethrough, highlights) should visually render when the cursor is elsewhere, and smoothly expand/reveal the raw markdown syntax when the cursor moves inside the token.
2. Inline math (`$...$`) and block math (`$$...$$`) must render into typography-grade mathematical formulas via KaTeX, while expanding to raw editable LaTeX when clicked or navigated into.
3. The underlying document on disk must remain 100% untouched, byte-for-byte identical plain markdown with zero automatic normalization, hidden frontmatter tags, or proprietary delimiters.
4. Rendering must be performant, flicker-free, and strictly conformant with Electron security policies (no `eval`, no arbitrary HTML injection).

## Decision

### 1. CodeMirror 6 Decoration Engine (`ViewPlugin`)
We implemented `livePreviewPlugin` as a CodeMirror 6 `ViewPlugin` that produces a `DecorationSet` using `RangeSetBuilder`:
- **Viewport-Aware Processing**: Rather than decorating the entire document on every keystroke, decorations are built only for `view.visibleRanges`.
- **AST Iteration & Hybrid Regex Scanning**:
  - Structural and syntactic elements (headings, bold, italics, inline code, blockquotes, fenced code, horizontal rules) are parsed via Lezer's markdown AST (`tree.iterate`).
  - GFM task lists (`- [ ]`, `- [x]`), strikethrough (`~~...~~`), and Obsidian highlights (`==...==`) are processed along visible line ranges.
  - Math ranges are parsed across the visible document slice with full support for escaped dollar signs (`\$`) and multi-line display blocks (`$$...$$`).
- **Cursor Detection (`selectionOverlaps`)**:
  - Each token tests whether `state.selection` intersects `[from, to]`.
  - When the cursor is outside, syntax delimiter marks (e.g. `### `, `**`, `==`) are hidden via `Decoration.replace({})` and styled with `Decoration.mark` or `Decoration.line`.
  - When the cursor moves into the token, the replacement decoration is omitted, immediately revealing the raw markdown characters for editing.

### 2. KaTeX Math Rendering & Security
- **Strict Sanitization**: We use `katex.renderToString(math, { displayMode, throwOnError: false })`. KaTeX HTML is the only generated HTML permitted into the DOM; errors are rendered gracefully with KaTeX's inline error styling rather than throwing exceptions or executing raw HTML.
- **Font Asset Bundling**: KaTeX styles and web fonts (`.woff2`, `.woff`, `.ttf`) are bundled into the renderer output via Vite. Content Security Policy is strictly configured:
  ```
  font-src 'self' data:; style-src 'self' 'unsafe-inline';
  ```
- **MathWidget & Click-to-Edit**: Math is replaced by an atomic `MathWidget`. Clicking the widget dispatches a selection transaction positioning the cursor inside the LaTeX formula, triggering the live preview plugin to reveal the raw LaTeX code.

### 3. Autocomplete Integration
- Context-aware completion source (`cairnCompletionSource`) triggers:
  - LaTeX mathematical commands when inside math delimiters (`\alpha`, `\frac`, `\sum`, `\matrix`, etc.).
  - Obsidian callout types (`> [!note]`, `[!warning]`, `[!tip]`, etc.).
  - Markdown snippets (`$$`, `table`, `codeblock`, `task`).
- Keybindings are registered with `Prec.lowest` so that autocomplete does not intercept the `Escape` key, ensuring Vim mode commands and navigation are unhindered.

### 4. Vim Mode Integration
- `@replit/codemirror-vim` is loaded dynamically via a CodeMirror `Compartment` controlled by `layoutStore.isVimMode`.
- Ex-commands (`:w`, `:q`, `:wq`, `:x`) are mapped to `useVaultStore` actions.
- Mode changes (`NORMAL`, `INSERT`, `VISUAL`, `REPLACE`) are synchronized to `layoutStore.vimMode` and displayed in the application status bar.

## Consequences

### Positive
- **Obsidian Compatibility**: The user's notes on disk remain pristine `.md` files without extra artifacts.
- **Performance**: Viewport chunking and Lezer syntax tree caching ensure high frame rates even in large notes.
- **Security**: Zero remote scripts, zero `eval`, strict CSP, and no direct filesystem access in the renderer.
- **Zero Flickering**: Incremental decoration updates prevent layout thrashing and preserve cursor stability.

### Negative / Trade-offs
- Lezer markdown syntax nodes do not cover custom Obsidian extensions (callouts, highlights, math) by default, requiring hybrid AST + regex scanners in `plugin.ts`.
- Complex nested math inside markdown tables or blockquotes requires careful boundary checking (`isInsideMath` / `overlapsMath`) to prevent conflicting replacement ranges.
