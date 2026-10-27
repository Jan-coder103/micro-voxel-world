import { expect, test } from '@playwright/test';

const kit = [
  ['ref-farmhouse', 'Farmhouse reference', '7.00 × 5.00 × 6.00 m'],
  ['ref-barn', 'Barn reference', '8.00 × 5.80 × 7.00 m'],
  ['ref-tractor', 'Tractor reference', '2.40 × 2.90 × 4.20 m'],
  ['ref-windmill', 'Windmill reference', '6.00 × 10.00 × 4.00 m'],
  ['ref-wooden-bridge', 'Wooden bridge reference', '4.00 × 2.20 × 10.00 m'],
  ['ref-water-tower', 'Water tower reference', '6.00 × 11.00 × 6.00 m'],
  ['ref-shipping-container', 'Shipping container reference', '2.50 × 2.60 × 6.10 m'],
  ['ref-bus-shelter', 'Bus shelter reference', '5.00 × 2.80 × 2.00 m'],
  ['ref-fuel-tank', 'Fuel tank reference', '4.80 × 4.00 × 7.00 m'],
  ['ref-watchtower', 'Military watchtower reference', '4.60 × 9.00 × 4.60 m'],
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
