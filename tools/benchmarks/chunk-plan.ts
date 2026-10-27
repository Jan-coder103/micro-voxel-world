import { performance } from 'node:perf_hooks';
import { ChunkPlan } from '../../src/streaming/chunk-plan.ts';
import { wantedChunks } from '../../src/streaming/terrain-data.ts';

// Fixed 60 Hz, 100 m/s route with abrupt turns; pure planning, no rendering/workers.
const route = Array.from({length:3600},(_,i)=> {
  const leg=Math.floor(i/900), d=(i%900)*100/60;
  return [[d,0],[1500,d],[1500-d,1500],[0,1500-d]][leg];
});
const baseline=(x:number,z:number)=>wantedChunks(103,x,z).map(s=>({...s,generator:'regional-v2' as const,structures:true as const}));
const run=(cached:boolean)=>{
  const plan=new ChunkPlan(103,true,true);let checksum=0;
  const start=performance.now();
  for(const [x,z] of route){const specs=cached?plan.at(x,z):baseline(x,z);checksum+=specs[0].x+specs[0].z;}
  return {ms:performance.now()-start,rebuilds:cached?plan.rebuilds:route.length,checksum};
};
for(let i=0;i<4;i++){run(false);run(true);}
const before=[],after=[];
for(let i=0;i<15;i++){before.push(run(false));after.push(run(true));}
const summarize=(samples:ReturnType<typeof run>[])=>({medianMs:samples.map(s=>s.ms).sort((a,b)=>a-b)[7],rebuilds:samples[0].rebuilds,checksum:samples[0].checksum});
console.log(JSON.stringify({scenario:'60 seconds at 100 m/s, 60 Hz, four square-route legs, seed 103, regional structures',runtime:process.version,samples:15,before:summarize(before),after:summarize(after),limits:'Pure main-thread plan construction only; excludes workers, uploads, rendering and collision. Not hardware FPS acceptance.'},null,2));
