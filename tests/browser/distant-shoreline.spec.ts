import { expect,test } from '@playwright/test';
import { build } from 'vite';
import { fileURLToPath } from 'node:url';

test('distant shoreline keeps a pixel-width edge instead of blending across a coarse triangle',async({page})=>{
  const result=await build({configFile:false,logLevel:'silent',build:{write:false,minify:false,lib:{entry:fileURLToPath(new URL('./fixtures/distant-shoreline.ts',import.meta.url)),formats:['es']}}});
  const bundle=Array.isArray(result)?result[0]:result;
  if(!('output' in bundle))throw new Error('Expected one fixture bundle');
  const script=bundle.output.find(o=>o.type==='chunk');if(!script||script.type!=='chunk')throw new Error('Missing shader fixture');
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.route('**/__shoreline-check.html',r=>r.fulfill({contentType:'text/html',body:'<html><body style="margin:0"><script type="module" src="/__shoreline-check.js"></script></body></html>'}));
  await page.route('**/__shoreline-check.js',r=>r.fulfill({contentType:'text/javascript',body:script.code}));
  await page.goto('/__shoreline-check.html');
  await expect.poll(()=>page.evaluate(()=>!!window.shorelinePixels?.sharp)).toBe(true);
  const {sharp,reference}=await page.evaluate(()=>window.shorelinePixels);
  const waterRed=sharp[16][0],landRed=Math.min(...sharp.slice(300,490).map(p=>p[0]));
  const intermediate=(row:number[][])=>row.filter(p=>p[0]>waterRed+5&&p[0]<landRed-8).length;
  expect(intermediate(reference)).toBeGreaterThan(100);
  expect(intermediate(sharp)).toBeLessThanOrEqual(2);
  expect(sharp.slice(16,250).every(p=>Math.abs(p[0]-waterRed)<=1)).toBe(true);
  await page.locator('canvas[data-shoreline="sharp"]').screenshot({path:'test-results/distant-shoreline-sharp.png'});
  await page.locator('canvas[data-shoreline="reference"]').screenshot({path:'test-results/distant-shoreline-reference.png'});
  expect(errors).toEqual([]);
});
