import { expect,test } from '@playwright/test';
import { build } from 'vite';
import { fileURLToPath } from 'node:url';
import { writeFile } from 'node:fs/promises';
test('compacted trees preserve color and shadows while removing submitted triangles, including restore and rebase',async({page})=>{
  test.setTimeout(90000);
  const result=await build({configFile:false,logLevel:'silent',build:{write:false,minify:false,lib:{entry:fileURLToPath(new URL('./fixtures/forest-compaction.ts',import.meta.url)),formats:['es']}}});
  const bundle=Array.isArray(result)?result[0]:result;if(!('output' in bundle))throw new Error('Missing bundle');const script=bundle.output.find(o=>o.type==='chunk');if(!script||script.type!=='chunk')throw new Error('Missing fixture');
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.route('**/__forest-compaction.html',r=>r.fulfill({contentType:'text/html',body:'<html><body><script type="module" src="/__forest-compaction.js"></script></body></html>'}));await page.route('**/__forest-compaction.js',r=>r.fulfill({contentType:'text/javascript',body:script.code}));await page.goto('/__forest-compaction.html');
  await page.waitForFunction(()=>(window as unknown as {forestCompaction?:{ready:boolean}}).forestCompaction?.ready);
  const stats=await page.evaluate(()=>(window as unknown as {forestCompaction:{comparisons:{phase:string;max:number;referenceTriangles:number;compactTriangles:number;stats:{omitted:number}}[]}}).forestCompaction);
  for(const c of stats.comparisons){expect(c.max,JSON.stringify(c)).toBe(0);if(c.phase==='restored'){expect(c.compactTriangles).toBe(c.referenceTriangles);expect(c.stats.omitted).toBe(0);}else{expect(c.compactTriangles).toBeLessThan(c.referenceTriangles);expect(c.stats.omitted).toBeGreaterThan(0);}}
  await writeFile('test-results/forest-compaction.json',JSON.stringify(stats,null,2));await page.locator('canvas').screenshot({path:'test-results/forest-compaction.png'});await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));expect(errors).toEqual([]);
});
