import { expect, test } from '@playwright/test';

test('editable depot imports at collision scale and renders in workshop inspection views',async({page})=>{
  await page.goto('/tools/voxel-editor/');await page.locator('#import-source').setInputFiles('assets/source/clearpass-depot.voxel.json');
  await expect(page.locator('#file-result')).toHaveText('Imported Clearpass utility depot.');
  await expect(page.getByRole('definition').nth(2)).toHaveText('4.00 × 3.00 × 12.00 m');
  for(const [view,button] of [['perspective','Frame asset'],['front','Front −Z'],['top','Top +Y']]){
    await page.getByRole('button',{name:button,exact:true}).click();await page.locator('canvas').screenshot({path:`test-results/clearpass-depot-${view}.png`});
  }
});
