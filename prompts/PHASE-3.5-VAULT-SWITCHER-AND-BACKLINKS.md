# PHASE 3.5: Vault Switcher Save System & Responsive Backlinks Panel

## Context
Phase 3 (Linking, in-memory index, wikilinks, backlinks, and search) and Phase 2.5 (Comprehensive live preview with rich GFM tables and YAML frontmatter) are complete and tested.
The app currently records the single `lastVaultPath` in `userData/settings.json`, but does not maintain a multi-vault history or provide an in-app switcher where users can view and switch between recent vaults.
Furthermore, the right-hand Backlinks panel currently renders flat buttons without file-based grouping, and due to missing flexbox shrink constraints (`min-width: 0`), its indentation, badges, and snippets do not adjust fluidly when the panel is resized.

Read `AGENTS.md`, `GEMINI.md`, `PROGRESS.md`, `.agents/rules/*`, `.agents/workflows/*`, and `docs/06-UI-DESIGN-BRIEF.md`.

## Goal
Implement a persistent vault history and switcher save system where users can view recently opened vaults, see their last opened times, click any vault to navigate to it, remove stale vaults, or open new ones from disk. Additionally, refactor the Backlinks panel into a grouped tree layout with fluid, responsive indentation and line-wrapping that dynamically adapts to any panel width when resized.

## Tasks

1. **Vault Persistence & History Model (`src/shared/types.ts`, `src/shared/ipc.ts`, `src/main/config/settings.ts`)**
   - Define `RecentVault` interface:
     ```ts
     export interface RecentVault {
       path: string;
       name: string;
       lastOpened: number; // Unix timestamp in ms
     }
     ```
   - Update `AppSettings` to include `recentVaults?: RecentVault[]`.
   - Update `src/main/ipc/vault.ts`:
     - When `switchVault(vaultPath)` succeeds, update `recentVaults`:
       - Prepend `{ path: vaultPath, name: path.basename(vaultPath) || 'Vault', lastOpened: Date.now() }`.
       - Deduplicate entries by normalized path (case-insensitive comparison on Windows, exact on Linux).
       - Cap history to the 10 most recent vaults.
       - Persist to `settings.json`.
     - Add `vault:remove-recent` IPC channel to allow users to prune missing or unwanted vaults from history.
   - Expose typed methods in `src/preload/index.ts` and `src/shared/ipc.ts`.

2. **Vault Switcher Modal & Store Integration (`src/renderer/`)**
   - Extend `vaultStore.ts`:
     - Add `recentVaults: RecentVault[]`, `isVaultSwitcherOpen: boolean`.
     - Actions: `setVaultSwitcherOpen(open: boolean)`, `removeRecentVault(path: string)`, `openRecentVault(path: string)`.
     - Automatically populate `recentVaults` on startup and after any vault switch.
   - Create `src/renderer/components/modal/VaultSwitcherModal.tsx`:
     - Accessible dark-mode dialog with backdrop, following `tokens.css` design system.
     - Search/filter input for quickly filtering vaults by name or path.
     - Vault list showing:
       - Vault folder icon.
       - Vault name (primary text) and full path (subtle truncated text).
       - Active vault indicator badge ("Current").
       - Relative timestamp (e.g. "Just now", "2 hours ago", "Yesterday", or formatted date).
       - Remove button (`X` icon) to delete an entry from history.
     - Click action: clicking a recent vault triggers `openVaultPath` to navigate immediately to that vault.
     - "Open folder from disk..." button invoking native `chooseVault` dialog.
     - Keyboard navigation: `Escape` closes modal, `ArrowUp`/`ArrowDown` navigates list, `Enter` selects active item.
   - Wire UI entry points to open the Vault Switcher:
     - Titlebar vault name / folder icon.
     - File Tree header vault title.
     - Status bar vault name badge.
     - Keyboard shortcut `Mod+Shift+O` registered in command registry.

3. **Responsive Backlinks Panel (`src/renderer/components/sidebar/BacklinksPanel.tsx`)**
   - Group incoming backlinks by source note file:
     - Header: Note title, file icon, reference count badge, and collapsible toggle chevron.
     - Nested references list:
       - Line number badge (`L{line}`).
       - Snippet with highlighted target anchor.
       - Responsive indentation using tree guide line (`border-left: 1px solid var(--border-subtle)`).
   - Layout & Resize Fix:
     - Add `min-width: 0` to flex container and flex children to eliminate the CSS flex-shrink blockage.
     - Ensure note titles truncate with ellipsis (`text-overflow: ellipsis; white-space: nowrap; overflow: hidden`).
     - Ensure snippet text wraps dynamically with `overflow-wrap: break-word; word-break: break-word` and line clamp.
     - Indentation and margins scale proportionally with panel width without horizontal scrollbars or pushed-off content.

4. **Tests & Verification**
   - Unit tests in `tests/unit/vault-switcher.test.ts`:
     - Test recent vaults recording, deduplication, timestamp sorting, and removal.
     - Test relative time formatting.
     - Test backlink grouping by source file and line ordering.
   - E2E tests:
     - Verify Vault Switcher modal opens, displays recent vaults, and switches active vault when clicked.
     - Verify Backlinks panel scales its indentation and content cleanly without clipping when resized.

5. **Documentation**
   - Update `PROGRESS.md` with Phase 3.5 completion notes.

## Constraints
- **Obsidian compatibility**: Never modify notes or `.obsidian/` when switching vaults. Cache per-vault indexes inside each `<vault>/.cairn/`.
- **Renderer isolation**: All file existence checks and settings writes remain strictly in the main process via typed IPC.
- **Cross-platform**: Handle Windows drive letters, path separators, and case-insensitivity cleanly.
- **Strict TypeScript & ESLint**: Zero `any`, `strict: true`, zero lint warnings.

## Acceptance
- Opening any vault automatically adds/updates it in `recentVaults` in `settings.json`.
- The Vault Switcher modal displays recent vaults with names, paths, and last opened times.
- Clicking any recent vault immediately switches the app to that vault.
- Resizing the Backlinks panel from minimum width (180px) to wide widths preserves correct indentation, prevents horizontal overflow, truncates long titles gracefully, and wraps snippets responsively.
- `pnpm check` (typecheck + lint + unit tests) passes with 0 errors.
- `pnpm test:e2e` passes with 0 errors.

## Deliver
1. Comprehensive prompt file `prompts/PHASE-3.5-VAULT-SWITCHER-AND-BACKLINKS.md`.
2. Clear implementation plan with touch points, risks, and verification steps.
3. Wait for user review and explicit approval before modifying code.
