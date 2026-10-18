import { existsSync, promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { _electron as electron, expect, test } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Phase 7 Features E2E: Command Palette, Theme, Daily Notes', () => {
  let tempVaultDir: string;

  test.beforeEach(async () => {
    const fixtureDir = path.resolve(__dirname, '../fixtures/vault');
    tempVaultDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cairn-phase7-e2e-'));
    await fs.cp(fixtureDir, tempVaultDir, { recursive: true });
  });

  test.afterEach(async () => {
    if (tempVaultDir && existsSync(tempVaultDir)) {
      await fs.rm(tempVaultDir, { recursive: true, force: true });
    }
  });

  test('opens command palette, filters, and toggles light/dark theme', async () => {
    const args = ['.'];
    if (process.platform === 'linux' && process.env.CI) {
      args.push('--no-sandbox');
    }

    const electronApp = await electron.launch({ args });
    const page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');

    // Open fixture vault
    const openRes = await page.evaluate(
      (vaultPath) =>
        (
          window as unknown as {
            cairn: { openVaultPath: (req: { path: string }) => Promise<{ ok: boolean }> };
          }
        ).cairn.openVaultPath({ path: vaultPath }),
      tempVaultDir
    );
    expect(openRes.ok).toBe(true);

    // Verify titlebar command palette button
    const paletteBtn = page.locator('[data-testid="titlebar-command-palette-btn"]');
    await expect(paletteBtn).toBeVisible({ timeout: 10000 });

    // Open Command Palette
    await paletteBtn.click();
    const modal = page.locator('[data-testid="command-palette-modal"]');
    await expect(modal).toBeVisible();

    // Type query in palette input
    const input = page.locator('[data-testid="command-palette-input"]');
    await expect(input).toBeFocused();
    await input.fill('theme');

    // Locate Theme command item and click it
    const themeItem = page.locator('[data-testid="command-palette-item"]', {
      hasText: 'Toggle Light/Dark Theme'
    });
    await expect(themeItem).toBeVisible();
    await themeItem.click();

    // Palette should dismiss
    await expect(modal).toBeHidden();

    // Verify document data-theme attribute
    const currentTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(currentTheme).toBe('light');

    // Click titlebar theme toggle button to switch back to dark
    const themeToggleBtn = page.locator('[data-testid="titlebar-theme-toggle-btn"]');
    await themeToggleBtn.click();
    const updatedTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(updatedTheme).toBe('dark');

    // Test Daily Note creation via titlebar daily note button
    const dailyBtn = page.locator('[data-testid="titlebar-daily-note-btn"]');
    await dailyBtn.click();

    // Verify editor opens daily note
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const expectedFilename = `${yyyy}-${mm}-${dd}.md`;

    const activeTitle = page.locator('[data-testid="editor-tab-title"]');
    await expect(activeTitle).toContainText(`${yyyy}-${mm}-${dd}`, { timeout: 10000 });

    // Verify the file was created on disk
    const createdDailyPath = path.join(tempVaultDir, expectedFilename);
    expect(existsSync(createdDailyPath)).toBe(true);

    await electronApp.close();
  });
});
