import { expect,it } from 'vitest';
import { regionalHash,regionalHeightCeiling,regionalSample } from '../../src/world/regional-terrain';
import { airbaseHeightCeiling,airbaseSample } from '../../src/world/airbase';
import { PLAYER_FIXED_HULL } from '../../src/flight/aircraft-hulls';
import { sweepAircraft } from '../../src/flight/collision';

it('bounds terrain and water across noise cells, biomes, seeds, distant coordinates and the airfield blend',()=>{
  for(const seed of [0,103,12012,4294967295])for(let i=0;i<160;i++){
    const x=i<120?regionalHash(seed,i,0)*4200-2000:regionalHash(seed,i,0)*400000-200000;
    const z=regionalHash(seed,i,1)*3400-1200,width=1+regionalHash(seed,i,2)*96;
    const b={minX:x,maxX:x+width,minZ:z,maxZ:z+width},ceiling=airbaseHeightCeiling(seed,b);
    for(let iz=0;iz<=4;iz++)for(let ix=0;ix<=4;ix++){
      const s=airbaseSample(seed,x+width*ix/4,z+width*iz/4);
      expect(Math.max(s.height,s.water??-Infinity)).toBeLessThanOrEqual(ceiling);
    }
  }
  for(const z of [119,120,360,600,601])expect(airbaseHeightCeiling(103,{minX:-25,maxX:25,minZ:z,maxZ:z+1})).toBeGreaterThanOrEqual(10.96);
  // A query crossing the flattened core boundary can still contain raised runway paint.
  expect(airbaseHeightCeiling(103,{minX:-20,maxX:20,minZ:590,maxZ:660})).toBeGreaterThanOrEqual(10.96);
});

it('eliminates procedural hull sampling on clear low passes on both sides of the reported altitude cutoff',()=>{
  for(const [x,z] of [[0,360],[5000,0]])for(const agl of [30,80,139,140,141,220]){
    const s=airbaseSample(103,x,z),y=Math.max(s.height,s.water??-Infinity)+agl;
    const from={position:{x,y,z},heading:0,pitch:0,bank:0},to={...from,position:{x,y,z:z-1}};
    let calls=0;const ground=(px:number,pz:number)=>{calls++;const s=airbaseSample(103,px,pz);return Math.max(s.height,s.water??-Infinity);};
    expect(sweepAircraft(from,to,PLAYER_FIXED_HULL,ground,{maxGroundHeight:191,groundCeiling:b=>airbaseHeightCeiling(103,b)})).toBeUndefined();
    expect(calls).toBe(0);
  }
});

it('preserves banked ground/water contacts and obstacle checks when local terrain is culled',()=>{
  for(const [x,z] of [[0,360],[1100,1100],[-1800,0],[500,65]])for(const bank of [0,.8]){
    const sample=regionalSample(103,x,z),y=Math.max(sample.height,sample.water??-Infinity)+1;
    const from={position:{x,y:y+2,z},heading:.4,pitch:-.1,bank},to={...from,position:{x,y,z:z-1}};
    const ground=(px:number,pz:number)=>{const s=regionalSample(103,px,pz);return Math.max(s.height,s.water??-Infinity);};
    const reference=sweepAircraft(from,to,PLAYER_FIXED_HULL,ground,{maxGroundHeight:190});
    const optimized=sweepAircraft(from,to,PLAYER_FIXED_HULL,ground,{maxGroundHeight:190,groundCeiling:b=>regionalHeightCeiling(103,b)});
    expect(optimized).toEqual(reference);expect(optimized?.reason).toBe('Terrain collision');
  }
  const from={position:{x:0,y:100,z:360},heading:0,pitch:0,bank:0};
  const obstacle={minX:-10,maxX:10,minY:98,maxY:110,minZ:350,maxZ:370};
  expect(sweepAircraft(from,from,PLAYER_FIXED_HULL,()=>10,{groundCeiling:()=>11,obstacles:()=>[obstacle]})?.reason).toBe('Obstacle collision');
});
