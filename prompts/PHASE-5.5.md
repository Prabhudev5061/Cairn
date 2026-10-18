# Phase 5.5: Multi-Format Live Preview & Interactive Cross-Format Hyperlinking

## Context
In Phase 5, Cairn introduced multi-format file support (`.org`, `.typ`, `.adoc`) alongside Markdown (`.md`).
The main process indexer and shared resolvers seamlessly extract metadata, build backlinks, and resolve cross-format wikilinks (e.g. `[[cairn-roadmap]]` resolves to `Projects/cairn-roadmap.org`).
However, Live Preview decoration (concealing markup syntax when the caret is away, rendering interactive widgets, and clickable link pills) is currently only active for Markdown documents. Non-markdown notes render in raw text mode with CodeMirror 6 stream syntax highlighting.
To make Org-mode, Typst, and AsciiDoc true first-class citizens in Cairn, we must bring our signature Live Preview experience and interactive cross-format navigation to all supported formats.

## Goal
Enable seamless, high-performance Live Preview and interactive link navigation across Org-mode (`.org`), Typst (`.typ`), and AsciiDoc (`.adoc`, `.asciidoc`).
When reading or editing notes in any format, syntax delimiters (headings, inline bold/italic/code, math delimiters, task markers) collapse cleanly into styled typography when the cursor is away, and reappear byte-for-byte upon cursor entry without file mutation.
Furthermore, links across all formats (Org `[[target][desc]]` and `[[target]]`, Typst `@ref`, `#link(...)` and `[[target]]`, AsciiDoc `xref:target[desc]`, `<<anchor,desc>>` and `[[target]]`) render as styled, clickable link pills that immediately navigate to the target note in Cairn when clicked.

---

## Tasks

### 1. Extensible Multi-Format Live Preview Decorators (`src/renderer/components/editor/livePreview/`)
1. **Org-mode Live Preview Decorator (`livePreviewOrg.ts`)**:
   - **Headings Concealing**: Conceal `*`, `**`, `***` leading asterisks on unfocused lines and apply `cairn-h1` through `cairn-h6` line styling.
   - **TODO & DONE Status Badges**: Decorate `TODO` as a high-visibility badge (`cairn-org-todo`: accent/warning background, bold, pill radius) and `DONE` as a completed badge (`cairn-org-done`: muted green badge with subtle strike-through option).
   - **Interactive Checkboxes**: Replace `- [ ]`, `- [X]`, `- [-]` with interactive `CheckboxWidget` allowing immediate mouse toggling on click.
   - **Inline Formatting**: Conceal delimiters for `*bold*` (`cm-strong`), `/italic/` (`cm-em`), `~code~` (`cm-inline-code`), and `=verbatim=` (`cm-inline-code`).
   - **Directives & Code Blocks**: Conceal or elegantly style `#+TITLE:`, `#+AUTHOR:`, `#+FILETAGS:`, and wrap `#+BEGIN_SRC` ... `#+END_SRC` in code block frames.

2. **Typst Live Preview Decorator (`livePreviewTypst.ts`)**:
   - **Headings Concealing**: Conceal `= `, `== `, `=== ` leading equals signs on unfocused lines, applying corresponding `cairn-h1` through `cairn-h6` styling.
   - **Mathematical Formulas via KaTeX**: Identify inline (`$ ... $`) and block math expressions, rendering them through KaTeX via `MathWidget` with click-to-edit cursor positioning.
   - **Labels & References**: Decorate `<label>` anchors with subtle anchor chips and `@ref` references as interactive navigational pills.
   - **Inline Formatting**: Conceal delimiters for `*bold*`, `_italic_`, and `` `code` ``.

3. **AsciiDoc Live Preview Decorator (`livePreviewAsciidoc.ts`)**:
   - **Headings Concealing**: Conceal leading `= `, `== `, `=== ` markers on unfocused lines and apply `cairn-h1` through `cairn-h6`.
   - **Admonition Callouts**: Decorate `[NOTE]`, `[TIP]`, `[WARNING]`, `[IMPORTANT]`, `[CAUTION]` and their delimited blocks (`====`) as rich callout boxes using `CalloutHeaderWidget` and existing Cairn callout token themes.
   - **Cross References & Anchors**: Render `xref:...[...]`, `<<...>>`, and `[#anchor]` as interactive link and anchor widgets.
   - **Inline Formatting**: Conceal delimiters for `*bold*`, `_italic_`, and `` `code` ``.

### 2. Universal Clickable Cross-Format Link Navigation
1. **Interactive Link Widgets**:
   - Ensure all link syntax across all formats (Org `[[target][alias]]`, Typst `@ref` / `#link` / `[[target]]`, AsciiDoc `xref:target[alias]` / `<<target>>` / `[[target]]`, and Markdown `[[target|alias]]`) render as styled `WikilinkWidget` or `LinkWidget`.
   - On click, dispatch `cairn:navigate-link` with `{ target, subpath, subpathType }`.
2. **End-to-End Cross-Format Switching**:
   - Verify that clicking a link inside an AsciiDoc file pointing to a Typst note (e.g. `xref:quantum-state-collapse.typ[Quantum State Collapse]` or `[[cairn-roadmap]]`) immediately opens and switches the active editor tab to that note with its appropriate language mode and live preview.

### 3. Editor Language Mode & Live Preview Assembly
1. In `src/renderer/components/editor/languages/index.ts`:
   - Assemble format-specific extensions combining the CodeMirror 6 `StreamLanguage` tokenizer with the corresponding format Live Preview ViewPlugin.
2. In `src/renderer/components/editor/CodeMirrorEditor.tsx`:
   - Verify dynamic transition between formats when navigating via links or selecting notes in the file tree.

### 4. Testing & Verification
1. **Unit Tests (`tests/unit/live-preview-formats.test.ts`)**:
   - Test decoration range calculation, delimiter concealing, and widget placement across Org, Typst, and AsciiDoc text samples.
   - Test cursor proximity: verify delimiters reveal when cursor enters [from, to] and conceal when cursor departs.
2. **E2E Tests (`tests/e2e/live-preview-formats.spec.ts`)**:
   - Test opening Org note: verify `TODO` badges render, checkboxes toggle interactively on click without altering surrounding text.
   - Test opening Typst note: verify math formulas render via KaTeX widgets.
   - Test opening AsciiDoc note: verify admonition callout boxes render.
   - Test clicking cross-format links: verify clicking a link in `asciidoc-specification.adoc` navigates to `quantum-state-collapse.typ`, and clicking a link in `cairn-roadmap.org` navigates to `welcome.md`.

---

## Constraints
- **Zero File Mutation on Open**: Never reformat or change note files on open. Preserving LF/CRLF and BOM byte-for-byte is non-negotiable.
- **Cursor Reveal Contract**: Moving the caret into any decorated range immediately reveals the underlying raw syntax for editing.
- **Renderer Sandboxing**: Renderer remains completely isolated (`sandbox: true`, `contextIsolation: true`). Link navigation dispatches through Zustand store actions.
- **Zero New Dependencies**: Re-use existing CodeMirror 6, KaTeX, and token styling infrastructure without adding any new npm packages.

---

## Acceptance Criteria
- [ ] Org-mode notes conceal `*` headings, render interactive task checkboxes, display stylized `TODO`/`DONE` badges, and render clickable `[[target][desc]]` links.
- [ ] Typst notes conceal `=` headings, render `$math$` with KaTeX, and render clickable links.
- [ ] AsciiDoc notes conceal `=` headings, render `[NOTE]` / `[TIP]` callout boxes with icons, and render clickable `xref:` and `[[target]]` links.
- [ ] Clicking a cross-format link in any note (e.g. Org -> Typst, AsciiDoc -> Markdown) navigates directly to that note in the editor.
- [ ] `pnpm check` passes with 0 type errors, 0 lint warnings, and 100% unit tests passing.
- [ ] `pnpm test:e2e` passes with all Electron end-to-end tests green.

---

## Deliverables
- `src/renderer/components/editor/livePreview/livePreviewOrg.ts`
- `src/renderer/components/editor/livePreview/livePreviewTypst.ts`
- `src/renderer/components/editor/livePreview/livePreviewAsciidoc.ts`
- Updates to `src/renderer/components/editor/languages/index.ts` and `widgets.ts`
- `tests/unit/live-preview-formats.test.ts`
- `tests/e2e/live-preview-formats.spec.ts`
- Updates to `docs/05-ROADMAP.md` and `PROGRESS.md`
