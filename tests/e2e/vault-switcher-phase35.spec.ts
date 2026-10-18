import { existsSync, promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { _electron as electron, expect, test } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Phase 3.5 Vault Switcher & Responsive Backlinks E2E', () => {
  let tempVaultDir1: string;
  let tempVaultDir2: string;

  test.beforeEach(async () => {
    const fixtureDir = path.resolve(__dirname, '../fixtures/vault');
    tempVaultDir1 = await fs.mkdtemp(path.join(os.tmpdir(), 'cairn-vault1-'));
    tempVaultDir2 = await fs.mkdtemp(path.join(os.tmpdir(), 'cairn-vault2-'));
    await fs.cp(fixtureDir, tempVaultDir1, { recursive: true });
    await fs.cp(fixtureDir, tempVaultDir2, { recursive: true });
  });

  test.afterEach(async () => {
    if (tempVaultDir1 && existsSync(tempVaultDir1)) {
      await fs.rm(tempVaultDir1, { recursive: true, force: true });
    }
    if (tempVaultDir2 && existsSync(tempVaultDir2)) {
      await fs.rm(tempVaultDir2, { recursive: true, force: true });
    }
  });

  test('switches vaults via switcher modal, manages recent vaults, and adapts backlink panel layout', async () => {
    const args = ['.'];
    if (process.platform === 'linux' && process.env.CI) {
      args.push('--no-sandbox');
    }

    const electronApp = await electron.launch({ args });
    const page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');

    // 1. Open Vault 1
    const openRes1 = await page.evaluate(
      (vaultPath) =>
        (
          window as unknown as {
            cairn: { openVaultPath: (req: { path: string }) => Promise<{ ok: boolean }> };
          }
        ).cairn.openVaultPath({ path: vaultPath }),
      tempVaultDir1
    );
    expect(openRes1.ok).toBe(true);

    const vault1Name = path.basename(tempVaultDir1);
    const vault2Name = path.basename(tempVaultDir2);

    // 2. Verify titlebar displays Vault 1 name
    const titlebarVault = page.locator('[data-testid="titlebar-vault-name"]');
    await expect(titlebarVault).toBeVisible({ timeout: 10000 });
    await expect(titlebarVault).toHaveText(vault1Name);

    // 3. Open Vault Switcher via Titlebar button
    const switcherTrigger = page.locator('[data-testid="titlebar-vault-switcher"]');
    await switcherTrigger.click();

    const switcherModal = page.locator('[data-testid="vault-switcher-modal"]');
    await expect(switcherModal).toBeVisible();

    // Verify Vault 1 is listed with Current badge
    const vault1Item = page.locator(`[data-testid="recent-vault-${vault1Name}"]`);
    await expect(vault1Item).toBeVisible();
    await expect(vault1Item.locator('[data-testid="current-vault-badge"]')).toBeVisible();

    // 4. Test Search Filter
    const searchInput = page.locator('[data-testid="vault-switcher-input"]');
    await searchInput.fill(vault1Name);
    await expect(vault1Item).toBeVisible();

    // Search for non-existent name
    await searchInput.fill('NonExistentVault12345');
    await expect(page.locator('[data-testid="vault-switcher-empty"]')).toBeVisible();

    // Clear search
    await searchInput.fill('');
    await expect(vault1Item).toBeVisible();

    // Close modal via Escape
    await page.keyboard.press('Escape');
    await expect(switcherModal).not.toBeVisible();

    // 5. Open Vault 2 directly via IPC
    const openRes2 = await page.evaluate(
      (vaultPath) =>
        (
          window as unknown as {
            cairn: { openVaultPath: (req: { path: string }) => Promise<{ ok: boolean }> };
          }
        ).cairn.openVaultPath({ path: vaultPath }),
      tempVaultDir2
    );
    expect(openRes2.ok).toBe(true);
    await expect(titlebarVault).toHaveText(vault2Name);

    // 6. Open Vault Switcher via Keyboard Shortcut (Mod+Shift+O)
    await page.keyboard.press('ControlOrMeta+Shift+O');
    await expect(switcherModal).toBeVisible();

    // Now both vaults should appear in recent vaults
    const vault2Item = page.locator(`[data-testid="recent-vault-${vault2Name}"]`);
    await expect(vault2Item).toBeVisible();
    await expect(vault2Item.locator('[data-testid="current-vault-badge"]')).toBeVisible();

    const vault1ItemInList = page.locator(`[data-testid="recent-vault-${vault1Name}"]`);
    await expect(vault1ItemInList).toBeVisible();

    // 7. Click Vault 1 to switch back to Vault 1
    await vault1ItemInList.click();
    await expect(switcherModal).not.toBeVisible();
    await expect(titlebarVault).toHaveText(vault1Name, { timeout: 10000 });

    // 8. Open Vault Switcher and test remove button
    await page.keyboard.press('ControlOrMeta+Shift+O');
    await expect(switcherModal).toBeVisible();

    const removeVault2Btn = page.locator(`[data-testid="remove-recent-vault-${vault2Name}"]`);
    await expect(removeVault2Btn).toBeVisible();
    await removeVault2Btn.click();

    // Vault 2 should be gone from the list
    await expect(page.locator(`[data-testid="recent-vault-${vault2Name}"]`)).not.toBeVisible();

    // Close switcher
    await page.keyboard.press('Escape');
    await expect(switcherModal).not.toBeVisible();

    // 9. Verify Backlinks Panel with grouped items and line wrapping
    const welcomeItem = page.locator('[data-testid="file-tree-item-welcome.md"]');
    await expect(welcomeItem).toBeVisible({ timeout: 10000 });
    await welcomeItem.click();

    const nestedLink = page.locator('.cairn-wikilink[data-target="nested-note"]');
    await expect(nestedLink).toBeVisible();
    await nestedLink.click();

    // Backlinks panel should show reference from welcome
    const backlinksPanel = page.locator('[data-testid="backlinks-panel"]');
    await expect(backlinksPanel).toBeVisible();

    const backlinkItem = page.locator('[data-testid="backlink-item-welcome"]');
    await expect(backlinkItem).toBeVisible({ timeout: 5000 });
    await expect(backlinkItem).toContainText('welcome');

    // Verify clicking backlink navigates to welcome.md
    await backlinkItem.click();
    await expect(page.locator('[data-testid="editor-tab-title"]')).toContainText('welcome', {
      timeout: 5000
    });

    // 10. Verify File Tree responsive layout and indent guides
    const subfolderItem = page.locator('div[role="treeitem"]').filter({ hasText: 'subfolder' });
    await expect(subfolderItem).toBeVisible();
    const nestedNoteItem = page.locator('[data-testid="file-tree-item-nested-note.md"]');
    await expect(nestedNoteItem).toBeVisible();
    // Verify indent guide span exists inside the nested item for proper visual nesting
    const indentGuide = nestedNoteItem.locator('span[aria-hidden="true"]');
    await expect(indentGuide).toBeVisible();

    await electronApp.close();
  });
});
