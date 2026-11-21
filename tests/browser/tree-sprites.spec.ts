import { expect,test } from '@playwright/test';
import { build } from 'vite';
import { fileURLToPath } from 'node:url';
import { writeFile } from 'node:fs/promises';
test('distant cutout sprites reduce geometry, preserve shadow depth and retain solid overhead trees',async({page})=>{
  test.setTimeout(90000);
  const result=await build({configFile:false,logLevel:'silent',build:{write:false,minify:false,lib:{entry:fileURLToPath(new URL('./fixtures/tree-sprites.ts',import.meta.url)),formats:['es']}}});const bundle=Array.isArray(result)?result[0]:result;if(!('output' in bundle))throw new Error('Missing bundle');const script=bundle.output.find(o=>o.type==='chunk');if(!script||script.type!=='chunk')throw new Error('Missing fixture');
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await page.route('**/__tree-sprites.html',r=>r.fulfill({contentType:'text/html',body:'<html><body><script type="module" src="/__tree-sprites.js"></script></body></html>'}));await page.route('**/__tree-sprites.js',r=>r.fulfill({contentType:'text/javascript',body:script.code}));await page.goto('/__tree-sprites.html');await page.waitForFunction(()=>(window as unknown as {treeSprites?:{ready:boolean}}).treeSprites?.ready);
  const stats=await page.evaluate(()=>(window as unknown as {treeSprites:{views:{name:string;variants:{triangles:number;meanDifference:number;shadowMaxDifference:number;stats:{spriteInstances:number}}[]}[]}}).treeSprites);
  await writeFile('test-results/tree-sprites.json',JSON.stringify(stats,null,2));await page.screenshot({path:'test-results/tree-sprites.png',fullPage:true});expect(errors).toEqual([]);
  for(const view of stats.views){const [reference,sprites]=view.variants;expect(sprites.shadowMaxDifference,JSON.stringify(view)).toBe(0);expect(sprites.meanDifference).toBeLessThan(8);if(view.name==='overhead'){expect(sprites.stats.spriteInstances).toBe(0);expect(sprites.triangles).toBe(reference.triangles);}else{expect(sprites.stats.spriteInstances).toBeGreaterThan(0);expect(sprites.triangles).toBeLessThan(reference.triangles);}}
  await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
});
