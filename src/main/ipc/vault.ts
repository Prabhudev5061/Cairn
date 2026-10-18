import { existsSync, statSync } from 'fs';
import path from 'path';
import { BrowserWindow, dialog, ipcMain } from 'electron';
import { loadSettings, saveSettings } from '../config/settings';
import { VaultIndexer } from '../indexer/indexer';
import { createNote, deleteNote, readNote, renameNote, writeNoteAtomic } from '../vault/io';
import { resolveInsideVault } from '../vault/paths';
import { scanVaultTree } from '../vault/tree';
import { markActiveWrite, startVaultWatcher } from '../vault/watcher';
import {
  AppSettings,
  FileMetadata,
  IPC_CHANNELS,
  IpcResult,
  RecentVault,
  VaultTreeNode,
  WatcherAlert,
  WatcherEvent,
  recordRecentVault,
  removeRecentVaultEntry
} from '@shared/ipc';

let currentVaultPath: string | null = null;
export function getActiveVaultPath(): string | null {
  return currentVaultPath;
}
let currentIndexer: VaultIndexer | null = null;
let stopWatcher: (() => Promise<void>) | null = null;

function sendToWindows(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, payload);
    }
  }
}

async function switchVault(vaultPath: string): Promise<IpcResult<{ path: string; name: string }>> {
  try {
    if (!existsSync(vaultPath)) {
      return { ok: false, error: `Folder does not exist: ${vaultPath}` };
    }
    const stat = statSync(vaultPath);
    if (!stat.isDirectory()) {
      return { ok: false, error: `Path is not a directory: ${vaultPath}` };
    }

    if (stopWatcher) {
      await stopWatcher();
      stopWatcher = null;
    }

    if (currentIndexer) {
      currentIndexer.dispose();
      currentIndexer = null;
    }

    const resolvedPath = path.resolve(vaultPath);
    const vaultName = path.basename(resolvedPath) || 'Vault';
    currentVaultPath = resolvedPath;

    // Update settings with lastVaultPath and deduplicated recentVaults history
    const currentSettings = await loadSettings();
    const recentVaults = recordRecentVault(
      currentSettings.recentVaults || [],
      resolvedPath,
      vaultName
    );
    await saveSettings({ lastVaultPath: resolvedPath, recentVaults });

    currentIndexer = new VaultIndexer(vaultPath);
    await currentIndexer.init();

    stopWatcher = await startVaultWatcher(
      vaultPath,
      (events: WatcherEvent[]) => {
        for (const evt of events) {
          if (evt.type === 'delete') {
            currentIndexer?.handleFileDelete(evt.path);
          } else {
            void currentIndexer?.handleFileUpdate(evt.path);
          }
          sendToWindows(IPC_CHANNELS.VAULT_WATCH_EVENT, evt);
        }
      },
      (alert: WatcherAlert) => {
        sendToWindows(IPC_CHANNELS.VAULT_WATCH_ALERT, alert);
      }
    );

    const result = {
      path: vaultPath,
      name: path.basename(vaultPath) || 'Vault'
    };

    sendToWindows(IPC_CHANNELS.VAULT_SWITCHED, result);

    return {
      ok: true,
      value: result
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export function registerVaultHandlers(): void {
  // Choose vault via native dialog
  ipcMain.handle(
    IPC_CHANNELS.VAULT_CHOOSE,
    async (): Promise<IpcResult<{ path: string; name: string } | null>> => {
      try {
        const result = await dialog.showOpenDialog({
          properties: ['openDirectory']
        });

        if (result.canceled || !result.filePaths[0]) {
          return { ok: true, value: null };
        }

        return await switchVault(result.filePaths[0]);
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    }
  );

  // Open vault by direct path (used for tests and recent vault restore)
  ipcMain.handle(
    IPC_CHANNELS.VAULT_OPEN_PATH,
    async (
      _event,
      req: { path: string }
    ): Promise<IpcResult<{ path: string; name: string }>> => {
      if (!req || !req.path) {
        return { ok: false, error: 'Path is required' };
      }
      return await switchVault(req.path);
    }
  );

  // Get current active vault
  ipcMain.handle(
    IPC_CHANNELS.VAULT_GET_CURRENT,
    async (): Promise<IpcResult<{ path: string; name: string } | null>> => {
      if (!currentVaultPath) {
        return { ok: true, value: null };
      }
      return {
        ok: true,
        value: {
          path: currentVaultPath,
          name: path.basename(currentVaultPath) || 'Vault'
        }
      };
    }
  );

  // List vault file tree
  ipcMain.handle(
    IPC_CHANNELS.VAULT_LIST_TREE,
    async (): Promise<IpcResult<VaultTreeNode>> => {
      if (!currentVaultPath) {
        return { ok: false, error: 'No vault is currently open' };
      }
      try {
        const tree = await scanVaultTree(currentVaultPath);
        return { ok: true, value: tree };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    }
  );

  // Read note
  ipcMain.handle(
    IPC_CHANNELS.NOTE_READ,
    async (
      _event,
      req: { path: string }
    ): Promise<IpcResult<{ content: string; metadata: FileMetadata }>> => {
      if (!currentVaultPath) {
        return { ok: false, error: 'No vault is currently open' };
      }
      try {
        const fullPath = resolveInsideVault(currentVaultPath, req.path);
        const result = await readNote(fullPath);
        return { ok: true, value: result };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    }
  );

  // Write note atomically
  ipcMain.handle(
    IPC_CHANNELS.NOTE_WRITE,
    async (
      _event,
      req: { path: string; content: string; metadata?: FileMetadata }
    ): Promise<IpcResult<{ written: boolean }>> => {
      if (!currentVaultPath) {
        return { ok: false, error: 'No vault is currently open' };
      }
      try {
        const fullPath = resolveInsideVault(currentVaultPath, req.path);
        // Suppress self-write in watcher
        markActiveWrite(req.path);
        const result = await writeNoteAtomic(fullPath, req.content, req.metadata);
        if (currentIndexer) {
          void currentIndexer.handleFileUpdate(req.path);
        }
        return { ok: true, value: result };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    }
  );

  // Create new note
  ipcMain.handle(
    IPC_CHANNELS.NOTE_CREATE,
    async (
      _event,
      req: { path: string }
    ): Promise<IpcResult<{ path: string }>> => {
      if (!currentVaultPath) {
        return { ok: false, error: 'No vault is currently open' };
      }
      try {
        const fullPath = resolveInsideVault(currentVaultPath, req.path);
        markActiveWrite(req.path);
        await createNote(fullPath);
        if (currentIndexer) {
          void currentIndexer.handleFileUpdate(req.path);
        }
        return { ok: true, value: { path: req.path } };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    }
  );

  // Rename note
  ipcMain.handle(
    IPC_CHANNELS.NOTE_RENAME,
    async (
      _event,
      req: { oldPath: string; newPath: string }
    ): Promise<IpcResult<{ path: string }>> => {
      if (!currentVaultPath) {
        return { ok: false, error: 'No vault is currently open' };
      }
      try {
        const oldFullPath = resolveInsideVault(currentVaultPath, req.oldPath);
        const newFullPath = resolveInsideVault(currentVaultPath, req.newPath);
        markActiveWrite(req.oldPath);
        markActiveWrite(req.newPath);
        await renameNote(oldFullPath, newFullPath);
        if (currentIndexer) {
          currentIndexer.handleFileDelete(req.oldPath);
          void currentIndexer.handleFileUpdate(req.newPath);
        }
        return { ok: true, value: { path: req.newPath } };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    }
  );

  // Delete note
  ipcMain.handle(
    IPC_CHANNELS.NOTE_DELETE,
    async (
      _event,
      req: { path: string }
    ): Promise<IpcResult<void>> => {
      if (!currentVaultPath) {
        return { ok: false, error: 'No vault is currently open' };
      }
      try {
        const fullPath = resolveInsideVault(currentVaultPath, req.path);
        markActiveWrite(req.path);
        await deleteNote(fullPath);
        if (currentIndexer) {
          currentIndexer.handleFileDelete(req.path);
        }
        return { ok: true, value: undefined };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    }
  );

  // Get note backlinks
  ipcMain.handle(
    IPC_CHANNELS.INDEX_GET_BACKLINKS,
    async (_event, req: { path: string }) => {
      if (!currentIndexer) {
        return { ok: true, value: [] };
      }
      return { ok: true, value: currentIndexer.getBacklinks(req.path) };
    }
  );

  // Search vault
  ipcMain.handle(
    IPC_CHANNELS.INDEX_SEARCH,
    async (_event, req: { query: string }) => {
      if (!currentIndexer) {
        return { ok: true, value: [] };
      }
      return { ok: true, value: currentIndexer.search(req.query) };
    }
  );

  // Get graph data
  ipcMain.handle(
    IPC_CHANNELS.INDEX_GET_GRAPH_DATA,
    async () => {
      if (!currentIndexer) {
        return { ok: true, value: { nodes: [], links: [] } };
      }
      return { ok: true, value: currentIndexer.getGraphData() };
    }
  );

  // Get all indexed entries
  ipcMain.handle(
    IPC_CHANNELS.INDEX_GET_ALL_ENTRIES,
    async () => {
      if (!currentIndexer) {
        return { ok: true, value: [] };
      }
      return { ok: true, value: currentIndexer.getAllEntries() };
    }
  );

  // Rename note and refactor incoming links
  ipcMain.handle(
    IPC_CHANNELS.VAULT_RENAME_NOTE_REFACTOR,
    async (
      _event,
      req: { oldPath: string; newPath: string }
    ): Promise<IpcResult<{ path: string; updatedFilesCount: number }>> => {
      if (!currentVaultPath || !currentIndexer) {
        return { ok: false, error: 'No vault is currently open' };
      }
      try {
        const oldFullPath = resolveInsideVault(currentVaultPath, req.oldPath);
        const newFullPath = resolveInsideVault(currentVaultPath, req.newPath);
        markActiveWrite(req.oldPath);
        markActiveWrite(req.newPath);
        await renameNote(oldFullPath, newFullPath);
        const refactorResult = await currentIndexer.refactorNoteRename(req.oldPath, req.newPath);
        return {
          ok: true,
          value: {
            path: req.newPath,
            updatedFilesCount: refactorResult.updatedFilesCount
          }
        };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    }
  );

  // Settings
  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_GET,
    async (): Promise<IpcResult<AppSettings>> => {
      try {
        const settings = await loadSettings();
        return { ok: true, value: settings };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_SET,
    async (
      _event,
      req: Partial<AppSettings>
    ): Promise<IpcResult<void>> => {
      try {
        await saveSettings(req);
        return { ok: true, value: undefined };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.VAULT_REMOVE_RECENT,
    async (
      _event,
      req: { path?: string }
    ): Promise<IpcResult<RecentVault[]>> => {
      try {
        if (!req || typeof req.path !== 'string') {
          return { ok: false, error: 'Invalid path argument' };
        }
        const currentSettings = await loadSettings();
        const updated = removeRecentVaultEntry(
          currentSettings.recentVaults || [],
          req.path
        );
        await saveSettings({ recentVaults: updated });
        return { ok: true, value: updated };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    }
  );
}

/**
 * Initializes vault state on app launch, restoring the last opened vault if valid.
 */
export async function initVaultService(): Promise<void> {
  const settings = await loadSettings();
  if (settings.lastVaultPath && existsSync(settings.lastVaultPath)) {
    await switchVault(settings.lastVaultPath);
  }
}
