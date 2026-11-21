import { expect,test } from '@playwright/test';

test('keyboard takeoff rotates, clears the runway and climbs after releasing the elevator',async({page})=>{
  test.setTimeout(90000);await page.emulateMedia({reducedMotion:'reduce'});
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:640,height:400});await page.goto('/');
  const host=page.getByLabel('Aircraft flight scene',{exact:true}),read=async()=>JSON.parse(await host.getAttribute('data-sample')??'{}');
  await expect(page.getByRole('dialog',{name:'Hangar and upgrades'})).toBeVisible();
  await page.getByText('Settings and developer tools',{exact:true}).click();await page.getByLabel('Combat effects',{exact:true}).uncheck();await page.getByLabel('Render scale',{exact:true}).selectOption('0.5');
  const initialY=(await read()).y;
  await page.getByRole('button',{name:'Start engine / Take off',exact:true}).click();
  await page.keyboard.down('e');await expect.poll(async()=>(await read()).speed,{timeout:20000}).toBeGreaterThan(33);
  await page.keyboard.down('s');await expect.poll(async()=>(await read()).grounded,{timeout:5000}).toBe(false);
  const liftoffTicks=(await read()).flightTicks;await expect.poll(async()=>(await read()).flightTicks,{timeout:20000}).toBeGreaterThanOrEqual(liftoffTicks+60);await page.keyboard.up('s');
  await expect.poll(async()=>{const s=await read();return s.state==='flying'&&s.y>initialY+15;},{timeout:20000}).toBe(true);
  const airborne=await read();expect(airborne.grounded).toBe(false);expect(airborne.stalled).toBe(false);expect(airborne.speed).toBeGreaterThan(35);
  await page.keyboard.up('e');await page.keyboard.press('Escape');await expect.poll(async()=>(await read()).paused).toBe(true);
  await page.getByRole('dialog',{name:'Hangar and upgrades'}).evaluate((d:HTMLDialogElement)=>d.close());
  await page.screenshot({path:'test-results/force-flight-climbout.png'});
  await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));expect(errors).toEqual([]);
});
