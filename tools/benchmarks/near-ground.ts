// Bounded CPU-only diagnostic, including the active narrow phase down to actual contact.
// node --experimental-strip-types tools/benchmarks/near-ground.ts
import { PLAYER_FIXED_HULL } from '../../src/flight/aircraft-hulls.ts';
import { sweepAircraft } from '../../src/flight/collision.ts';
import { airbaseHeightCeiling,airbaseSample } from '../../src/world/airbase.ts';
import { regionalLandmarks } from '../../src/world/regional-terrain.ts';
const landmarks=regionalLandmarks(103),rows=[];
for(const [name,x,z] of [['runway',0,360],['plain',5000,0],['river',landmarks.River.x,landmarks.River.z],['mountain',1100,1100]] as const)for(const agl of [2,3,5,10,20,29,30])for(const hierarchy of [false,true]){
  const s=airbaseSample(103,x,z),y=Math.max(s.height,s.water??-Infinity)+agl;
  const from={position:{x,y,z},heading:.3,pitch:0,bank:.1},to={...from,position:{x:x+.3,y,z:z-1}};
  let samples=0,bounds=0;
  const ground=(px:number,pz:number)=>{samples++;const s=airbaseSample(103,px,pz);return Math.max(s.height,s.water??-Infinity);};
  const start=performance.now();
  const hit=sweepAircraft(from,to,hierarchy?PLAYER_FIXED_HULL:{...PLAYER_FIXED_HULL,terrainTree:undefined},ground,{maxGroundHeight:191,...(hierarchy?{groundCeiling:b=>{bounds++;return airbaseHeightCeiling(103,b);}}:{})});
  rows.push({name,agl,hierarchy,samples,bounds,ms:performance.now()-start,contact:hit?.reason??null});
}
console.log(JSON.stringify({scope:'CPU-only 1 m sweeps. Exhaustive reference vs spatial hierarchy, including actual contact. Not hardware FPS.',hullPoints:PLAYER_FIXED_HULL.points.length,rows},null,2));
