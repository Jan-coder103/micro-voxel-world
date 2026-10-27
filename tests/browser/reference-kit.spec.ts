import { expect, test } from '@playwright/test';

const kit = [
  ['ref-pine-tree', 'Pine tree reference', '4.00 × 8.00 × 4.00 m'],
  ['ref-derelict-car', 'Derelict car reference', '2.00 × 1.50 × 4.40 m'],
  ['ref-streetlight', 'Streetlight reference', '1.00 × 6.50 × 2.40 m'],
  ['ref-road-barrier', 'Concrete road barrier reference', '3.00 × 1.00 × 0.80 m'],
  ['ref-small-warehouse', 'Small warehouse reference', '10.00 × 5.00 × 8.00 m'],
  ['ref-zombie', 'Zombie scale reference', '0.90 × 1.80 × 0.70 m'],
  ['ref-attack-aircraft', 'Thunderbolt attack aircraft reference', '17.40 × 4.80 × 16.40 m'],
  ['ref-field-tree', 'Field tree reference', '4.00 × 6.00 × 4.00 m'],
  ['ref-utility-building', 'Utility building reference', '8.00 × 4.00 × 6.00 m'],
  ['ref-road-landing-pad', 'Road and landing pad reference', '12.00 × 0.10 × 16.00 m'],
];
for (const [id, name, bounds] of kit) {
  test(`reference asset imports and renders in all inspection views: ${id}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/tools/voxel-editor/');
    await page.locator('#import-source').setInputFiles(`assets/source/${id}.voxel.json`);
    await expect(page.locator('#file-result')).toHaveText(`Imported ${name}.`);
    await expect(page.getByRole('definition').nth(2)).toHaveText(bounds);
    await expect(page.locator('#dirty-state')).toContainText('unchanged');
    for (const [view, button] of [['perspective', 'Frame asset'], ['front', 'Front −Z'], ['top', 'Top +Y']]) {
      await page.getByRole('button', { name: button, exact: true }).click();
      await page.locator('canvas').screenshot({ path: `test-results/${id}-${view}.png` });
    }
    expect(errors).toEqual([]);
  });
}
