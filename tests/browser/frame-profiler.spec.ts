import { readFile } from 'node:fs/promises';
import { expect,test } from '@playwright/test';

test('profiler collects bounded timings, exports and restores toggles',async({page})=>{
  test.setTimeout(60000);await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:480,height:320});
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
  await expect(page.locator('#hangar')).toBeVisible();await page.keyboard.press('F8');
  const panel=page.locator('.frame-profiler');await expect(panel).toBeVisible();
  await expect(panel.locator('pre')).toContainText('CPU frame callback',{timeout:30000});
  await panel.getByLabel('Trees',{exact:true}).uncheck();
  const download=page.waitForEvent('download');await panel.getByRole('button',{name:'Export JSON'}).click();const file=await download;expect(file.suggestedFilename()).toBe('frontier-profile.json');const report=JSON.parse(await readFile((await file.path())!,'utf8'));expect(report.visuals.Trees).toBe(false);expect(report.budgetMs).toBeCloseTo(16.67,2);await panel.screenshot({path:'test-results/frame-profiler.png'});
  await panel.getByRole('button',{name:'Stop / close'}).click();await expect(panel).toBeHidden();
  await page.keyboard.press('F8');await expect(panel.getByLabel('Trees',{exact:true})).toBeChecked();
  await page.keyboard.press('F8');await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await expect(panel).toHaveCount(0);expect(errors).toEqual([]);
});
