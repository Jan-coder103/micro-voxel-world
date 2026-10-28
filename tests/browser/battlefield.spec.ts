import { expect, test } from '@playwright/test';

test('autumn scene renders without shader errors, quality/fog preserve play and seed reload stays bounded', async ({page})=>{
  test.setTimeout(90000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto('/play/');
  const read=async()=>JSON.parse(await page.getByLabel('Prototype diagnostics').getAttribute('data-sample')??'{}');
  const report=async()=>JSON.parse(await page.getByLabel('Benchmark measurements').getAttribute('data-report')??'{}');
  await expect.poll(async()=>(await read()).settled,{timeout:30000}).toBe(true);
  await expect.poll(async()=>(await read()).renderIdle).toBe(true);const idle=(await read()).renderedFrames;await page.waitForTimeout(200);expect((await read()).renderedFrames).toBe(idle);
  const first=await read();await page.getByLabel('Scenery quality',{exact:true}).selectOption('high');await expect.poll(async()=>(await report()).presentation.quality).toBe('high');const presentation=(await report()).presentation;
  expect(presentation.environment).toBe('autumn-valley');expect(presentation.trees).toBeGreaterThan(1000);expect(presentation.shadowMap).toBe(1024);
  expect(presentation.depots).toBe(81);expect(presentation.groundExtent).toBe(1536);
  // Scenic/depot geometry plus one reusable ground-shadow grid: <=67 total.
  expect(first.geometries).toBeLessThanOrEqual(67);
  expect((await read()).geometries).toBeLessThanOrEqual(67);
  const high=await page.locator('canvas').screenshot();
  await page.getByLabel('Soft shadows',{exact:true}).uncheck();await page.getByLabel('Distance fog',{exact:true}).uncheck();
  await expect.poll(async()=>(await report()).presentation.shadowMap).toBe(0);
  expect((await read()).ticks).toBe(first.ticks);expect((await read()).remaining).toBe(first.remaining);
  expect((await page.locator('canvas').screenshot()).equals(high)).toBe(false);
  await page.getByLabel('Soft shadows',{exact:true}).check();await page.getByLabel('Distance fog',{exact:true}).check();
  await page.getByLabel('Scenery quality',{exact:true}).selectOption('auto');await page.getByText('Settings and diagnostics',{exact:true}).click();
  for(const seed of ['12013','12012']){
    await page.getByLabel('World seed').fill(seed);await page.getByRole('button',{name:'Load world',exact:true}).click();
    await expect.poll(async()=>(await read()).settled,{timeout:30000}).toBe(true);
    expect((await read()).geometries).toBeLessThanOrEqual(67);expect((await read()).failures).toBe(0);
  }
  await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await expect(page.locator('canvas')).toHaveCount(0);expect(errors).toEqual([]);
});

test('distant city is present on approach and stays present while the simulation ring moves',async({page})=>{
  test.setTimeout(60000);await page.goto('/play/');
  const read=async()=>JSON.parse(await page.getByLabel('Prototype diagnostics').getAttribute('data-sample')??'{}');
  const presentation=async()=>JSON.parse(await page.getByLabel('Benchmark measurements').getAttribute('data-report')??'{}').presentation;
  await expect.poll(async()=>(await read()).settled,{timeout:30000}).toBe(true);
  expect((await presentation()).depots).toBe(81);expect((await read()).hordes).toBeLessThan(81);
  await page.getByRole('button',{name:'Start / Resume',exact:true}).click();
  await expect.poll(async()=>(await read()).z,{timeout:15000}).toBeLessThan(128);
  await page.getByRole('button',{name:'Pause',exact:true}).click();expect((await presentation()).depots).toBe(81);
  expect((await read()).residents).toBeLessThanOrEqual(49);expect((await read()).remaining).toBe(96);
  await page.getByRole('button',{name:'Recover aircraft',exact:true}).click();await expect.poll(async()=>(await read()).state).toBe('ready');
  expect((await presentation()).depots).toBe(81);await page.screenshot({path:'test-results/city-distance-coverage.png',fullPage:true});
});

test('player landscape and instruments remain visible at desktop and narrow widths',async({page})=>{
  test.setTimeout(60000);await page.setViewportSize({width:1440,height:900});await page.goto('/');
  await page.getByRole('button',{name:'Fly / Resume'}).click();await page.keyboard.press('Escape');await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog',{name:'Game menu'})).not.toBeVisible();
  await expect(page.locator('#heading-readout')).toHaveText('000°');await expect(page.locator('.sortie-result')).toContainText('Paused');
  await expect.poll(async()=>JSON.parse(await page.getByLabel('Prototype diagnostics').getAttribute('data-sample')??'{}').settled,{timeout:30000}).toBe(true);
  await page.screenshot({path:'test-results/autumn-valley-desktop-low.png'});
  await page.keyboard.press('Escape');await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByLabel('Scenery quality',{exact:true}).selectOption('high');await page.keyboard.press('Escape');
  await expect.poll(async()=>JSON.parse(await page.getByLabel('Benchmark measurements').getAttribute('data-report')??'{}').presentation?.quality).toBe('high');
  await page.screenshot({path:'test-results/autumn-valley-desktop.png'});
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  const a=await page.getByLabel('Mission HUD').boundingBox(),b=await page.getByLabel('Flight HUD').boundingBox();expect(a!.x+a!.width).toBeLessThan(b!.x);
  const menu=await page.getByRole('button',{name:'Esc · Menu',exact:true}).boundingBox(),compass=await page.locator('.compass-hud').boundingBox(),brand=await page.locator('header .brand').boundingBox();
  expect(menu!.y+menu!.height).toBeLessThan(compass!.y);expect(brand!.x+brand!.width).toBeLessThan(menu!.x);
  await page.screenshot({path:'test-results/autumn-valley-narrow.png'});
});

test('editable depot imports at collision scale and renders in workshop inspection views',async({page})=>{
  await page.goto('/tools/voxel-editor/');await page.locator('#import-source').setInputFiles('assets/source/clearpass-depot.voxel.json');
  await expect(page.locator('#file-result')).toHaveText('Imported Clearpass utility depot.');
  await expect(page.getByRole('definition').nth(2)).toHaveText('4.00 × 3.00 × 12.00 m');
  for(const [view,button] of [['perspective','Frame asset'],['front','Front −Z'],['top','Top +Y']]){
    await page.getByRole('button',{name:button,exact:true}).click();await page.locator('canvas').screenshot({path:`test-results/clearpass-depot-${view}.png`});
  }
});
