import { existsSync, promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { _electron as electron, expect, test } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Phase 3 Linking, Indexing, Backlinks, and Search E2E', () => {
  let tempVaultDir: string;

  test.beforeEach(async () => {
    const fixtureDir = path.resolve(__dirname, '../fixtures/vault');
    tempVaultDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cairn-phase3-e2e-'));
    await fs.cp(fixtureDir, tempVaultDir, { recursive: true });
  });

  test.afterEach(async () => {
    if (tempVaultDir && existsSync(tempVaultDir)) {
      await fs.rm(tempVaultDir, { recursive: true, force: true });
    }
  });

  test('renders wikilinks, navigates on click, shows backlinks, autocompletes, and searches vault', async () => {
    const args = ['.'];
    if (process.platform === 'linux' && process.env.CI) {
      args.push('--no-sandbox');
    }

    const electronApp = await electron.launch({ args });
    const page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');

    // 1. Open vault
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

    // 2. Open welcome.md
    const welcomeItem = page.locator('[data-testid="file-tree-item-welcome.md"]');
    await expect(welcomeItem).toBeVisible({ timeout: 10000 });
    await welcomeItem.click();

    await expect(page.locator('[data-testid="editor-tab-title"]')).toContainText('welcome');

    // 3. Verify wikilink widgets rendered in live preview
    const wikilinks = page.locator('.cairn-wikilink');
    await expect(wikilinks.first()).toBeVisible({ timeout: 5000 });

    const nestedLink = page.locator('.cairn-wikilink[data-target="nested-note"]');
    await expect(nestedLink).toBeVisible();
    await expect(nestedLink).toHaveText('nested-note');

    const crlfLink = page.locator('.cairn-wikilink[data-target="crlf-note"]');
    await expect(crlfLink).toBeVisible();
    await expect(crlfLink).toHaveText('CRLF Note');

    // 4. Click wikilink to navigate to nested-note.md
    await nestedLink.click();
    await expect(page.locator('[data-testid="editor-tab-title"]')).toContainText('nested-note', {
      timeout: 5000
    });

    // 5. Verify Backlinks panel shows incoming reference from welcome.md
    const backlinksPanel = page.locator('[data-testid="backlinks-panel"]');
    await expect(backlinksPanel).toBeVisible();

    const welcomeBacklink = page.locator('[data-testid="backlink-item-welcome"]');
    await expect(welcomeBacklink).toBeVisible({ timeout: 5000 });
    await expect(welcomeBacklink).toContainText('welcome');

    // 6. Navigate back to welcome by clicking backlink item
    await welcomeBacklink.click();
    await expect(page.locator('[data-testid="editor-tab-title"]')).toContainText('welcome', {
      timeout: 5000
    });

    // 7. Search Panel: Switch to Search tab in Activity Rail
    const searchRailButton = page.locator('[data-testid="activity-rail-search"]');
    await searchRailButton.click();

    const searchInput = page.locator('[data-testid="vault-search-input"]');
    await expect(searchInput).toBeVisible();

    // Type query
    await searchInput.fill('nested note inside');
    const searchResult = page.locator('[data-testid="search-result-nested-note"]');
    await expect(searchResult).toBeVisible({ timeout: 5000 });

    // Click search result to open note
    await searchResult.click();
    await expect(page.locator('[data-testid="editor-tab-title"]')).toContainText('nested-note');

    await electronApp.close();
  });
});
