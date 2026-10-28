import { test,expect,type Page } from '@playwright/test';
const sample=async(page:Page,label='Prototype diagnostics')=>JSON.parse(await page.getByLabel(label).getAttribute('data-sample')??'{}');
test('Clearpass aircraft/loadout changes preserve casualties, hover and equipped weapon restrictions',async({page})=>{
  test.setTimeout(90000);const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/play/');await expect.poll(async()=>(await sample(page)).settled,{timeout:30000}).toBe(true);
  await page.getByRole('button',{name:'Start / Resume',exact:true}).click();await page.keyboard.down('Space');await expect.poll(async()=>(await sample(page)).killed,{timeout:15000}).toBeGreaterThan(0);await page.keyboard.up('Space');
  await page.getByRole('button',{name:'Pause',exact:true}).click();const before=await sample(page);
  const saved=await page.evaluate(()=>localStorage.getItem('mvw:hordes:v1:g1:p1:12012'));
  await page.getByLabel('Aircraft',{exact:true}).selectOption('helicopter');await expect.poll(async()=>(await sample(page)).aircraft).toBe('helicopter');
  const heli=await sample(page);expect(heli.state).toBe('ready');expect(heli.visited).toBe(false);expect(heli.speed).toBe(0);expect(heli.killed).toBe(before.killed);expect(await page.evaluate(()=>localStorage.getItem('mvw:hordes:v1:g1:p1:12012'))).toBe(saved);
  await page.getByLabel('Loadout',{exact:true}).selectOption('precision');await expect(page.getByLabel('Weapon',{exact:true}).locator('option[value=shell]')).toHaveJSProperty('disabled',true);
  await page.getByLabel('Weapon mount',{exact:true}).selectOption('port');await expect.poll(async()=>(await sample(page)).mount).toBe('port');const port=await sample(page);expect(port.muzzle.x).toBeLessThan(port.x);
  await page.getByRole('button',{name:'Start / Resume',exact:true}).click();await page.keyboard.press('Digit3');await expect.poll(async()=>(await sample(page)).ticks).toBeGreaterThan(20);const hovered=await sample(page);expect(hovered.x).toBe(heli.x);expect(hovered.z).toBe(heli.z);expect(hovered.y).toBe(heli.y);expect(hovered.weapon).toBe('minigun');
  await page.keyboard.down('KeyE');await expect.poll(async()=>(await sample(page)).y).toBeGreaterThan(heli.y+1);await page.keyboard.up('KeyE');
  await page.getByLabel('Weapon mount',{exact:true}).selectOption('starboard');await expect.poll(async()=>(await sample(page)).flightState).toBe('paused');const paused=await sample(page);await page.waitForTimeout(250);expect((await sample(page)).shots).toBe(paused.shots);
  await page.screenshot({path:'test-results/phase-17-helicopter.png',fullPage:true});
  await page.getByRole('button',{name:'Recover aircraft',exact:true}).click();expect((await sample(page)).killed).toBe(before.killed);
  await page.getByText('Settings and diagnostics',{exact:true}).click();await page.getByLabel('World seed').fill('12013');await page.getByRole('button',{name:'Load world',exact:true}).click();await expect.poll(async()=>(await sample(page)).seed).toBe(12013);expect((await sample(page)).remaining).toBe(96);expect((await sample(page)).aircraft).toBe('helicopter');expect((await sample(page)).loadout).toBe('precision');
  await page.reload();await expect.poll(async()=>(await sample(page)).aircraft).toBe('fixed-wing');expect((await sample(page)).killed).toBe(before.killed);
  await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await expect(page.locator('canvas')).toHaveCount(0);expect(errors).toEqual([]);
});
test('regional helicopter switches remain bounded and retain population bytes through recovery/reload',async({page})=>{
  test.setTimeout(90000);const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));const read=()=>sample(page,'Flight diagnostics');
  await page.goto('/tools/flight/?terrain=regional');await expect.poll(async()=>(await read()).settled,{timeout:30000}).toBe(true);
  const saved=await page.evaluate(()=>localStorage.getItem('mvw:regional-population:v1:g2:s1:p1:103'));
  for(const aircraft of ['helicopter','fixed-wing','helicopter']){await page.getByLabel('Aircraft',{exact:true}).selectOption(aircraft);await expect.poll(async()=>(await read()).aircraft).toBe(aircraft);expect((await read()).state).toBe('ready');}
  await page.getByLabel('Loadout',{exact:true}).selectOption('siege');await page.getByLabel('Weapon mount',{exact:true}).selectOption('starboard');
  await expect(page.getByLabel('Weapon',{exact:true}).locator('option[value=minigun]')).toHaveJSProperty('disabled',true);
  await page.getByRole('button',{name:'Start / Resume',exact:true}).click();await page.keyboard.down('KeyW');await expect.poll(async()=>(await read()).z).toBeLessThan(15);await page.keyboard.up('KeyW');await page.keyboard.down('KeyD');await expect.poll(async()=>(await read()).heading).toBeGreaterThan(.2);await page.keyboard.up('KeyD');
  await page.getByRole('button',{name:'Pause',exact:true}).click();expect((await read()).geometries).toBeLessThanOrEqual(80);await page.screenshot({path:'test-results/phase-17-regional-helicopter.png',fullPage:true});
  await page.getByRole('button',{name:'Recover / Reset',exact:true}).click();await expect.poll(async()=>(await read()).speed).toBe(0);expect(await page.evaluate(()=>localStorage.getItem('mvw:regional-population:v1:g2:s1:p1:103'))).toBe(saved);
  await page.reload();await expect.poll(async()=>(await read()).aircraft).toBe('fixed-wing');expect(await page.evaluate(()=>localStorage.getItem('mvw:regional-population:v1:g2:s1:p1:103'))).toBe(saved);
  await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await expect(page.locator('canvas')).toHaveCount(0);expect(errors).toEqual([]);
});
