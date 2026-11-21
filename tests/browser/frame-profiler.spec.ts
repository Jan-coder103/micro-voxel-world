import { readFile } from 'node:fs/promises';
import { expect,test } from '@playwright/test';

test('profiler collects bounded timings, exports and restores toggles',async({page})=>{
  test.setTimeout(60000);await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:480,height:320});
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
  await expect(page.locator('#hangar')).toBeVisible();await page.keyboard.press('F8');
  const panel=page.locator('.frame-profiler');await expect(panel).toBeVisible();
  await expect(panel.locator('[data-summary]')).toContainText('CPU frame callback',{timeout:30000});
  await panel.getByLabel('Trees',{exact:true}).uncheck();
  const download=page.waitForEvent('download');await panel.getByRole('button',{name:'Export JSON'}).click();const file=await download;expect(file.suggestedFilename()).toBe('frontier-profile.json');const report=JSON.parse(await readFile((await file.path())!,'utf8'));expect(report.visuals.Trees).toBe(false);expect(report.budgetMs).toBeCloseTo(16.67,2);
  expect(report.schemaVersion).toBe(2);expect(report.draws.some((d:{name:string;calls:{mean:number}})=>d.name.startsWith('Color / ')&&d.calls.mean>0)).toBe(true);
  expect(report.cpu['Scene transform propagation']).toBeTruthy();expect(report.cpu['Render traversal + setup (exclusive)']).toBeTruthy();expect(report.cpu['Shadow cache scan']).toBeTruthy();
  expect(report.sceneState.shadowCache.fallback).toBe(false);expect(report.gpuSupported||report.gpuRender===null).toBe(true);
  await expect(panel.locator('[data-draws]')).toContainText('Color /');await panel.screenshot({path:'test-results/frame-profiler.png'});
  await panel.getByRole('button',{name:'Stop / close'}).click();await expect(panel).toBeHidden();
  await page.keyboard.press('F8');await expect(panel.getByLabel('Trees',{exact:true})).toBeChecked();
  await page.keyboard.press('F8');await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await expect(panel).toHaveCount(0);expect(errors).toEqual([]);
});

test('detailed hooks attribute instanced work, preserve pixels and restore render and GL methods',async({page})=>{
  test.setTimeout(60000);
  const {build}=await import('vite'),{fileURLToPath}=await import('node:url');
  const result=await build({configFile:false,logLevel:'silent',build:{write:false,minify:false,lib:{entry:fileURLToPath(new URL('./fixtures/profiler-detail.ts',import.meta.url)),formats:['es']}}});
  const bundle=Array.isArray(result)?result[0]:result;if(!('output' in bundle))throw new Error('Missing bundle');const script=bundle.output.find(o=>o.type==='chunk');if(!script||script.type!=='chunk')throw new Error('Missing fixture');
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.route('**/__profiler-detail.html',r=>r.fulfill({contentType:'text/html',body:'<html><body><script type="module" src="/__profiler-detail.js"></script></body></html>'}));await page.route('**/__profiler-detail.js',r=>r.fulfill({contentType:'text/javascript',body:script.code}));await page.goto('/__profiler-detail.html');
  const resultStats=await page.evaluate(()=>(window as unknown as {profilerDetail:{run:()=>Promise<{calls:number;triangles:number;pixelDifference:number}>}}).profilerDetail.run());
  expect(resultStats.pixelDifference).toBe(0);
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export JSON'}).click();const report=JSON.parse(await readFile((await (await download).path())!,'utf8'));
  expect(report.windowFrames).toBe(4);expect(report.cpu['Frame interval'].samples).toBe(2);expect(report.cpu['Frame interval'].mean).toBeGreaterThan(0);expect(report.cpuCalls['GL draw command submission'].mean).toBe(2.25);expect(report.cpu['GL buffer update'].max).toBeGreaterThanOrEqual(0);expect(report.cpuCalls['GL buffer update'].max).toBeGreaterThan(0);expect(report.cpu['Render traversal + setup (exclusive)'].mean).toBeGreaterThanOrEqual(0);
  // Static cache rebuild only occurs in the first frame; color and dynamic counts are stable.
  const color=report.draws.filter((d:{name:string})=>d.name.startsWith('Color / '));expect(color.reduce((sum:number,d:{calls:{mean:number}})=>sum+d.calls.mean,0)).toBe(2);
  expect(color.find((d:{name:string})=>d.name==='Color / Trees').triangles.mean).toBe(24);
  expect(report.draws.find((d:{name:string})=>d.name==='Shadow / Trees').triangles.mean).toBe(6);
  expect(report.cpu['Shadow static rebuild (inclusive)']).toBeTruthy();expect(report.cpuCalls['Shadow static rebuild (inclusive)'].mean).toBe(.25);
  expect(await page.evaluate(()=>(window as unknown as {profilerDetail:{stop:()=>unknown}}).profilerDetail.stop())).toEqual({draw:true,shadow:true,render:true,buffer:true,command:true,sink:true});
  await page.evaluate(()=>(window as unknown as {profilerDetail:{dispose:()=>void}}).profilerDetail.dispose());expect(errors).toEqual([]);
});
