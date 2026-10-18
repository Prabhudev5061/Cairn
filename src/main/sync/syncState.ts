import crypto from 'crypto';
import { existsSync, promises as fs } from 'fs';
import path from 'path';
import type { StoredSyncState } from '../../shared/sync/types';

/**
 * Computes both SHA-256 (for local integrity) and MD5 (for Google Drive parity) hashes.
 */
export function computeFileHashes(content: Buffer): { sha256: string; md5: string } {
  const sha256 = crypto.createHash('sha256').update(content).digest('hex');
  const md5 = crypto.createHash('md5').update(content).digest('hex');
  return { sha256, md5 };
}

function getSyncStatePath(vaultPath: string): string {
  return path.join(vaultPath, '.cairn', 'sync-state.json');
}

/**
 * Loads the stored sync state for a vault. Returns a fresh default state if none exists.
 */
export async function loadSyncState(vaultPath: string): Promise<StoredSyncState> {
  const statePath = getSyncStatePath(vaultPath);
  try {
    if (!existsSync(statePath)) {
      return {
        version: 1,
        vaultPath,
        remoteFolderId: '',
        lastSyncTimestamp: 0,
        files: {},
        conflicts: []
      };
    }

    const data = await fs.readFile(statePath, 'utf8');
    const parsed = JSON.parse(data) as StoredSyncState;
    if (parsed && parsed.version === 1 && typeof parsed.files === 'object') {
      return parsed;
    }
  } catch {
    // If corrupted, fallback to clean state
  }

  return {
    version: 1,
    vaultPath,
    remoteFolderId: '',
    lastSyncTimestamp: 0,
    files: {},
    conflicts: []
  };
}

/**
 * Persists the sync state atomically to <vault>/.cairn/sync-state.json.
 */
export async function saveSyncState(vaultPath: string, state: StoredSyncState): Promise<void> {
  const statePath = getSyncStatePath(vaultPath);
  const dir = path.dirname(statePath);

  await fs.mkdir(dir, { recursive: true });

  const tmpPath = path.join(dir, `.sync-state-tmp-${Date.now()}`);
  const json = JSON.stringify(state, null, 2);

  await fs.writeFile(tmpPath, json, 'utf8');
  await fs.rename(tmpPath, statePath);
}

/**
 * Generates an Obsidian-compatible conflict filename, e.g. "note (conflict 2026-10-18-2100).md".
 */
export function generateConflictPath(originalRelPath: string): string {
  const ext = path.extname(originalRelPath);
  const baseWithoutExt = originalRelPath.slice(0, originalRelPath.length - ext.length);

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  const timestamp = `${year}-${month}-${day}-${hours}${minutes}${seconds}`;
  return `${baseWithoutExt} (conflict ${timestamp})${ext}`;
}
