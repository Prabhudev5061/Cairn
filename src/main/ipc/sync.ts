import path from 'path';
import { BrowserWindow, ipcMain, shell } from 'electron';
import { IPC_CHANNELS, IpcResult, SyncConnectionState, SyncSettings, SyncStatus, SyncSummary } from '../../shared/ipc';
import { loadSettings, saveSettings } from '../config/settings';
import { GoogleDriveApiClient, IDriveClient, MockGoogleDriveClient } from '../sync/googleDriveClient';
import {
  buildGoogleAuthUrl,
  exchangeCodeForTokens,
  generateOAuthState,
  generatePkcePair,
  refreshAccessToken,
  startOAuthLoopbackServer
} from '../sync/oauth';
import { SyncEngine } from '../sync/syncEngine';
import { loadSyncState } from '../sync/syncState';
import { clearGoogleDriveAuth, loadGoogleDriveAuth, saveGoogleDriveAuth } from '../sync/tokenStore';
import { getActiveVaultPath } from './vault';

let currentSyncState: SyncConnectionState = 'idle';
let currentError: string | null = null;
let lastSyncTimestamp: number | null = null;
let autoSyncIntervalTimer: NodeJS.Timeout | null = null;

// Reusable mock client instance for mock authentication / test runs
export const sharedMockDriveClient = new MockGoogleDriveClient();

function sendToWindows(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, payload);
    }
  }
}

/**
 * Computes the current full SyncStatus object.
 */
export async function getLiveSyncStatus(): Promise<SyncStatus> {
  const auth = await loadGoogleDriveAuth();
  const vaultPath = getActiveVaultPath();

  if (!auth.refreshToken) {
    return {
      state: 'disconnected',
      lastSyncTime: null,
      userEmail: null,
      remoteFolderName: null,
      activeConflicts: [],
      error: currentError,
      isMock: false
    };
  }

  let conflicts: import('../../shared/ipc').SyncConflict[] = [];
  if (vaultPath) {
    try {
      const state = await loadSyncState(vaultPath);
      conflicts = state.conflicts || [];
      if (!lastSyncTimestamp && state.lastSyncTimestamp) {
        lastSyncTimestamp = state.lastSyncTimestamp;
      }
    } catch {
      // Ignore
    }
  }

  return {
    state: currentSyncState,
    lastSyncTime: lastSyncTimestamp,
    userEmail: auth.userEmail,
    remoteFolderName: vaultPath ? path.basename(vaultPath) : 'Cairn Vault',
    activeConflicts: conflicts,
    error: currentError,
    isMock: Boolean(auth.isMock)
  };
}

export function broadcastSyncStatus(status: SyncStatus): void {
  sendToWindows(IPC_CHANNELS.SYNC_STATUS_CHANGED, status);
}

/**
 * Registers all cloud sync IPC handlers.
 */
export function registerSyncIpcHandlers(): void {
  // 1. Get live sync status
  ipcMain.handle(IPC_CHANNELS.SYNC_GET_STATUS, async (): Promise<IpcResult<SyncStatus>> => {
    try {
      const status = await getLiveSyncStatus();
      return { ok: true, value: status };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  // 2. Start OAuth authorization flow (or mock auth)
  ipcMain.handle(
    IPC_CHANNELS.SYNC_START_AUTH,
    async (
      _e,
      req?: { customClientId?: string; mock?: boolean }
    ): Promise<IpcResult<{ success: boolean; userEmail: string | null }>> => {
      try {
        if (req?.mock) {
          await saveGoogleDriveAuth({
            refreshToken: 'mock_cairn_refresh_token',
            userEmail: 'demo-user@cairn.vault',
            isMock: true
          });
          currentSyncState = 'idle';
          currentError = null;
          const status = await getLiveSyncStatus();
          broadcastSyncStatus(status);
          return { ok: true, value: { success: true, userEmail: 'demo-user@cairn.vault' } };
        }

        const clientId = req?.customClientId || process.env.CAIRN_GDRIVE_CLIENT_ID;
        if (!clientId) {
          return {
            ok: false,
            error:
              'Google OAuth Client ID is required. Pass a custom Client ID or use Mock Mode for offline testing.'
          };
        }

        const state = generateOAuthState();
        const { verifier, challenge } = generatePkcePair();

        const loopback = await startOAuthLoopbackServer(state);
        const authUrl = buildGoogleAuthUrl(clientId, loopback.redirectUri, challenge, state);

        // Open user's default system browser
        await shell.openExternal(authUrl);

        // Wait for loopback callback (up to 120s)
        const code = await loopback.waitForCode();
        const tokens = await exchangeCodeForTokens(code, verifier, clientId, loopback.redirectUri);

        if (!tokens.refresh_token) {
          throw new Error('Google did not return a refresh token. Re-consent may be required.');
        }

        const driveClient = new GoogleDriveApiClient();
        const userEmail = await driveClient.getUserEmail(tokens.access_token);

        await saveGoogleDriveAuth({
          refreshToken: tokens.refresh_token,
          userEmail,
          clientId,
          isMock: false
        });

        currentSyncState = 'idle';
        currentError = null;
        const status = await getLiveSyncStatus();
        broadcastSyncStatus(status);

        return { ok: true, value: { success: true, userEmail } };
      } catch (err) {
        currentError = err instanceof Error ? err.message : String(err);
        currentSyncState = 'error';
        const status = await getLiveSyncStatus();
        broadcastSyncStatus(status);
        return { ok: false, error: currentError };
      }
    }
  );

  // 3. Disconnect Google Drive account
  ipcMain.handle(
    IPC_CHANNELS.SYNC_DISCONNECT,
    async (): Promise<IpcResult<{ disconnected: boolean }>> => {
      try {
        await clearGoogleDriveAuth();
        currentSyncState = 'disconnected';
        currentError = null;
        lastSyncTimestamp = null;
        const status = await getLiveSyncStatus();
        broadcastSyncStatus(status);
        return { ok: true, value: { disconnected: true } };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    }
  );

  // 4. Trigger synchronization
  ipcMain.handle(
    IPC_CHANNELS.SYNC_TRIGGER,
    async (_e, req?: { dryRun?: boolean }): Promise<IpcResult<SyncSummary>> => {
      const vaultPath = getActiveVaultPath();
      if (!vaultPath) {
        return { ok: false, error: 'No vault is currently open. Open a vault first.' };
      }

      const auth = await loadGoogleDriveAuth();
      if (!auth.refreshToken) {
        return { ok: false, error: 'Google Drive is not connected.' };
      }

      try {
        currentSyncState = 'syncing';
        currentError = null;
        broadcastSyncStatus(await getLiveSyncStatus());

        let driveClient: IDriveClient;
        let accessToken: string;

        if (auth.isMock) {
          driveClient = sharedMockDriveClient;
          accessToken = 'mock_access_token';
        } else {
          driveClient = new GoogleDriveApiClient();
          const refreshed = await refreshAccessToken(auth.refreshToken, auth.clientId || '');
          accessToken = refreshed.access_token;
        }

        const engine = new SyncEngine(vaultPath, accessToken, driveClient);
        const summary = await engine.runSync({
          dryRun: req?.dryRun
        });

        lastSyncTimestamp = Date.now();
        currentSyncState = 'idle';
        currentError = null;

        const updatedStatus = await getLiveSyncStatus();
        broadcastSyncStatus(updatedStatus);

        return { ok: true, value: summary };
      } catch (err) {
        currentSyncState = 'error';
        currentError = err instanceof Error ? err.message : String(err);
        const status = await getLiveSyncStatus();
        broadcastSyncStatus(status);
        return { ok: false, error: currentError };
      }
    }
  );

  // 5. Get sync settings
  ipcMain.handle(IPC_CHANNELS.SYNC_GET_SETTINGS, async (): Promise<IpcResult<SyncSettings>> => {
    try {
      const settings = await loadSettings();
      const gd = settings.cloudSync?.googleDrive;
      return {
        ok: true,
        value: {
          autoSync: gd?.autoSync ?? true,
          syncIntervalMinutes: gd?.syncIntervalMinutes ?? 5,
          syncOnSave: gd?.syncOnSave ?? false
        }
      };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  // 6. Update sync settings
  ipcMain.handle(
    IPC_CHANNELS.SYNC_SET_SETTINGS,
    async (_e, req: Partial<SyncSettings>): Promise<IpcResult<void>> => {
      try {
        const settings = await loadSettings();
        const cloudSync = settings.cloudSync ?? {};
        cloudSync.googleDrive = {
          ...cloudSync.googleDrive,
          ...(req.autoSync !== undefined ? { autoSync: req.autoSync } : {}),
          ...(req.syncIntervalMinutes !== undefined ? { syncIntervalMinutes: req.syncIntervalMinutes } : {}),
          ...(req.syncOnSave !== undefined ? { syncOnSave: req.syncOnSave } : {})
        };
        await saveSettings({ cloudSync });

        // Update auto-sync timer
        if (autoSyncIntervalTimer) {
          clearInterval(autoSyncIntervalTimer);
          autoSyncIntervalTimer = null;
        }
        if (cloudSync.googleDrive?.autoSync) {
          const intervalMs = (cloudSync.googleDrive.syncIntervalMinutes || 5) * 60 * 1000;
          autoSyncIntervalTimer = setInterval(() => {
            const vault = getActiveVaultPath();
            if (vault && currentSyncState === 'idle') {
              void (async () => {
                try {
                  const auth = await loadGoogleDriveAuth();
                  if (auth.refreshToken) {
                    const client = auth.isMock ? sharedMockDriveClient : new GoogleDriveApiClient();
                    const token = auth.isMock ? 'mock_token' : (await refreshAccessToken(auth.refreshToken, auth.clientId || '')).access_token;
                    const engine = new SyncEngine(vault, token, client);
                    await engine.runSync();
                    lastSyncTimestamp = Date.now();
                    broadcastSyncStatus(await getLiveSyncStatus());
                  }
                } catch {
                  // Silent fail on background tick
                }
              })();
            }
          }, intervalMs);
        }

        return { ok: true, value: undefined };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    }
  );
}
