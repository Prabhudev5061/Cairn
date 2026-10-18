import { existsSync, promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { _electron as electron, expect, test } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Phase 6 Cloud Vault Sync E2E', () => {
  let tempVaultDir: string;

  test.beforeEach(async () => {
    const fixtureDir = path.resolve(__dirname, '../fixtures/vault');
    tempVaultDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cairn-phase6-e2e-'));
    await fs.cp(fixtureDir, tempVaultDir, { recursive: true });
  });

  test.afterEach(async () => {
    if (tempVaultDir && existsSync(tempVaultDir)) {
      await fs.rm(tempVaultDir, { recursive: true, force: true });
    }
  });

  test('interacts with status bar cloud indicator, connects mock Drive, synchronizes, and disconnects', async () => {
    const args = ['.'];
    if (process.platform === 'linux' && process.env.CI) {
      args.push('--no-sandbox');
    }

    const electronApp = await electron.launch({ args });
    const page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');

    // 1. Open fixture vault
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

    // 2. Locate Cloud Sync indicator in status bar
    const syncIndicator = page.locator('[data-testid="status-sync-indicator"]');
    await expect(syncIndicator).toBeVisible({ timeout: 10000 });

    // Click indicator to open Cloud Sync modal
    await syncIndicator.click();

    // 3. Verify Cloud Sync Modal is displayed
    const modal = page.locator('[data-testid="cloud-sync-modal"]');
    await expect(modal).toBeVisible();

    // Verify Disconnected view elements
    const connectMockBtn = page.locator('[data-testid="connect-mock-drive-btn"]');
    await expect(connectMockBtn).toBeVisible();

    // 4. Connect using Mock Mode
    await connectMockBtn.click();

    // Verify transition to Connected view
    const accountEmail = page.locator('[data-testid="sync-account-email"]');
    await expect(accountEmail).toBeVisible({ timeout: 5000 });
    await expect(accountEmail).toContainText('demo-user@cairn.vault');

    const statusBadge = page.locator('[data-testid="sync-status-badge"]');
    await expect(statusBadge).toContainText('Connected');

    // 5. Trigger Sync Now
    const syncNowBtn = page.locator('[data-testid="sync-now-btn"]');
    await expect(syncNowBtn).toBeVisible();
    await syncNowBtn.click();

    // Verify sync feedback banner
    const feedbackBanner = page.locator('[data-testid="sync-feedback-banner"]');
    await expect(feedbackBanner).toBeVisible({ timeout: 10000 });
    await expect(feedbackBanner).toContainText('Sync completed');

    // Verify last summary stats
    const lastSummary = page.locator('[data-testid="sync-last-summary"]');
    await expect(lastSummary).toBeVisible();
    await expect(lastSummary).toContainText('Uploaded:');

    // Close modal
    const closeBtn = page.locator('[data-testid="cloud-sync-close-btn"]');
    await closeBtn.click();
    await expect(modal).not.toBeVisible();

    // 6. Verify status bar indicator displays "Synced"
    await expect(syncIndicator).toContainText('Synced');

    // Reopen modal to test disconnect
    await syncIndicator.click();
    await expect(modal).toBeVisible();

    const disconnectBtn = page.locator('[data-testid="disconnect-sync-btn"]');
    await expect(disconnectBtn).toBeVisible();
    await disconnectBtn.click();

    // Verify modal resets to disconnected state
    await expect(connectMockBtn).toBeVisible({ timeout: 5000 });

    // Close modal
    await page.locator('[data-testid="cloud-sync-close-btn"]').click();
    await expect(modal).not.toBeVisible();

    await electronApp.close();
  });
});
