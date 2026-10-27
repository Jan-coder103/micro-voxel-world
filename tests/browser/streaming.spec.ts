import { expect, test, type Page } from '@playwright/test';
const sample=async (page:Page) => JSON.parse((await page.getByLabel('Streaming diagnostics').getAttribute('data-sample'))??'{}') as {resident:number;pending:number;ready:number;settled:boolean;lods:number[];chunk:string;failures:number;geometries:number;seed:number};
async function settled(page:Page) {
  await expect.poll(async () => (await sample(page)).settled,{timeout:20000}).toBe(true);
  const state=await sample(page); expect(state.resident).toBe(49); expect(state.pending+state.ready).toBe(0); expect(state.lods).toEqual([1,8,16,24]); expect(state.failures).toBe(0); expect(state.geometries).toBeLessThanOrEqual(50);
}
test('worker streaming survives traversal, seed changes, reload and saved clearance', async ({page}) => {
  test.setTimeout(90000);
  const errors:string[]=[]; page.on('pageerror',(error)=>errors.push(error.message));
  await page.goto('/tools/streaming/'); await settled(page);
  await expect(page.getByLabel('Current marker')).toHaveText('beacon:0,0 · present');
  await page.screenshot({path:'test-results/phase-8-home.png',fullPage:true});
  await page.getByRole('button',{name:'Clear current marker',exact:true}).click();
  await expect(page.getByLabel('Current marker')).toHaveText('beacon:0,0 · cleared');
  for (let i=0;i<2;i++) {
    await page.getByRole('button',{name:'Travel east 256 m',exact:true}).click();
    await expect.poll(async ()=>(await sample(page)).chunk).toBe('8,0'); await settled(page);
    await page.getByRole('button',{name:'Return home',exact:true}).click();
    await expect.poll(async ()=>(await sample(page)).chunk).toBe('0,0'); await settled(page);
    await expect(page.getByLabel('Current marker')).toHaveText('beacon:0,0 · cleared');
  }
  await page.getByRole('button',{name:'Travel west 256 m',exact:true}).click(); await settled(page);
  await expect(page.getByLabel('Current marker')).toHaveText('beacon:-8,0 · present');
  await page.screenshot({path:'test-results/phase-8-away.png',fullPage:true});
  await page.getByLabel('World seed').fill('104'); await page.getByRole('button',{name:'Load seed',exact:true}).click(); await settled(page);
  expect((await sample(page)).seed).toBe(104); await expect(page.getByLabel('Current marker')).toHaveText('beacon:0,0 · present');
  await page.getByLabel('World seed').fill('103'); await page.getByRole('button',{name:'Load seed',exact:true}).click(); await settled(page);
  await expect(page.getByLabel('Current marker')).toHaveText('beacon:0,0 · cleared');
  await page.reload(); await settled(page); await expect(page.getByLabel('Current marker')).toHaveText('beacon:0,0 · cleared');
  // Abruptly reverse direction while jobs are in flight; stale terrain must never remain attached.
  await page.getByRole('button',{name:'Travel east 256 m',exact:true}).click(); await page.getByRole('button',{name:'Return home',exact:true}).click(); await settled(page);
  await page.screenshot({path:'test-results/phase-8-return.png',fullPage:true});
  await page.getByLabel('World seed').fill(''); await page.getByRole('button',{name:'Load seed',exact:true}).click(); await expect(page.getByRole('status')).toContainText('Seed must'); expect((await sample(page)).seed).toBe(103);
  await page.evaluate(()=>{window.dispatchEvent(new Event('pagehide'));window.dispatchEvent(new Event('pagehide'));});
  await expect(page.locator('canvas')).toHaveCount(0); expect(errors).toEqual([]);
});
test('focused camera input crosses chunk boundaries and clearing keys stops travel', async ({page}) => {
  await page.goto('/tools/streaming/'); await settled(page); await page.getByLabel('Streamed terrain', {exact:true}).focus(); await page.keyboard.down('KeyD');
  await expect.poll(async ()=>(await sample(page)).chunk,{timeout:10000}).not.toBe('0,0');
  await page.keyboard.up('KeyD'); await page.getByLabel('World seed').focus(); await settled(page);
  const before=await sample(page); await page.keyboard.down('KeyD'); await page.waitForTimeout(150); await page.keyboard.up('KeyD'); expect((await sample(page)).chunk).toBe(before.chunk);
});
test('storage corruption and unavailable WebGL fail visibly without replacing saved bytes', async ({page,browser}) => {
  await page.addInitScript(()=>localStorage.setItem('mvw:chunk-deltas:v1:g1:103','corrupt-save'));
  await page.goto('/tools/streaming/'); await settled(page); await expect(page.getByLabel('Save status')).toContainText('Session only');
  await page.getByRole('button',{name:'Clear current marker',exact:true}).click(); await expect(page.getByLabel('Current marker')).toContainText('cleared'); expect(await page.evaluate(()=>localStorage.getItem('mvw:chunk-deltas:v1:g1:103'))).toBe('corrupt-save');
  const context=await browser.newContext(); const fallback=await context.newPage(); await fallback.addInitScript(()=>{HTMLCanvasElement.prototype.getContext=(()=>null) as typeof HTMLCanvasElement.prototype.getContext;});
  await fallback.goto('/tools/streaming/'); await expect(fallback.getByRole('status')).toContainText('WebGL 2 unavailable'); await expect(fallback.getByRole('button',{name:'Load seed',exact:true})).toBeDisabled(); await context.close();
});
test('worker startup failure releases the canvas and disables generation controls', async ({page}) => {
  await page.addInitScript(()=>{window.Worker=class {constructor(){throw new Error('Workers blocked');}} as unknown as typeof Worker;});
  await page.goto('/tools/streaming/'); await expect(page.getByRole('status')).toContainText('Terrain workers unavailable'); await expect(page.locator('canvas')).toHaveCount(0); await expect(page.getByRole('button',{name:'Load seed',exact:true})).toBeDisabled();
});
