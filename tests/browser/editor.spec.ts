import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('edit, history, palette, dirty state and source reopen workflow', async ({ page }) => {
  await page.goto('/tools/voxel-editor/');
  await page.getByRole('button', { name: 'Create asset', exact: true }).click();
  await expect(page.locator('#dirty-state')).toContainText('Unsaved changes');
  await page.locator('#cell-X').fill('1');
  await page.getByRole('button', { name: 'Remove voxel', exact: true }).click();
  await expect(page.locator('#cell-state')).toContainText('empty');
  await expect(page.getByRole('definition').last()).toHaveText('63');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.locator('#cell-state')).toContainText('occupied');
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await page.locator('#palette-id').fill('coral');
  await page.locator('#palette-color').fill('#ff7766');
  await page.getByRole('button', { name: 'Add palette', exact: true }).click();
  await page.locator('#edit-palette').selectOption('coral');
  await page.getByRole('button', { name: 'Add voxel', exact: true }).click();
  await expect(page.locator('#cell-state')).toContainText('coral');
  await page.locator('#cell-X').fill('0');
  await page.getByRole('button', { name: 'Paint voxel', exact: true }).click();
  await expect(page.locator('#cell-state')).toContainText('coral');
  await page.locator('#palette-id').fill('rose');
  await page.getByRole('button', { name: 'Update palette', exact: true }).click();
  await expect(page.locator('#cell-state')).toContainText('rose');
  await page.getByRole('button', { name: 'Remove palette', exact: true }).click();
  await expect(page.locator('#edit-error')).toContainText('in use');
  await page.locator('#size-X').fill('5');
  await page.locator('#source-name').fill('Edited block');
  await page.getByRole('button', { name: 'Apply name / grid' }).click();
  await expect(page.locator('#asset-list option:checked')).toHaveText('Edited block');
  await page.locator('#cell-X').fill('4');
  await page.getByRole('button', { name: 'Add voxel', exact: true }).click();
  const downloading = page.waitForEvent('download');
  await page.locator('#export-source').click();
  const download = await downloading;
  const data = await readFile((await download.path())!, 'utf8');
  const source = JSON.parse(data);
  expect(source.size).toEqual([5, 4, 4]);
  expect(source.cells).toHaveLength(65);
  expect(source.cells.filter((cell: { palette: string }) => cell.palette === 'rose')).toHaveLength(3);
  await expect(page.locator('#dirty-state')).toContainText('unchanged');
  const exporting = page.waitForEvent('download');
  await page.locator('#export-glb').click();
  expect((await exporting).suggestedFilename()).toMatch(/\.glb$/);
  // Another asset has its own history and switching back preserves this document.
  const id = source.id;
  await page.locator('#asset-list').selectOption({ index: 0 });
  await expect(page.locator('#undo')).toBeDisabled();
  await page.locator('#asset-list').selectOption(id);
  await expect(page.locator('#undo')).toBeEnabled();
  await page.screenshot({ path: 'test-results/phase-5-editor.png', fullPage: true });
  await page.reload();
  await page.locator('#import-source').setInputFiles({ name: 'edited.voxel.json', mimeType: 'application/json', buffer: Buffer.from(data) });
  await expect(page.locator('#source-name')).toHaveValue('Edited block');
  await expect(page.locator('#dirty-state')).toContainText('unchanged');
  await expect(page.locator('#undo')).toBeDisabled();
  const reopened = page.waitForEvent('download');
  await page.locator('#export-source').click();
  expect(await readFile((await (await reopened).path())!, 'utf8')).toBe(data);
});

test('invalid edits retain state and unsaved navigation is guarded', async ({ page }) => {
  await page.goto('/tools/voxel-editor/');
  await page.getByRole('button', { name: 'Create asset', exact: true }).click();
  await page.locator('#cell-X').fill('255');
  await page.getByRole('button', { name: 'Paint voxel', exact: true }).click();
  await expect(page.locator('#edit-error')).toContainText('inside the grid');
  await expect(page.locator('#undo')).toBeDisabled();
  const dialog = page.waitForEvent('dialog');
  const navigating = page.locator('a.brand').click({ noWaitAfter: true });
  await (await dialog).dismiss();
  await navigating;
  await expect(page).toHaveURL(/voxel-editor/);
});


test('explicit replacement reopens edited fixture IDs and remains atomic on invalid input', async ({ page }) => {
  await page.goto('/tools/voxel-editor/');
  await page.locator('#source-name').fill('Edited marker');
  await page.getByRole('button', { name: 'Apply name / grid' }).click();
  const exporting = page.waitForEvent('download');
  await page.locator('#export-source').click();
  const data = await readFile((await (await exporting).path())!, 'utf8');
  await page.reload();
  await page.locator('#replace-source').check();
  await page.locator('#import-source').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{}') });
  await expect(page.locator('#source-name')).toHaveValue('Direction marker');
  await page.locator('#import-source').setInputFiles({ name: 'edited.json', mimeType: 'application/json', buffer: Buffer.from(data) });
  await expect(page.locator('#source-name')).toHaveValue('Edited marker');
  await expect(page.locator('#asset-list option')).toHaveCount(2);
  await expect(page.locator('#undo')).toBeDisabled();
  await expect(page.locator('#replace-source')).not.toBeChecked();
  await expect(page.locator('#dirty-state')).toContainText('unchanged');
});


test('editing without WebGL retains dirty source through GLB export', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
  });
  await page.goto('/tools/voxel-editor/');
  await page.getByRole('button', { name: 'Create asset', exact: true }).click();
  await page.getByRole('button', { name: 'Remove voxel', exact: true }).click();
  await expect(page.locator('#cell-state')).toContainText('empty');
  const exporting = page.waitForEvent('download');
  await page.locator('#export-glb').click();
  const bytes = await readFile((await (await exporting).path())!);
  expect(bytes.readUInt32LE(0)).toBe(0x46546c67);
  await expect(page.locator('#dirty-state')).toContainText('Unsaved changes');
  await page.locator('#undo').click();
  await expect(page.locator('#cell-state')).toContainText('occupied');
  await expect(page.getByRole('status')).toContainText('WebGL 2 unavailable');
});
