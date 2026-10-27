import { test,expect,type Page } from '@playwright/test';
import { RegionalPopulation } from '../../src/hordes/regional-population';
const sample=async(page:Page)=>JSON.parse(await page.getByLabel('Population diagnostics').getAttribute('data-sample')??'{}');
test('regional flight presents persistent partial encounters, weapons and recovery without resurrecting victims',async({page})=>{
  test.setTimeout(90000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  const storage=new Map<string,string>(),p=new RegionalPopulation(103,{getItem:k=>storage.get(k)??null,setItem:(k,v)=>{storage.set(k,v);}}),e=Array.from({length:25},(_,i)=>p.encounter(i%5-2,Math.floor(i/5)-4)).find(e=>e.members.length>2)!;expect(e.members.length).toBeGreaterThan(2);const targets=p.targets(e);targets[0].health=0;p.damaged(targets[0]);targets[1].health=17;p.damaged(targets[1]);
  const save=storage.get(p.key)!;
  await page.addInitScript(({key,save})=>{if(!localStorage.getItem(key))localStorage.setItem(key,save);localStorage.setItem('mvw:hordes:v1:g1:p1:103','legacy');},{key:p.key,save});
  await page.goto(`/tools/flight/?terrain=regional&x=${e.x*128+64}&z=${e.z*128+64}`);
  await expect.poll(async()=>(await sample(page)).killed,{timeout:30000}).toBe(1);
  expect((await sample(page)).error).toBe('');expect((await sample(page)).resident).toBeLessThanOrEqual(49);
  await page.getByRole('button',{name:'Approach nearby horde',exact:true}).click();
  await page.getByRole('button',{name:'Start / Resume',exact:true}).click();await page.keyboard.down('Space');await expect.poll(async()=>JSON.parse(await page.getByLabel('Combat diagnostics').getAttribute('data-sample')??'{}').shots).toBeGreaterThan(0);await page.keyboard.up('Space');
  await page.getByRole('button',{name:'Pause',exact:true}).click();await page.screenshot({path:'test-results/phase-15-regional-population.png',fullPage:true});
  const before=await sample(page),saved=await page.evaluate(key=>localStorage.getItem(key),p.key);
  await page.getByRole('button',{name:'Recover / Reset',exact:true}).click();expect((await sample(page)).killed).toBe(before.killed);
  await page.reload();await expect.poll(async()=>(await sample(page)).killed,{timeout:30000}).toBe(before.killed);expect(await page.evaluate(key=>localStorage.getItem(key),p.key)).toBe(saved);expect(await page.evaluate(()=>localStorage.getItem('mvw:hordes:v1:g1:p1:103'))).toBe('legacy');
  await page.evaluate(()=>{window.dispatchEvent(new Event('pagehide'));window.dispatchEvent(new Event('pagehide'));});await expect(page.locator('canvas')).toHaveCount(0);expect(errors).toEqual([]);
});
test('regional flight reports corrupt population saves without overwriting them',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('mvw:regional-population:v1:g2:s1:p1:103','corrupt'));
  await page.goto('/tools/flight/?terrain=regional');await expect(page.getByLabel('Population diagnostics')).toContainText('SyntaxError',{timeout:30000});await page.getByRole('button',{name:'Pause',exact:true}).click();expect(await page.evaluate(()=>localStorage.getItem('mvw:regional-population:v1:g2:s1:p1:103'))).toBe('corrupt');
});
