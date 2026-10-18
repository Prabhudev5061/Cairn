import watcher from '@parcel/watcher';
import { toVaultRelativePath } from '@shared/paths';
import { WatcherAlert, WatcherChangeType, WatcherEvent } from '@shared/types';

interface ActiveWriteEntry {
  timestamp: number;
}

const activeWrites = new Map<string, ActiveWriteEntry>();

function normalizeKey(relPath: string): string {
  const normalized = relPath.replace(/\\/g, '/');
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

/**
 * Registers an upcoming write path so the subsequent file watcher event
 * is suppressed (avoiding feedback loops and false external conflict notices).
 */
export function markActiveWrite(relPath: string): void {
  activeWrites.set(normalizeKey(relPath), { timestamp: Date.now() });
}

/**
 * Removes an active write mark if needed.
 */
export function unmarkActiveWrite(relPath: string): void {
  activeWrites.delete(normalizeKey(relPath));
}

function isSelfWrite(relPath: string): boolean {
  const key = normalizeKey(relPath);
  const entry = activeWrites.get(key);
  if (!entry) {
    return false;
  }
  // If registered within the last 5 seconds, it's a self-write
  if (Date.now() - entry.timestamp < 5000) {
    activeWrites.delete(key);
    return true;
  }
  activeWrites.delete(key);
  return false;
}

export type WatcherCallback = (events: WatcherEvent[]) => void;
export type AlertCallback = (alert: WatcherAlert) => void;

/**
 * Starts watching a vault root using @parcel/watcher with:
 * - 100ms debounce
 * - Self-write suppression
 * - Ignored internal directories (.obsidian, .cairn, .git, node_modules)
 * - Linux inotify limit error handling
 */
export async function startVaultWatcher(
  vaultRoot: string,
  onEvents: WatcherCallback,
  onAlert: AlertCallback
): Promise<() => Promise<void>> {
  let pendingEvents: WatcherEvent[] = [];
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const flush = (): void => {
    if (pendingEvents.length > 0) {
      const toSend = [...pendingEvents];
      pendingEvents = [];
      onEvents(toSend);
    }
  };

  try {
    const subscription = await watcher.subscribe(
      vaultRoot,
      (err, events) => {
        if (err) {
          const errCode = (err as NodeJS.ErrnoException).code;
          const isEnospc = errCode === 'ENOSPC' || err.message.includes('ENOSPC');
          if (isEnospc) {
            onAlert({
              type: 'inotify-limit',
              message:
                'System inotify watch limit reached. External vault changes might not be detected.'
            });
          } else {
            onAlert({
              type: 'error',
              message: `Watcher error: ${err.message}`
            });
          }
          return;
        }

        for (const event of events) {
          const relPath = toVaultRelativePath(event.path, vaultRoot);
          if (!relPath) {
            continue;
          }

          // Ignore temp files and internal folders
          const parts = relPath.split('/');
          if (parts.some((p) => p.startsWith('.') || p === 'node_modules')) {
            continue;
          }

          // Self-write suppression
          if (isSelfWrite(relPath)) {
            continue;
          }

          const changeType: WatcherChangeType =
            event.type === 'create' ? 'create' : event.type === 'delete' ? 'delete' : 'update';

          pendingEvents.push({
            type: changeType,
            path: relPath
          });
        }

        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
        debounceTimer = setTimeout(flush, 100);
      },
      {
        ignore: ['.obsidian/**', '.cairn/**', '.git/**', 'node_modules/**', '**/.cairn-tmp-*']
      }
    );

    return async (): Promise<void> => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      pendingEvents = [];
      await subscription.unsubscribe();
    };
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOSPC' || err.message?.includes('ENOSPC')) {
      onAlert({
        type: 'inotify-limit',
        message: 'System inotify watch limit reached. External changes might not be detected.'
      });
    } else {
      onAlert({
        type: 'error',
        message: `Failed to initialize vault watcher: ${err.message}`
      });
    }
    // Return a no-op teardown function
    return async () => {};
  }
}
