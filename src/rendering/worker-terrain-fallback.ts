import type { MeshStandardMaterial } from 'three';
import { airbaseSample } from '../world/airbase';
import { FRONTIER_COVERAGE,type CoverageData } from '../streaming/coverage-data';
import { createTerrainFallback } from './terrain-fallback';
/** One in-flight payload and one staged reply; old coverage survives until atomic publication. */
export function createWorkerTerrainFallback(seed:number,material:MeshStandardMaterial,wake:()=>void,makeWorker=()=>new Worker(new URL('../streaming/coverage.worker.ts',import.meta.url),{type:'module'})){
  // Keep the original startup coverage. All subsequent normal/bounds generation is off-thread.
  const view=createTerrainFallback(seed,(x,z)=>{const s=airbaseSample(seed,x,z);return {height:Math.max(s.height,s.water??-Infinity),color:[...s.color],waterDepth:s.water!==null?Math.max(0,s.water-s.height):1000};},FRONTIER_COVERAGE.spacing,{...FRONTIER_COVERAGE,material,samplesPerUpdate:128,budgetMs:2});
  let worker:Worker|undefined,disposed=false,failed=false,active:{id:number;x:number;z:number}|undefined,ready:CoverageData|undefined,id=0;
  let desiredX=view.mesh.position.x,desiredZ=view.mesh.position.z;
  const fail=()=>{if(disposed)return;failed=true;active=undefined;ready=undefined;worker?.terminate();worker=undefined;wake();};
  try{worker=makeWorker();worker.onerror=fail;worker.onmessageerror=fail;worker.onmessage=(event:MessageEvent<CoverageData&{error?:string}>)=>{if(disposed||!active||event.data.id!==active.id)return;if(event.data.error){fail();return;}active=undefined;ready=event.data;wake();};}catch{failed=true;}
  return {mesh:view.mesh,get pending(){return !disposed&&(failed?view.pending:!!active||!!ready||desiredX!==view.mesh.position.x||desiredZ!==view.mesh.position.z);},get needsFrame(){return !disposed&&(failed?view.pending:!!ready);},get workerFailed(){return failed;},update(x:number,z:number){
    if(disposed)return;desiredX=Math.floor(x/128)*128;desiredZ=Math.floor(z/128)*128;
    if(failed){view.update(x,z);return;}
    if(ready){const result=ready;ready=undefined;
      // Nearby replies publish even if travel has advanced, to avoid starvation.
      if(Math.abs(result.x-desiredX)<=1024&&Math.abs(result.z-desiredZ)<=1024)view.apply(result);
    }
    if(!active&&(desiredX!==view.mesh.position.x||desiredZ!==view.mesh.position.z)){
      active={id:++id,x:desiredX,z:desiredZ};try{worker!.postMessage({...active,seed});}catch{fail();}
    }
  },dispose(){if(disposed)return;disposed=true;worker?.terminate();worker=undefined;active=undefined;ready=undefined;view.dispose();}};
}
