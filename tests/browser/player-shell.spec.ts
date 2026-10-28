import { expect, test } from '@playwright/test';

test('player entry launches combat and gates labs in pause settings', async ({ page }) => {
  await page.goto('/');
  const menu = page.getByRole('dialog', { name: 'Game menu' });
  await expect(menu).toBeVisible();
  await page.screenshot({ path: 'test-results/player-menu.png' });
  await expect(page.getByRole('navigation', { name: 'Workspace' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Flight lab', exact: true })).toBeHidden();
  await menu.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Enable developer tools').check();
  await expect(page.getByRole('link', { name: 'Flight lab', exact: true })).toBeVisible();
  await page.getByLabel('Enable developer tools').uncheck();
  await menu.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Fly / Resume' }).click();
  await expect(menu).not.toBeVisible();
  await expect(page.locator('.sortie-scene canvas')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toBeVisible();
  await expect(page.locator('.sortie-result')).toContainText(/paused/i);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
