import { test,expect } from '@playwright/test';
for(const [url,label] of [['/play/','Prototype diagnostics'],['/tools/flight/?terrain=regional','Flight diagnostics']])test(`aircraft clears the old invisible buffer and stops at visible skid contact: ${url}`,async({page})=>{
  test.setTimeout(60000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);const read=async()=>JSON.parse(await page.getByLabel(label).getAttribute('data-sample')??'{}');
  await expect.poll(async()=>(await read()).settled,{timeout:30000}).toBe(true);
  await page.getByLabel('Aircraft',{exact:true}).selectOption('helicopter');
  await page.getByRole('button',{name:'Start / Resume',exact:true}).click();await page.keyboard.down('KeyQ');
  await expect.poll(async()=>(await read()).altitude,{timeout:20000}).toBeLessThan(label==='Prototype diagnostics'?10:6);
  await page.keyboard.up('KeyQ');await page.getByRole('button',{name:'Pause',exact:true}).click();
  await expect.poll(async()=>{const s=await read();return s.flightState??s.state;}).toBe('paused');
  const near=await read();expect(near.flightState??near.state).toBe('paused');expect(near.altitude).toBeGreaterThan(2.3);expect(near.altitude).toBeLessThan(label==='Prototype diagnostics'?12:8);
  await page.getByRole('button',{name:'Start / Resume',exact:true}).click();await page.keyboard.down('KeyQ');
  await expect.poll(async()=>{const s=await read();return s.flightState??s.state;},{timeout:15000}).toBe('crashed');await page.keyboard.up('KeyQ');
  const hit=await read();expect(hit.reason).toBe('Terrain collision');expect(hit.altitude).toBeGreaterThan(1.2);expect(hit.altitude).toBeLessThan(2.6);
  const host=page.locator(label==='Prototype diagnostics'?'.sortie-scene':'.viewport');await host.focus();
  const box=(await host.boundingBox())!;await page.mouse.move(box.x+box.width*.4,box.y+box.height*.6);await page.keyboard.press('KeyC');await page.mouse.move(box.x+box.width*.6,box.y+box.height*.3,{steps:8});
  await page.screenshot({path:`test-results/skid-contact-${label==='Prototype diagnostics'?'combat':'regional'}.png`,fullPage:true});
  await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await expect(page.locator('canvas')).toHaveCount(0);expect(errors).toEqual([]);
});
