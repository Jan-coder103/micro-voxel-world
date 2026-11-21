/** Reproduce the pre-fix algorithms from the profiler commit; CPU-only, no WebGL. */
import { execFileSync } from 'node:child_process';
import { mkdtemp,writeFile,rm } from 'node:fs/promises';
import { fileURLToPath,pathToFileURL } from 'node:url';
import { createTerrainFallback } from '../../src/rendering/terrain-fallback';
import { createAircraftShadow } from '../../src/rendering/aircraft-shadow';
import { airbaseSample } from '../../src/world/airbase';

const directory=await mkdtemp(fileURLToPath(new URL('./.hotspot-baseline-',import.meta.url)));
try{
  const original=(path:string)=>execFileSync('git',['show',`29f8759:${path}`],{encoding:'utf8'});
  const terrainPath=directory+'/terrain.ts',shadowPath=directory+'/shadow.ts';
  await writeFile(terrainPath,original('src/rendering/terrain-fallback.ts').replace('../streaming/terrain-data',pathToFileURL(fileURLToPath(new URL('../../src/streaming/terrain-data.ts',import.meta.url))).href));
  await writeFile(shadowPath,original('src/rendering/aircraft-shadow.ts'));
  const baseline=await import(pathToFileURL(terrainPath).href) as {createTerrainFallback:typeof createTerrainFallback};
  const baselineShadow=await import(pathToFileURL(shadowPath).href) as {createAircraftShadow:typeof createAircraftShadow};
  const stats=(values:number[])=>({mean:values.reduce((a,b)=>a+b,0)/values.length,p95:[...values].sort((a,b)=>a-b)[Math.ceil(values.length*.95)-1],max:Math.max(...values),count:values.length});
  function terrain(create:typeof createTerrainFallback,budgeted:boolean){
    let samples=0;const view=create(103,(x,z)=>{samples++;const s=airbaseSample(103,x,z);return {height:Math.max(s.height,s.water??-Infinity),color:[...s.color],waterDepth:s.water!==null?Math.max(0,s.water-s.height):1000};},128,{innerExtent:512,innerSpacing:16,drop:1,...budgeted?{samplesPerUpdate:128,budgetMs:2}:{}});
    const ticks:number[]=[],recenter:number[]=[];samples=0;
    for(const x of [128,256,384,512,640,768]){const start=performance.now();let count=0;do {const t=performance.now();view.update(x,144);ticks.push(performance.now()-t);if(++count>1000)throw new Error('Coverage did not converge');}while(view.pending);recenter.push(performance.now()-start);}
    view.dispose();return {terrainSamples:samples,updateCpuMs:stats(ticks),recenterCpuMs:stats(recenter)};
  }
  function shadow(create:typeof createAircraftShadow){
    let samples=0;const ground=(x:number,z:number)=>{samples++;const s=airbaseSample(103,x,z);return Math.max(s.height,s.water??-Infinity);};
    const view=create(),pose={position:{x:0,y:80,z:144},heading:.3,pitch:0,bank:0},ticks:number[]=[];
    for(let i=0;i<120;i++){pose.position.x=i;const t=performance.now();view.update(pose,ground);ticks.push(performance.now()-t);}
    view.dispose();return {terrainSamples:samples,updateCpuMs:stats(ticks)};
  }
  // Warm both paths before retaining samples.
  terrain(baseline.createTerrainFallback,false);terrain(createTerrainFallback,true);shadow(baselineShadow.createAircraftShadow);shadow(createAircraftShadow);
  console.log(JSON.stringify({baselineCommit:'29f8759',scenario:'seed 103, six 128 m recenterings; 120 moving shadow frames',scope:'CPU only; excludes initial construction, GPU and browser work; not hardware FPS evidence',terrain:{before:terrain(baseline.createTerrainFallback,false),after:terrain(createTerrainFallback,true)},shadow:{before:shadow(baselineShadow.createAircraftShadow),after:shadow(createAircraftShadow)}},null,2));
}finally{await rm(directory,{recursive:true,force:true});}
