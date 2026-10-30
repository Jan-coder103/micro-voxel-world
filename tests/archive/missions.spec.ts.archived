import { test,expect,type Page } from '@playwright/test';
const read=async(page:Page)=>JSON.parse(await page.getByLabel('Prototype diagnostics').getAttribute('data-sample')??'{}');
const campaign=async(page:Page)=>JSON.parse(await page.getByLabel('Campaign progress').getAttribute('data-sample')??'{}');
const flyHome=async(page:Page,hover=false)=>{
  await page.getByRole('button',{name:'Start / Resume',exact:true}).click();await page.keyboard.down('Space');if(hover){await expect.poll(async()=>(await read(page)).remaining,{timeout:20000}).toBe(0);await page.keyboard.up('Space');await page.keyboard.down('KeyW');await expect.poll(async()=>(await read(page)).state,{timeout:15000}).toBe('returning');await page.keyboard.up('KeyW');}else{await expect.poll(async()=>(await read(page)).state,{timeout:20000}).toBe('returning');await page.keyboard.up('Space');}
  await page.getByRole('button',{name:'Return assist',exact:true}).click();await expect.poll(async()=>(await read(page)).state,{timeout:60000}).toBe('complete');
};
test('mission board earns stars once, unlocks Relief, rearms and reloads durable progression',async({page})=>{
  test.setTimeout(150000);const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/play/');await expect.poll(async()=>(await read(page)).settled,{timeout:30000}).toBe(true);
  await expect(page.getByLabel('Mission',{exact:true}).locator('option[value=relief]')).toHaveJSProperty('disabled',true);expect((await campaign(page)).stars).toBe(0);
  await flyHome(page);await expect.poll(async()=>(await campaign(page)).stars).toBe(1);await expect(page.getByLabel('Mission',{exact:true}).locator('option[value=relief]')).toHaveJSProperty('disabled',false);await expect(page.getByLabel('Sortie results')).toContainText('+1 service star');
  const save=await page.evaluate(()=>localStorage.getItem('mvw:campaign:v1:g1:p1'));const killed=(await read(page)).killed;
  await page.screenshot({path:'test-results/phase-18-clearpass-result.png',fullPage:true});
  await page.getByRole('button',{name:'Prepare next sortie / rearm',exact:true}).click();await expect.poll(async()=>(await read(page)).state).toBe('ready');expect((await read(page)).shots).toBe(0);expect((await read(page)).killed).toBe(killed);expect((await read(page)).visited).toBe(false);
  await page.getByLabel('Mission',{exact:true}).selectOption('relief');await expect(page.getByRole('heading',{name:'Relief Watch',exact:true})).toBeVisible();await expect.poll(async()=>(await read(page)).mission).toBe('relief');expect((await read(page)).remaining).toBe(96);await page.getByLabel('Aircraft',{exact:true}).selectOption('helicopter');await flyHome(page,true);
  await expect.poll(async()=>(await campaign(page)).stars).toBe(3);expect((await read(page)).integrity).toBeGreaterThan(0);await expect(page.getByLabel('Campaign progress')).toContainText('Flight lead');await page.screenshot({path:'test-results/phase-18-relief-result.png',fullPage:true});
  await page.getByText('Settings and diagnostics',{exact:true}).click();await page.getByLabel('World seed').fill('12013');await page.getByRole('button',{name:'Load world',exact:true}).click();await expect.poll(async()=>(await read(page)).seed).toBe(12013);expect((await campaign(page)).stars).toBe(3);expect((await read(page)).remaining).toBe(96);await expect(page.getByLabel('Sortie results')).toContainText('No sortie result this session');
  await page.reload();await expect.poll(async()=>(await campaign(page)).stars,{timeout:30000}).toBe(3);expect((await read(page)).state).toBe('ready');expect((await read(page)).remaining).toBe(0);expect((await read(page)).visited).toBe(false);expect(await page.evaluate(()=>localStorage.getItem('mvw:campaign:v1:g1:p1'))).not.toBe(save);
  expect(errors).toEqual([]);await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await expect(page.locator('canvas')).toHaveCount(0);
});
test('post pressure pauses, mission abandonment gives no award and corrupt campaign bytes stay untouched',async({page})=>{
  test.setTimeout(90000);await page.addInitScript(()=>{if(localStorage.getItem('mvw:campaign:v1:g1:p1')===null)localStorage.setItem('mvw:campaign:v1:g1:p1',JSON.stringify({schema:1,completed:['clearpass']}));});
  await page.goto('/play/');await expect.poll(async()=>(await campaign(page)).stars,{timeout:30000}).toBe(1);await page.getByLabel('Mission',{exact:true}).selectOption('relief');await page.getByLabel('Aircraft',{exact:true}).selectOption('helicopter');
  await page.getByRole('button',{name:'Start / Resume',exact:true}).click();await expect.poll(async()=>(await read(page)).integrity).toBeLessThan(99);await page.getByRole('button',{name:'Pause',exact:true}).click();const integrity=(await read(page)).integrity;await page.waitForTimeout(400);expect((await read(page)).integrity).toBe(integrity);
  await page.screenshot({path:'test-results/phase-18-relief-pressure.png',fullPage:true});
  await page.getByRole('button',{name:'Prepare next sortie / rearm',exact:true}).click();await expect(page.getByLabel('Sortie results')).toContainText('aborted');expect((await campaign(page)).stars).toBe(1);expect((await read(page)).integrity).toBe(100);
  await page.evaluate(()=>localStorage.setItem('mvw:campaign:v1:g1:p1','corrupt'));await page.reload();await expect(page.getByLabel('Campaign progress')).toContainText('Session only',{timeout:30000});expect(await page.evaluate(()=>localStorage.getItem('mvw:campaign:v1:g1:p1'))).toBe('corrupt');await expect(page.getByLabel('Mission',{exact:true}).locator('option[value=relief]')).toHaveJSProperty('disabled',true);
});
test('isolated benchmark does not access campaign records',async({page})=>{
  await page.addInitScript(()=>{const original=Storage.prototype.getItem;Storage.prototype.getItem=function(key){if(key.includes('campaign'))throw new Error('Campaign accessed by isolated benchmark');return original.call(this,key);};});
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));await page.goto('/play/?benchmark=crowd');await expect(page.getByLabel('Campaign progress')).toContainText('no campaign records accessed',{timeout:30000});expect((await campaign(page)).isolated).toBe(true);expect(errors).toEqual([]);await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await expect(page.locator('canvas')).toHaveCount(0);
});
