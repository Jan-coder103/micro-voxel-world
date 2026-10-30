import { expect,test } from '@playwright/test';

test('frontier player starts at the runway, gates tools, pauses and fits narrow screens',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.setViewportSize({width:800,height:600});await page.goto('/');
  const menu=page.getByRole('dialog',{name:'Hangar and upgrades'}),host=page.getByLabel('Aircraft flight scene',{exact:true}),read=async()=>JSON.parse(await host.getAttribute('data-sample')??'{}');
  await expect(menu).toBeVisible();await expect.poll(async()=>(await read()).grounded).toBe(true);expect((await read()).speed).toBe(0);expect((await read()).money).toBe(0);
  await page.getByText('Settings and developer tools',{exact:true}).click();
  await expect(page.getByRole('link',{name:'Voxel workshop',exact:true})).toBeHidden();await page.getByLabel('Enable developer tools').check();await expect(page.getByRole('link',{name:'Voxel workshop',exact:true})).toBeVisible();await page.getByLabel('Enable developer tools').uncheck();
  await expect(page.locator('a[href^="/tools/"]').filter({hasNotText:'Voxel workshop'})).toHaveCount(0);
  await expect(page.locator('a[href="/play/"]')).toHaveCount(0);
  await page.getByLabel('Flying mode',{exact:true}).selectOption('direct');await expect.poll(async()=>(await read()).assisted).toBe(false);
  await page.getByRole('button',{name:'Start engine / Take off',exact:true}).click();await expect(menu).not.toBeVisible();await page.keyboard.press('Escape');await expect(menu).toBeVisible();await expect.poll(async()=>(await read()).paused).toBe(true);
  await expect.poll(async()=>(await read()).settled,{timeout:20000}).toBe(true);expect((await read()).distantTrees).toBeGreaterThan(0);expect((await read()).residents).toBeLessThanOrEqual(49);expect((await read()).hordes).toBeLessThanOrEqual(49);expect((await read()).lods.every((n:number)=>n>0)).toBe(true);
  await page.screenshot({path:'test-results/frontier-hangar.png'});
  // Close only the dialog for an idle landscape capture; flight remains paused.
  await menu.evaluate((d:HTMLDialogElement)=>d.close());await page.screenshot({path:'test-results/frontier-runway.png'});
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/frontier-narrow.png'});
  await page.getByRole('button',{name:'Esc · Hangar / Pause'}).click();await expect(menu).toBeVisible();expect(await menu.evaluate(d=>d.scrollWidth<=d.clientWidth)).toBe(true);
  await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await expect(page.locator('canvas')).toHaveCount(0);expect(errors).toEqual([]);
});

test('frontier reports unavailable WebGL without enabling flight',async({page})=>{
  await page.addInitScript(()=>{HTMLCanvasElement.prototype.getContext=(()=>null) as typeof HTMLCanvasElement.prototype.getContext;});await page.goto('/');await expect(page.getByRole('status')).toContainText('WebGL 2 is unavailable');await expect(page.locator('canvas')).toHaveCount(0);await expect(page.getByRole('button',{name:'Esc · Hangar / Pause'})).toBeDisabled();
});
