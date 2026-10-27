import { generateTerrain, wantedChunks } from '../../src/streaming/terrain-data.ts';
import { regionalLandmarks } from '../../src/world/regional-terrain.ts';
const reports=[];
for(const seed of [103,12012])for(const name of ['Forest','Mountains','River','Lake','Ocean'] as const){
  const p=regionalLandmarks(seed)[name],times:number[]=[];let bytes=0,triangles=0,peakPayload=0;
  for(const spec of wantedChunks(seed,p.x,p.z)){
    const start=performance.now(),data=generateTerrain({...spec,generator:'regional-v2'});times.push(performance.now()-start);
    const size=data.positions.byteLength+data.normals.byteLength+data.colors.byteLength;bytes+=size;peakPayload=Math.max(peakPayload,size);triangles+=data.positions.length/9;
  }
  times.sort((a,b)=>a-b);reports.push({seed,landmark:name,chunks:times.length,generationMs:{median:times[Math.floor(times.length*.5)],p95:times[Math.floor(times.length*.95)],max:times.at(-1)},residentPayloadBytes:bytes,peakChunkPayloadBytes:peakPayload,triangles});
}
console.log(JSON.stringify({generator:2,description:'Single-process CPU generation and typed-array payload only; not GPU frame times or gameplay FPS.',node:process.version,reports},null,2));
