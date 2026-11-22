import { expect, test } from '@playwright/test';

// Run after `npm run build -- --base /micro-voxel-world/` with
// PAGES_BASE_PATH=/micro-voxel-world/ to exercise the Pages deployment.
test.use({ launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } });

test('production entry points and navigation work under the deployment prefix', async ({ page }) => {
  test.setTimeout(90000);
  const base = process.env.PAGES_BASE_PATH ?? '/';
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  });
  const response = await page.goto(base);
  expect(await response!.text()).not.toContain('/src/game/frontier-main.ts');
  await expect(page.getByRole('dialog', { name: 'Hangar and upgrades' })).toBeVisible({ timeout: 60000 });
  await expect(page.locator('.wordmark')).toHaveAttribute('href', base);
  await expect(page.locator('#dev-links a')).toHaveAttribute('href', `${base}tools/voxel-editor/`);
  await page.goto(`${base}tools/voxel-editor/`);
  await expect(page.locator('canvas').first()).toBeVisible();
  expect(errors).toEqual([]);
});
