import { expect,test } from '@playwright/test';

test.use({hasTouch:true,isMobile:true,viewport:{width:844,height:390},launchOptions:{args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']}});
test('touch controls steer, set power, toggle fire and reset when paused or interrupted',async({page})=>{
  test.setTimeout(90000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');
  const menu=page.getByRole('dialog',{name:'Hangar and upgrades'}),host=page.getByLabel('Aircraft flight scene',{exact:true});
  await expect(menu).toBeVisible({timeout:60000});
  await expect(page.getByRole('status').filter({hasText:'rotate your device'})).toHaveCount(0); // hidden in landscape
  await page.locator('#launch').click();
  const controls=page.getByRole('region',{name:'Touch flight controls'});
  // A named section is exposed as a region.
  await expect(controls).toBeVisible();
  const slider=page.getByRole('slider',{name:'Throttle'}),shoot=page.getByRole('button',{name:'Auto-shoot: OFF'});
  await slider.fill('100');
  const sample=async()=>JSON.parse(await host.getAttribute('data-sample')??'{}');
  await expect.poll(async()=>(await sample()).throttle,{timeout:15000}).toBeGreaterThan(.2);
  await shoot.tap();await expect(page.locator('#auto-shoot')).toHaveAttribute('aria-pressed','true');
  const stick=page.locator('#flight-stick'),box=(await stick.boundingBox())!;
  const touch=await page.context().newCDPSession(page);
  const thumb={x:box.x+box.width*.8,y:box.y+box.height*.8,id:1};
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[thumb]});
  await expect(stick.locator('i')).not.toHaveAttribute('style','transform: translate(-50%, -50%);');
  const throttleBox=(await slider.boundingBox())!;
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[thumb,{x:throttleBox.x+throttleBox.width/2,y:throttleBox.y+10,id:2}]});
  expect((await sample()).paused).toBe(false);
  await touch.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
  await expect(stick.locator('i')).toHaveAttribute('style','transform: translate(-50%, -50%);');
  await page.locator('#menu-button').tap();await expect(menu).toBeVisible();await expect(controls).toBeHidden();
  await page.locator('#launch').click();await expect(page.locator('#auto-shoot')).toHaveAttribute('aria-pressed','false');
  await page.setViewportSize({width:390,height:844});
  await expect(page.locator('.frontier>.landscape-notice')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.setViewportSize({width:844,height:390});await expect(page.locator('.frontier>.landscape-notice')).toBeHidden();
  await page.screenshot({path:'test-results/mobile-landscape.png'});
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
  await expect.poll(async()=>(await sample()).paused).toBe(true);
  await expect(controls).toBeHidden();expect(errors).toEqual([]);
});
