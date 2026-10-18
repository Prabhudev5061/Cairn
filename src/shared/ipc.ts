import {
  BacklinkItem,
  GraphData,
  NoteIndexEntry,
  SearchResultItem
} from './linking/types';
import { AppSettings, FileMetadata, RecentVault, VaultTreeNode, WatcherAlert, WatcherEvent } from './types';
export * from './types';
export * from './linking/types';
export * from './recentVaults';
export * from './linking/grouping';
export * from './sync/types';

export type IpcResult<T> = { ok: true; value: T } | { ok: false; error: string };

export interface AppPingPayload {
  version: string;
  platform: string;
}

export type AppPingResponse = IpcResult<AppPingPayload>;

export const IPC_CHANNELS = {
  APP_PING: 'app:ping',
  VAULT_CHOOSE: 'vault:choose',
  VAULT_OPEN_PATH: 'vault:open-path',
  VAULT_GET_CURRENT: 'vault:get-current',
  VAULT_LIST_TREE: 'vault:list-tree',
  NOTE_READ: 'note:read',
  NOTE_WRITE: 'note:write',
  NOTE_CREATE: 'note:create',
  NOTE_RENAME: 'note:rename',
  NOTE_DELETE: 'note:delete',
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  VAULT_SWITCHED: 'vault:switched',
  VAULT_WATCH_EVENT: 'vault:watch-event',
  VAULT_WATCH_ALERT: 'vault:watch-alert',
  INDEX_GET_BACKLINKS: 'index:get-backlinks',
  INDEX_SEARCH: 'index:search',
  INDEX_GET_GRAPH_DATA: 'index:get-graph-data',
  INDEX_GET_ALL_ENTRIES: 'index:get-all-entries',
  VAULT_RENAME_NOTE_REFACTOR: 'vault:rename-note-refactor',
  VAULT_REMOVE_RECENT: 'vault:remove-recent',
  SYNC_GET_STATUS: 'sync:get-status',
  SYNC_START_AUTH: 'sync:start-auth',
  SYNC_DISCONNECT: 'sync:disconnect',
  SYNC_TRIGGER: 'sync:trigger',
  SYNC_GET_SETTINGS: 'sync:get-settings',
  SYNC_SET_SETTINGS: 'sync:set-settings',
  SYNC_STATUS_CHANGED: 'sync:status-changed',
  EXPORT_HTML: 'export:html',
  EXPORT_MARKDOWN: 'export:markdown'
} as const;

export interface CairnApi {
  ping: () => Promise<AppPingResponse>;
  chooseVault: () => Promise<IpcResult<{ path: string; name: string } | null>>;
  openVaultPath: (req: { path: string }) => Promise<IpcResult<{ path: string; name: string }>>;
  getCurrentVault: () => Promise<IpcResult<{ path: string; name: string } | null>>;
  listTree: () => Promise<IpcResult<VaultTreeNode>>;
  readNote: (req: { path: string }) => Promise<IpcResult<{ content: string; metadata: FileMetadata }>>;
  writeNote: (req: {
    path: string;
    content: string;
    metadata?: FileMetadata;
  }) => Promise<IpcResult<{ written: boolean }>>;
  createNote: (req: { path: string }) => Promise<IpcResult<{ path: string }>>;
  renameNote: (req: { oldPath: string; newPath: string }) => Promise<IpcResult<{ path: string }>>;
  deleteNote: (req: { path: string }) => Promise<IpcResult<void>>;
  getSettings: () => Promise<IpcResult<AppSettings>>;
  setSettings: (req: Partial<AppSettings>) => Promise<IpcResult<void>>;
  removeRecentVault: (req: { path: string }) => Promise<IpcResult<RecentVault[]>>;
  getBacklinks: (req: { path: string }) => Promise<IpcResult<BacklinkItem[]>>;
  searchVault: (req: { query: string }) => Promise<IpcResult<SearchResultItem[]>>;
  getGraphData: () => Promise<IpcResult<GraphData>>;
  getAllIndexEntries: () => Promise<IpcResult<NoteIndexEntry[]>>;
  renameNoteRefactor: (req: {
    oldPath: string;
    newPath: string;
  }) => Promise<IpcResult<{ path: string; updatedFilesCount: number }>>;
  onVaultSwitched: (callback: (vault: { path: string; name: string }) => void) => () => void;
  onWatchEvent: (callback: (event: WatcherEvent) => void) => () => void;
  onWatchAlert: (callback: (alert: WatcherAlert) => void) => () => void;
  syncGetStatus: () => Promise<IpcResult<import('./sync/types').SyncStatus>>;
  syncStartAuth: (req?: { customClientId?: string; mock?: boolean }) => Promise<IpcResult<{ success: boolean; userEmail: string | null }>>;
  syncDisconnect: () => Promise<IpcResult<{ disconnected: boolean }>>;
  syncTrigger: (req?: { dryRun?: boolean }) => Promise<IpcResult<import('./sync/types').SyncSummary>>;
  syncGetSettings: () => Promise<IpcResult<import('./sync/types').SyncSettings>>;
  syncSetSettings: (req: Partial<import('./sync/types').SyncSettings>) => Promise<IpcResult<void>>;
  onSyncStatusChanged: (callback: (status: import('./sync/types').SyncStatus) => void) => () => void;
  exportHtml: (req: { path: string; destinationPath?: string }) => Promise<IpcResult<{ filePath?: string }>>;
  exportMarkdown: (req: { path: string; destinationPath?: string }) => Promise<IpcResult<{ filePath?: string }>>;
}

