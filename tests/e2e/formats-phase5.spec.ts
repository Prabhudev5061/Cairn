import { existsSync, promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { _electron as electron, expect, test } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Phase 5 Multi-Format Support E2E', () => {
  let tempVaultDir: string;

  test.beforeEach(async () => {
    const fixtureDir = path.resolve(__dirname, '../fixtures/vault');
    tempVaultDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cairn-phase5-e2e-'));
    await fs.cp(fixtureDir, tempVaultDir, { recursive: true });
  });

  test.afterEach(async () => {
    if (tempVaultDir && existsSync(tempVaultDir)) {
      await fs.rm(tempVaultDir, { recursive: true, force: true });
    }
  });

  test('opens, edits, creates, and navigates across Org, Typst, and AsciiDoc notes', async () => {
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

    // 2. Open Org-mode note (cairn-roadmap.org)
    const orgItem = page.locator('[data-testid="file-tree-item-cairn-roadmap.org"]');
    await expect(orgItem).toBeVisible({ timeout: 10000 });
    await orgItem.click();

    // Verify Tab Title and StatusBar Format Badge for ORG
    await expect(page.locator('[data-testid="editor-tab-title"]')).toContainText('cairn-roadmap');
    const orgBadge = page.locator('[data-testid="status-format-badge"]');
    await expect(orgBadge).toBeVisible();
    await expect(orgBadge).toHaveText('ORG');

    // Verify Editor contains Org text
    const editorContent = page.locator('.cm-content');
    await expect(editorContent).toContainText('Cairn Multi-Format Roadmap');

    // 3. Open Typst note (quantum-state-collapse.typ)
    const typItem = page.locator('[data-testid="file-tree-item-quantum-state-collapse.typ"]');
    await expect(typItem).toBeVisible({ timeout: 5000 });
    await typItem.click();

    // Verify Tab Title and StatusBar Format Badge for TYP
    await expect(page.locator('[data-testid="editor-tab-title"]')).toContainText('quantum-state-collapse');
    const typBadge = page.locator('[data-testid="status-format-badge"]');
    await expect(typBadge).toHaveText('TYP');
    await expect(editorContent).toContainText('Quantum State Collapse');

    // 4. Open AsciiDoc note (asciidoc-specification.adoc)
    const adocItem = page.locator('[data-testid="file-tree-item-asciidoc-specification.adoc"]');
    await expect(adocItem).toBeVisible({ timeout: 5000 });
    await adocItem.click();

    // Verify Tab Title and StatusBar Format Badge for ADOC
    await expect(page.locator('[data-testid="editor-tab-title"]')).toContainText('asciidoc-specification');
    const adocBadge = page.locator('[data-testid="status-format-badge"]');
    await expect(adocBadge).toHaveText('ADOC');
    await expect(editorContent).toContainText('AsciiDoc Integration Specification');

    // 5. Test creating a new note with explicit format extension (.typ)
    const newNoteBtn = page.locator('[data-testid="new-note-button"]');
    await expect(newNoteBtn).toBeVisible();
    await newNoteBtn.click();

    const noteInput = page.locator('[data-testid="new-note-input"]');
    await expect(noteInput).toBeVisible();
    await noteInput.fill('benchmarks.typ');
    await noteInput.press('Enter');

    // Verify new note is open in editor and status bar displays TYP
    await expect(page.locator('[data-testid="editor-tab-title"]')).toContainText('benchmarks');
    await expect(page.locator('[data-testid="status-format-badge"]')).toHaveText('TYP');

    // Verify file exists on disk with .typ extension
    const createdPath = path.join(tempVaultDir, 'benchmarks.typ');
    expect(existsSync(createdPath)).toBe(true);

    await electronApp.close();
  });
});
