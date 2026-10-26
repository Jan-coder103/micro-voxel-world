import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { parseSource } from '../../src/assets/voxel-source';

const marker = JSON.parse(await readFile('assets/source/direction-marker.voxel.json', 'utf8'));

test('created sources download and reopen losslessly after reload', async ({ page }) => {
  await page.goto('/tools/voxel-editor/');
  await page.getByLabel('Name', { exact: true }).fill('Saved coral block');
  await page.getByLabel('Width X').fill('2');
  await page.getByLabel('Height Y').fill('3');
  await page.getByLabel('Depth Z').fill('4');
  await page.getByLabel('Color', { exact: true }).fill('#dd6644');
  await page.getByRole('button', { name: 'Create asset' }).click();
  const image = await page.locator('canvas').screenshot();
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export selected source' }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toMatch(/^block-.*\.voxel\.json$/);
  const path = (await download.path())!;
  const exported = parseSource(await readFile(path, 'utf8'));
  expect(exported.size).toEqual([2, 3, 4]);
  expect(exported.palette[0].color).toBe('#dd6644');
  expect(exported.cells).toHaveLength(24);
  await page.reload();
  await expect(page.getByLabel('Selected asset').locator('option')).toHaveCount(2);
  await page.getByLabel('Import voxel JSON').setInputFiles(path);
  await expect(page.locator('#file-result')).toHaveText('Imported Saved coral block.');
  await expect(page.getByRole('status')).toContainText('Saved coral block · 24 voxels');
  await expect(page.locator('.asset-stats')).toContainText('0.20 × 0.30 × 0.40 m');
  expect((await page.locator('canvas').screenshot()).equals(image)).toBe(true);
  const again = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export selected source' }).click();
  expect(parseSource(await readFile((await (await again).path())!, 'utf8'))).toEqual(exported);
  await page.screenshot({ path: 'test-results/source-roundtrip.png', fullPage: true });
});

test('invalid files and duplicate IDs leave the catalog and selected preview intact', async ({ page }) => {
  await page.goto('/tools/voxel-editor/');
  const original = await page.locator('canvas').screenshot();
  for (const [contents, message] of [
    ['{', 'invalid JSON'],
    [JSON.stringify({ ...marker, schemaVersion: 9 }), 'schemaVersion'],
    [JSON.stringify({ ...marker, cells: [{ position: [999, 0, 0], palette: 'body' }] }), 'outside'],
    [JSON.stringify(marker), 'already in this session'],
    [' '.repeat(8 * 1024 * 1024 + 1), 'maximum size'],
  ]) {
    await page.getByLabel('Import voxel JSON').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from(contents) });
    await expect(page.getByRole('alert')).toContainText(message);
    await expect(page.getByLabel('Selected asset').locator('option')).toHaveCount(2);
    expect((await page.locator('canvas').screenshot()).equals(original)).toBe(true);
  }
  await page.getByLabel('Import voxel JSON').setInputFiles({ name: 'new.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ ...marker, id: 'imported-marker', name: '<b>Imported marker</b>' })) });
  await expect(page.getByLabel('Selected asset').locator('option')).toHaveCount(3);
  await expect(page.locator('.asset-stats')).toContainText('<b>Imported marker</b>');
  await expect(page.locator('.asset-stats b')).toHaveCount(0);
});

test('imports respect the session budget', async ({ page }) => {
  await page.goto('/tools/voxel-editor/');
  for (let i = 0; i < 22; i++) await page.getByRole('button', { name: 'Create asset' }).click();
  await page.getByLabel('Import voxel JSON').setInputFiles({ name: 'new.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ ...marker, id: 'imported-marker' })) });
  await expect(page.getByRole('alert')).toContainText('Session limit reached');
  await expect(page.getByLabel('Selected asset').locator('option')).toHaveCount(24);
});

test('source file controls work without WebGL', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
  });
  await page.goto('/tools/voxel-editor/');
  const source = { ...marker, id: 'fallback-marker' };
  await page.getByLabel('Import voxel JSON').setInputFiles({ name: 'source.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(source)) });
  await expect(page.locator('.asset-stats')).toContainText('0.80 × 0.60 × 1.00 m');
  await expect(page.getByRole('status')).toContainText('WebGL 2 unavailable');
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export selected source' }).click();
  expect(parseSource(await readFile((await (await downloaded).path())!, 'utf8'))).toEqual(source);
});
