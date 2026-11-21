import { expect,test } from '@playwright/test';

test('HUD text and compact telemetry are throttled, markers stay smooth, hidden diagnostics stay empty',async({page})=>{
  test.setTimeout(60000);await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:480,height:320});
  // Drive a short deterministic frame sequence, avoiding a sustained GPU load.
  await page.addInitScript(()=>{
    let now=0,id=0;const callbacks=new Map<number,FrameRequestCallback>();
    window.requestAnimationFrame=callback=>{callbacks.set(++id,callback);return id;};window.cancelAnimationFrame=key=>{callbacks.delete(key);};
    Object.defineProperty(window,'__pumpFrame',{value:()=>{now+=1000/60;const batch=[...callbacks.values()];callbacks.clear();for(const callback of batch)callback(now);}});
  });
  const pump=()=>page.evaluate(()=>(window as unknown as {__pumpFrame:()=>void}).__pumpFrame());
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await pump();
  const host=page.getByLabel('Aircraft flight scene',{exact:true});
  await page.getByText('Settings and developer tools',{exact:true}).evaluate((element:HTMLElement)=>element.click());await page.getByLabel('Render scale',{exact:true}).selectOption('0.5');await pump();
  await expect(page.locator('#diagnostics')).toHaveText('');
  await page.getByRole('button',{name:'Start engine / Take off',exact:true}).evaluate((element:HTMLElement)=>element.click());await pump();
  await host.evaluate(element=>element.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyC',bubbles:true})));await pump();
  await page.evaluate(()=>{
    const counts={telemetry:0,markers:0};Object.defineProperty(window,'__hudCounts',{value:counts});
    new MutationObserver(records=>{counts.telemetry+=records.length;}).observe(document.querySelector('.world-view')!,{attributes:true,attributeFilter:['data-sample']});
    new MutationObserver(records=>{counts.markers+=records.length;}).observe(document.querySelector('#home-marker')!,{attributes:true,attributeFilter:['style']});
  });
  for(let i=0;i<18;i++){await host.evaluate(element=>{const event=new MouseEvent('mousemove');Object.defineProperty(event,'movementX',{value:2});Object.defineProperty(event,'movementY',{value:0});element.dispatchEvent(event);});await pump();}
  const counts=await page.evaluate(()=>(window as unknown as {__hudCounts:{telemetry:number;markers:number}}).__hudCounts);
  expect(counts.telemetry).toBeGreaterThanOrEqual(2);expect(counts.telemetry).toBeLessThanOrEqual(3);expect(counts.markers).toBeGreaterThanOrEqual(18);
  await expect(page.locator('#diagnostics')).toHaveText('');
  await page.keyboard.press('Escape');await pump();expect(JSON.parse((await host.getAttribute('data-sample'))!).paused).toBe(true);
  await page.getByLabel('Enable developer tools').evaluate((element:HTMLElement)=>element.click());await pump();await expect(page.locator('#diagnostics')).toContainText('"paused": true');
  const before=await page.locator('#diagnostics').textContent();await page.getByLabel('Enable developer tools').evaluate((element:HTMLElement)=>element.click());await pump();await expect(page.locator('#diagnostics')).toHaveText(before!);
  await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));expect(errors).toEqual([]);
});
