# PHASE 6: Cloud Vault Sync: Google Drive Integration

## Context
Phases 0 through 5.5 are complete, fully tested, and green in CI:
- **Phase 0**: Scaffolding, security baseline, typed IPC, Vitest & Playwright, dual-platform CI (Windows & Linux).
- **Phase 1**: Walking skeleton, safe atomic file I/O, `@parcel/watcher`, file tree, layout shell.
- **Phase 2 & 2.5**: CodeMirror 6 live-preview editor, KaTeX math typesetting, Vim modal editing, autocomplete, GFM tables, fenced code highlighting, callouts, and frontmatter cards.
- **Phase 3 & 3.5**: Obsidian-compatible wikilinks, shortest-path resolver, reactive vault indexer, backlinks panel, vault search, vault switcher save system, and responsive layout.
- **Phase 4**: Interactive 2D canvas force-directed graph view (global & local), zero-overlap compact labels, sublinear degree scaling, and 0% idle CPU physics cooldown.
- **Phase 5 & 5.5**: Multi-format support via `FormatPlugin` (Markdown, Org-mode, Typst, AsciiDoc), format-specific live preview decorators (Org TODO/DONE badges, Typst KaTeX math, AsciiDoc callouts), and interactive cross-format link navigation.

Currently, Cairn operates entirely on local disk vaults. In Phase 6, we introduce an **offline-first cloud vault sync engine** powered by **Google Drive REST API v3**. The local disk remains the single source of truth; cloud sync acts as an automated, non-destructive bridge across devices with robust conflict preservation.

---

## Goal
Implement two-way incremental cloud vault synchronization with Google Drive. Users can connect their Google account via standard OAuth 2.0 PKCE, designate a cloud folder, and sync notes automatically or on demand. Synchronization preserves all non-negotiables: local files remain the source of truth, file writes are atomic, line endings and BOMs are preserved, and merge conflicts are never destructive (creating duplicate conflict copies rather than overwriting edits). The UI features a real-time status bar sync indicator and a dedicated Cloud Sync modal for managing account connection, transfer progress, and conflict history.

---

## Tasks

### 1. OAuth 2.0 PKCE Flow & Secure Credential Storage (`src/main/sync/`)
- Implement RFC 7636 PKCE (Proof Key for Code Exchange) in `src/main/sync/oauth.ts`:
  - Generate cryptographically secure `code_verifier` (43-128 random chars) and base64url SHA-256 `code_challenge`.
  - Start an ephemeral local HTTP loopback server on `127.0.0.1` with a dynamically allocated port to receive the OAuth callback.
  - Construct the Google OAuth authorization URL targeting the `https://www.googleapis.com/auth/drive.file` scope (least privilege: only accesses files created or opened by Cairn, never reading the user's personal Google Drive contents).
  - Launch system browser via Electron `shell.openExternal(authUrl)`.
  - Handle OAuth callback, validate state parameter, exchange authorization code for `access_token` and `refresh_token`, and auto-shutdown loopback server.
- Secure token storage in `src/main/sync/tokenStore.ts`:
  - Encrypt refresh tokens using Electron's native `safeStorage.encryptString()` / `safeStorage.decryptString()`.
  - Persist encrypted tokens in `userData/settings.json` under `cloudSync.googleDrive`.
  - Handle automatic token refresh when `access_token` expires.
  - Support a mock authentication mode for headless CI and offline environments.

### 2. Google Drive Client & Metadata API (`src/main/sync/`)
- Implement `GoogleDriveClient` in `src/main/sync/googleDriveClient.ts` using Node's standard `fetch` (zero unnecessary external SDK bloat):
  - `getOrCreateVaultFolder(folderName: string)`: Finds or creates the dedicated Cairn vault folder on Google Drive.
  - `listFiles(folderId: string)`: Recursively retrieves remote file metadata (id, name, mimeType, modifiedTime, md5Checksum, parents).
  - `uploadFile(parentFolderId: string, relativePath: string, content: Buffer, mimeType: string)`: Creates new remote file or folder.
  - `updateFile(fileId: string, content: Buffer, mimeType: string)`: Updates existing remote file content and metadata.
  - `downloadFile(fileId: string)`: Streams and downloads remote file contents as Buffer.
  - `trashFile(fileId: string)`: Moves remote file to Drive trash when deleted locally.
  - Exponential backoff and retry strategy for HTTP 429 (rate limits) and 5xx transient network errors.

### 3. Incremental Sync Engine & Non-Destructive Conflict Resolution (`src/main/sync/`)
- Implement `SyncState` manager in `src/main/sync/syncState.ts`:
  - Persist per-vault sync cache at `<vault>/.cairn/sync-state.json`.
  - Track mapping: `relativePath` -> `{ driveFileId, driveModifiedTime, localMtime, localHash, driveMd5 }`.
- Implement `SyncEngine` in `src/main/sync/syncEngine.ts`:
  - **Local change detection**: Scan local vault files (all formats: `.md`, `.org`, `.typ`, `.adoc`), compute SHA-256 hashes, compare with `sync-state.json`.
  - **Remote change detection**: Query Google Drive folder metadata, compare `md5Checksum` and `modifiedTime` against last sync state.
  - **Reconciliation Matrix**:
    - *Local Added, Remote None* -> Upload to Drive, record ID and hashes in state.
    - *Remote Added, Local None* -> Download to local disk using atomic write (`.cairn-tmp-*` -> rename), preserve formatting.
    - *Local Modified, Remote Untouched* -> Upload update to Drive, update state.
    - *Remote Modified, Local Untouched* -> Download update to local disk using atomic write, update state.
    - *Local Deleted, Remote Untouched* -> Trash file on Google Drive.
    - *Remote Deleted, Local Untouched* -> Move local file to trash via `shell.trashItem`.
    - *Both Modified (Conflict)*: **Zero data loss**. Keep local edit intact, save remote version as `<filename> (conflict <YYYY-MM-DD-HHmm>).<ext>`, and notify user via sync status.
  - Guard against active file watcher loops: suppress local watcher events for files downloaded by the sync engine.

### 4. Typed IPC Contracts & Preload Exposure (`src/shared/ipc.ts`, `src/preload/`)
- Define IPC channels in `src/shared/ipc.ts`:
  - `sync:get-status` -> Request: `void`, Response: `Result<SyncStatus>`
  - `sync:start-auth` -> Request: `{ customClientId?: string }`, Response: `Result<{ success: boolean }>`
  - `sync:disconnect` -> Request: `void`, Response: `Result<{ disconnected: boolean }>`
  - `sync:trigger` -> Request: `{ dryRun?: boolean }`, Response: `Result<SyncSummary>`
  - `sync:get-settings` / `sync:update-settings` -> Auto-sync interval, on-save sync toggle.
  - Push event `sync:status-changed` broadcasting `{ state: 'idle' | 'syncing' | 'error' | 'offline', progress?: { current: number, total: number }, lastSyncTime?: number, error?: string }`.
- Expose safe typed wrappers in `src/preload/index.ts`.

### 5. Renderer Sync Store & UI Components (`src/renderer/`)
- Create `useSyncStore` in `src/renderer/stores/syncStore.ts`:
  - Tracks sync state, connection status, account email, last sync timestamp, and active conflict list.
  - Listens to `sync:status-changed` events.
- Status Bar Indicator in `src/renderer/components/statusbar/StatusBar.tsx`:
  - Cloud icon reflecting live status:
    - `CloudOff`: Disconnected / Not configured.
    - `CloudCheck`: Synced / Up to date.
    - `Cloud` (spinning): Actively syncing.
    - `CloudAlert`: Conflict detected or sync error.
  - Clicking indicator opens the Cloud Sync Modal.
- Cloud Sync Modal in `src/renderer/components/modal/CloudSyncModal.tsx`:
  - Account info card with connected Google Drive email and folder name.
  - "Connect Google Drive" button initiating PKCE browser authorization.
  - "Sync Now" action button with detailed transfer log.
  - Auto-sync toggle (manual, on save, or periodic every 5 minutes).
  - Conflict list with direct links to open both local and conflict notes side by side.
  - "Disconnect Account" option with confirmation.

---

## Constraints
- **Files are the source of truth**: Local disk files are never blocked or replaced without safe atomic fallback. The cloud is a replica, not a lock.
- **Least privilege scope**: Use `https://www.googleapis.com/auth/drive.file`. Never request full Google Drive access (`drive` or `drive.readonly`).
- **No plaintext tokens**: Refresh tokens must be encrypted via Electron `safeStorage`.
- **Renderer never touches network or fs**: All OAuth, HTTP requests, and disk operations stay strictly inside the main process.
- **Cross-platform**: Ephemeral loopback port works cleanly on Windows, Linux, and macOS without firewall popup issues.
- **Dependencies**: Use standard Node.js `fetch` and `crypto` built-ins. Do NOT install heavy Google API client libraries (`googleapis`) which add 50+ MB of bundle weight.

---

## Acceptance Criteria
- [x] `sync:get-status` returns accurate status before, during, and after synchronization.
- [x] OAuth 2.0 PKCE flow correctly initiates system browser, completes via loopback HTTP server, and stores encrypted credentials.
- [x] Incremental two-way sync correctly synchronizes new notes, edits, and deletions between local vault and Google Drive folder.
- [x] Conflict scenario (both modified concurrently) creates `<filename> (conflict <timestamp>).<ext>` without data loss or file corruption.
- [x] Atomic file creation on local download preserves CRLF/LF line endings, UTF-8 BOM, and unknown syntax.
- [x] Status bar displays real-time sync state (`CloudCheck`, `Cloud` spinner, `CloudAlert`).
- [x] Cloud Sync Modal allows connecting, disconnecting, manual sync triggering, and viewing conflict files.
- [x] All unit tests pass in `tests/unit/sync.test.ts`.
- [x] End-to-end integration test passes in `tests/e2e/sync-phase6.spec.ts`.
- [x] `pnpm check` and `pnpm test:e2e` pass with 100% green tests.

---

## Deliverables
1. `src/main/sync/oauth.ts`, `tokenStore.ts`, `googleDriveClient.ts`, `syncState.ts`, `syncEngine.ts`.
2. `src/shared/sync/types.ts` with typed sync contracts and status definitions.
3. `src/shared/ipc.ts` and `src/preload/index.ts` with typed sync channels.
4. `src/renderer/stores/syncStore.ts` and `src/renderer/components/modal/CloudSyncModal.tsx`.
5. Status bar sync indicator in `StatusBar.tsx`.
6. ADR 0006 in `docs/adr/0006-cloud-vault-sync-google-drive.md`.
7. Comprehensive unit tests in `tests/unit/sync.test.ts` and E2E specs in `tests/e2e/sync-phase6.spec.ts`.
8. Updated `PROGRESS.md` and `docs/05-ROADMAP.md`.
