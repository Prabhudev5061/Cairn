import { existsSync, promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { _electron as electron, expect, test } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Phase 4 Graph View E2E', () => {
  let tempVaultDir: string;

  test.beforeEach(async () => {
    const fixtureDir = path.resolve(__dirname, '../fixtures/vault');
    tempVaultDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cairn-phase4-e2e-'));
    await fs.cp(fixtureDir, tempVaultDir, { recursive: true });
  });

  test.afterEach(async () => {
    if (tempVaultDir && existsSync(tempVaultDir)) {
      await fs.rm(tempVaultDir, { recursive: true, force: true });
    }
  });

  test('interacts with global graph view, filters, zoom, keyboard shortcut, and local graph panel', async () => {
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

    // 2. Open welcome.md note
    const welcomeItem = page.locator('[data-testid="file-tree-item-welcome.md"]');
    await expect(welcomeItem).toBeVisible({ timeout: 10000 });
    await welcomeItem.click();
    await expect(page.locator('[data-testid="editor-tab-title"]')).toContainText('welcome');

    // 3. Test Right Panel tab switching (Backlinks <-> Local Graph)
    const backlinksTab = page.locator('[data-testid="right-panel-tab-backlinks"]');
    await expect(backlinksTab).toBeVisible({ timeout: 5000 });

    const localGraphTab = page.locator('[data-testid="right-panel-tab-graph"]');
    await expect(localGraphTab).toBeVisible();
    await localGraphTab.click();

    const localGraphPanel = page.locator('[data-testid="local-graph-panel"]');
    await expect(localGraphPanel).toBeVisible({ timeout: 5000 });

    const localGraphCanvas = page.locator('[data-testid="local-graph-canvas"]');
    await expect(localGraphCanvas).toBeVisible();

    // Test local depth buttons
    const depth2Btn = page.locator('[data-testid="local-graph-depth-2"]');
    await expect(depth2Btn).toBeVisible();
    await depth2Btn.click();

    // Switch back to Backlinks tab
    await backlinksTab.click();
    await expect(page.locator('[data-testid="backlinks-panel"]')).toBeVisible();

    // 4. Test Global Graph View via Activity Rail
    const graphRailBtn = page.locator('[data-testid="activity-rail-graph"]');
    await expect(graphRailBtn).toBeVisible();
    await graphRailBtn.click();

    const globalGraph = page.locator('[data-testid="global-graph-view"]');
    await expect(globalGraph).toBeVisible({ timeout: 5000 });

    const graphCanvas = page.locator('[data-testid="graph-canvas"]');
    await expect(graphCanvas).toBeVisible();

    // 5. Test Floating Controls HUD
    const hud = page.locator('[data-testid="graph-controls-hud"]');
    await expect(hud).toBeVisible();

    // Search input
    const searchInput = page.locator('[data-testid="graph-search-input"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('welcome');
    await page.waitForTimeout(200);

    // Orphan toggle
    const orphanToggle = page.locator('[data-testid="graph-orphan-toggle"]');
    await expect(orphanToggle).toBeVisible();
    await orphanToggle.click();
    await expect(orphanToggle).toHaveText('Hidden');

    // Text labels toggle
    const labelToggle = page.locator('[data-testid="graph-label-toggle"]');
    await expect(labelToggle).toBeVisible();
    await labelToggle.click();
    await expect(labelToggle).toHaveText('Off');

    // Zoom controls
    const zoomIn = page.locator('[data-testid="graph-zoom-in"]');
    const zoomOut = page.locator('[data-testid="graph-zoom-out"]');
    const zoomFit = page.locator('[data-testid="graph-zoom-fit"]');
    await expect(zoomIn).toBeVisible();
    await expect(zoomOut).toBeVisible();
    await expect(zoomFit).toBeVisible();
    await zoomIn.click();
    await zoomOut.click();
    await zoomFit.click();

    // 6. Test Close Graph Button -> returns to editor
    const closeBtn = page.locator('[data-testid="graph-close-btn"]');
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();

    await expect(page.locator('[data-testid="editor-tab-title"]')).toBeVisible();
    await expect(globalGraph).not.toBeVisible();

    // 7. Test Keyboard Shortcut Mod+G to toggle graph view
    const isMac = process.platform === 'darwin';
    const modifier = isMac ? 'Meta' : 'Control';

    await page.keyboard.press(`${modifier}+g`);
    await expect(globalGraph).toBeVisible({ timeout: 5000 });

    await page.keyboard.press(`${modifier}+g`);
    await expect(globalGraph).not.toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="editor-tab-title"]')).toBeVisible();

    await electronApp.close();
  });
});
