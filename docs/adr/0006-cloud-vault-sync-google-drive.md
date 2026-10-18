# ADR 0006: Offline-First Cloud Vault Synchronization via Google Drive REST API v3

## Status
Accepted

## Context
As users take notes across desktop machines, they require transparent synchronization without compromising Cairn's core tenets:
1. **Local Files Remain the Source of Truth**: Notes reside as plain text on disk. Cloud storage is a replica, not a lock.
2. **Zero Data Loss & Non-Destructive Conflict Handling**: In the event of conflicting concurrent edits, Cairn must never overwrite either version.
3. **Strict Electron Security**: The renderer process must never possess direct filesystem or internet access. Authentication tokens must be encrypted via OS-level credential stores.
4. **Least-Privilege Scoping**: Access must be strictly restricted to files created or opened by Cairn, never reading or indexing the user's broader Google Drive contents.
5. **Zero Heavy SDK Dependencies**: Standard Google client SDKs (`googleapis`) add 50+ MB of unneeded dependencies. Cairn interacts directly with the lightweight Google Drive v3 REST endpoints via Node.js `fetch`.

---

## Decision

### 1. OAuth 2.0 with PKCE and Loopback Server (`src/main/sync/oauth.ts`)
We adopted the IETF RFC 7636 (PKCE) and RFC 8252 (OAuth 2.0 for Native Apps) specification:
- The main process generates a cryptographically random `code_verifier` (43+ chars) and a SHA-256 base64url-encoded `code_challenge`.
- An ephemeral HTTP loopback server is spawned on `127.0.0.1` on an OS-assigned dynamic port (port 0) to receive the callback.
- The authorization URL uses the least-privilege `https://www.googleapis.com/auth/drive.file email` scope and launches in the user's default system browser via `shell.openExternal`.
- Upon callback arrival, the state parameter is verified, authorization code is exchanged for access and refresh tokens, and the loopback server is immediately closed.

### 2. Secure Token Storage (`src/main/sync/tokenStore.ts`)
- Refresh tokens are encrypted using Electron's native `safeStorage` API (Windows DPAPI, macOS Keychain, Linux Secret Service).
- Stored safely in `userData/settings.json` under `cloudSync.googleDrive.encryptedRefreshToken`.
- When `safeStorage` is unavailable (e.g. headless CI environments or minimal containers), an obfuscated fallback format ensures the app never crashes.

### 3. Lightweight REST API Client (`src/main/sync/googleDriveClient.ts`)
- Calls Google Drive v3 endpoints directly using Node `fetch`:
  - `getOrCreateFolder`: Discovers or creates folders.
  - `listFiles`: Recursively queries files with pagination.
  - `uploadFile`: Sends multipart requests containing JSON metadata and raw file buffers.
  - `updateFile`: Sends media patch requests with file buffers.
  - `downloadFile`: Streams raw file contents as Buffer.
  - `trashFile`: Soft-deletes files by setting `trashed: true`.
- Exponential backoff retry logic handles HTTP 429 rate limits and 5xx network glitches.
- A deterministic `MockGoogleDriveClient` is provided for offline testing, CI automation, and demo sandboxing.

### 4. Incremental Sync & Reconciliation (`src/main/sync/syncEngine.ts`)
Per-vault sync metadata is tracked locally at `<vault>/.cairn/sync-state.json`.
The reconciliation matrix handles all 8 states:
- **Local Add**: Uploaded to Drive, ID and hashes recorded.
- **Remote Add**: Downloaded to local vault via atomic `.cairn-tmp-*` -> rename, preserving EOL and BOM.
- **Local Edit**: Uploaded to Drive, updating metadata.
- **Remote Edit**: Downloaded locally via atomic write.
- **Local Delete**: Remote file trashed on Drive.
- **Remote Delete**: Local file moved to system trash via `shell.trashItem`.
- **Concurrent Edit (Conflict)**:
  - If content hashes match: no conflict, state updated.
  - If content differs: The local file is preserved as canonical, while the remote version is saved locally as `<filename> (conflict <YYYY-MM-DD-HHmmss>).<ext>`. Both copies are immediately accessible in the editor, ensuring **zero data loss**.

### 5. UI Integration & Feedback (`src/renderer/`)
- **Status Bar Indicator (`StatusBar.tsx`)**: Reflects live status (`CloudOff`, `CloudCheck` for synced, spinning `RefreshCw` during transfer, and `AlertTriangle` for conflicts).
- **Cloud Sync Modal (`CloudSyncModal.tsx`)**: Provides account status, "Sync Now" action with detailed progress feedback, auto-sync scheduling (every 5 minutes), and a list of active preserved conflicts.
- **Global Command (`sync:open`)**: Rebindable keyboard shortcut `Mod+Shift+S` opens the sync panel.

---

## Consequences

### Positive
- Fully automated two-way cloud backup and synchronization across all supported note formats (`.md`, `.org`, `.typ`, `.adoc`).
- Non-destructive conflict handling guarantees that user thoughts are never silently overwritten.
- Least-privilege OAuth scope ensures zero access to user personal Drive files outside of Cairn.
- Zero external package dependencies added to `package.json`, keeping the bundle compact and performant.
- Mock mode enables complete end-to-end testing in offline CI environments without Google API credentials.

### Negative / Trade-offs
- Synchronization requires an active internet connection when using live Google Drive. Offline edits are queued and synced upon reconnect.
- Very large binary attachments (if added in the future) may require resumable upload endpoints rather than multipart requests.
