import { expect, test, type Page } from '@playwright/test';
const sample=async(page:Page,label:string)=>JSON.parse(await page.getByLabel(label).getAttribute('data-sample')??'{}');
async function settled(page:Page){await expect.poll(async()=>(await sample(page,'Streaming diagnostics')).settled,{timeout:30000}).toBe(true);const s=await sample(page,'Streaming diagnostics');expect(s.resident).toBe(49);expect(s.pending+s.ready).toBe(0);expect(s.failures).toBe(0);expect(s.geometries).toBeLessThanOrEqual(59);}
test('six districts have streamed shared buildings and connected roads across seeds and eviction',async({page})=>{
  test.setTimeout(150000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('mvw:chunk-deltas:v1:g1:103','keep-legacy-save'));
  await page.goto('/tools/streaming/?terrain=regional');await settled(page);
  for(const kind of ['City','Rural','Industrial','Military','Airport','Harbor']){
    await page.getByRole('button',{name:kind,exact:true}).click();await settled(page);
    const s=await sample(page,'Settlement diagnostics');expect(s.kind).toBe(kind.toLowerCase());expect(s.buildings).toBeGreaterThanOrEqual(4);expect(s.roads).toBeGreaterThan(12);expect(s.nodes).toBeGreaterThan(12);expect(s.cache).toBeLessThanOrEqual(64);expect(s.batches).toBe(8);
    if(['City','Airport','Harbor'].includes(kind))await page.screenshot({path:`test-results/phase-14-${kind.toLowerCase()}.png`,fullPage:true});
  }
  await page.getByRole('button',{name:'City',exact:true}).click();await settled(page);const before=await sample(page,'Settlement diagnostics');
  await page.getByRole('button',{name:'Travel east 256 m',exact:true}).click();await settled(page);await page.getByRole('button',{name:'City',exact:true}).click();await settled(page);expect((await sample(page,'Settlement diagnostics')).id).toBe(before.id);expect((await sample(page,'Settlement diagnostics')).buildings).toBe(before.buildings);
  await page.getByLabel('World seed').fill('12012');await page.getByRole('button',{name:'Load seed',exact:true}).click();await settled(page);await page.getByRole('button',{name:'City',exact:true}).click();await settled(page);expect((await sample(page,'Settlement diagnostics')).id).not.toBe(before.id);
  expect(await page.evaluate(()=>localStorage.getItem('mvw:chunk-deltas:v1:g1:103'))).toBe('keep-legacy-save');
  await page.getByRole('link',{name:'Fly this region'}).click();await expect.poll(async()=>(await sample(page,'Flight diagnostics')).structures,{timeout:30000}).toBeGreaterThan(0);
  await page.getByRole('button',{name:'Start / Resume',exact:true}).click();await expect.poll(async()=>(await sample(page,'Flight diagnostics')).ticks).toBeGreaterThan(30);await page.getByRole('button',{name:'Pause',exact:true}).click();await expect.poll(async()=>(await sample(page,'Flight diagnostics')).state).toBe('paused');
  await page.screenshot({path:'test-results/phase-14-flight.png',fullPage:true});await page.getByRole('button',{name:'Recover / Reset',exact:true}).click();await expect.poll(async()=>(await sample(page,'Flight diagnostics')).state).toBe('ready');
  await page.evaluate(()=>{window.dispatchEvent(new Event('pagehide'));window.dispatchEvent(new Event('pagehide'));});await expect(page.locator('canvas')).toHaveCount(0);expect(errors).toEqual([]);
});
test('regional explorer releases its canvas when terrain workers cannot start',async({page})=>{
  await page.addInitScript(()=>{window.Worker=class{constructor(){throw new Error('Workers blocked');}} as unknown as typeof Worker;});
  await page.goto('/tools/streaming/?terrain=regional');await expect(page.getByRole('status')).toContainText('Terrain workers unavailable');await expect(page.locator('canvas')).toHaveCount(0);
});
