import { existsSync, promises as fs } from 'fs';
import { join } from 'path';
import { app } from 'electron';
import { AppSettings } from '@shared/types';

function getSettingsPath(customDir?: string): string {
  const dir = customDir ?? app.getPath('userData');
  return join(dir, 'settings.json');
}

/**
 * Reads app settings from userData/settings.json.
 * Returns empty settings object on missing file or read/parse error.
 */
export async function loadSettings(customDir?: string): Promise<AppSettings> {
  try {
    const settingsPath = getSettingsPath(customDir);
    if (!existsSync(settingsPath)) {
      return {};
    }
    const data = await fs.readFile(settingsPath, 'utf8');
    const parsed = JSON.parse(data) as unknown;
    if (parsed && typeof parsed === 'object') {
      return parsed as AppSettings;
    }
    return {};
  } catch {
    return {};
  }
}

/**
 * Merges and saves partial settings to userData/settings.json.
 */
export async function saveSettings(
  partial: Partial<AppSettings>,
  customDir?: string
): Promise<AppSettings> {
  const settingsPath = getSettingsPath(customDir);
  const current = await loadSettings(customDir);
  const updated: AppSettings = { ...current, ...partial };

  const dir = customDir ?? app.getPath('userData');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(settingsPath, JSON.stringify(updated, null, 2), 'utf8');
  return updated;
}
