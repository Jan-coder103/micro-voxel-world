import {expect,test} from '@playwright/test';
import {build} from 'vite';
import {fileURLToPath} from 'node:url';
test('world coastline stays fixed across moving coverage and incoming terrain LODs',async({page})=>{
  test.setTimeout(60000);
  const result=await build({configFile:false,logLevel:'silent',build:{write:false,minify:false,lib:{entry:fileURLToPath(new URL('./fixtures/coast-stability.ts',import.meta.url)),formats:['es']}}});
  const bundle=Array.isArray(result)?result[0]:result;if(!('output' in bundle))throw new Error('Missing fixture bundle');const script=bundle.output.find(o=>o.type==='chunk');if(!script||script.type!=='chunk')throw new Error('Missing coast fixture');
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.route('**/__coast-stability.html',r=>r.fulfill({contentType:'text/html',body:'<html><body><script type="module" src="/__coast-stability.js"></script></body></html>'}));
  await page.route('**/__coast-stability.js',r=>r.fulfill({contentType:'text/javascript',body:script.code}));
  await page.goto('/__coast-stability.html');await expect.poll(()=>page.evaluate(()=>window.coastStability?.ready),{timeout:45000}).toBe(true);
  const resultStats=await page.evaluate(()=>window.coastStability);
  expect(resultStats.maxHeightError,JSON.stringify(resultStats)).toBeLessThan(.051);expect(resultStats.wetMismatches).toBe(0);
  expect(resultStats.waterPixels).toBeGreaterThan(1000);expect(resultStats.waterPixels).toBeLessThan(30000);
  expect(Math.max(...resultStats.movingMaskDifferences)).toBeLessThanOrEqual(2);
  expect(Math.max(...resultStats.lodMaskDifferences)).toBeLessThanOrEqual(2);
  await page.locator('canvas').screenshot({path:'test-results/stable-coastline.png'});expect(errors).toEqual([]);
});
