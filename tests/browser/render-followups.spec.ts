import { expect,test } from '@playwright/test';
import { build } from 'vite';
import { fileURLToPath } from 'node:url';
import { writeFile } from 'node:fs/promises';
test('cloud noise retains appearance and far trees and manual matrices preserve pixels',async({page})=>{
  test.setTimeout(60000);
  const result=await build({configFile:false,logLevel:'silent',build:{write:false,minify:false,lib:{entry:fileURLToPath(new URL('./fixtures/render-followups.ts',import.meta.url)),formats:['es']}}});
  const bundle=Array.isArray(result)?result[0]:result;if(!('output' in bundle))throw new Error('Missing bundle');const script=bundle.output.find(o=>o.type==='chunk');if(!script||script.type!=='chunk')throw new Error('Missing fixture');
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.route('**/__followups.html',r=>r.fulfill({contentType:'text/html',body:'<html><body></body><script type="module" src="/__followups.js"></script></html>'}));await page.route('**/__followups.js',r=>r.fulfill({contentType:'text/javascript',body:script.code}));await page.goto('/__followups.html');
  const stats=await page.evaluate(()=>(window as unknown as {followups:{cloudDiffs:{mean:number;max:number}[];treeDiff:{max:number};matrixDiff:{max:number};detailTriangles:number;farTriangles:number}}).followups);
  expect(errors).toEqual([]);expect(stats).toBeTruthy();expect(stats.treeDiff.max).toBe(0);expect(stats.matrixDiff.max).toBe(0);expect(stats.farTriangles).toBe(stats.detailTriangles/3);
  for(const d of stats.cloudDiffs)expect(d.mean).toBeLessThan(1);
  await writeFile('test-results/render-followups.json',JSON.stringify(stats,null,2));await page.screenshot({path:'test-results/render-followups.png',fullPage:true});
});
