# PROGRESS

## Status
| Phase | Title | Status |
|---|---|---|
| 0 | Foundation | done |
| 1 | Walking skeleton | not started |
| 2 | Live-preview editor, LaTeX, autocomplete, vim | not started |
| 3 | Linking and index | not started |
| 4 | Graph view | not started |
| 5 | Other formats | not started |
| 6 | Polish and release | not started |

## Done
- Scaffolding with electron-vite, React 19, and TypeScript (`strict: true`, `noUncheckedIndexedAccess: true`).
- Configured Node 24 across `.nvmrc`, `engines`, and CI.
- Configured `pnpm@11.28.6` as packageManager and allowed only `electron` and `esbuild` install scripts via `pnpm-workspace.yaml`.
- Set up quality toolchain: ESLint (flat config), Prettier, Vitest, Playwright. Added `pnpm dev`, `build`, `typecheck`, `lint`, `test`, `test:e2e`, and `check`.
- Security per `.agent/rules/electron-security.md`: `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, `webSecurity: true`, strict dev/prod separated CSP, blocked in-app navigation and blocked `window.open` (delegating to `shell.openExternal`).
- Typed IPC skeleton: channel `app:ping` defined in `src/shared/ipc.ts`, handler in `src/main/ipc/app.ts`, exposed via `src/preload/index.ts` (bundled as CJS), displayed in `src/renderer/src/App.tsx`.
- Cross-platform path helper `toVaultRelativePath` in `src/shared/paths.ts` with 16 unit tests covering Windows and POSIX path resolution, case sensitivity, traversal rejection, and case preservation.
- Playwright Electron smoke test in `tests/e2e/smoke.spec.ts` asserting ping text visibility and renderer security boundaries.
- Linux Wayland/X11 switch: `--ozone-platform-hint=auto` conditionally passed on Linux.
- GitHub Actions CI workflow in `.github/workflows/ci.yml` testing both `windows-latest` and `ubuntu-latest` with AppArmor userns relaxation and xvfb.
- Added `.editorconfig`, `.gitattributes` (with fixtures `-text`), and `.gitignore`.

## Next
Phase 1: Walking skeleton. See `prompts/PHASE-1.md`.

## Assumptions
- Host environment has Node 24.19.0 on Windows; project standardized on Node 24 across `.nvmrc`, `package.json` engines, and CI.
- `packageManager` is set to `pnpm@11.28.6`. In pnpm 11, `onlyBuiltDependencies` is placed in `pnpm-workspace.yaml` to avoid package.json warnings.
- Preload script is bundled as CommonJS (`out/preload/index.cjs`) so Electron's sandboxed renderer can execute it without ES module syntax errors.

## Known issues
(none)

## Dependencies added (with one-line justification)
- `react`: Approved UI framework for note renderer and UI components.
- `react-dom`: React DOM renderer for mounting components in the browser window.
- `electron`: Core desktop runtime for running the application.
- `electron-vite`: Approved fast build tool and bundler for Electron main, preload, and renderer.
- `vite`: Underlying Vite bundler powering electron-vite.
- `@vitejs/plugin-react`: Vite plugin providing React Fast Refresh and JSX transformation.
- `typescript`: Type checking and TypeScript language compiler.
- `@types/node`: Node.js type definitions for Electron main, preload, and tooling.
- `@types/react`: Type definitions for React.
- `@types/react-dom`: Type definitions for React DOM.
- `eslint`: Linter for catching code style and correctness issues.
- `@eslint/js`: ESLint recommended JavaScript rules.
- `typescript-eslint`: TypeScript AST parser and lint rules for ESLint.
- `eslint-plugin-react-hooks`: Enforces React rules of hooks.
- `eslint-plugin-react-refresh`: Validates React components for Fast Refresh.
- `prettier`: Code formatter ensuring consistent formatting per `.editorconfig`.
- `vitest`: Unit test framework for fast execution of shared and main logic tests.
- `@playwright/test`: End-to-end testing tool for launching Electron and asserting UI behavior.

## Ideas (not in scope)
(none)

## Tested on
| OS | Last verified |
|---|---|
| Windows | 2026-10-16 |
| Ubuntu (CI) | Configured in `.github/workflows/ci.yml` |
| Linux desktop (manual) | |
