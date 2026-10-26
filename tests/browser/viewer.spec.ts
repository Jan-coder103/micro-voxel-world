import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tools/voxel-editor/');
  await expect(page.locator('.viewport')).toHaveAttribute('data-state', 'ready');
});

test('selects fixtures, creates a block, and keeps assets for the current session', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const list = page.getByLabel('Selected asset');
  await expect(list.locator('option')).toHaveCount(2);
  await expect(page.locator('.asset-stats')).toContainText('0.80 × 0.60 × 1.00 m');
  await list.selectOption({ label: 'Metre cube' });
  await expect(page.getByRole('status')).toContainText('Metre cube · 1,000 voxels');
  await expect(page.locator('.asset-stats')).toContainText('1.00 × 1.00 × 1.00 m');
  await page.getByLabel('Name', { exact: true }).fill('<b>Test block</b>');
  await page.getByLabel('Width X').fill('2');
  await page.getByLabel('Height Y').fill('3');
  await page.getByLabel('Depth Z').fill('4');
  await page.getByLabel('Color', { exact: true }).fill('#dd6644');
  await page.getByRole('button', { name: 'Create asset' }).click();
  await expect(list.locator('option')).toHaveCount(3);
  await expect(page.locator('.asset-stats')).toContainText('0.20 × 0.30 × 0.40 m');
  await expect(page.getByRole('status')).toContainText('<b>Test block</b> · 24 voxels');
  await expect(page.locator('.asset-stats b')).toHaveCount(0);
  await list.selectOption({ label: 'Direction marker' });
  await list.selectOption({ label: '<b>Test block</b>' });
  await expect(page.locator('.asset-stats')).toContainText('2 × 3 × 4 voxels');
  expect(errors).toEqual([]);
  await page.screenshot({ path: 'test-results/viewer-created.png', fullPage: true });
  await page.reload();
  await expect(list.locator('option')).toHaveCount(2);
});

test('rejects invalid dimensions and names without adding assets', async ({ page }) => {
  await page.getByLabel('Width X').fill('17');
  await page.getByRole('button', { name: 'Create asset' }).click();
  await expect(page.getByLabel('Selected asset').locator('option')).toHaveCount(2);
  await page.getByLabel('Width X').fill('4');
  await page.getByLabel('Name', { exact: true }).fill('   ');
  await page.getByRole('button', { name: 'Create asset' }).click();
  await expect(page.getByRole('alert')).toContainText('name');
  await expect(page.getByLabel('Selected asset').locator('option')).toHaveCount(2);
});

test('orbit, zoom, pan, preset views and display toggles change the rendered image', async ({ page }) => {
  const canvas = page.locator('canvas');
  const initial = await canvas.screenshot();
  const box = (await canvas.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 90, y + 35, { steps: 8 });
  await page.mouse.up();
  const orbited = await canvas.screenshot();
  expect(orbited.equals(initial)).toBe(false);
  await page.mouse.wheel(0, -200);
  await expect.poll(async () => (await canvas.screenshot()).equals(orbited)).toBe(false);
  const zoomed = await canvas.screenshot();
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(x + 140, y + 55, { steps: 8 });
  await page.mouse.up({ button: 'right' });
  expect((await canvas.screenshot()).equals(zoomed)).toBe(false);
  await page.getByRole('button', { name: 'Frame asset' }).click();
  expect((await canvas.screenshot()).equals(initial)).toBe(true);
  await page.getByRole('button', { name: 'Front −Z' }).click();
  const front = await canvas.screenshot();
  expect(front.equals(initial)).toBe(false);
  await page.getByRole('button', { name: 'Top +Y' }).click();
  expect((await canvas.screenshot()).equals(front)).toBe(false);
  await page.screenshot({ path: 'test-results/viewer-top.png', fullPage: true });
  await page.getByRole('button', { name: 'Frame asset' }).click();
  await page.getByLabel('Bounds', { exact: true }).uncheck();
  const noBounds = await canvas.screenshot();
  expect(noBounds.equals(initial)).toBe(false);
  await page.getByLabel('Selected asset').selectOption({ label: 'Metre cube' });
  await page.getByLabel('Selected asset').selectOption({ label: 'Direction marker' });
  expect((await canvas.screenshot()).equals(noBounds)).toBe(true);
  await page.getByLabel('Grid / axes').uncheck();
  expect((await canvas.screenshot()).equals(noBounds)).toBe(false);
  await page.getByLabel('Grid / axes').check();
  await page.getByLabel('Bounds', { exact: true }).check();
  await page.screenshot({ path: 'test-results/viewer-workshop.png', fullPage: true });
  const framed = await canvas.screenshot();
  await canvas.focus();
  await page.keyboard.press('ArrowLeft');
  expect((await canvas.screenshot()).equals(framed)).toBe(false);
});

test('workshop remains usable as a catalog when WebGL is unavailable', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
  });
  await page.goto('/tools/voxel-editor/');
  await expect(page.locator('.viewport')).toHaveAttribute('data-state', 'unsupported');
  await expect(page.getByRole('status')).toContainText('WebGL 2 unavailable');
  await expect(page.getByRole('button', { name: 'Frame asset' })).toBeDisabled();
  await page.getByRole('button', { name: 'Create asset' }).click();
  await expect(page.getByLabel('Selected asset').locator('option')).toHaveCount(3);
  await expect(page.getByRole('status')).toContainText('WebGL 2 unavailable');
  await context.close();
});

test('limits session allocations with an actionable message', async ({ page }) => {
  for (let count = 0; count < 23; count++) await page.getByRole('button', { name: 'Create asset' }).click();
  await expect(page.getByLabel('Selected asset').locator('option')).toHaveCount(24);
  await expect(page.getByRole('alert')).toContainText('Session limit reached');
});
