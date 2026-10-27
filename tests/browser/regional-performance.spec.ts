import { test,expect,type Page } from '@playwright/test';
import { mkdir,writeFile } from 'node:fs/promises';
const flight=async(page:Page)=>JSON.parse(await page.getByLabel('Flight diagnostics').getAttribute('data-sample')??'{}');
async function settled(page:Page){await expect.poll(async()=>{const s=await flight(page);return s.resident===49&&s.pending===0&&s.ready===0&&s.idle===true;},{timeout:30000}).toBe(true);}
test('settled regional scenes stop drawing and uploading unchanged population buffers',async({page})=>{
  test.setTimeout(90000);
  await page.addInitScript(()=>{
    const counters={clears:0,uploads:0};Object.assign(window,{performanceTestCounters:counters});
    const clear=WebGL2RenderingContext.prototype.clear,upload=WebGL2RenderingContext.prototype.bufferSubData;
    WebGL2RenderingContext.prototype.clear=function(...args){counters.clears++;return Reflect.apply(clear,this,args);};
    WebGL2RenderingContext.prototype.bufferSubData=(function(this:WebGL2RenderingContext,...args:unknown[]){counters.uploads++;return Reflect.apply(upload,this,args);}) as typeof upload;
  });
  await page.goto('/tools/flight/?terrain=regional');await settled(page);
  const counts=()=>page.evaluate(()=>({...((window as unknown as {performanceTestCounters:{clears:number;uploads:number}}).performanceTestCounters)}));
  const initial=await flight(page),before=await counts();await page.waitForTimeout(1200);const after=await counts();
  const device=await page.evaluate(()=>{const gl=document.querySelector('canvas')!.getContext('webgl2')!,ext=gl.getExtension('WEBGL_debug_renderer_info');return {renderer:ext?String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)):'unavailable',width:gl.drawingBufferWidth,height:gl.drawingBufferHeight,dpr:devicePixelRatio};});
  await mkdir('test-results',{recursive:true});await writeFile('test-results/regional-idle-measurement.json',JSON.stringify({device,state:(await flight(page)).state,windowMs:1200,clears:after.clears-before.clears,uploads:after.uploads-before.uploads,renderedFrames:(await flight(page)).renderedFrames,instanceRebuilds:(await flight(page)).populationRebuilds},null,2));
  expect(after).toEqual(before);expect((await flight(page)).renderedFrames).toBe(initial.renderedFrames);expect((await flight(page)).populationRebuilds).toBe(initial.populationRebuilds);expect(initial.populationRebuilds).toBe(1);
});

test('sleeping regional flight wakes for resize, controls, streaming, resume and recovery',async({page})=>{
  test.setTimeout(90000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/tools/flight/?terrain=regional');await settled(page);const initial=await flight(page);
  await page.setViewportSize({width:1000,height:760});await expect.poll(async()=>(await flight(page)).renderedFrames).toBeGreaterThan(initial.renderedFrames);await settled(page);
  await page.getByLabel('Weapon',{exact:true}).selectOption('shell');await expect(page.getByLabel('Combat diagnostics')).toContainText('Explosive shell');
  await page.getByLabel('Flight assistance').selectOption('direct');await expect(page.getByRole('status')).toContainText('Direct');
  await page.getByRole('button',{name:'Approach nearby horde',exact:true}).click();await settled(page);expect((await flight(page)).renderedFrames).toBeGreaterThan(initial.renderedFrames);
  await page.getByRole('button',{name:'Start / Resume',exact:true}).click();await page.keyboard.down('Space');await expect.poll(async()=>JSON.parse(await page.getByLabel('Combat diagnostics').getAttribute('data-sample')??'{}').shots).toBeGreaterThan(0);await page.keyboard.up('Space');
  await expect.poll(async()=>(await flight(page)).ticks).toBeGreaterThan(20);await page.getByRole('button',{name:'Pause',exact:true}).click();await settled(page);const paused=await flight(page);expect(paused.state).toBe('paused');await page.waitForTimeout(400);expect((await flight(page)).renderedFrames).toBe(paused.renderedFrames);expect((await flight(page)).ticks).toBe(paused.ticks);
  await page.getByRole('button',{name:'Start / Resume',exact:true}).click();await expect.poll(async()=>(await flight(page)).ticks).toBeGreaterThan(paused.ticks);expect((await flight(page)).dropped).toBe(paused.dropped);
  await page.getByLabel('Flight assistance').focus();await expect.poll(async()=>(await flight(page)).state).toBe('paused');
  await page.getByRole('button',{name:'Recover / Reset',exact:true}).click();await settled(page);expect((await flight(page)).state).toBe('ready');expect((await flight(page)).ticks).toBe(0);
  await page.screenshot({path:'test-results/phase-16-regional-idle.png',fullPage:true});await page.evaluate(()=>{window.dispatchEvent(new Event('pagehide'));window.dispatchEvent(new Event('pagehide'));window.dispatchEvent(new Event('resize'));});await expect(page.locator('canvas')).toHaveCount(0);await page.waitForTimeout(100);expect(errors).toEqual([]);
});
