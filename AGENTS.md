# Cairn: Agent Guide (canonical, shared by all agents)

Cairn is a keyboard-first, Obsidian-compatible markdown note-taking desktop app
with live preview, LaTeX, vim bindings, wikilinks and a graph view.
Targets: **Windows and Linux are both first-class.** macOS is not a goal.

## Roles
- **Gemini (Antigravity)**: the builder. Reads `GEMINI.md`. Writes all code.
- **Claude**: the planner. Reads `CLAUDE.md`. Plans, optimizes, writes prompts in `prompts/`. Does not build.
- **The human**: owner and tester. Final say on scope and taste.

## Stack (approved, do not change without an ADR in docs/adr/)
Electron + electron-vite, React + TypeScript (strict), CodeMirror 6 (+ @replit/codemirror-vim),
KaTeX, unified/remark, Zustand, force-graph, @parcel/watcher, better-sqlite3 (later),
Vitest (unit), Playwright (Electron e2e), pnpm, Node 24.

## Commands
| Task | Command |
|---|---|
| Dev | `pnpm dev` |
| Build | `pnpm build` |
| Typecheck | `pnpm typecheck` |
| Lint | `pnpm lint` |
| Unit tests | `pnpm test` |
| E2E tests | `pnpm test:e2e` |
| Everything | `pnpm check` (typecheck + lint + test) |

## Source layout
```
src/main/       Electron main process (vault service, watcher, config, menus)
src/preload/    Minimal contextBridge API. No logic here.
src/renderer/   React UI (components/, editor/, stores/, styles/)
src/shared/     Types and the typed IPC contract (ipc.ts). Imported by all sides.
src/worker/     Worker threads (indexer, from Phase 3)
tests/          Unit fixtures and e2e specs. tests/fixtures/vault/ is a sample vault.
docs/           Architecture, decisions (adr/), setup, UI brief
prompts/        Phase prompts written by Claude
```

## Non-negotiables
1. **Files are the source of truth.** Notes are plain `.md` on disk. Any index or cache is disposable and lives in `.cairn/`.
2. **Obsidian compatible.** Never write to `.obsidian/`. Never reformat or "fix" a user's note on open. Preserve line endings, BOM, frontmatter and unknown syntax byte-for-byte unless the user edited that text.
3. **Renderer never touches the filesystem.** All disk access goes through typed IPC to the main process.
4. **Every path from the renderer is untrusted.** Main must verify it resolves inside the vault root.
5. **Cross-platform from line one.** See `.agent/rules/cross-platform.md`.
6. **No new dependency without a one-line justification in PROGRESS.md.** Prefer what is already in the stack.
7. **Small scope.** Do only what the current prompt asks. Note extra ideas in PROGRESS.md under "Ideas", do not build them.

## Obsidian compatibility contract
`[[note]]`, `[[note|alias]]`, `[[note#heading]]`, `[[note#^block]]`, `![[embed]]`, `#tags`, YAML frontmatter,
callouts (`> [!note]`), `==highlight==`, `%%comment%%`, `- [ ]` tasks, `$inline$` and `$$block$$` math.
Link resolution is case-insensitive and shortest-unique-path, same as Obsidian, implemented once in `src/shared/`.

## Definition of done (every task)
- `pnpm check` passes locally.
- New behavior has tests (unit, and e2e when UI or disk is involved).
- CI is green on **both** windows-latest and ubuntu-latest.
- `PROGRESS.md` updated (done, next, assumptions, known issues).
- No stray TODOs without an entry in PROGRESS.md.
