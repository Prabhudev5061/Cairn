# PHASE 0: Foundation (setup that works on Windows and Linux)

## Context
Empty repo containing only the starter pack: `AGENTS.md`, `GEMINI.md`, `CLAUDE.md`, `PROGRESS.md`, `.agent/`, `docs/`, `prompts/`.
Read `AGENTS.md` and all `.agent/rules/*` first. Use plan mode and wait for approval before scaffolding.

## Goal
`pnpm dev` opens a blank Cairn window, the full quality toolchain works, and CI is green on Windows and Ubuntu.
No product features yet.

## Tasks
1. Report installed versions of node, pnpm, git. Require Node 22 LTS. Add `.nvmrc` and `engines` in package.json.
2. Scaffold with electron-vite using the React + TypeScript template, **into the repo root without overwriting the starter files**. Use the folder layout from AGENTS.md (`src/main`, `src/preload`, `src/renderer`, `src/shared`).
3. TypeScript `strict` plus `noUncheckedIndexedAccess`. ESLint (flat config) and Prettier. Add scripts: `dev`, `build`, `typecheck`, `lint`, `test`, `test:e2e`, `check`.
4. Vitest with one real unit test (for example a pure path helper in `src/shared/` that converts native paths to vault-relative forward-slash paths).
5. Security per `.agent/rules/electron-security.md`: contextIsolation, sandbox, no nodeIntegration, strict CSP, blocked navigation and window.open.
6. Typed IPC skeleton: `src/shared/ipc.ts` with one channel `app:ping` (returns `{ ok: true, value: { version, platform } }`). Preload exposes it. The renderer shows the result as plain text on the page.
7. Playwright Electron smoke test: launches the built app, finds the window, asserts the ping text is shown.
8. Pass `--ozone-platform-hint=auto` on Linux (via `app.commandLine.appendSwitch`, guarded by platform).
9. GitHub Actions workflow with a matrix of `windows-latest` and `ubuntu-latest`: install, `pnpm check`, build, e2e (Linux via `xvfb-run -a`).
10. Add `.gitignore`, `.editorconfig` (LF by default), and `.gitattributes` so fixtures keep their line endings (`tests/fixtures/** -text`).
11. Fill the real versions into `docs/04-SETUP.md` if anything differs, and update `PROGRESS.md`.

## Constraints
- Do not build any feature beyond the ping skeleton. No editor, no file access, no UI styling beyond readable defaults.
- Do not add dependencies beyond the scaffold, ESLint, Prettier, Vitest, Playwright, and what the scaffold needs. Justify each in PROGRESS.md.
- Do not modify the starter files except `PROGRESS.md` and the Setup doc.
- Never loosen lint or TypeScript settings to get green.

## Acceptance
- `pnpm install && pnpm dev` opens a window showing the ping result.
- `pnpm check` passes. `pnpm build` passes. `pnpm test:e2e` passes locally.
- CI is green on both operating systems (or you explain exactly what blocked you).
- Security flags verified by a test or a documented manual check.

## Deliver
Final report in the format from `GEMINI.md`. Include exact versions installed.
