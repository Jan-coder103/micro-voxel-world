import { expect,test } from '@playwright/test';
import { regionLayout } from '../../src/world/regional-terrain';

test('river and lake banks render while flight remains idle',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.setViewportSize({width:800,height:600});
  const l=regionLayout(103);
  for(const [name,x,z] of [['river',-500,l.riverZ(-500)+50],['lake',l.lakeX,l.riverZ(l.lakeX)+65+140]] as const){
    await page.goto(`/tools/flight/?terrain=regional&seed=103&structures=0&x=${x}&z=${z}`);
    const stats=page.getByLabel('Flight diagnostics'),read=async()=>JSON.parse(await stats.getAttribute('data-sample')??'{}');
    await expect.poll(async()=>(await read()).settled,{timeout:20000}).toBe(true);
    await expect.poll(async()=>(await read()).idle).toBe(true);
    const s=await read();expect(s.state).toBe('ready');expect(s.ticks).toBe(0);expect(s.failures).toBe(0);expect(s.resident).toBeLessThanOrEqual(49);
    await page.getByLabel('Aircraft flight scene',{exact:true}).screenshot({path:`test-results/shoreline-${name}.png`});
  }
  expect(errors).toEqual([]);
});
