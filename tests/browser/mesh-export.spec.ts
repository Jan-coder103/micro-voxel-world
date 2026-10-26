import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { parseSource } from '../../src/assets/voxel-source';

const marker = parseSource(await readFile('assets/source/direction-marker.voxel.json', 'utf8'));
function jsonChunk(bytes: Buffer) {
  expect(bytes.readUInt32LE(0)).toBe(0x46546c67);
  expect(bytes.readUInt32LE(4)).toBe(2);
  expect(bytes.readUInt32LE(8)).toBe(bytes.length);
  expect(bytes.readUInt32LE(16)).toBe(0x4e4f534a);
  return JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString('utf8'));
}

test('workshop reports reduced triangles and downloads an optimized GLB without changing source', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/tools/voxel-editor/');
  await expect(page.getByLabel('Mesh statistics')).toContainText('1,896 → 46');
  const exported = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export runtime GLB' }).click();
  const download = await exported;
  expect(download.suggestedFilename()).toBe('fixture-marker.glb');
  const json = jsonChunk(await readFile((await download.path())!));
  expect(json.meshes).toHaveLength(1);
  expect(json.meshes[0].primitives).toHaveLength(1);
  expect(json.accessors[json.meshes[0].primitives[0].indices].count).toBe(138);
  expect(json.nodes[0].extras).toMatchObject({ assetId: marker.id, units: 'metres', pivot: 'base-center', meshVersion: 1 });
  const sourceDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export selected source' }).click();
  expect(parseSource(await readFile((await (await sourceDownload).path())!, 'utf8'))).toEqual(marker);
  await page.screenshot({ path: 'test-results/phase4-marker.png', fullPage: true });
  await page.getByLabel('Selected asset').selectOption({ label: 'Metre cube' });
  await expect(page.getByLabel('Mesh statistics')).toContainText('12,000 → 12');
  await page.screenshot({ path: 'test-results/phase4-cube.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('GLB export recovers from an error and remains available without WebGL', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
    const digest = crypto.subtle.digest.bind(crypto.subtle);
    Object.defineProperty(crypto.subtle, 'digest', { configurable: true, value: () => {
      Object.defineProperty(crypto.subtle, 'digest', { configurable: true, value: digest });
      return Promise.reject(new Error('Simulated export failure'));
    } });
  });
  await page.goto('/tools/voxel-editor/');
  const button = page.getByRole('button', { name: 'Export runtime GLB' });
  await button.click();
  await expect(page.getByRole('alert')).toContainText('Simulated export failure');
  await expect(button).toBeEnabled();
  const downloaded = page.waitForEvent('download');
  await button.click();
  expect(jsonChunk(await readFile((await (await downloaded).path())!)).meshes).toHaveLength(1);
  await expect(page.getByRole('alert')).toHaveText('');
  await expect(page.getByRole('status')).toContainText('WebGL 2 unavailable');
});
