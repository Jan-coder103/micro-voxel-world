import { expect,test } from '@playwright/test';
import { build } from 'vite';
import { fileURLToPath } from 'node:url';

test('connected countryside, ocean fleets and colossal mutants render in short static views',async({page})=>{
  const result=await build({configFile:false,logLevel:'silent',build:{write:false,minify:false,lib:{entry:fileURLToPath(new URL('./fixtures/frontier-expansion.ts',import.meta.url)),formats:['es']},target:'es2022'}});
  const bundle=Array.isArray(result)?result[0]:result;if(!('output' in bundle))throw new Error('Missing fixture bundle');const script=bundle.output.find(o=>o.type==='chunk');if(!script||script.type!=='chunk')throw new Error('Missing expansion fixture');
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.route('**/__expansion.html*',r=>r.fulfill({contentType:'text/html',body:'<html><body><script type="module" src="/__expansion.js"></script></body></html>'}));
  await page.route('**/__expansion.js',r=>r.fulfill({contentType:'text/javascript',body:script.code}));
  for(const view of ['fields','navy','boss']){
    await page.goto(`/__expansion.html?view=${view}`);await expect.poll(()=>page.evaluate(()=>window.expansionView?.ready),{timeout:20000}).toBe(true);
    const stats=await page.evaluate(()=>window.expansionView);expect(stats.roadTiles).toBe(25);if(view==='navy')expect(stats.shipParts).toBeGreaterThan(90);if(view==='boss')expect(stats.mutants).toBeGreaterThan(0);
    await page.locator('canvas').screenshot({path:`test-results/expansion-${view}.png`});
  }
  expect(errors).toEqual([]);
});

test('hangar skills, equipment, base navigation and saved purchases work on desktop and narrow screens',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.addInitScript(()=>localStorage.setItem('mvw:frontier:pilot:v1',JSON.stringify({schema:1,money:10000,xp:6000,levels:{engine:0,weapons:0,bounty:0}})));
  await page.goto('/');const menu=page.getByRole('dialog',{name:'Hangar and upgrades'});await expect(menu).toBeVisible();
  await page.getByLabel('Navigation destination').selectOption('flagship:0');await expect(page.locator('#heading')).toContainText('CARRIER');
  await page.getByRole('button',{name:'Pilot skill tree',exact:true}).click();await expect(page.locator('#skill-points')).toContainText('20 skill points');
  await expect(page.locator('[data-skill=control]')).toBeDisabled();await page.locator('[data-skill=thrust]').click();await expect(page.locator('[data-skill=control]')).toBeEnabled();await page.locator('[data-skill=control]').click();await expect(page.locator('#skill-points')).toContainText('18 skill points');
  await menu.screenshot({path:'test-results/expansion-skills.png'});
  await page.getByRole('button',{name:'Equipment shop',exact:true}).click();await page.locator('[data-shop=engine-1]').click();await expect(page.getByLabel('engine equipment',{exact:true})).toHaveValue('engine-1');await expect(page.locator('[data-shop=engine-1]')).toHaveText('Equipped');
  await page.getByLabel('Shop category').selectOption('weapon');await expect(page.locator('.shop-card:visible')).toHaveCount(5);await menu.screenshot({path:'test-results/expansion-shop.png'});
  await page.setViewportSize({width:390,height:844});expect(await menu.evaluate(d=>d.scrollWidth<=d.clientWidth)).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await menu.screenshot({path:'test-results/expansion-shop-narrow.png'});
  await page.reload();await expect(menu).toBeVisible();await page.getByRole('button',{name:'Equipment shop',exact:true}).click();await expect(page.getByLabel('engine equipment',{exact:true})).toHaveValue('engine-1');await page.getByRole('button',{name:'Pilot skill tree',exact:true}).click();await expect(page.locator('#skill-points')).toContainText('18 skill points');
  await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await expect(page.locator('canvas')).toHaveCount(0);expect(errors).toEqual([]);
});
