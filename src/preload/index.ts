import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import {
  AppPingResponse,
  AppSettings,
  CairnApi,
  FileMetadata,
  IPC_CHANNELS,
  IpcResult,
  RecentVault,
  VaultTreeNode,
  WatcherAlert,
  WatcherEvent
} from '@shared/ipc';

const api: CairnApi = {
  ping: (): Promise<AppPingResponse> => ipcRenderer.invoke(IPC_CHANNELS.APP_PING),

  chooseVault: (): Promise<IpcResult<{ path: string; name: string } | null>> =>
    ipcRenderer.invoke(IPC_CHANNELS.VAULT_CHOOSE),

  openVaultPath: (req: { path: string }): Promise<IpcResult<{ path: string; name: string }>> =>
    ipcRenderer.invoke(IPC_CHANNELS.VAULT_OPEN_PATH, req),

  getCurrentVault: (): Promise<IpcResult<{ path: string; name: string } | null>> =>
    ipcRenderer.invoke(IPC_CHANNELS.VAULT_GET_CURRENT),

  listTree: (): Promise<IpcResult<VaultTreeNode>> =>
    ipcRenderer.invoke(IPC_CHANNELS.VAULT_LIST_TREE),

  readNote: (req: {
    path: string;
  }): Promise<IpcResult<{ content: string; metadata: FileMetadata }>> =>
    ipcRenderer.invoke(IPC_CHANNELS.NOTE_READ, req),

  writeNote: (req: {
    path: string;
    content: string;
    metadata?: FileMetadata;
  }): Promise<IpcResult<{ written: boolean }>> =>
    ipcRenderer.invoke(IPC_CHANNELS.NOTE_WRITE, req),

  createNote: (req: { path: string }): Promise<IpcResult<{ path: string }>> =>
    ipcRenderer.invoke(IPC_CHANNELS.NOTE_CREATE, req),

  renameNote: (req: {
    oldPath: string;
    newPath: string;
  }): Promise<IpcResult<{ path: string }>> =>
    ipcRenderer.invoke(IPC_CHANNELS.NOTE_RENAME, req),

  deleteNote: (req: { path: string }): Promise<IpcResult<void>> =>
    ipcRenderer.invoke(IPC_CHANNELS.NOTE_DELETE, req),

  getSettings: (): Promise<IpcResult<AppSettings>> =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),

  setSettings: (req: Partial<AppSettings>): Promise<IpcResult<void>> =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, req),

  removeRecentVault: (req: { path: string }): Promise<IpcResult<RecentVault[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.VAULT_REMOVE_RECENT, req),

  getBacklinks: (req: { path: string }) =>
    ipcRenderer.invoke(IPC_CHANNELS.INDEX_GET_BACKLINKS, req),

  searchVault: (req: { query: string }) =>
    ipcRenderer.invoke(IPC_CHANNELS.INDEX_SEARCH, req),

  getGraphData: () =>
    ipcRenderer.invoke(IPC_CHANNELS.INDEX_GET_GRAPH_DATA),

  getAllIndexEntries: () =>
    ipcRenderer.invoke(IPC_CHANNELS.INDEX_GET_ALL_ENTRIES),

  renameNoteRefactor: (req: { oldPath: string; newPath: string }) =>
    ipcRenderer.invoke(IPC_CHANNELS.VAULT_RENAME_NOTE_REFACTOR, req),

  onVaultSwitched: (callback: (vault: { path: string; name: string }) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, vault: { path: string; name: string }): void => {
      callback(vault);
    };
    ipcRenderer.on(IPC_CHANNELS.VAULT_SWITCHED, listener);
    return (): void => {
      ipcRenderer.removeListener(IPC_CHANNELS.VAULT_SWITCHED, listener);
    };
  },

  onWatchEvent: (callback: (event: WatcherEvent) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, event: WatcherEvent): void => {
      callback(event);
    };
    ipcRenderer.on(IPC_CHANNELS.VAULT_WATCH_EVENT, listener);
    return (): void => {
      ipcRenderer.removeListener(IPC_CHANNELS.VAULT_WATCH_EVENT, listener);
    };
  },

  onWatchAlert: (callback: (alert: WatcherAlert) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, alert: WatcherAlert): void => {
      callback(alert);
    };
    ipcRenderer.on(IPC_CHANNELS.VAULT_WATCH_ALERT, listener);
    return (): void => {
      ipcRenderer.removeListener(IPC_CHANNELS.VAULT_WATCH_ALERT, listener);
    };
  },

  syncGetStatus: () =>
    ipcRenderer.invoke(IPC_CHANNELS.SYNC_GET_STATUS),

  syncStartAuth: (req?: { customClientId?: string; mock?: boolean }) =>
    ipcRenderer.invoke(IPC_CHANNELS.SYNC_START_AUTH, req),

  syncDisconnect: () =>
    ipcRenderer.invoke(IPC_CHANNELS.SYNC_DISCONNECT),

  syncTrigger: (req?: { dryRun?: boolean }) =>
    ipcRenderer.invoke(IPC_CHANNELS.SYNC_TRIGGER, req),

  syncGetSettings: () =>
    ipcRenderer.invoke(IPC_CHANNELS.SYNC_GET_SETTINGS),

  syncSetSettings: (req: Partial<import('@shared/ipc').SyncSettings>) =>
    ipcRenderer.invoke(IPC_CHANNELS.SYNC_SET_SETTINGS, req),

  onSyncStatusChanged: (callback: (status: import('@shared/ipc').SyncStatus) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, status: import('@shared/ipc').SyncStatus): void => {
      callback(status);
    };
    ipcRenderer.on(IPC_CHANNELS.SYNC_STATUS_CHANGED, listener);
    return (): void => {
      ipcRenderer.removeListener(IPC_CHANNELS.SYNC_STATUS_CHANGED, listener);
    };
  },

  exportHtml: (req: { path: string; destinationPath?: string }) =>
    ipcRenderer.invoke(IPC_CHANNELS.EXPORT_HTML, req),

  exportMarkdown: (req: { path: string; destinationPath?: string }) =>
    ipcRenderer.invoke(IPC_CHANNELS.EXPORT_MARKDOWN, req)
};

contextBridge.exposeInMainWorld('cairn', api);
