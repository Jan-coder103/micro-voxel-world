import { expect,test } from '@playwright/test';
import { build } from 'vite';
import { fileURLToPath } from 'node:url';

test('crop parcels and mountain landscape render with the actual terrain shader',async({page})=>{
  const result=await build({configFile:false,logLevel:'silent',build:{write:false,minify:false,lib:{entry:fileURLToPath(new URL('./fixtures/crop-landscape.ts',import.meta.url)),formats:['es']},target:'es2022'}});
  const bundle=Array.isArray(result)?result[0]:result;if(!('output' in bundle))throw new Error('Missing fixture bundle');
  const script=bundle.output.find(o=>o.type==='chunk');if(!script||script.type!=='chunk')throw new Error('Missing forest fixture');
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.setViewportSize({width:800,height:500});
  await page.route('**/__forest-check.html',r=>r.fulfill({contentType:'text/html',body:'<html><body style="margin:0"><script type="module" src="/__forest-check.js"></script></body></html>'}));
  await page.route('**/__forest-check.js',r=>r.fulfill({contentType:'text/javascript',body:script.code}));
  await page.goto('/__forest-check.html');await expect.poll(()=>page.evaluate(()=>window.cropStats?.pending),{timeout:20000}).toBe(false);
  const stats=await page.evaluate(()=>window.cropStats);expect(stats.trees).toBeGreaterThan(1000);expect(stats.tiles).toBe(97);expect(stats.calls).toBeLessThan(60);expect(stats.cropPixels).toBeGreaterThan(2000);
  await page.screenshot({path:'test-results/crop-landscape.png'});expect(errors).toEqual([]);
});
