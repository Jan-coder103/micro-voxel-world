import type { Object3D,WebGLRenderer } from 'three';
import { FrameProfile } from './frame-profile';
import { GpuFrameTimer } from './gpu-frame-timer';
import { DrawProfile,type DrawCategory } from './draw-profile';

export type TimingSink=(name:string,ms:number)=>void;
/** GPU queries never block. CPU and GPU overlap and must not be added together. */
export function createFrontierProfiler(renderer:WebGLRenderer,settings:Element,wake:()=>void){
  const gl=renderer.getContext() as WebGL2RenderingContext;
  const cpu=new FrameProfile(),calls=new FrameProfile(),events=new FrameProfile(),gpu=new GpuFrameTimer(gl),draws=new DrawProfile();
  let enabled=false,frameStart=0,stageStart=0,overhead=0,lastFrame:number|undefined,lastPaint=0,lastCallbackMs=0,inShadow=false;
  let context:()=>unknown=()=>null;
  const stack:{children:number}[]=[];
  const restores:(()=>void)[]=[],installers:(()=>()=>void)[]=[],switches:{name:string;get:()=>boolean;set:(value:boolean)=>void;original?:boolean;input:HTMLInputElement}[]=[];
  const panel=document.createElement('section');panel.className='frame-profiler';panel.hidden=true;
  panel.innerHTML='<strong>FRAME PROFILER · 16.67 ms budget</strong><div><button data-stop>Stop / close</button> <button data-reset>Reset</button> <button data-export>Export JSON</button></div><div data-switches></div><pre data-summary></pre><details open><summary>Shadow rebuild reasons</summary><pre data-shadow-reasons></pre></details><details open><summary>Draw submission by category</summary><pre data-draws></pre></details><small>CPU rows ending “inclusive” contain child rows; do not sum them. GPU overlaps CPU. Visual toggles estimate marginal render cost; simulation stays active. Compare the same view after warm-up. Draw and GL timings are inclusive CPU submission, not shader execution. Draws are children of render/shadow totals. Outside-callback time is unattributed; includes browser scheduling. Workers are not timed.</small>';
  document.body.append(panel);
  const button=document.createElement('button');button.textContent='Open frame profiler (F8)';settings.append(button);
  const reset=()=>{cpu.reset();calls.reset();events.reset();draws.reset();gpu.run(()=>gpu.reset());lastFrame=undefined;lastCallbackMs=0;};
  function toggle(){
    enabled=!enabled;panel.hidden=!enabled;
    const menu=settings.closest('dialog');if(enabled&&menu?.open)menu.append(panel);else document.body.append(panel);
    if(enabled){reset();for(const install of installers)restores.push(install());}
    else {for(const restore of restores.splice(0).reverse())restore();for(const s of switches){if(s.original!==undefined)s.set(s.original);s.original=undefined;s.input.checked=true;}lastFrame=undefined;gpu.run(()=>gpu.reset());}
    wake();
  }
  button.onclick=toggle;panel.querySelector<HTMLButtonElement>('[data-stop]')!.onclick=toggle;
  panel.querySelector<HTMLButtonElement>('[data-reset]')!.onclick=()=>{reset();wake();};
  const snapshot=()=>{
    const gpuReport=gpu.samples.report();
    return {schemaVersion:2,budgetMs:1000/60,windowFrames:cpu.frames.length,cpu:cpu.report(['Frame interval','Outside previous callback (unattributed)']),cpuCalls:calls.report(),events:Object.fromEntries(Object.entries(events.report()).map(([name,v])=>[name,{...v,total:Math.round(v.mean*v.samples)}])),sceneState:context(),gpuRender:gpuReport.Total??null,gpuPasses:Object.fromEntries(Object.entries(gpuReport).filter(([name])=>name!=='Total')),gpuSupported:gpu.supported,gpuError:gpu.error||null,draws:draws.report(),visuals:Object.fromEntries(switches.map(s=>[s.name,s.get()])),drawingBuffer:{width:gl.drawingBufferWidth,height:gl.drawingBufferHeight},userAgent:navigator.userAgent,notes:'CPU inclusive rows overlap. Draw CPU rows include nested GL calls and are children of render/shadow totals; GL compile/draw submission is not GPU execution; counts are actual renderer.info deltas including instancing and shadow draws. GPU passes are sequential, total is their sum; GPU overlaps CPU. GPU samples are asynchronous complete frames, not paired with CPU frames. Outside previous callback is unattributed browser/worker scheduling/compositing/idle time, not a GPU estimate. Observer bookkeeping is a lower bound; deferred layout and driver effects excluded. Workers execute off-thread and are not timed.'};
  };
  panel.querySelector<HTMLButtonElement>('[data-export]')!.onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(snapshot(),null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='frontier-profile.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),0);};
  const key=(e:KeyboardEvent)=>{if(e.code==='F8'&&!e.repeat){e.preventDefault();toggle();}};window.addEventListener('keydown',key);
  function visual(name:string,get:()=>boolean,set:(value:boolean)=>void){
    const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.checked=true;label.append(input,document.createTextNode(name));panel.querySelector('[data-switches]')!.append(label);
    const s={name,get,set,input,original:undefined as boolean|undefined};switches.push(s);input.onchange=()=>{if(s.original===undefined)s.original=get();set(input.checked?s.original:false);reset();wake();};
  }
  function instrument<T extends object,K extends keyof T>(object:T,key:K,name:string,exclusive=false){
      installers.push(()=>{const original=object[key] as (...args:unknown[])=>unknown;const wrapped=function(this:T,...args:unknown[]){const entry={children:0},start=performance.now();stack.push(entry);try{return original.apply(this,args);}finally{const end=performance.now();stack.pop();if(stack.length)stack[stack.length-1].children+=end-start;calls.add(name,1);cpu.add(name,end-start-(exclusive?entry.children:0));overhead+=performance.now()-end;}};object[key]=wrapped as T[K];return ()=>{object[key]=original as T[K];};});
    }
  installers.push(()=>{
    const originalDraw=renderer.renderBufferDirect,originalShadow=renderer.shadowMap.render;
    renderer.renderBufferDirect=function(...args){
      const entry={children:0},start=performance.now(),name=`${inShadow?'Shadow':'Color'} / ${draws.category(args[4])}`,before={...renderer.info.render};stack.push(entry);
      try{return originalDraw.apply(this,args);}finally{const end=performance.now();stack.pop();draws.record(name,end-start,before,renderer.info.render);cpu.add(`Draw CPU / ${inShadow?'Shadow':'Color'}`,end-start);if(stack.length)stack[stack.length-1].children+=end-start;overhead+=performance.now()-end;}
    };
    renderer.shadowMap.render=function(...args){
      inShadow=true;const start=performance.now();gpu.run(()=>gpu.stage('Shadow depth'));overhead+=performance.now()-start;
      try{return originalShadow.apply(this,args);}finally{inShadow=false;const start=performance.now();gpu.run(()=>gpu.stage('Main color'));overhead+=performance.now()-start;}
    };
    return ()=>{renderer.renderBufferDirect=originalDraw;renderer.shadowMap.render=originalShadow;inShadow=false;};
  });
  for(const [method,name] of [
    ['bufferData','GL buffer allocation/upload'],['bufferSubData','GL buffer update'],
    ['texImage2D','GL texture 2D allocation/upload'],['texSubImage2D','GL texture 2D update'],
    ['texImage3D','GL texture 3D allocation/upload'],['texSubImage3D','GL texture 3D update'],
    ['compileShader','GL shader compile submission'],['linkProgram','GL program link submission'],
    ['drawElements','GL draw command submission'],['drawArrays','GL draw command submission'],
    ['drawElementsInstanced','GL draw command submission'],['drawArraysInstanced','GL draw command submission'],
  ] as const)instrument(gl,method,name);
  const contextLost=()=>gpu.run(()=>gpu.reset()),contextRestored=()=>gpu.run(()=>gpu.restore());
  renderer.domElement.addEventListener('webglcontextlost',contextLost);renderer.domElement.addEventListener('webglcontextrestored',contextRestored);
  return {
    get enabled(){return enabled;},
    context(read:()=>unknown){context=read;},
    drawGroup(root:Object3D,category:DrawCategory){draws.register(root,category);},
    observe(source:{timingSink?:TimingSink;counterSink?:(name:string,count:number)=>void}){installers.push(()=>{const previous=source.timingSink,previousCounter=source.counterSink;source.timingSink=(name,ms)=>{cpu.add(name,ms);calls.add(name,1);};source.counterSink=(name,count)=>events.add(name,count);return ()=>{source.timingSink=previous;source.counterSink=previousCounter;};});},
    visualGroup(name:string,group:Object3D){visual(name,()=>group.visible,v=>{group.visible=v;});},visual,
    instrument,
    begin(continuous=true){if(!enabled)return;const menu=settings.closest('dialog'),parent=menu?.open?menu:document.body;if(panel.parentElement!==parent)parent.append(panel);const start=performance.now();overhead=0;frameStart=start;cpu.current={};if(continuous&&lastFrame!==undefined){cpu.add('Frame interval',start-lastFrame);cpu.add('Outside previous callback (unattributed)',Math.max(0,start-lastFrame-lastCallbackMs));}lastFrame=start;
      gpu.run(()=>gpu.poll());overhead+=performance.now()-start;stageStart=performance.now();
    },
    mark(name:string){if(!enabled)return;const end=performance.now();cpu.add(name,end-stageStart);overhead+=performance.now()-end;stageStart=performance.now();},
    gpuBegin(){if(!enabled)return;const start=performance.now();gpu.run(()=>gpu.begin());overhead+=performance.now()-start;},
    gpuEnd(){if(!enabled)return;const start=performance.now();gpu.run(()=>gpu.end());overhead+=performance.now()-start;},
    end(){if(!enabled)return;const start=performance.now();cpu.add('CPU frame callback (inclusive)',start-frameStart);cpu.add('Observer bookkeeping (lower bound)',overhead);cpu.finish();calls.finish();events.finish();draws.finish();
      if(start-lastPaint>500){lastPaint=start;const s=snapshot(),format=(v:{mean:number;p95:number;max:number})=>`${v.mean.toFixed(2)} / ${v.p95.toFixed(2)} / ${v.max.toFixed(2)}`;
        const forest=(s.sceneState as {forest?:{generated:number;submitted:number;omitted:number}}|null)?.forest;
        const cpuText=s.cpu['CPU frame callback (inclusive)']?format(s.cpu['CPU frame callback (inclusive)']):'pending',outside=s.cpu['Outside previous callback (unattributed)'];
        const gpuText=s.gpuRender?`${format(s.gpuRender)} ms (${s.gpuRender.samples} samples)`:s.gpuError?`unavailable: ${s.gpuError}`:s.gpuSupported?'pending':'unsupported';
        panel.querySelector('pre')!.textContent=`Last ${s.windowFrames} frames · mean / p95 / max ms\n${s.cpu['Frame interval']?`Pacing: ${(1000/s.cpu['Frame interval'].mean).toFixed(1)} FPS (continuous frames only)\n`:''}CPU callback: ${cpuText} ms\nOutside previous callback: ${outside?format(outside):'pending'} ms (unattributed)\nBuffer: ${s.drawingBuffer.width} × ${s.drawingBuffer.height}\nGPU render (shadows included): ${gpuText}\n${forest?`Forest: ${forest.submitted.toLocaleString()} / ${forest.generated.toLocaleString()} submitted (${forest.omitted.toLocaleString()} omitted)\n`:''}`+Object.entries(s.gpuPasses).map(([name,v])=>`GPU ${name.padEnd(28)} ${format(v)} ms`).join('\n')+'\n'+Object.entries(s.cpu).map(([name,v])=>`${name.padEnd(44)} ${format(v)}`).join('\n');
        panel.querySelector('[data-shadow-reasons]')!.textContent=Object.entries(s.events).map(([name,v])=>`${name}: ${v.total} / ${s.windowFrames} frames`).join('\n')||'No shadow rebuilds in this capture.';
        panel.querySelector('[data-draws]')!.textContent='CPU mean / p95 / max ms · mean calls / triangles per frame\n'+s.draws.map(d=>`${d.name.padEnd(28)} ${format(d.cpu)} · ${d.calls.mean.toFixed(1)} / ${Math.round(d.triangles.mean).toLocaleString()}`).join('\n');
      }
      cpu.frames.at(-1)!['Observer report/aggregation']=performance.now()-start;lastCallbackMs=performance.now()-frameStart;
    },
    dispose(){renderer.domElement.removeEventListener('webglcontextlost',contextLost);renderer.domElement.removeEventListener('webglcontextrestored',contextRestored);if(enabled)toggle();window.removeEventListener('keydown',key);gpu.run(()=>gpu.dispose());panel.remove();button.remove();}
  };
}
