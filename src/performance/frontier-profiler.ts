import type { Object3D,WebGLRenderer } from 'three';
import { FrameProfile } from './frame-profile';

type TimerExtension={TIME_ELAPSED_EXT:number;GPU_DISJOINT_EXT:number};
/** GPU queries never block. CPU and GPU overlap and must not be added together. */
export function createFrontierProfiler(renderer:WebGLRenderer,settings:Element,wake:()=>void){
  const gl=renderer.getContext() as WebGL2RenderingContext;
  const ext=gl.getExtension('EXT_disjoint_timer_query_webgl2') as TimerExtension|null;
  const cpu=new FrameProfile(),gpu:number[]=[];
  const pending:{query:WebGLQuery;epoch:number}[]=[];
  let enabled=false,epoch=0,frameStart=0,stageStart=0,overhead=0,lastFrame:number|undefined,lastPaint=0,active:WebGLQuery|null=null;
  const stack:{children:number}[]=[];
  const restores:(()=>void)[]=[],installers:(()=>()=>void)[]=[],switches:{name:string;get:()=>boolean;set:(value:boolean)=>void;original?:boolean;input:HTMLInputElement}[]=[];
  const panel=document.createElement('section');panel.className='frame-profiler';panel.hidden=true;
  panel.innerHTML='<strong>FRAME PROFILER · 16.67 ms budget</strong><div><button data-stop>Stop / close</button> <button data-reset>Reset</button> <button data-export>Export JSON</button></div><div data-switches></div><pre></pre><small>CPU rows ending “inclusive” contain child rows; do not sum them. GPU overlaps CPU. Visual toggles estimate marginal render cost; simulation stays active. Compare the same view after warm-up. Browser layout, workers and GPU waits are not individually attributed.</small>';
  document.body.append(panel);
  const button=document.createElement('button');button.textContent='Open frame profiler (F8)';settings.append(button);
  const reset=()=>{epoch++;cpu.reset();gpu.length=0;lastFrame=undefined;};
  function toggle(){
    enabled=!enabled;panel.hidden=!enabled;
    const menu=settings.closest('dialog');if(enabled&&menu?.open)menu.append(panel);else document.body.append(panel);
    if(enabled){reset();for(const install of installers)restores.push(install());}
    else {for(const restore of restores.splice(0))restore();for(const s of switches){if(s.original!==undefined)s.set(s.original);s.original=undefined;s.input.checked=true;}lastFrame=undefined;}
    wake();
  }
  button.onclick=toggle;panel.querySelector<HTMLButtonElement>('[data-stop]')!.onclick=toggle;
  panel.querySelector<HTMLButtonElement>('[data-reset]')!.onclick=()=>{reset();wake();};
  const snapshot=()=>({budgetMs:1000/60,windowFrames:cpu.frames.length,cpu:cpu.report(),gpuRender:gpu.length?{mean:gpu.reduce((a,b)=>a+b,0)/gpu.length,p95:[...gpu].sort((a,b)=>a-b)[Math.ceil(gpu.length*.95)-1],max:Math.max(...gpu),samples:gpu.length}:null,gpuSupported:!!ext,visuals:Object.fromEntries(switches.map(s=>[s.name,s.get()])),drawingBuffer:{width:gl.drawingBufferWidth,height:gl.drawingBufferHeight},userAgent:navigator.userAgent,notes:'CPU inclusive rows overlap. GPU overlaps CPU; no sum. GPU samples arrive asynchronously. Observer bookkeeping is a lower bound, excludes driver/query effects and browser layout. Worker generation is off-thread; streaming CPU includes integration, not worker compute.'});
  panel.querySelector<HTMLButtonElement>('[data-export]')!.onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(snapshot(),null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='frontier-profile.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),0);};
  const key=(e:KeyboardEvent)=>{if(e.code==='F8'&&!e.repeat){e.preventDefault();toggle();}};window.addEventListener('keydown',key);
  function visual(name:string,get:()=>boolean,set:(value:boolean)=>void){
    const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.checked=true;label.append(input,document.createTextNode(name));panel.querySelector('[data-switches]')!.append(label);
    const s={name,get,set,input,original:undefined as boolean|undefined};switches.push(s);input.onchange=()=>{if(s.original===undefined)s.original=get();set(input.checked?s.original:false);reset();wake();};
  }
  return {
    get enabled(){return enabled;},
    visualGroup(name:string,group:Object3D){visual(name,()=>group.visible,v=>{group.visible=v;});},visual,
    instrument<T extends object,K extends keyof T>(object:T,key:K,name:string,exclusive=false){
      installers.push(()=>{const original=object[key] as (...args:unknown[])=>unknown;const wrapped=function(this:T,...args:unknown[]){const entry={children:0},start=performance.now();stack.push(entry);try{return original.apply(this,args);}finally{const end=performance.now();stack.pop();if(stack.length)stack[stack.length-1].children+=end-start;cpu.add(name,end-start-(exclusive?entry.children:0));overhead+=performance.now()-end;}};object[key]=wrapped as T[K];return ()=>{object[key]=original as T[K];};});
    },
    begin(){if(!enabled)return;const menu=settings.closest('dialog'),parent=menu?.open?menu:document.body;if(panel.parentElement!==parent)parent.append(panel);const start=performance.now();overhead=0;frameStart=start;cpu.current={};if(lastFrame!==undefined&&start-lastFrame<1000)cpu.add('Frame interval',start-lastFrame);lastFrame=start;
      const disjoint=ext&&gl.getParameter(ext.GPU_DISJOINT_EXT);if(disjoint){for(const p of pending)gl.deleteQuery(p.query);pending.length=0;gpu.length=0;}
      while(pending.length&&gl.getQueryParameter(pending[0].query,gl.QUERY_RESULT_AVAILABLE)){const p=pending.shift()!;const value=gl.getQueryParameter(p.query,gl.QUERY_RESULT)/1e6;gl.deleteQuery(p.query);if(p.epoch===epoch&&!disjoint){gpu.push(value);if(gpu.length>600)gpu.shift();}}
      overhead+=performance.now()-start;stageStart=performance.now();
    },
    mark(name:string){if(!enabled)return;const end=performance.now();cpu.add(name,end-stageStart);overhead+=performance.now()-end;stageStart=performance.now();},
    gpuBegin(){if(!enabled||!ext||pending.length>=8||gl.isContextLost())return;const start=performance.now();active=gl.createQuery();if(active)gl.beginQuery(ext.TIME_ELAPSED_EXT,active);overhead+=performance.now()-start;},
    gpuEnd(){if(!active||!ext)return;const start=performance.now();gl.endQuery(ext.TIME_ELAPSED_EXT);pending.push({query:active,epoch});active=null;overhead+=performance.now()-start;},
    end(){if(!enabled)return;const start=performance.now();cpu.add('CPU frame callback (inclusive)',start-frameStart);cpu.add('Observer bookkeeping (lower bound)',overhead);cpu.finish();
      if(start-lastPaint>500){lastPaint=start;const s=snapshot();panel.querySelector('pre')!.textContent=`Last ${s.windowFrames} frames · mean / p95 / max ms\n${s.cpu['Frame interval']?`Pacing: ${(1000/s.cpu['Frame interval'].mean).toFixed(1)} FPS (continuous frames only)\n`:''}`+Object.entries(s.cpu).map(([name,v])=>`${name.padEnd(36)} ${v.mean.toFixed(2)} / ${v.p95.toFixed(2)} / ${v.max.toFixed(2)}`).join('\n')+`\nGPU render (shadows included): ${s.gpuRender?`${s.gpuRender.mean.toFixed(2)} / ${s.gpuRender.p95.toFixed(2)} / ${s.gpuRender.max.toFixed(2)} ms (${s.gpuRender.samples} samples)` : ext?'pending':'unsupported'}\nBuffer: ${s.drawingBuffer.width} × ${s.drawingBuffer.height}`;}
      cpu.frames.at(-1)!['Observer report/aggregation']=performance.now()-start;
    },
    dispose(){if(enabled)toggle();window.removeEventListener('keydown',key);for(const p of pending)gl.deleteQuery(p.query);panel.remove();button.remove();}
  };
}
