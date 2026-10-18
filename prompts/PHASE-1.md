# PHASE 1: Walking skeleton (open, browse, edit, save)

## Context
Phase 0 is complete. Read `AGENTS.md`, `PROGRESS.md`, all `.agent/rules/*`, `.agent/workflows/*`, and `docs/06-UI-DESIGN-BRIEF.md`.
Use plan mode and wait for approval.

## Goal
Open any folder as a vault, browse its markdown files in a dark, panel-based app shell, edit a note in CodeMirror,
and save it safely. Open a real Obsidian vault without damaging it.

## Tasks
1. **Design tokens and shell.** Create `src/renderer/styles/tokens.css` per the UI brief. Build the layout: title bar, left sidebar (file tree), center editor area, right panel placeholder, status bar. Resizable and collapsible panels with remembered sizes. Bundle Inter and JetBrains Mono. Icons from lucide-react.
2. **Command registry.** A tiny registry (`id`, `title`, `run`, optional `keys`). Register: open vault, save, new note, rename, delete, toggle sidebar, toggle right panel. Wire keyboard shortcuts through it.
3. **Vault service (main process).** IPC channels (use `.agent/workflows/add-ipc-channel.md`) for: choose vault via native dialog, list tree, read note, write note, create note, rename, delete (via `shell.trashItem`). Persist the last vault path in userData config and reopen it on launch.
4. **File tree.** Recursive tree of `.md` files and folders. Ignore `.obsidian`, `.cairn`, `.git`, `node_modules`, and dotfiles. Folders first, then natural alphabetical sort. Keyboard navigation (arrows, Enter) and context menu (new, rename, delete).
5. **Editor.** CodeMirror 6 with the markdown language, line wrapping, history, and a theme driven by the CSS tokens. Dirty indicator in the tab and status bar. Autosave 1 second after the last keystroke, and `Ctrl+S` saves immediately. Single open note is enough for this phase.
6. **Safe I/O.** Atomic writes (temp file in the same folder, then rename). Preserve line endings and BOM exactly. Do not rewrite a file if its content did not change. All paths validated inside the vault root, including symlink escapes.
7. **Watcher.** Use `@parcel/watcher` with debounce. Reflect external create, rename, and delete in the tree. If the open note changes on disk while clean, reload it; if dirty, show a non-blocking conflict notice. Ignore your own writes. Handle inotify limit errors with a visible warning.
8. **Fixtures and tests.**
   - `tests/fixtures/vault/` with: normal notes, a CRLF note, a note with a BOM, Unicode names, nested folders, a `.obsidian/` folder, and two notes differing only by case.
   - Unit tests for path validation, line-ending and BOM preservation, atomic write, tree ignore rules.
   - Playwright e2e on a **copy** of the fixture vault: open vault, open note, type, save, verify bytes on disk, rename a note, delete a note.
9. Update `PROGRESS.md` and, if something surprising came up, add an ADR in `docs/adr/`.

## Constraints
- No live preview, vim, math, wikilinks, graph, search, or tabs beyond a single open note. Those are later phases.
- Renderer must not touch the filesystem. No hardcoded paths or colors.
- New dependencies only for: CodeMirror packages, Zustand, a panel-resizing library, lucide-react, @parcel/watcher, bundled fonts. Anything else needs a justification in PROGRESS.md.
- Never modify the user's `.obsidian` folder or any file the user did not edit.

## Acceptance
- Opening `tests/fixtures/vault` shows the expected tree, ignoring `.obsidian`.
- Edit and save changes only the intended bytes (diff the file before and after).
- CRLF and BOM files keep their line endings and BOM after an edit.
- Renaming and deleting notes works and the tree updates; deleted notes go to the trash.
- External edits appear without restarting.
- `pnpm check` and `pnpm test:e2e` pass. CI is green on Windows and Ubuntu.
- Manual: run the app on a Linux desktop (VM is fine), record the result in PROGRESS.md under "Tested on".

## Deliver
Final report in the format from `GEMINI.md`, plus screenshots of the shell if you can capture them.
