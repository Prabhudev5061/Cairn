export interface FileMetadata {
  hasBom: boolean;
  eol: '\r\n' | '\n';
}

export interface VaultTreeNode {
  name: string;
  /** Vault-relative path with forward slashes */
  path: string;
  isDirectory: boolean;
  children?: VaultTreeNode[];
}

export type WatcherChangeType = 'create' | 'update' | 'delete';

export interface WatcherEvent {
  type: WatcherChangeType;
  /** Vault-relative path with forward slashes */
  path: string;
}

export interface WatcherAlert {
  type: 'inotify-limit' | 'error';
  message: string;
}

export interface RecentVault {
  path: string;
  name: string;
  lastOpened: number; // Unix timestamp in ms
}

export interface CloudSyncSettings {
  googleDrive?: {
    encryptedRefreshToken?: string;
    userEmail?: string;
    clientId?: string;
    remoteFolderName?: string;
    autoSync?: boolean;
    syncIntervalMinutes?: number;
    syncOnSave?: boolean;
    isMock?: boolean;
  };
}

export interface AppSettings {
  lastVaultPath?: string;
  recentVaults?: RecentVault[];
  sidebarWidth?: number;
  rightPanelWidth?: number;
  sidebarCollapsed?: boolean;
  rightPanelCollapsed?: boolean;
  cloudSync?: CloudSyncSettings;
  theme?: 'dark' | 'light' | 'system';
  dailyNotesFolder?: string;
  dailyNotesFormat?: string;
  templateFolder?: string;
}
