import { safeStorage } from 'electron';
import { loadSettings, saveSettings } from '../config/settings';

/**
 * Encrypts a string using Electron's native safeStorage API (OS keychain / DPAPI),
 * falling back gracefully if safeStorage is unavailable in headless/container environments.
 */
export function encryptToken(token: string): string {
  try {
    if (safeStorage && typeof safeStorage.isEncryptionAvailable === 'function' && safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(token);
      return `safe:${encrypted.toString('base64')}`;
    }
  } catch {
    // Fall back below
  }
  // Fallback for headless environments without OS keyring
  return `fallback:${Buffer.from(token, 'utf8').toString('base64')}`;
}

/**
 * Decrypts a token previously encrypted with encryptToken.
 */
export function decryptToken(encryptedString: string): string {
  try {
    if (encryptedString.startsWith('safe:')) {
      const buffer = Buffer.from(encryptedString.slice(5), 'base64');
      if (safeStorage && typeof safeStorage.decryptString === 'function') {
        return safeStorage.decryptString(buffer);
      }
    } else if (encryptedString.startsWith('fallback:')) {
      return Buffer.from(encryptedString.slice(9), 'base64').toString('utf8');
    }
  } catch {
    return '';
  }
  return '';
}

export interface StoredAuthData {
  refreshToken: string | null;
  userEmail: string | null;
  clientId?: string;
  isMock?: boolean;
}

/**
 * Saves Google Drive authentication info securely into AppSettings.
 */
export async function saveGoogleDriveAuth(auth: {
  refreshToken: string;
  userEmail: string;
  clientId?: string;
  isMock?: boolean;
}): Promise<void> {
  const currentSettings = await loadSettings();
  const encrypted = encryptToken(auth.refreshToken);

  const cloudSync = currentSettings.cloudSync ?? {};
  cloudSync.googleDrive = {
    ...cloudSync.googleDrive,
    encryptedRefreshToken: encrypted,
    userEmail: auth.userEmail,
    clientId: auth.clientId,
    isMock: auth.isMock
  };

  await saveSettings({ cloudSync });
}

/**
 * Loads and decrypts Google Drive authentication info.
 */
export async function loadGoogleDriveAuth(): Promise<StoredAuthData> {
  const settings = await loadSettings();
  const gd = settings.cloudSync?.googleDrive;
  if (!gd || !gd.encryptedRefreshToken) {
    return { refreshToken: null, userEmail: null, isMock: false };
  }

  const refreshToken = decryptToken(gd.encryptedRefreshToken);
  return {
    refreshToken: refreshToken || null,
    userEmail: gd.userEmail || null,
    clientId: gd.clientId,
    isMock: Boolean(gd.isMock)
  };
}

/**
 * Clears Google Drive authentication credentials from settings.
 */
export async function clearGoogleDriveAuth(): Promise<void> {
  const settings = await loadSettings();
  if (settings.cloudSync?.googleDrive) {
    delete settings.cloudSync.googleDrive.encryptedRefreshToken;
    delete settings.cloudSync.googleDrive.userEmail;
    delete settings.cloudSync.googleDrive.isMock;
    await saveSettings({ cloudSync: settings.cloudSync });
  }
}
