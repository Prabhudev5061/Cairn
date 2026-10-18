import { existsSync, promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { _electron as electron, expect, test } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Phase 2 Live-Preview, KaTeX, and Vim E2E', () => {
  let tempVaultDir: string;

  test.beforeEach(async () => {
    const fixtureDir = path.resolve(__dirname, '../fixtures/vault');
    tempVaultDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cairn-phase2-e2e-'));
    await fs.cp(fixtureDir, tempVaultDir, { recursive: true });
  });

  test.afterEach(async () => {
    if (tempVaultDir && existsSync(tempVaultDir)) {
      await fs.rm(tempVaultDir, { recursive: true, force: true });
    }
  });

  test('renders KaTeX math, collapses markdown syntax, toggles tasks, and operates vim mode', async () => {
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

    // 2. Open math-and-syntax.md
    const noteItem = page.locator('[data-testid="file-tree-item-math-and-syntax.md"]');
    await expect(noteItem).toBeVisible({ timeout: 10000 });
    await noteItem.click();

    await expect(page.locator('[data-testid="editor-tab-title"]')).toContainText('math-and-syntax');
    const editor = page.locator('[data-testid="codemirror-editor"]');
    await expect(editor).toBeVisible();

    // 3. Verify live preview headings and formatting at top of note
    const h1Heading = page.locator('.cm-heading-1');
    await expect(h1Heading).toBeVisible({ timeout: 5000 });



    const strongText = page.locator('.cm-strong');
    await expect(strongText.first()).toBeVisible();

    // Verify horizontal rule divider
    const hr = page.locator('.cairn-hr');
    await expect(hr.first()).toBeVisible();

    // Verify tag pills
    const tagPill = page.locator('.cairn-tag-pill');
    await expect(tagPill.first()).toBeVisible();

    // 4. Verify task checkboxes
    const taskCheckbox = page.locator('.cairn-task-checkbox');
    await expect(taskCheckbox.first()).toBeVisible();

    // Toggle the first checkbox
    await taskCheckbox.first().click();
    await expect(page.locator('[data-testid="status-dirty-state"]')).toContainText('Unsaved');

    // 5. Verify KaTeX rendered elements
    const katexInline = page.locator('.cairn-math-inline .katex');
    await expect(katexInline.first()).toBeVisible({ timeout: 5000 });

    const katexBlock = page.locator('.cairn-math-block .katex-display');
    await expect(katexBlock).toBeVisible();


    // 5. Test Vim mode toggle
    const isMac = process.platform === 'darwin';
    await page.keyboard.press(isMac ? 'Meta+Shift+v' : 'Control+Shift+v');

    const vimBadge = page.locator('[data-testid="status-vim-mode"]');
    await expect(vimBadge).toBeVisible();
    await expect(vimBadge).toContainText('NORMAL');

    // Focus editor and switch to INSERT mode
    await page.locator('.cm-content').click();
    await page.keyboard.press('i');
    await expect(vimBadge).toContainText('INSERT');

    // Type in insert mode
    await page.keyboard.type('\nNew vim typed text');

    // Press Escape to return to NORMAL mode
    await page.keyboard.press('Escape');
    await expect(vimBadge).toContainText('NORMAL');

    // Save active note via Vim Ex command: :w
    await page.keyboard.type(':w');
    await page.keyboard.press('Enter');

    await expect(page.locator('[data-testid="status-dirty-state"]')).toContainText('Saved', {
      timeout: 5000
    });

    // Verify disk content contains the newly added text
    const diskNote = await fs.readFile(
      path.join(tempVaultDir, 'math-and-syntax.md'),
      'utf8'
    );
    expect(diskNote).toContain('New vim typed text');

    await electronApp.close();
  });
});
