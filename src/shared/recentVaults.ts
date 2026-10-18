import { RecentVault } from './types';

/**
 * Normalizes backslashes to forward slashes and trims trailing slashes.
 */
export function normalizeVaultPath(p: string): string {
  return p.replace(/\\/g, '/').replace(/\/+$/, '');
}

/**
 * Detects whether the current runtime platform is Windows across Node, Electron, and browser environments.
 */
export function detectIsWindows(): boolean {
  if (typeof process !== 'undefined' && process?.platform) {
    return process.platform === 'win32';
  }
  if (typeof navigator !== 'undefined' && navigator.userAgent) {
    return /win/i.test(navigator.userAgent);
  }
  return false;
}

/**
 * Checks if two vault paths match according to platform semantics.
 * On Windows, comparison is case-insensitive. On other platforms, case-sensitive.
 */
export function isSameVaultPath(
  p1: string,
  p2: string,
  isWindows: boolean = detectIsWindows()
): boolean {
  const norm1 = normalizeVaultPath(p1);
  const norm2 = normalizeVaultPath(p2);
  return isWindows ? norm1.toLowerCase() === norm2.toLowerCase() : norm1 === norm2;
}

/**
 * Records a vault into recent vaults list, deduplicating existing entries,
 * prepending the newest entry, and capping to max 10.
 */
export function recordRecentVault(
  existing: RecentVault[],
  vaultPath: string,
  vaultName?: string,
  timestamp: number = Date.now(),
  isWindows: boolean = detectIsWindows()
): RecentVault[] {
  const normPath = normalizeVaultPath(vaultPath);
  const name = vaultName || normPath.split('/').filter(Boolean).pop() || 'Vault';
  const filtered = existing.filter((r) => !isSameVaultPath(r.path, normPath, isWindows));
  const newEntry: RecentVault = {
    path: vaultPath,
    name,
    lastOpened: timestamp
  };
  return [newEntry, ...filtered].slice(0, 10);
}

/**
 * Removes a vault path from recent vaults.
 */
export function removeRecentVaultEntry(
  existing: RecentVault[],
  targetPath: string,
  isWindows: boolean = detectIsWindows()
): RecentVault[] {
  return existing.filter((r) => !isSameVaultPath(r.path, targetPath, isWindows));
}

/**
 * Formats a unix timestamp in ms to a friendly relative time string.
 */
export function formatRelativeTime(timestamp: number, now: number = Date.now()): string {
  const diff = Math.max(0, now - timestamp);
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return 'Just now';
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  if (hours < 24) {
    return `${hours}h ago`;
  }
  if (days === 1) {
    return 'Yesterday';
  }
  if (days < 7) {
    return `${days}d ago`;
  }

  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
