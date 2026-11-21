import { writeFile } from 'node:fs/promises';
import { expect,test } from '@playwright/test';
import { build } from 'vite';
import { fileURLToPath } from 'node:url';
test('shader fast paths, ordered cloud culling and cached moving shadows preserve rendered pixels',async({page})=>{
  test.setTimeout(90000);
  const result=await build({configFile:false,logLevel:'silent',build:{write:false,minify:false,lib:{entry:fileURLToPath(new URL('./fixtures/render-optimizations.ts',import.meta.url)),formats:['es']}}});
  const bundle=Array.isArray(result)?result[0]:result;if(!('output' in bundle))throw new Error('Missing bundle');const script=bundle.output.find(o=>o.type==='chunk');if(!script||script.type!=='chunk')throw new Error('Missing fixture');
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.route('**/__render-optimizations.html',r=>r.fulfill({contentType:'text/html',body:'<html><body><script type="module" src="/__render-optimizations.js"></script></body></html>'}));await page.route('**/__render-optimizations.js',r=>r.fulfill({contentType:'text/javascript',body:script.code}));
  await page.goto('/__render-optimizations.html');
  const resultStats=await page.evaluate(()=>(window as unknown as {renderOptimizations:{ready:boolean;cloudComparisons:{max:number;different:number}[];terrainComparisons:{max:number;different:number}[];shadowComparisons:{max:number;different:number}[];cloudCounts:number[][];buildCounts:number[];shadowCacheFallback:boolean;depthCopies:number}}).renderOptimizations);
  await writeFile('test-results/render-optimizations.json',JSON.stringify(resultStats,null,2));
  expect(resultStats,errors.join('\n')).toBeTruthy();expect(resultStats.shadowCacheFallback,JSON.stringify(resultStats)).toBe(false);expect(resultStats.depthCopies).toBe(10);expect(resultStats.buildCounts).toEqual([1,1,2,3,4,5,6,6,6,7]);
  for(const comparison of [...resultStats.cloudComparisons,...resultStats.terrainComparisons,...resultStats.shadowComparisons])expect(comparison.different,JSON.stringify(resultStats)).toBe(0);
  expect(resultStats.cloudCounts.every(([all,visible])=>visible<all&&visible>0)).toBe(true);
  await page.locator('canvas').screenshot({path:'test-results/render-optimizations.png'});expect(errors).toEqual([]);
});

test('Frontier publishes worker coverage and uses cached shadow depth',async({page})=>{
  test.setTimeout(60000);await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:480,height:320});
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await page.goto('/');
  const host=page.getByLabel('Aircraft flight scene',{exact:true}),read=async()=>JSON.parse(await host.getAttribute('data-sample')??'{}');
  // Forest residency streams independently; static reuse is checked in the controlled fixture.
  await expect.poll(async()=>(await read()).settled,{timeout:30000}).toBe(true);
  const sample=await read();expect(sample.coverageWorkerFailed).toBe(false);expect(sample.fallbackPending).toBe(false);expect(sample.shadowCacheFallback,JSON.stringify(sample)).toBe(false);expect(sample.staticShadowBuilds).toBeGreaterThan(0);expect(sample.shadowDepthCopies).toBeGreaterThan(0);
  // Wake one demand frame directly; player controls have separate browser coverage.
  await page.locator('#menu-button').evaluate((element:HTMLElement)=>element.click());
  await expect.poll(async()=>(await read()).shadowDepthCopies).toBeGreaterThan(sample.shadowDepthCopies);
  await page.screenshot({path:'test-results/frontier-cached-shadows.png'});await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));expect(errors).toEqual([]);
});
