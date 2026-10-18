/**
 * Types and contracts for Cloud Vault Sync (Google Drive integration).
 * Shared across main, preload, and renderer processes.
 */

export type SyncConnectionState = 'disconnected' | 'idle' | 'syncing' | 'error' | 'offline';

export interface SyncConflict {
  originalPath: string;
  conflictPath: string;
  timestamp: number;
}

export interface SyncStatus {
  state: SyncConnectionState;
  lastSyncTime: number | null;
  userEmail: string | null;
  remoteFolderName: string | null;
  activeConflicts: SyncConflict[];
  error: string | null;
  isMock?: boolean;
}

export interface SyncProgress {
  current: number;
  total: number;
  message: string;
}

export interface SyncSummary {
  uploaded: number;
  downloaded: number;
  deletedLocal: number;
  deletedRemote: number;
  conflicts: number;
  errors: string[];
  conflictList?: SyncConflict[];
}

export interface SyncSettings {
  autoSync: boolean;
  syncIntervalMinutes: number;
  syncOnSave: boolean;
}

export interface StoredSyncStateEntry {
  path: string;
  driveFileId: string;
  driveModifiedTime: string;
  localMtime: number;
  localHash: string;
  driveMd5: string;
}

export interface StoredSyncState {
  version: 1;
  vaultPath: string;
  remoteFolderId: string;
  lastSyncTimestamp: number;
  files: Record<string, StoredSyncStateEntry>;
  conflicts: SyncConflict[];
}
