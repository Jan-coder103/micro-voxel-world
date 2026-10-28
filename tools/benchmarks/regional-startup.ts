import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import { meshVoxelSource } from '../../src/assets/voxel-mesh.ts';
import { RegionalPopulation } from '../../src/hordes/regional-population.ts';

// Separate synchronous CPU stages; deliberately excludes browsers, workers and GPU uploads.
const kits=['farmhouse','utility-building','small-warehouse','fuel-tank','watchtower','shipping-container','wooden-bridge'];
const sources=kits.map(kit=>JSON.parse(readFileSync(new URL(`../../assets/source/ref-${kit}.voxel.json`,import.meta.url),'utf8')));
const measure=<T>(operation:()=>T)=>{const start=performance.now();const value=operation();return {ms:performance.now()-start,value};};
const meshing=sources.map((source,index)=>{
  const first=measure(()=>meshVoxelSource(source));
  const repeated=Array.from({length:5},()=>measure(()=>meshVoxelSource(source)));
  for(const sample of repeated)assert.deepEqual(sample.value.stats,first.value.stats);
  return {kit:kits[index],firstMs:first.ms,repeatedMs:repeated.map(s=>s.ms),stats:first.value.stats};
});
const population=[];
for(const seed of [103,12012])for(const structures of [true,false]){
  const bytes=new Map<string,string>();
  const storage={getItem:(key:string)=>bytes.get(key)??null,setItem:(key:string,value:string)=>{bytes.set(key,value);}};
  const constructed=measure(()=>new RegionalPopulation(seed,storage,structures));
  const world=constructed.value;
  const initial=measure(()=>world.update({x:0,y:100,z:0}));
  const descriptors=[...world.resident.values()].map(r=>r.encounter);
  const repeated=measure(()=>world.update({x:0,y:100,z:0}));
  assert.deepEqual([...world.resident.values()].map(r=>r.encounter),descriptors);
  const target=[...world.resident.values()].flatMap(r=>r.targets)[0];
  const damage=measure(()=>{if(target){target.health=0;world.damaged(target);}});
  const reload=measure(()=>new RegionalPopulation(seed,storage,structures));
  assert.equal(reload.value.error,'');
  assert.equal(reload.value.counts.killed,target?1:0);
  const returned=measure(()=>{world.update({x:1024,y:100,z:0});world.update({x:0,y:100,z:0});});
  assert.deepEqual([...world.resident.values()].map(r=>r.encounter),descriptors);
  assert.ok(world.counts.resident<=49&&world.counts.cache<=64);
  population.push({seed,structures,constructionMs:constructed.ms,initialResidencyMs:initial.ms,unchangedUpdateMs:repeated.ms,singleKillAndCheckpointMs:damage.ms,oneRecordReloadMs:reload.ms,travelAndReturnMs:returned.ms,saveBytes:Buffer.byteLength(bytes.get(world.key)??''),counts:world.counts});
}
console.log(JSON.stringify({runtime:process.version,platform:process.platform,architecture:process.arch,scenario:'Seven settlement source kits; regional population at origin, one kill/reload, 1024 m jump and return; two seeds with/without structures',limitations:'First calls are process-local, not cold browser startup. Source parsing/import time, render geometry assembly, workers, uploads, integrated travel/combat, large saves, peak memory and GPU FPS are excluded. Repeated meshing samples are diagnostic, not a statistical performance gate.',meshing,population},null,2));
