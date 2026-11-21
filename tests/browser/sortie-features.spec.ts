import { expect,test } from '@playwright/test';
test('showroom keeps aircraft between panels and world map pauses, pans, zooms and resumes',async({page})=>{
  test.setTimeout(60000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.setViewportSize({width:1280,height:800});await page.goto('/');
  const host=page.getByLabel('Aircraft flight scene',{exact:true}),menu=page.getByRole('dialog',{name:'Hangar and upgrades'}),read=async()=>JSON.parse(await host.getAttribute('data-sample')??'{}');
  await expect(menu).toBeVisible();await expect.poll(async()=>(await read()).frameCount).toBeGreaterThan(2);
  await expect(page.locator('.plane-slots button:disabled')).toHaveCount(4);
  const left=await page.locator('.hangar-left').boundingBox(),right=await page.locator('.hangar-right').boundingBox();expect(left!.x+left!.width).toBeLessThan(600);expect(right!.x).toBeGreaterThan(700);
  await page.screenshot({path:'test-results/sortie-showroom.png'});await page.emulateMedia({reducedMotion:'reduce'});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/sortie-home-narrow.png'});await page.setViewportSize({width:1280,height:800});
  // Low-resolution short UI check, no sustained flight benchmark.
  await page.getByText('Settings and developer tools',{exact:true}).click();await page.getByLabel('Render scale',{exact:true}).selectOption('0.5');await page.getByLabel('Combat effects',{exact:true}).uncheck();
  await page.getByRole('button',{name:'Start engine / Take off',exact:true}).click();await page.keyboard.press('m');
  const map=page.getByRole('dialog',{name:'World map',exact:true});await expect(map).toBeVisible();await expect.poll(async()=>(await read()).paused).toBe(true);
  const before=await read();await page.keyboard.press('d');await expect.poll(async()=>(await read()).mapX).toBeGreaterThan(before.mapX);await page.keyboard.press('w');await expect.poll(async()=>(await read()).mapZ).toBeLessThan(before.mapZ);
  await page.getByRole('button',{name:'− Zoom out',exact:true}).click();await expect.poll(async()=>(await read()).mapSpan).toBe(before.mapSpan*2);
  const after=await read();expect(after.x).toBe(before.x);expect(after.z).toBe(before.z);expect(after.speed).toBe(before.speed);expect(after.residents).toBeLessThanOrEqual(49);
  await page.screenshot({path:'test-results/sortie-map.png'});await page.keyboard.press('m');await expect(map).toBeHidden();await expect.poll(async()=>(await read()).paused).toBe(false);
  await page.keyboard.press('4');await expect(page.locator('#weapon-hud')).toContainText('Homing missile');await page.keyboard.press('Escape');await expect(menu).toBeVisible();
  await page.setViewportSize({width:390,height:844});expect(await menu.evaluate(d=>d.scrollWidth<=d.clientWidth)).toBe(true);await page.screenshot({path:'test-results/sortie-showroom-narrow.png'});
  await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));expect(errors).toEqual([]);
});

test('renders the fortified base, detailed mutant, rescue pair and distant clouds in bounded static views',async({page})=>{
  test.setTimeout(90000);
  const {build}=await import('vite'),{fileURLToPath}=await import('node:url');
  const result=await build({configFile:false,logLevel:'silent',build:{write:false,minify:false,lib:{entry:fileURLToPath(new URL('./fixtures/sortie-presentation.ts',import.meta.url)),formats:['es']},target:'es2022'}});
  const bundle=Array.isArray(result)?result[0]:result;if(!('output' in bundle))throw new Error('Missing fixture bundle');const script=bundle.output.find(o=>o.type==='chunk');if(!script||script.type!=='chunk')throw new Error('Missing fixture');
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.route('**/__sortie.html*',r=>r.fulfill({contentType:'text/html',body:'<body><script type="module" src="/__sortie.js"></script>'}));await page.route('**/__sortie.js',r=>r.fulfill({contentType:'text/javascript',body:script.code}));
  for(const view of ['base','boss','rescue','clouds']){await page.goto(`/__sortie.html?view=${view}`);await expect(page.locator('body')).toHaveAttribute('data-ready','true');await page.locator('canvas').screenshot({path:`test-results/sortie-${view}.png`});}
  expect(errors).toEqual([]);
});
