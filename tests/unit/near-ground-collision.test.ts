import { expect,it } from 'vitest';
import { Frontier } from '../../src/game/frontier';
import { PLAYER_FIXED_HULL } from '../../src/flight/aircraft-hulls';
import { sweepAircraft,prepareHull } from '../../src/flight/collision';
import { airbaseHeightCeiling,airbaseSample } from '../../src/world/airbase';
import { regionalLandmarks,regionalHeightCeiling,regionalSample } from '../../src/world/regional-terrain';

it('keeps near-contact clear passes cheap and preserves contact at every height without thinning hull samples',()=>{
  const seed=103,landmarks=regionalLandmarks(seed),reference={...PLAYER_FIXED_HULL,terrainTree:undefined};
  for(const [x,z] of [[0,360],[0,0],[170,0],[170,360],[landmarks.Lake.x+180,landmarks.Lake.z+130],[5000,0],[1100,1100],[landmarks.River.x,landmarks.River.z],[landmarks.Lake.x,landmarks.Lake.z]])for(const agl of [2,3,5,10,20,29]){
    const surface=airbaseSample(seed,x,z),y=Math.max(surface.height,surface.water??-Infinity)+agl;
    const from={position:{x,y,z},heading:.3,pitch:0,bank:.1},to={...from,position:{x:x+.3,y,z:z-1}};
    let calls=0;
    const ground=(px:number,pz:number)=>{const s=airbaseSample(seed,px,pz);return Math.max(s.height,s.water??-Infinity);};
    const expected=sweepAircraft(from,to,reference,ground,{maxGroundHeight:191});
    const actual=sweepAircraft(from,to,PLAYER_FIXED_HULL,(px,pz)=>{calls++;return ground(px,pz);},{maxGroundHeight:191,groundCeiling:b=>airbaseHeightCeiling(seed,b)});
    expect(actual).toEqual(expected);
    // Bound real work, including the active near-ground path, rather than asserting hardware timings.
    expect(calls,JSON.stringify({x,z,agl})).toBeLessThan(512);
  }
});

it('retains wing-tip ridge, rotating-wing, water and banked contact with the hierarchy enabled',()=>{
  const wing=prepareHull([[0,0,0,8,.2,2]]);
  const ground=(x:number,z:number)=>Math.abs(x-2)<.3&&Math.abs(z)<.3?3:0;
  const ceiling=(b:{minX:number;maxX:number;minZ:number;maxZ:number})=>b.minX<2.3&&b.maxX>1.7&&b.minZ<.3&&b.maxZ>-.3?3:0;
  const pose={position:{x:0,y:2,z:0},heading:0,pitch:0,bank:0};
  expect(sweepAircraft(pose,pose,wing,ground,{groundCeiling:ceiling})?.reason).toBe('Terrain collision');
  for(const bank of [-1,.7,1]){
    const to={...pose,bank};
    expect(sweepAircraft(pose,to,wing,()=>0,{groundCeiling:()=>0})).toEqual(sweepAircraft(pose,to,{...wing,terrainTree:undefined},()=>0,{}));
  }
  for(const seed of [0,103,12012])for(const name of ['Mountains','River','Lake','Coast'] as const){
    const p=regionalLandmarks(seed)[name];
    const ground=(x:number,z:number)=>{const s=regionalSample(seed,x,z);return Math.max(s.height,s.water??-Infinity);};
    const from={position:{...p,y:ground(p.x,p.z)+4},heading:.9,pitch:-.1,bank:.65};
    const to={...from,position:{x:p.x+.5,y:from.position.y-2,z:p.z-1}};
    expect(sweepAircraft(from,to,PLAYER_FIXED_HULL,ground,{groundCeiling:b=>regionalHeightCeiling(seed,b)})).toEqual(sweepAircraft(from,to,{...PLAYER_FIXED_HULL,terrainTree:undefined},ground,{}));
  }
});

it('runs maximum catch-up frames at 5 m AGL with detailed terrain collision enabled',()=>{
  const game=new Frontier(103);game.launch();const f=game.flight;
  f.grounded=false;f.position={x:0,y:game.baseHeight+5,z:400};f.speed=60;f.throttle=.6;f.assisted=false;
  for(let frame=0;frame<8;frame++)game.advance(8/60,{pitch:0,bank:0,throttle:0,fire:false,weapon:'minigun',aim:false});
  expect(f.ticks).toBe(64);expect(game.state).toBe('flying');expect(f.position.y-game.ground(f.position.x,f.position.z)).toBeCloseTo(4.84);
});
