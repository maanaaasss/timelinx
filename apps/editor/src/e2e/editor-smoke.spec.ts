import { expect, test } from '@playwright/test';

test('loads the editor shell and core timeline controls', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('.tl-layout')).toBeVisible();
  await expect(page.getByTitle(/Cut \(C\)|Razor \(C\)/)).toBeVisible();
  await expect(page.locator('.tl-ruler-canvas, .tl-ruler-v3-canvas')).toBeVisible();
  await expect(page.locator('.tl-status-bar')).toContainText('4 tracks');
});
