import { expect, test } from '@playwright/test';

for (const [path, title] of [['/tools/outdoor/', 'Micro Voxel World'], ['/tools/voxel-editor/', 'Voxel workshop']]) {
  test(`${title} renders its production entry point`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(path);
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await expect(page.locator('.viewport')).toHaveAttribute('data-state', 'ready');
    await expect(page.locator('canvas')).toBeVisible();
    await page.setViewportSize({ width: 800, height: 600 });
    await expect(page.locator('canvas')).toHaveJSProperty('clientWidth', await page.locator('.viewport').evaluate((host) => host.clientWidth));
    expect(errors).toEqual([]);
    await page.screenshot({ path: `test-results/${title === 'Voxel workshop' ? 'tool' : 'game'}-setup.png` });
  });
}

test('workspace navigation connects game and tool', async ({ page }) => {
  await page.goto('/tools/outdoor/');
  await page.getByRole('link', { name: 'Voxel workshop' }).click();
  await expect(page).toHaveURL(/\/tools\/voxel-editor\/$/);
  await page.getByRole('link', { name: 'Game', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Game menu' })).toBeVisible();
});

test('unavailable WebGL reports an actionable fallback', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
  });
  await page.goto('/tools/outdoor/');
  await expect(page.locator('.viewport')).toHaveAttribute('data-state', 'unsupported');
  await expect(page.getByRole('status')).toContainText('WebGL 2 unavailable');
  await context.close();
});
