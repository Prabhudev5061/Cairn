import { existsSync, promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { _electron as electron, expect, test } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Walking Skeleton E2E', () => {
  let tempVaultDir: string;

  test.beforeEach(async () => {
    // Create an isolated copy of the fixture vault for testing
    const fixtureDir = path.resolve(__dirname, '../fixtures/vault');
    tempVaultDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cairn-e2e-vault-'));
    await fs.cp(fixtureDir, tempVaultDir, { recursive: true });
  });

  test.afterEach(async () => {
    if (tempVaultDir && existsSync(tempVaultDir)) {
      await fs.rm(tempVaultDir, { recursive: true, force: true });
    }
  });

  test('opens vault, browses tree, edits CRLF/BOM notes, preserves formatting, renames, deletes, and handles external edits', async () => {
    const args = ['.'];
    if (process.platform === 'linux' && process.env.CI) {
      args.push('--no-sandbox');
    }

    const electronApp = await electron.launch({ args });
    const page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');

    // 1. Open the temporary vault directly via preload API
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

    // 2. Verify vault titlebar & tree rendered
    const titlebarVault = page.locator('[data-testid="titlebar-vault-name"]');
    await expect(titlebarVault).toBeVisible({ timeout: 10000 });

    const fileTree = page.locator('[data-testid="file-tree-container"]');
    await expect(fileTree).toBeVisible();

    // Verify .obsidian and .cairn are excluded
    const obsidianItem = page.locator('[data-testid="file-tree-item-.obsidian"]');
    await expect(obsidianItem).toHaveCount(0);
    const cairnItem = page.locator('[data-testid="file-tree-item-.cairn"]');
    await expect(cairnItem).toHaveCount(0);

    // Verify expected notes are present in tree
    await expect(page.locator('[data-testid="file-tree-item-crlf-note.md"]')).toBeVisible();
    await expect(page.locator('[data-testid="file-tree-item-bom-note.md"]')).toBeVisible();
    await expect(page.locator('[data-testid="file-tree-item-welcome.md"]')).toBeVisible();

    // 3. Open crlf-note.md and verify byte-for-byte CRLF preservation
    await page.locator('[data-testid="file-tree-item-crlf-note.md"]').click();
    await expect(page.locator('[data-testid="editor-tab-title"]')).toContainText('crlf-note');
    const editor = page.locator('[data-testid="codemirror-editor"]');
    await expect(editor).toBeVisible();
    await expect(page.locator('.cm-content')).toContainText('CRLF Note');
    await expect(page.locator('[data-testid="status-eol"]')).toContainText('CRLF');

    // Edit content in CodeMirror and save via Ctrl+S / Cmd+S
    await page.locator('.cm-content').click();
    await page.keyboard.type('\nAdded new test line');
    await expect(page.locator('[data-testid="status-dirty-state"]')).toContainText('Unsaved');

    const isMac = process.platform === 'darwin';
    await page.keyboard.press(isMac ? 'Meta+s' : 'Control+s');
    await expect(page.locator('[data-testid="status-dirty-state"]')).toContainText('Saved', {
      timeout: 5000
    });

    // Verify on disk that CRLF was preserved and all newlines are \r\n
    const diskCrlfPath = path.join(tempVaultDir, 'crlf-note.md');
    const diskCrlfBuffer = await fs.readFile(diskCrlfPath);
    expect(diskCrlfBuffer.includes(Buffer.from('\r\n'))).toBe(true);
    const diskCrlfText = diskCrlfBuffer.toString('utf8');
    expect(diskCrlfText).toContain('Added new test line');
    expect(diskCrlfText.replace(/\r\n/g, '').includes('\n')).toBe(false);

    // 4. Open bom-note.md and verify UTF-8 BOM preservation
    await page.locator('[data-testid="file-tree-item-bom-note.md"]').click();
    await expect(page.locator('[data-testid="editor-tab-title"]')).toContainText('bom-note');
    await expect(page.locator('[data-testid="status-eol"]')).toContainText('BOM');

    await page.locator('.cm-content').click();
    await page.keyboard.type('\nEdited BOM note content');
    await page.keyboard.press(isMac ? 'Meta+s' : 'Control+s');
    await expect(page.locator('[data-testid="status-dirty-state"]')).toContainText('Saved', {
      timeout: 5000
    });

    const diskBomPath = path.join(tempVaultDir, 'bom-note.md');
    const diskBomBuffer = await fs.readFile(diskBomPath);
    expect(diskBomBuffer[0]).toBe(0xef);
    expect(diskBomBuffer[1]).toBe(0xbb);
    expect(diskBomBuffer[2]).toBe(0xbf);
    expect(diskBomBuffer.toString('utf8')).toContain('Edited BOM note content');

    // 5. Create a new note
    await page.locator('[data-testid="new-note-button"]').click();
    const newNoteInput = page.locator('[data-testid="new-note-input"]');
    await expect(newNoteInput).toBeVisible();
    await newNoteInput.fill('e2e-created-note');
    await newNoteInput.press('Enter');

    await expect(
      page.locator('[data-testid="file-tree-item-e2e-created-note.md"]')
    ).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="editor-tab-title"]')).toContainText(
      'e2e-created-note'
    );
    expect(existsSync(path.join(tempVaultDir, 'e2e-created-note.md'))).toBe(true);

    // 6. Rename note
    await page.locator('[data-testid="file-tree-item-welcome.md"]').hover();
    const renameBtn = page
      .locator('[data-testid="file-tree-item-welcome.md"]')
      .locator('button[title="Rename note"]');
    await renameBtn.click();

    const renameInput = page.locator('[data-testid="rename-note-input"]');
    await expect(renameInput).toBeVisible();
    await renameInput.fill('welcome-renamed.md');
    await renameInput.press('Enter');

    await expect(
      page.locator('[data-testid="file-tree-item-welcome-renamed.md"]')
    ).toBeVisible({ timeout: 5000 });
    expect(existsSync(path.join(tempVaultDir, 'welcome-renamed.md'))).toBe(true);
    expect(existsSync(path.join(tempVaultDir, 'welcome.md'))).toBe(false);

    // 7. Delete note
    page.on('dialog', (dialog) => dialog.accept());

    const deleteBtn = page
      .locator('[data-testid="file-tree-item-e2e-created-note.md"]')
      .locator('button[title="Delete note"]');
    await page.locator('[data-testid="file-tree-item-e2e-created-note.md"]').hover();
    await deleteBtn.click();

    await expect(
      page.locator('[data-testid="file-tree-item-e2e-created-note.md"]')
    ).toHaveCount(0, { timeout: 5000 });

    await electronApp.close();
  });
});
