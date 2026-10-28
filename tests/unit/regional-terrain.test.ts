import { REGIONAL_HEIGHT_CEILING } from '../../src/world/regional-terrain';
import { expect, it } from 'vitest';
import { generateTerrain, heightAt, signature } from '../../src/streaming/terrain-data';
import { regionalSample, regionLayout, regionTrees, settlementSite, regionalLandmarks } from '../../src/world/regional-terrain';

const seeds=[103,12012,0,4294967295];
it('reproduces seeded regional fixtures and keeps legacy worlds separate',()=>{
  expect(seeds.map(seed=>regionalSample(seed,800,900).height)).toMatchInlineSnapshot(`
    [
      87.7,
      109.2,
      115.4,
      150.2,
    ]
  `);
  expect(new Set(seeds.map(seed=>JSON.stringify(regionalSample(seed,800,900)))).size).toBe(4);
  const a={seed:103,x:0,z:0,lod:0 as const},b={...a,generator:'regional-v2' as const};
  expect(signature(a)).not.toBe(signature(b));
  expect(generateTerrain(a).positions).not.toEqual(generateTerrain(b).positions);
  expect(heightAt(103,0,0)).toBe(5.4);
  expect(generateTerrain(b)).toEqual(generateTerrain(b));
});
it('has connected river, lake and ocean fields and all seven biomes across seeds',()=>{
  for(const seed of seeds){
    const layout=regionLayout(seed),biomes=new Set<string>();
    for(let z=-1600;z<=1600;z+=80)for(let x=-2000;x<=2000;x+=80){
      const s=regionalSample(seed,x,z);biomes.add(s.biome);expect(Number.isFinite(s.height)).toBe(true);expect(s.height).toBeGreaterThan(-100);expect(s.height).toBeLessThan(250);
    }
    expect([...biomes].sort()).toEqual(['coast','forest','lake','mountains','ocean','plains','river']);
    let previous=0;
    for(let x=layout.coast-100;x<2000;x+=8){
      const s=regionalSample(seed,x,layout.riverZ(x));expect(s.water).not.toBeNull();expect(s.height).toBeLessThanOrEqual(s.water!+.05);expect(s.water!).toBeGreaterThanOrEqual(previous);expect(s.water!-previous).toBeLessThan(.2);previous=s.water!;
    }
    const centre=regionalSample(seed,layout.lakeX,layout.riverZ(layout.lakeX)+65);expect(centre.biome).toBe('lake');
  }
});
it('preserves exact shared terrain/water positions and colors between mixed LOD and negative chunks',()=>{
  for(const seed of [103,12012])for(const x of [-47,-1,0,15])for(const lod of [0,1,2,3] as const){
    const a=generateTerrain({seed,x,z:0,lod,generator:'regional-v2'}),b=generateTerrain({seed,x:x+1,z:0,lod:((lod+1)%4) as 0|1|2|3,generator:'regional-v2'});
    const edge=(data:typeof a,px:number)=>{const points=new Map<number,string>();for(let i=0;i<data.positions.length;i+=3)if(data.positions[i]===px && data.positions[i+2]>=0 && data.positions[i+2]<=32)points.set(data.positions[i+2],`${data.positions[i+1]}:${[...data.colors.slice(i,i+3)]}`);return points;};
    const right=edge(a,32),left=edge(b,0);expect(right.size).toBe(33);expect(left).toEqual(right);
  }
});
it('places bounded deterministic trees and safe stable settlement reservations independently of LOD',()=>{
  let total=0,sites=0;
  for(const seed of seeds){
    const forest=regionalLandmarks(seed).Forest;
    const spec={seed,x:Math.floor(forest.x/32),z:Math.floor(forest.z/32),lod:0 as const};
    const trees=regionTrees(spec);total+=trees.length;expect(trees).toEqual(regionTrees({...spec,lod:1}));expect(regionTrees({...spec,lod:3})).toEqual([]);expect(trees.length).toBeLessThanOrEqual(16);
    for(const t of trees){expect(t.x).toBeGreaterThanOrEqual(spec.x*32);expect(t.x).toBeLessThan((spec.x+1)*32);expect(regionalSample(seed,t.x,t.z).water).toBeNull();expect(t.y).toBe(regionalSample(seed,t.x,t.z).height);}
    for(let z=-2;z<=2;z++)for(let x=-2;x<=2;x++){const site=settlementSite(seed,x,z);if(!site)continue;sites++;expect(site).toEqual(settlementSite(seed,x,z));expect(site.id).toContain(`v2:${seed}:`);expect(regionalSample(seed,site.x,site.z).water).toBeNull();}
  }
  expect(total).toBeGreaterThan(0);expect(sites).toBeGreaterThan(10);
});
it('supports fixed-step aircraft travel and authoritative terrain/water collision before meshes load',async()=>{
  const {Flight}=await import('../../src/flight/flight');
  for(const seed of seeds){
    const ground=(x:number,z:number)=>{const s=regionalSample(seed,x,z);return Math.max(s.height,s.water??-Infinity);};
    const flight=new Flight(ground,undefined,'fixed-wing',{maxGroundHeight:REGIONAL_HEIGHT_CEILING});flight.position.y=220;flight.start();
    for(let i=0;i<600;i++)flight.advance(1/60,{pitch:0,bank:0,throttle:1});
    expect(flight.state).toBe('running');expect(flight.position.z).toBeLessThan(-750);
    const lake=regionalLandmarks(seed).Lake;flight.position={...lake,y:ground(lake.x,lake.z)+2};flight.advance(1/60,{pitch:0,bank:0,throttle:0});expect(flight.state).toBe('running');flight.position={...lake,y:ground(lake.x,lake.z)+.4};flight.advance(1/60,{pitch:0,bank:0,throttle:0});expect(flight.state).toBe('crashed');
  }
});

it('keeps the entire finite world below the aircraft ceiling with room to traverse',()=>{
  for(const seed of seeds)for(const x of [-130900,-32000,0,32000,130900])for(const z of [-130900,-32000,0,32000,130900]){const s=regionalSample(seed,x,z);expect(Math.max(s.height,s.water??-Infinity)).toBeLessThanOrEqual(REGIONAL_HEIGHT_CEILING);}
});
it('rejects a late v1 worker reply when the same chunk switches to v2',async()=>{
  const {ChunkStream}=await import('../../src/streaming/chunk-stream');
  const jobs:{resolve:(n:number)=>void;signal:AbortSignal}[]=[],attached:number[]=[],freed:number[]=[];
  const stream=new ChunkStream<number,{dispose():void}>((_s,signal)=>new Promise(resolve=>jobs.push({resolve,signal})),(_s,n)=>{attached.push(n);return {dispose(){}};},n=>freed.push(n));
  const old={seed:103,x:0,z:0,lod:0 as const},next={...old,generator:'regional-v2' as const};
  stream.update([old]);stream.update([next]);expect(jobs[0].signal.aborted).toBe(true);
  jobs[0].resolve(1);jobs[1].resolve(2);for(let i=0;i<5;i++)await Promise.resolve();stream.update([next]);
  expect(attached).toEqual([2]);expect(freed).toEqual([1,2]);expect(stream.settled).toBe(true);stream.dispose();
});
it('reuses regional underlay buffers and releases geometry/material once',async()=>{
  const {createTerrainFallback}=await import('../../src/rendering/terrain-fallback');
  const underlay=createTerrainFallback(103,(x,z)=>{const s=regionalSample(103,x,z);return {height:Math.max(s.height,s.water??-Infinity),color:[...s.color]};});
  const position=underlay.mesh.geometry.getAttribute('position'),color=underlay.mesh.geometry.getAttribute('color');
  const before=position.getY(0);underlay.update(1000,1000);expect(underlay.mesh.geometry.getAttribute('position')).toBe(position);expect(underlay.mesh.geometry.getAttribute('color')).toBe(color);expect(position.getY(0)).not.toBe(before);expect(underlay.mesh.material.vertexColors).toBe(true);
  let count=0;underlay.mesh.geometry.addEventListener('dispose',()=>count++);underlay.mesh.material.addEventListener('dispose',()=>count++);underlay.dispose();underlay.dispose();expect(count).toBe(2);
});
