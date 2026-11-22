import type { TimingSink } from '../performance/frontier-profiler';
import { SettlementWorld } from '../world/settlements';
import { generateScenery,type SceneryData,type ScenerySpec } from './scenery-data';
export const sceneryKey=(s:ScenerySpec)=>`${s.kind}:${s.x},${s.z}`;
interface Job {id:number;spec:ScenerySpec;priority:number;publish:(data:SceneryData)=>void;cancelled:boolean;iterator?:Generator<void,SceneryData>}
/** One shared worker, one staged result, and no publication bursts. Old scenery remains usable. */
export function createSceneryQueue(seed:number,wake=()=>{},makeWorker:()=>Worker=()=>new Worker(new URL('./scenery.worker.ts',import.meta.url),{type:'module'})){
  const diagnostics:{timingSink?:TimingSink}={},queued=new Map<string,Job>();
  let worker:Worker|undefined,world:SettlementWorld|undefined,active:Job|undefined,ready:SceneryData|undefined,timer:ReturnType<typeof setTimeout>|undefined,disposed=false,failed=false,next=0,completed=0,stale=0;
  const schedule=()=>{if(!disposed&&timer===undefined)timer=setTimeout(pump,16);};
  const fail=()=>{if(disposed)return;worker?.terminate();worker=undefined;failed=true;ready=undefined;if(active)active.iterator=undefined;schedule();};
  try{worker=makeWorker();worker.onerror=fail;worker.onmessageerror=fail;worker.onmessage=(event:MessageEvent<{id:number;data?:SceneryData;error?:string}>)=>{
    if(disposed||!active||active.id!==event.data.id)return;
    if(event.data.error||!event.data.data||event.data.data.kind!==active.spec.kind){fail();return;}
    ready=event.data.data;schedule();
  };}catch{failed=true;}
  const run=()=>{
    timer=undefined;if(disposed)return;
    if(active?.cancelled&&(ready||!worker)){active=undefined;ready=undefined;stale++;}
    if(ready&&active){const job=active,data=ready;active=undefined;ready=undefined;completed++;job.publish(data);wake();}
    if(!active){
      const job=[...queued.values()].sort((a,b)=>a.priority-b.priority||a.id-b.id)[0];if(!job)return;
      queued.delete(sceneryKey(job.spec));active=job;
      if(worker){try{worker.postMessage({id:job.id,seed,spec:job.spec});}catch{fail();}return;}
    }
    if(!worker&&active){
      world??=new SettlementWorld(seed);active.iterator??=generateScenery(seed,world,active.spec);
      const start=performance.now();let steps=0;
      do{const step=active.iterator.next();if(step.done){ready=step.value;break;}steps++;}while(steps<32&&performance.now()-start<1);
      schedule();
    }
  };
  function pump(){if(!diagnostics.timingSink){run();return;}const start=performance.now();try{run();}finally{diagnostics.timingSink('Scenery publication / fallback timer',performance.now()-start);}}
  return {diagnostics,get stats(){return {queued:queued.size,active:!!active,ready:!!ready,worker:!!worker,failed,completed,stale};},
    get pending(){return !disposed&&(queued.size>0||!!active||!!ready);},
    request(spec:ScenerySpec,priority:number,publish:(data:SceneryData)=>void){
      if(disposed)return;const key=sceneryKey(spec),old=queued.get(key);if(old){old.priority=priority;return;}
      if(active&&!active.cancelled&&sceneryKey(active.spec)===key)return;
      queued.set(key,{id:++next,spec,priority,publish,cancelled:false});schedule();
    },
    retain(kind:ScenerySpec['kind'],keys:Set<string>){
      for(const [key,job] of queued)if(job.spec.kind===kind&&!keys.has(key))queued.delete(key);
      if(active?.spec.kind===kind&&!keys.has(sceneryKey(active.spec)))active.cancelled=true;
    },
    dispose(){if(disposed)return;disposed=true;if(timer!==undefined)clearTimeout(timer);timer=undefined;worker?.terminate();worker=undefined;queued.clear();active=undefined;ready=undefined;world=undefined;}
  };
}
export type SceneryQueue=ReturnType<typeof createSceneryQueue>;
