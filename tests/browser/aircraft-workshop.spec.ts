import { expect,test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { parseSource } from '../../src/assets/voxel-source';
import { PLANES } from '../../src/game/aircraft-roster';
test('new aircraft sources import, frame, export and reopen losslessly in the voxel workshop',async({page})=>{
  test.setTimeout(90000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  for(const plane of PLANES.filter(p=>p.id!=='frontier')){
    await page.goto('/tools/voxel-editor/');const path=`assets/source/plane-${plane.id}.voxel.json`,source=parseSource(await readFile(path,'utf8'));
    await page.getByLabel('Import voxel JSON').setInputFiles(path);await expect(page.locator('#file-result')).toHaveText(`Imported ${plane.name}.`);
    await expect(page.getByRole('definition').nth(2)).toHaveText(source.size.map(n=>(n*.1).toFixed(2)).join(' × ')+' m');
    for(const [view,button] of [['perspective','Frame asset'],['front','Front −Z'],['top','Top +Y']]){await page.getByRole('button',{name:button,exact:true}).click();await page.locator('canvas').screenshot({path:`test-results/workshop-${plane.id}-${view}.png`});}
    const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export selected source',exact:true}).click();const saved=(await (await download).path())!;expect(parseSource(await readFile(saved,'utf8'))).toEqual(source);
    await page.reload();await page.getByLabel('Import voxel JSON').setInputFiles(saved);await expect(page.locator('#file-result')).toHaveText(`Imported ${plane.name}.`);await expect(page.locator('#dirty-state')).toContainText('unchanged');
  }
  expect(errors).toEqual([]);
});
