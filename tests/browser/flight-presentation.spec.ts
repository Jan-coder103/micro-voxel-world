import { test,expect,type Page } from '@playwright/test';
const read=async(page:Page,label='Prototype diagnostics')=>JSON.parse(await page.getByLabel(label).getAttribute('data-sample')??'{}');

test('player flying mode controls auto-level and survives recovery, aircraft and world changes',async({page})=>{
  test.setTimeout(90000);await page.goto('/');
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await page.getByLabel('Flying mode',{exact:true}).selectOption('direct');
  await expect.poll(async()=>(await read(page)).assisted).toBe(false);
  await page.setViewportSize({width:390,height:844});
  const menu=page.getByRole('dialog',{name:'Game menu'});
  expect(await menu.evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true);
  await page.screenshot({path:'test-results/flight-settings-narrow.png'});
  await page.setViewportSize({width:1280,height:720});
  await page.getByRole('button',{name:'Fly / Resume'}).click();await page.keyboard.down('KeyD');
  await expect.poll(async()=>(await read(page)).bank).toBeGreaterThan(.2);await page.keyboard.up('KeyD');
  const bank=(await read(page)).bank,ticks=(await read(page)).ticks;
  await expect.poll(async()=>(await read(page)).ticks).toBeGreaterThan(ticks+12);expect((await read(page)).bank).toBeCloseTo(bank,5);
  await page.keyboard.press('Escape');await page.getByLabel('Flying mode',{exact:true}).selectOption('assisted');
  await page.getByRole('button',{name:'Fly / Resume'}).click();await expect.poll(async()=>(await read(page)).bank).toBeLessThan(bank*.7);
  await page.keyboard.press('Escape');await page.getByLabel('Flying mode',{exact:true}).selectOption('direct');
  await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('button',{name:'Recover aircraft',exact:true}).click();
  await page.getByLabel('Aircraft',{exact:true}).selectOption('helicopter');await expect.poll(async()=>(await read(page)).aircraft).toBe('helicopter');expect((await read(page)).assisted).toBe(false);
  await page.goto('/play/');await page.getByLabel('Flying mode',{exact:true}).selectOption('direct');
  await page.getByText('Settings and diagnostics',{exact:true}).click();await page.getByLabel('World seed').fill('12013');await page.getByRole('button',{name:'Load world',exact:true}).click();
  await expect.poll(async()=>(await read(page)).seed).toBe(12013);expect((await read(page)).assisted).toBe(false);
});

for(const [url,label,hostSelector] of [['/play/','Prototype diagnostics','.sortie-scene'],['/tools/flight/?terrain=regional','Flight diagnostics','.viewport']])test(`hold C orbit returns to chase and shadow follows displayed aircraft: ${url}`,async({page})=>{
  test.setTimeout(60000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await expect.poll(async()=>(await read(page,label)).settled,{timeout:30000}).toBe(true);
  const host=page.locator(hostSelector);await host.focus();const before=await read(page,label),box=(await host.boundingBox())!;
  await page.mouse.move(box.x+box.width*.4,box.y+box.height*.4);await page.keyboard.down('KeyC');await page.mouse.move(box.x+box.width*.75,box.y+box.height*.6,{steps:8});
  await expect.poll(async()=>Math.abs((await read(page,label)).camera.x-before.camera.x)).toBeGreaterThan(5);
  const orbited=await read(page,label);
  expect(orbited.orbit).toBe(true);expect(orbited.ticks).toBe(0);
  const distance=(sample:typeof orbited)=>Math.hypot(sample.camera.x-sample.renderPose.position.x,sample.camera.y-sample.renderPose.position.y,sample.camera.z-sample.renderPose.position.z);
  expect(distance(orbited)).toBeCloseTo(distance(before),6);
  await page.screenshot({path:`test-results/orbit-${label.startsWith('Flight')?'regional':'combat'}.png`,fullPage:true});
  await page.keyboard.up('KeyC');await expect.poll(async()=>Math.abs((await read(page,label)).camera.x-before.camera.x)).toBeLessThan(.05);
  await page.keyboard.down('KeyC');await page.mouse.move(box.x+box.width*.5,box.y+box.height*.45);await page.getByRole('button',{name:'Start / Resume',exact:true}).focus();
  await expect.poll(async()=>(await read(page,label)).orbit).toBe(false);await page.keyboard.up('KeyC');
  await page.getByLabel('Aircraft',{exact:true}).selectOption('helicopter');await page.getByRole('button',{name:'Start / Resume',exact:true}).click();await page.keyboard.down('KeyE');
  await expect.poll(async()=>(await read(page,label)).y).toBeGreaterThan(before.y+1);await page.keyboard.up('KeyE');
  const flying=await read(page,label);expect(flying.groundShadow.x).toBeCloseTo(flying.renderPose.position.x);expect(flying.groundShadow.z).toBeCloseTo(flying.renderPose.position.z);expect(flying.groundShadow.y).toBeLessThan(flying.y-5);
  await page.getByRole('button',{name:'Pause',exact:true}).click();await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await expect(page.locator('canvas')).toHaveCount(0);expect(errors).toEqual([]);
});
