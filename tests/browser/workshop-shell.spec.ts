import { expect, test } from '@playwright/test';

test('workshop production entry resizes and links back to Frontier', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/tools/voxel-editor/');
  await expect(page.getByRole('heading', { name: 'Voxel workshop', exact: true })).toBeVisible();
  await expect(page.locator('.viewport')).toHaveAttribute('data-state', 'ready');
  await expect(page.locator('canvas')).toBeVisible();
  await page.setViewportSize({ width: 800, height: 600 });
  await expect(page.locator('canvas')).toHaveJSProperty('clientWidth', await page.locator('.viewport').evaluate(host => host.clientWidth));
  expect(errors).toEqual([]);
  await page.getByRole('link', { name: 'Game', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Hangar and upgrades' })).toBeVisible();
});
