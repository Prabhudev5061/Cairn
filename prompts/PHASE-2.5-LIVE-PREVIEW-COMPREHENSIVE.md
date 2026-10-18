# PHASE 2.5: Comprehensive Live Preview (Markdown, Multi-Language Code Blocks, KaTeX, Callouts, Tables & Media)

## Context
Phases 0, 1, 2, and 3 are complete and passing all 72 unit tests and 4 Playwright Electron E2E suites.
Cairn has a working live-preview engine (`src/renderer/components/editor/livePreview/`) that conceals syntax markers, renders KaTeX math formulas, formats headings, horizontal rules, task checkboxes, wikilinks, and provides Vim bindings.
The user requested a thorough, production-grade research and implementation of all Markdown, LaTeX, and code/language syntax for Live Preview, organized into actionable sub-phases.

Read `AGENTS.md`, `GEMINI.md`, `PROGRESS.md`, `.agents/rules/*`, and `docs/06-UI-DESIGN-BRIEF.md`.

---

## Goal
Elevate Cairn's Live Preview to the highest Obsidian-grade standard:
1. **Complete Markdown Syntax**: Rich headings, bold, italic, bold-italic, strikethrough, highlights, subscript, superscript, tags (`#tag`), comments (`%%...%%`), and a collapsible frontmatter properties card.
2. **Obsidian Callouts**: 10 curated callout types (`note`, `tip`, `warning`, `danger`, `success`, `question`, `quote`, `todo`, `example`, `bug`) with custom accent colors, Lucide icons, and header widgets that hide raw `> [!type]` markup when unfocused.
3. **Multi-Language Code Blocks**: Fenced code blocks with language badge headers, one-click copy-to-clipboard button, and syntax highlighting for major languages (JS/TS, Python, HTML, CSS, JSON, Rust, C/C++, Bash, Markdown).
4. **GFM Tables & Media Embeds**: Rich table styling with alignments and borders, and vault image embeds (`![[image.png]]` / `![alt](url)`).
5. **LaTeX & KaTeX**: Formula environments (`matrix`, `align`, `cases`), equation tagging, and error-resilient display math.

---

## Sub-Phases & Tasks

### Sub-Phase A: Rich Typography, Tags, Comments, Sub/Superscript & Frontmatter Card
1. **Tags (`#tag`, `#nested/tag`)**:
   - Detect valid markdown tags (must start with letter, underscore, or Unicode char; can contain `/` for nested tags; not preceded by `&` or alphanumeric).
   - Render unfocused tags as interactive pills (`.cairn-tag-pill`) with accent tint, rounded borders, and pointer cursor.
   - Revealing raw `#tag` when cursor enters the tag boundary.
2. **Comments (`%%comment%%`)**:
   - Conceal `%%...%%` completely when the cursor is outside the range.
   - Reveal with faint italic styling (`.cm-comment-text`) when the cursor enters the range.
3. **Subscript (`~text~`) & Superscript (`^text^`)**:
   - Detect `~subscript~` (single tilde) and `^superscript^` (caret).
   - Unfocused: conceal markers, apply `cm-subscript` (`vertical-align: sub; font-size: 0.8em;`) and `cm-superscript` (`vertical-align: super; font-size: 0.8em;`).
   - Focused: reveal raw markers.
4. **Frontmatter Properties Card**:
   - Parse YAML frontmatter into structured key-value pairs (tags, aliases, title, custom fields).
   - Render a sleek metadata card at note top with an expand/collapse toggle, property badges, and tag chips.
   - When clicked or focused, seamlessly reveals the raw YAML text.

### Sub-Phase B: Obsidian Callouts (Icons, Color Themes, Header Widgets)
1. **Callout Type Registry**:
   - Define type mappings, Lucide icons, and color palettes:
     - `note` / `info`: Blue (`--callout-note`), icon: `Info`
     - `tip` / `hint`: Cyan (`--callout-tip`), icon: `Lightbulb`
     - `warning` / `caution` / `attention`: Amber (`--callout-warning`), icon: `AlertTriangle`
     - `danger` / `error`: Rose (`--callout-danger`), icon: `Flame`
     - `success` / `check` / `done`: Emerald (`--callout-success`), icon: `CheckCircle2`
     - `question` / `help` / `faq`: Purple (`--callout-question`), icon: `HelpCircle`
     - `quote` / `cite`: Gray (`--callout-quote`), icon: `Quote`
     - `todo`: Sky (`--callout-todo`), icon: `CheckSquare`
     - `example`: Indigo (`--callout-example`), icon: `ListTree`
     - `bug`: Orange (`--callout-bug`), icon: `Bug`
2. **Callout Header Widget (`CalloutHeaderWidget`)**:
   - Replaces `> [!type] Optional Title` when unfocused.
   - Renders header container with colored icon, type-specific styling, and title (defaults to capitalized type if no custom title).
   - When cursor enters the line, reveals raw `> [!type] Title` markup.
   - All subsequent quote lines receive `.cm-callout-line` with matching colored left border and subtle tinted background.

### Sub-Phase C: Multi-Language Fenced Code Blocks & Copy Button
1. **Code Block Header Widget (`CodeBlockHeaderWidget`)**:
   - For every fenced code block (```` ```lang ````), render a top bar widget with:
     - Language name pill/badge (e.g., `TypeScript`, `Python`, `Rust`, `Bash`, `JSON`).
     - One-click Copy Code button with icon (`Copy` -> `Check` on copy) using `navigator.clipboard.writeText`.
2. **Multi-Language Syntax Highlighting**:
   - Support dynamic code block highlighting for popular languages:
     - JavaScript / TypeScript / JSX / TSX
     - Python
     - HTML / CSS
     - JSON
     - Rust / C / C++ / Go / Bash
3. **Code Container Styling**:
   - Rounded border (`var(--radius-md)`), dark surface background (`rgba(0, 0, 0, 0.3)`), monospace typography (`var(--font-mono)`), horizontal scrolling for overflow lines.

### Sub-Phase D: GFM Tables & Media Embeds
1. **GFM Table Styling in Live Preview**:
   - Style markdown tables (`| Header | Header |` / `|---|---|` / `| Cell | Cell |`):
     - Align columns according to colons (`:---` left, `:---:` center, `---:` right).
     - Clean cell borders, header background accentuation, and monospace alignment.
2. **Image Embeds (`![[image.png]]` & `![alt](path)`)**:
   - Detect image embeds in markdown.
   - Render `ImageEmbedWidget` displaying local vault image (via file URL or main IPC) or web URL.
   - Support optional width syntax: `![[image.png|300]]`.
   - Error placeholder for missing images with fallback text.

---

## Constraints
- **Obsidian Compatibility**: Under no circumstances modify the raw markdown text on disk. All enhancements are pure CodeMirror 6 visual decorations (`Decoration.replace`, `Decoration.mark`, `Decoration.line`).
- **Security**: No `eval` or remote scripts. CSP remains strict (`script-src 'self'`). KaTeX and Lucide icons rendered securely via DOM APIs.
- **Performance**: Use CodeMirror `StateField` and viewport ranges; do not block typing or cause layout shift jitter.
- **Cross-Platform**: Keybindings, fonts, and clipboard interactions must function identically on Windows and Linux.

---

## Acceptance Criteria
- Tags (`#tag`), comments (`%%...%%`), subscript (`~sub~`), and superscript (`^sup^`) render visually formatted when unfocused and reveal raw source when focused.
- Callouts render colored banners with icons according to their type (`note`, `warning`, `tip`, `danger`, `success`, etc.).
- Fenced code blocks show language labels and copy buttons that copy block content to clipboard.
- Tables format with clean borders, headers, and alignments.
- All existing features (KaTeX, wikilinks, tasks, horizontal rules, vim mode) continue to pass 100% of tests.
- `pnpm check` and `pnpm test:e2e` pass with 0 errors.

---

## Verification & Deliverables
1. Implementation of Sub-Phases A through D with unit and E2E tests for each.
2. Update `PROGRESS.md` and docs.
3. Final verification report with exact test commands and manual verification steps.
