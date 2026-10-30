import { test,expect,type Page } from '@playwright/test';
import { mkdir,writeFile } from 'node:fs/promises';
const sample=async(page:Page)=>JSON.parse(await page.getByLabel('Flight diagnostics').getAttribute('data-sample')??'{}');
const wrap=(angle:number)=>Math.atan2(Math.sin(angle),Math.cos(angle));

// Explicit opt-in: sustained software rendering is inappropriate for every smoke run.
test('continuous regional out-and-back route preserves bounded ownership',async({page})=>{
  test.skip(process.env.MVW_ROUTE_PROFILE!=='1','Set MVW_ROUTE_PROFILE=1 for the sustained route profile');
  test.setTimeout(180000);
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/tools/flight/?terrain=regional');
  const settle=async()=>expect.poll(async()=>{const s=await sample(page);return s.idle&&s.settled;},{timeout:30000}).toBe(true);
  await settle();
  const device=await page.evaluate(()=>{const gl=document.querySelector('canvas')!.getContext('webgl2')!,ext=gl.getExtension('WEBGL_debug_renderer_info');return {renderer:ext?String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)):'unavailable',width:gl.drawingBufferWidth,height:gl.drawingBufferHeight,dpr:devicePixelRatio};});
  const cdp=await page.context().newCDPSession(page);
  const memory=async()=>{
    // Compare retained JS heap at settled checkpoints, explicitly after forced GC.
    await cdp.send('HeapProfiler.collectGarbage');
    return cdp.send('Runtime.getHeapUsage');
  };
  const initial=await sample(page),checkpoints=[{flight:initial,heap:await memory()}],samples=[];
  await page.getByLabel('Flight assistance').selectOption('direct');
  let steering='';
  const steer=async(key:string)=>{if(key===steering)return;if(steering)await page.keyboard.up(steering);steering=key;if(key)await page.keyboard.down(key);};
  const began=Date.now();let lastSample=0;
  try{
    for(let lap=0;lap<2;lap++){
      await page.getByRole('button',{name:'Start / Resume',exact:true}).click();await page.keyboard.down('KeyE');
      for(const waypoint of [{x:16,z:-784},{x:16,z:16}]){
        const deadline=Date.now()+50000;
        while(true){
          const s=await sample(page),distance=Math.hypot(waypoint.x-s.x,waypoint.z-s.z);
          if(Date.now()-lastSample>=1000){samples.push({lap,waypoint:waypoint.z,...s});lastSample=Date.now();}
          expect(s.state).toBe('running');expect(s.failures).toBe(0);expect(s.resident).toBeLessThanOrEqual(49);expect(s.pending+s.ready).toBeLessThanOrEqual(2);
          if(distance<80)break;
          expect(Date.now(),'waypoint deadline').toBeLessThan(deadline);
          const error=wrap(Math.atan2(waypoint.x-s.x,-(waypoint.z-s.z))-s.heading);
          const bank=Math.max(-1.05,Math.min(1.05,error*1.8));
          await steer(bank-s.bank>.08?'KeyD':bank-s.bank<-.08?'KeyA':'');
          await page.waitForTimeout(150);
        }
      }
      await steer('');await page.keyboard.up('KeyE');await page.getByRole('button',{name:'Pause',exact:true}).click();await settle();
      const state=await sample(page),population=JSON.parse(await page.getByLabel('Population diagnostics').getAttribute('data-sample')??'{}');
      expect(Math.hypot(state.x-initial.x,state.z-initial.z)).toBeLessThan(90);
      expect(population.resident).toBeLessThanOrEqual(49);expect(population.cache).toBeLessThanOrEqual(64);
      // Resource count is a renderer geometry proxy, not GPU bytes; route windows can differ.
      expect(state.geometries).toBeLessThanOrEqual(80);
      checkpoints.push({flight:state,heap:await memory()});
    }
    expect(Math.max(...samples.map(s=>s.speed))).toBeGreaterThan(99);
    await mkdir('test-results',{recursive:true});await writeFile('test-results/regional-route-measurement.json',JSON.stringify({device,wallMs:Date.now()-began,limitations:'Two ~800 m outbound/return passes using normal flight controls, no teleport. Guidance uses 150 ms wall-clock polling; route is approximate, not deterministic frame replay. Heap checkpoints force GC while paused; heap/GPU-byte stability and dense combat are not acceptance-tested. Counters are lifetime aggregates including startup.',checkpoints,samples},null,2));
    await page.screenshot({path:'test-results/regional-route-return.png',fullPage:true});
  }finally{
    await steer('');await page.keyboard.up('KeyE');await cdp.detach();
    await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
  }
  await expect(page.locator('canvas')).toHaveCount(0);expect(errors).toEqual([]);
});
