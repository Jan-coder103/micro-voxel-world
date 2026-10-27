import { SettlementWorld } from '../../src/world/settlements.ts';
import { generateTerrain, wantedChunks } from '../../src/streaming/terrain-data.ts';
const reports=[];
for(const seed of [103,12012]){
  const start=performance.now(),world=new SettlementWorld(seed),landmarks=world.landmarks(),discoveryMs=performance.now()-start;
  for(const site of Object.values(landmarks)){
    const times:number[]=[];let bytes=0,triangles=0,buildings=0,peakPayload=0;
    for(const spec of wantedChunks(seed,site.x,site.z)){
      const start=performance.now(),data=generateTerrain({...spec,generator:'regional-v2',structures:true});times.push(performance.now()-start);
      const payload=data.positions.byteLength+data.normals.byteLength+data.colors.byteLength;bytes+=payload;peakPayload=Math.max(peakPayload,payload);triangles+=data.positions.length/9;buildings+=data.buildings?.length??0;
    }
    times.sort((a,b)=>a-b);reports.push({seed,district:site.kind,discoveryMs,roads:site.roads.length,nodes:site.nodes.length,buildings,chunks:times.length,terrainTriangles:triangles,residentArrayBytes:bytes,peakChunkArrayBytes:peakPayload,generationMs:{median:times[Math.floor(times.length*.5)],p95:times[Math.floor(times.length*.95)],max:times.at(-1)}});
  }
}
console.log(JSON.stringify({structureVersion:1,node:process.version,note:'CPU generation only; excludes building kit meshing, GPU copies, JS temporaries and descriptor strings. Not gameplay FPS or GPU time.',reports},null,2));
