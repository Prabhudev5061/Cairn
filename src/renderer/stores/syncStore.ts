import { create } from 'zustand';
import type { SyncSettings, SyncStatus, SyncSummary } from '../../shared/sync/types';
import {
  disconnectSync,
  getSyncSettings,
  getSyncStatus,
  setSyncSettings,
  startSyncAuth,
  subscribeSyncStatus,
  triggerVaultSync
} from '../ipc';

interface SyncState {
  status: SyncStatus;
  isSyncModalOpen: boolean;
  isSyncing: boolean;
  lastSummary: SyncSummary | null;
  settings: SyncSettings;
  init: () => Promise<void>;
  openModal: () => void;
  closeModal: () => void;
  connectGoogleDrive: (options?: { customClientId?: string; mock?: boolean }) => Promise<{ success: boolean; error?: string }>;
  disconnectGoogleDrive: () => Promise<void>;
  triggerSync: (dryRun?: boolean) => Promise<{ success: boolean; summary?: SyncSummary; error?: string }>;
  updateSettings: (partial: Partial<SyncSettings>) => Promise<void>;
}

let isSubscribed = false;

export const useSyncStore = create<SyncState>((set, get) => ({
  status: {
    state: 'disconnected',
    lastSyncTime: null,
    userEmail: null,
    remoteFolderName: null,
    activeConflicts: [],
    error: null,
    isMock: false
  },
  isSyncModalOpen: false,
  isSyncing: false,
  lastSummary: null,
  settings: {
    autoSync: true,
    syncIntervalMinutes: 5,
    syncOnSave: false
  },

  init: async () => {
    if (!isSubscribed) {
      isSubscribed = true;
      subscribeSyncStatus((updatedStatus) => {
        set({
          status: updatedStatus,
          isSyncing: updatedStatus.state === 'syncing'
        });
      });
    }

    try {
      const res = await getSyncStatus();
      if (res.ok) {
        set({
          status: res.value,
          isSyncing: res.value.state === 'syncing'
        });
      }

      const settingsRes = await getSyncSettings();
      if (settingsRes.ok) {
        set({ settings: settingsRes.value });
      }
    } catch {
      // Ignore
    }
  },

  openModal: () => set({ isSyncModalOpen: true }),
  closeModal: () => set({ isSyncModalOpen: false }),

  connectGoogleDrive: async (options) => {
    try {
      const res = await startSyncAuth(options);
      if (res.ok && res.value.success) {
        const statusRes = await getSyncStatus();
        if (statusRes.ok) {
          set({ status: statusRes.value });
        }
        return { success: true };
      }
      return { success: false, error: res.ok ? 'Connection failed' : res.error };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  },

  disconnectGoogleDrive: async () => {
    try {
      await disconnectSync();
      set({
        status: {
          state: 'disconnected',
          lastSyncTime: null,
          userEmail: null,
          remoteFolderName: null,
          activeConflicts: [],
          error: null,
          isMock: false
        },
        lastSummary: null
      });
    } catch {
      // Ignore
    }
  },

  triggerSync: async (dryRun) => {
    set({ isSyncing: true });
    try {
      const res = await triggerVaultSync({ dryRun });
      if (res.ok) {
        set({
          lastSummary: res.value,
          isSyncing: false
        });
        const statusRes = await getSyncStatus();
        if (statusRes.ok) {
          set({ status: statusRes.value });
        }
        return { success: true, summary: res.value };
      } else {
        set({ isSyncing: false });
        return { success: false, error: res.error };
      }
    } catch (err) {
      set({ isSyncing: false });
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  },

  updateSettings: async (partial) => {
    const updated = { ...get().settings, ...partial };
    set({ settings: updated });
    await setSyncSettings(partial);
  }
}));
