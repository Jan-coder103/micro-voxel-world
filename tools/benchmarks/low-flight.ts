// Bounded CPU diagnostic: one old/new sweep per altitude, no browser or GPU load.
// node --experimental-strip-types tools/benchmarks/low-flight.ts
import { PLAYER_FIXED_HULL } from '../../src/flight/aircraft-hulls.ts';
import { sweepAircraft } from '../../src/flight/collision.ts';
import { airbaseHeightCeiling,airbaseSample } from '../../src/world/airbase.ts';
const rows=[];
for(const [x,z] of [[0,360],[5000,0]])for(const agl of [30,139,140,141,220])for(const local of [false,true]){
  const s=airbaseSample(103,x,z),y=Math.max(s.height,s.water??-Infinity)+agl;
  const from={position:{x,y,z},heading:0,pitch:0,bank:0},to={...from,position:{x,y,z:z-1}};
  let samples=0;
  const ground=(px:number,pz:number)=>{samples++;const v=airbaseSample(103,px,pz);return Math.max(v.height,v.water??-Infinity);};
  const start=performance.now();
  const hit=sweepAircraft(from,to,PLAYER_FIXED_HULL,ground,{maxGroundHeight:191,...(local?{groundCeiling:b=>airbaseHeightCeiling(103,b)}:{})});
  rows.push({x,z,agl,local,samples,ms:performance.now()-start,collision:hit?.reason??null});
}
console.log(JSON.stringify({scope:'CPU-only isolated 1 m sweeps; timings include JIT variation, not hardware FPS',hullPoints:PLAYER_FIXED_HULL.points.length,rows},null,2));
