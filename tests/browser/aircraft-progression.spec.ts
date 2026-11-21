import { expect,test } from '@playwright/test';
import { PLANES } from '../../src/game/aircraft-roster';
test('hangar previews five tiers, enforces the chain, purchases/selects aircraft and persists the loadout',async({page})=>{
  test.setTimeout(90000);await page.emulateMedia({reducedMotion:'reduce'});
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  // Existing pilot migration gives funds, but does not grant aircraft ahead of the chain.
  await page.addInitScript(()=>{if(!localStorage.getItem('mvw:frontier:pilot:v3'))localStorage.setItem('mvw:frontier:pilot:v2',JSON.stringify({schema:2,money:50000,xp:40000,levels:{engine:0,bounty:0,weapons:0},skills:{},owned:[],equipped:{}}));});
  await page.setViewportSize({width:1100,height:760});await page.goto('/');const host=page.getByLabel('Aircraft flight scene',{exact:true}),read=async()=>JSON.parse(await host.getAttribute('data-sample')??'{}');
  await expect(page.getByRole('dialog',{name:'Hangar and upgrades'})).toBeVisible();await expect.poll(async()=>(await read()).plane).toBe('kestrel');await expect(page.locator('[data-plane]')).toHaveCount(5);
  await page.locator('[data-plane=spectre]').click();await expect.poll(async()=>(await read()).displayPlane).toBe('spectre');await expect(page.getByRole('button',{name:'Unlock & select Spectre X-5',exact:true})).toBeDisabled();expect((await read()).plane).toBe('kestrel');
  for(const id of ['mule','comet','frontier','spectre']){const p=PLANES.find(p=>p.id===id)!;await page.locator(`[data-plane=${id}]`).click();await page.getByRole('button',{name:`Unlock & select ${p.name}`,exact:true}).click();await expect.poll(async()=>(await read()).plane).toBe(id);}
  await expect(page.locator('#next-plane')).toContainText('COLLECTION COMPLETE');await page.screenshot({path:'test-results/progression-hangar.png'});
  await page.reload();await expect.poll(async()=>(await read()).plane).toBe('spectre');expect((await read()).ownedPlanes).toHaveLength(5);
  await page.locator('[data-plane=kestrel]').click();await expect.poll(async()=>(await read()).plane).toBe('kestrel');await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/progression-hangar-narrow.png'});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));expect(errors).toEqual([]);
});

test('all five aircraft retain micro-voxel detail and distinct silhouettes in perspective, front and top views',async({page})=>{
  test.setTimeout(90000);const {build}=await import('vite'),{fileURLToPath}=await import('node:url');const result=await build({configFile:false,logLevel:'silent',build:{write:false,minify:false,lib:{entry:fileURLToPath(new URL('./fixtures/aircraft-roster.ts',import.meta.url)),formats:['es']},target:'es2022'}});const bundle=Array.isArray(result)?result[0]:result;if(!('output' in bundle))throw new Error('Missing fixture');const script=bundle.output.find(o=>o.type==='chunk');if(!script||script.type!=='chunk')throw new Error('Missing fixture');
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await page.route('**/__aircraft.html*',r=>r.fulfill({contentType:'text/html',body:'<body><script type="module" src="/__aircraft.js"></script>'}));await page.route('**/__aircraft.js',r=>r.fulfill({contentType:'text/javascript',body:script.code}));
  for(const p of PLANES)for(const view of ['perspective','front','top']){await page.goto(`/__aircraft.html?plane=${p.id}&view=${view}`);await expect(page.locator('body')).toHaveAttribute('data-sample',/ready/);const sample=JSON.parse(await page.locator('body').getAttribute('data-sample')??'{}');expect(sample.cells).toBeGreaterThan(8000);expect(sample.rotors).toBe(p.propellers.length);expect(sample.triangles).toBeGreaterThan(100);await page.locator('canvas').screenshot({path:`test-results/aircraft-${p.id}-${view}.png`});}expect(errors).toEqual([]);
});

test('a saved successful run shows credits, XP, kill count and the landing bonus before the next sortie',async({page})=>{
  test.setTimeout(45000);await page.emulateMedia({reducedMotion:'reduce'});
  await page.addInitScript(()=>localStorage.setItem('mvw:frontier:pilot:v3',JSON.stringify({schema:3,planes:['kestrel','mule'],selectedPlane:'mule',runs:3,money:1000,xp:1800,levels:{engine:0,bounty:0,weapons:0},skills:{},owned:[],equipped:{},lastRun:{number:3,outcome:'landed',plane:'mule',kills:20,seconds:173,baseMoney:200,baseXP:300,money:400,xp:600,bonus:100}})));
  await page.goto('/');await expect(page.locator('#menu-title')).toHaveText('Ready for run 4.');await expect(page.locator('#run-debrief')).toContainText('RUN 3 · SAFE RETURN');await expect(page.locator('#run-debrief')).toContainText('+400 credits · +600 XP');await expect(page.locator('#run-debrief')).toContainText('20 kills · 2m 53s');await expect(page.locator('#run-debrief')).toContainText('SAFE LANDING +100% BONUS');await page.locator('#run-debrief').scrollIntoViewIfNeeded();await page.screenshot({path:'test-results/progression-debrief.png'});await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
});
