import { _electron as electron, expect, test } from '@playwright/test';

test.describe('Electron smoke test', () => {
  test('launches app and receives ping response from main process', async () => {
    const args = ['.'];
    if (process.platform === 'linux' && process.env.CI) {
      args.push('--no-sandbox');
    }

    const electronApp = await electron.launch({ args });
    const page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');

    const appRoot = page.locator('[data-testid="welcome-screen"], [data-testid="app-titlebar"]');
    await expect(appRoot).toBeVisible({ timeout: 10000 });

    const pingRes = await page.evaluate(() =>
      (window as unknown as { cairn: { ping: () => Promise<{ ok: boolean; value: { version: string; platform: string } }> } }).cairn.ping()
    );
    expect(pingRes.ok).toBe(true);
    if (pingRes.ok) {
      expect(pingRes.value.version).toBeDefined();
      expect(pingRes.value.platform).toBe(process.platform);
    }

    // Verify Electron security boundaries in renderer
    const hasNodeProcess = await page.evaluate(() => typeof (window as unknown as { process?: unknown }).process !== 'undefined');
    expect(hasNodeProcess).toBe(false);

    const hasRequire = await page.evaluate(() => typeof (window as unknown as { require?: unknown }).require !== 'undefined');
    expect(hasRequire).toBe(false);

    const hasCairnApi = await page.evaluate(
      () => typeof (window as unknown as { cairn?: { ping?: unknown } }).cairn?.ping === 'function'
    );
    expect(hasCairnApi).toBe(true);

    await electronApp.close();
  });
});
