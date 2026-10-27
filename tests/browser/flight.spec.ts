import { test,expect,type Page } from '@playwright/test';
const sample=async(page:Page)=>JSON.parse(await page.getByLabel('Flight diagnostics').getAttribute('data-sample')??'{}') as {state:string;ticks:number;z:number;pitch:number;speed:number;resident:number;pending:number;ready:number;failures:number;geometries:number};
test('flight controls, streaming traversal, focus pause, recovery and disposal',async({page})=>{
  test.setTimeout(90000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/tools/flight/');
  await expect.poll(async()=>(await sample(page)).resident).toBe(49);
  await page.getByRole('button',{name:'Start / Resume',exact:true}).click();await page.keyboard.down('KeyE');await page.keyboard.down('KeyS');
  await expect.poll(async()=>(await sample(page)).pitch).toBeGreaterThan(.15);await page.keyboard.up('KeyS');
  await expect.poll(async()=>(await sample(page)).speed,{timeout:30000}).toBeGreaterThan(90);await page.keyboard.up('KeyE');
  await expect.poll(async()=>(await sample(page)).z,{timeout:15000}).toBeLessThan(-112);
  expect((await sample(page)).resident).toBeLessThanOrEqual(49);expect((await sample(page)).geometries).toBeLessThanOrEqual(56);expect((await sample(page)).pending+(await sample(page)).ready).toBeLessThanOrEqual(2);
  await page.getByRole('button',{name:'Pause',exact:true}).click();await expect.poll(async()=>(await sample(page)).state).toBe('paused');const paused=await sample(page);await page.waitForTimeout(250);expect((await sample(page)).ticks).toBe(paused.ticks);
  await page.getByRole('button',{name:'Recover / Reset',exact:true}).click();await expect.poll(async()=>(await sample(page)).state).toBe('ready');
  await page.getByLabel('Flight assistance').selectOption('direct');await page.getByRole('button',{name:'Start / Resume',exact:true}).click();await page.keyboard.down('KeyW');await expect.poll(async()=>(await sample(page)).state,{timeout:15000}).toBe('crashed');await page.keyboard.up('KeyW');
  await page.getByRole('button',{name:'Recover / Reset',exact:true}).click();await expect.poll(async()=>(await sample(page)).state).toBe('ready');await expect.poll(async()=>(await sample(page)).resident).toBe(49);await expect.poll(async()=>(await sample(page)).pending+(await sample(page)).ready).toBe(0);await page.screenshot({path:'test-results/phase-9-flight.png',fullPage:true});
  await page.getByRole('button',{name:'Start / Resume',exact:true}).click();await page.getByLabel('Flight assistance').focus();await expect.poll(async()=>(await sample(page)).state).toBe('paused');expect((await sample(page)).failures).toBe(0);
  await page.evaluate(()=>{window.dispatchEvent(new Event('pagehide'));window.dispatchEvent(new Event('pagehide'));});await expect(page.locator('canvas')).toHaveCount(0);expect(errors).toEqual([]);
});

test('flight reports unsupported WebGL and worker startup and disables flight',async({page,browser})=>{
  await page.addInitScript(()=>{window.Worker=class {constructor(){throw new Error('blocked');}} as unknown as typeof Worker;});
  await page.goto('/tools/flight/');await expect(page.getByRole('status')).toContainText('Terrain workers unavailable');await expect(page.getByRole('button',{name:'Start / Resume',exact:true})).toBeDisabled();
  await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await expect(page.locator('canvas')).toHaveCount(0);
  const context=await browser.newContext();const fallback=await context.newPage();await fallback.addInitScript(()=>{HTMLCanvasElement.prototype.getContext=(()=>null) as typeof HTMLCanvasElement.prototype.getContext;});await fallback.goto('/tools/flight/');await expect(fallback.getByRole('status')).toContainText('WebGL 2 unavailable');await expect(fallback.getByRole('button',{name:'Start / Resume',exact:true})).toBeDisabled();await context.close();
});
