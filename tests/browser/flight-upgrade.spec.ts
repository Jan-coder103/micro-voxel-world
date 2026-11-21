import { expect,test } from '@playwright/test';
test('loads cockpit only in FPV, toggles back, and renders morph shaders without errors',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.setViewportSize({width:800,height:600});await page.goto('/');
  const host=page.getByLabel('Aircraft flight scene',{exact:true}),menu=page.getByRole('dialog',{name:'Hangar and upgrades'}),read=async()=>JSON.parse(await host.getAttribute('data-sample')??'{}');
  await expect(menu).toBeVisible();await expect.poll(async()=>(await read()).distantTrees).toBeGreaterThan(0);
  expect((await read()).cockpitLoaded).toBe(false);
  // Stay paused throughout: only camera/presentation resources are exercised.
  await menu.evaluate((d:HTMLDialogElement)=>d.close());await host.focus();await page.keyboard.press('v');
  await expect.poll(async()=>(await read()).cockpitLoaded).toBe(true);expect((await read()).firstPerson).toBe(true);
  await page.screenshot({path:'test-results/frontier-cockpit.png'});
  await page.keyboard.press('v');await expect.poll(async()=>(await read()).cockpitLoaded).toBe(false);
  expect((await read()).firstPerson).toBe(false);await page.screenshot({path:'test-results/frontier-tree-morph.png'});
  await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await expect(page.locator('canvas')).toHaveCount(0);expect(errors).toEqual([]);
});
