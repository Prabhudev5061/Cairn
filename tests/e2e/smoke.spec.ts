import { _electron as electron, expect, test } from '@playwright/test';

test.describe('Electron smoke test', () => {
  test('launches app and receives ping response from main process', async () => {
    const args = ['.'];
    if (process.platform === 'linux' && process.env.CI) {
      args.push('--no-sandbox');
    }

    const electronApp = await electron.launch({ args });
    const window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');

    const pingText = window.locator('[data-testid="ping-result"]');
    await expect(pingText).toBeVisible({ timeout: 10000 });
    await expect(pingText).toContainText('Cairn v');
    await expect(pingText).toContainText(`on ${process.platform}`);

    // Verify Electron security boundaries in renderer
    const hasNodeProcess = await window.evaluate(() => typeof (window as unknown as { process?: unknown }).process !== 'undefined');
    expect(hasNodeProcess).toBe(false);

    const hasRequire = await window.evaluate(() => typeof (window as unknown as { require?: unknown }).require !== 'undefined');
    expect(hasRequire).toBe(false);

    const hasCairnApi = await window.evaluate(
      () => typeof (window as unknown as { cairn?: { ping?: unknown } }).cairn?.ping === 'function'
    );
    expect(hasCairnApi).toBe(true);

    await electronApp.close();
  });
});
