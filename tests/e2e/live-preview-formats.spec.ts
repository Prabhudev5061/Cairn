import { existsSync, promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { _electron as electron, expect, test } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Phase 5.5 Multi-Format Live Preview & Cross-Format Linking E2E', () => {
  let tempVaultDir: string;

  test.beforeEach(async () => {
    const fixtureDir = path.resolve(__dirname, '../fixtures/vault');
    tempVaultDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cairn-phase55-e2e-'));
    await fs.cp(fixtureDir, tempVaultDir, { recursive: true });
  });

  test.afterEach(async () => {
    if (tempVaultDir && existsSync(tempVaultDir)) {
      await fs.rm(tempVaultDir, { recursive: true, force: true });
    }
  });

  test('renders live preview decorations in Org, Typst, and AsciiDoc, and navigates across format boundaries on click', async () => {
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

    // Verify Tab Title and Status Bar
    await expect(page.locator('[data-testid="editor-tab-title"]')).toContainText('cairn-roadmap');
    await expect(page.locator('[data-testid="status-format-badge"]')).toHaveText('ORG');

    // Verify Org Live Preview: TODO & DONE badges
    const todoBadge = page.locator('.cairn-org-todo').first();
    await expect(todoBadge).toBeVisible();
    await expect(todoBadge).toHaveText('TODO');

    const doneBadge = page.locator('.cairn-org-done').first();
    await expect(doneBadge).toBeVisible();
    await expect(doneBadge).toHaveText('DONE');

    // Verify interactive task checkboxes
    const checkbox = page.locator('.cairn-task-checkbox').first();
    await expect(checkbox).toBeVisible();

    // Click link [[welcome]] inside Org note to navigate to welcome.md
    const welcomeLink = page.locator('.cairn-wikilink[data-target="welcome"]').first();
    await expect(welcomeLink).toBeVisible();
    await welcomeLink.click();

    // Verify active note switched to welcome.md
    await expect(page.locator('[data-testid="editor-tab-title"]')).toContainText('welcome');
    await expect(page.locator('[data-testid="status-format-badge"]')).toHaveText('MD');

    // 3. Open AsciiDoc note (asciidoc-specification.adoc)
    const adocItem = page.locator('[data-testid="file-tree-item-asciidoc-specification.adoc"]');
    await expect(adocItem).toBeVisible({ timeout: 5000 });
    await adocItem.click();

    await expect(page.locator('[data-testid="editor-tab-title"]')).toContainText('asciidoc-specification');
    await expect(page.locator('[data-testid="status-format-badge"]')).toHaveText('ADOC');

    // Verify AsciiDoc Live Preview: Callout box
    const calloutHeader = page.locator('.cairn-callout-header').first();
    await expect(calloutHeader).toBeVisible();

    // Click link pointing to Typst note
    const typstLink = page.locator('.cairn-wikilink[data-target="quantum-state-collapse.typ"]').first();
    await expect(typstLink).toBeVisible();
    await typstLink.click();

    // 4. Verify editor transitioned to Typst note
    await expect(page.locator('[data-testid="editor-tab-title"]')).toContainText('quantum-state-collapse');
    await expect(page.locator('[data-testid="status-format-badge"]')).toHaveText('TYP');

    // Verify Typst Live Preview: KaTeX Math formula rendered
    const mathBlock = page.locator('.cairn-math-block').first();
    await expect(mathBlock).toBeVisible();

    // Click link [[cairn-roadmap.org]] inside Typst note to return to Org note
    const returnOrgLink = page.locator('.cairn-wikilink[data-target="cairn-roadmap.org"]').first();
    await expect(returnOrgLink).toBeVisible();
    await returnOrgLink.click();

    // Verify back on cairn-roadmap.org
    await expect(page.locator('[data-testid="editor-tab-title"]')).toContainText('cairn-roadmap');
    await expect(page.locator('[data-testid="status-format-badge"]')).toHaveText('ORG');

    await electronApp.close();
  });
});
