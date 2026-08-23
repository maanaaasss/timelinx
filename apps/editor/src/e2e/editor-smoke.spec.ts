import { expect, test } from '@playwright/test';

test('loads the editor shell and core timeline controls', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('.tl-layout')).toBeVisible();
  await expect(page.getByTitle('Select (V)')).toBeVisible();
  await expect(page.getByTitle('Razor (C)')).toBeVisible();
  await expect(page.locator('.tl-ruler-canvas')).toBeVisible();
  await expect(page.locator('.tl-status-bar')).toContainText('4 tracks');
  await expect(page.getByRole('button', { name: 'Effects' })).toBeVisible();
});
