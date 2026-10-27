import { expect, test, type Page } from '@playwright/test';
const read=async(page:Page,label:string)=>JSON.parse(await page.getByLabel(label).getAttribute('data-sample')??'{}');
async function ready(page:Page){await expect.poll(async()=>(await read(page,'Streaming diagnostics')).settled,{timeout:30000}).toBe(true);const s=await read(page,'Streaming diagnostics');expect(s.generator).toBe(2);expect(s.resident).toBe(49);expect(s.failures).toBe(0);expect(s.pending+s.ready).toBe(0);expect(s.geometries).toBeLessThanOrEqual(51);}
test('regional landmarks stream reproducibly across seed changes and launch aircraft without touching saves',async({page})=>{
  test.setTimeout(120000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('mvw:chunk-deltas:v1:g1:103','preserve-phase-8'));
  await page.goto('/tools/streaming/?terrain=regional');await ready(page);
  await expect(page.getByRole('heading',{name:'Regional terrain explorer'})).toBeVisible();
  for(const [name,biome] of [['Plains','plains'],['Coast','coast'],['Forest','forest'],['Mountains','mountains'],['Ocean','ocean'],['River','river'],['Lake','lake']]){
    await page.getByRole('button',{name,exact:true}).click();await ready(page);await expect.poll(async()=>(await read(page,'Regional terrain diagnostics')).biome).toBe(biome);
    if(name==='Forest'||name==='Lake')await page.screenshot({path:`test-results/phase-13-${name.toLowerCase()}.png`,fullPage:true});
  }
  const before=await read(page,'Regional terrain diagnostics');
  await page.getByLabel('World seed').fill('12012');await page.getByRole('button',{name:'Load seed',exact:true}).click();await ready(page);await page.getByRole('button',{name:'Lake',exact:true}).click();await ready(page);
  expect(await read(page,'Regional terrain diagnostics')).not.toEqual(before);
  await page.getByRole('link',{name:'Fly this region'}).click();await expect(page.getByRole('heading',{name:'Regional terrain flight'})).toBeVisible();
  await expect.poll(async()=>(await read(page,'Flight diagnostics')).generator).toBe(2);
  expect((await read(page,'Flight diagnostics')).seed).toBe(12012);
  await page.getByRole('button',{name:'Start / Resume',exact:true}).click();await expect.poll(async()=>(await read(page,'Flight diagnostics')).ticks).toBeGreaterThan(30);
  await page.getByRole('button',{name:'Pause',exact:true}).click();await expect.poll(async()=>(await read(page,'Flight diagnostics')).state).toBe('paused');
  const s=await read(page,'Flight diagnostics');expect(s.altitude).toBeGreaterThan(3);expect(s.resident).toBeLessThanOrEqual(49);expect(s.pending+s.ready).toBeLessThanOrEqual(2);
  await page.screenshot({path:'test-results/phase-13-flight.png',fullPage:true});
  const approach=new URL(page.url());await page.getByRole('button',{name:'Recover / Reset',exact:true}).click();await expect.poll(async()=>(await read(page,'Flight diagnostics')).state).toBe('ready');const reset=await read(page,'Flight diagnostics');expect(reset.x).toBe(Number(approach.searchParams.get('x')));expect(reset.z).toBe(Number(approach.searchParams.get('z')));expect(reset.seed).toBe(12012);
  expect(await page.evaluate(()=>localStorage.getItem('mvw:chunk-deltas:v1:g1:103'))).toBe('preserve-phase-8');
  await page.evaluate(()=>{window.dispatchEvent(new Event('pagehide'));window.dispatchEvent(new Event('pagehide'));});await expect(page.locator('canvas')).toHaveCount(0);expect(errors).toEqual([]);
});
