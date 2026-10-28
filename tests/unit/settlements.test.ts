import { expect, it } from 'vitest';
import { SettlementWorld, intersects, type Settlement } from '../../src/world/settlements';
import { regionalSample } from '../../src/world/regional-terrain';
import { generateTerrain, signature } from '../../src/streaming/terrain-data';
import { Flight } from '../../src/flight/flight';

const kinds=['airport','city','harbor','industrial','military','rural'];
function connected(s:Settlement){
  const reached=new Set([s.nodes[0].id]);let changed=true;while(changed){changed=false;for(const r of s.roads)if(reached.has(r.from)||reached.has(r.to)){if(!reached.has(r.from)||!reached.has(r.to))changed=true;reached.add(r.from);reached.add(r.to);}}
  for(const node of s.nodes)expect(reached.has(node.id)).toBe(true);
  for(const b of s.buildings)expect(reached.has(b.access)).toBe(true);
}
it('reproduces all district types for four seeds, stable IDs and load-order-independent negative regions',()=>{
  for(const seed of [103,12012,0,4294967295]){
    const world=new SettlementWorld(seed),sites=world.landmarks();expect(Object.keys(sites).sort()).toEqual(kinds);
    const replay=new SettlementWorld(seed);replay.region(4,2);replay.region(-4,-4);
    for(const s of Object.values(sites)){expect(s).toEqual(replay.region(Math.floor(s.x/512),Math.floor(s.z/512)));expect(new Set(s.buildings.map(b=>b.id)).size).toBe(s.buildings.length);connected(s);}
    expect(world.cachedRegions).toBeLessThanOrEqual(64);
  }
});
it('keeps plots dry, gently grounded, separate from roads/buildings and with accessible driveways',()=>{
  const world=new SettlementWorld(103);
  for(const s of Object.values(world.landmarks())){
    for(const b of s.buildings){
      expect(b.y+b.height).toBeLessThan(250);
      if(b.kit==='pier'){expect(regionalSample(103,b.minX+2,b.z).biome).toBe('ocean');continue;}
      for(let x=b.minX;x<=b.maxX;x+=1)for(let z=b.minZ;z<=b.maxZ;z+=1){const ground=regionalSample(103,x,z);expect(ground.water).toBeNull();expect(ground.height).toBeLessThan(b.y);expect(ground.height).toBeGreaterThan(b.bottom);}
      expect(b.y-b.bottom).toBeLessThanOrEqual(1.91);
      expect(s.roads.some(r=>r.kind==='driveway'&&r.from===b.access)).toBe(true);
      for(const r of s.roads)expect(intersects(b,r)).toBe(false);
      for(const other of s.buildings)if(other!==b)expect(intersects(b,other)).toBe(false);
      expect(world.walkable(b.x,b.z)).toBe(false);expect(world.reserved(b.x,b.z)).toBe(true);
    }
    for(const r of s.roads)for(let x=r.minX;x<=r.maxX;x+=3)for(let z=r.minZ;z<=r.maxZ;z+=3)expect(regionalSample(103,x,z).water).toBeNull();
    for(const node of s.nodes)expect(world.walkable(node.x,node.z,.5)).toBe(true);
  }
});
it('pairs stable border portals and keeps cross-region roads joined to both local networks',()=>{
  const world=new SettlementWorld(103),sites=Object.values(world.landmarks());let links=0;
  for(const s of sites)for(const portal of s.nodes.filter(n=>n.id.includes(':portal:'))){
    const neighbours=[[-1,0],[1,0],[0,-1],[0,1]].map(([dx,dz])=>world.region(Math.floor(s.x/512)+dx,Math.floor(s.z/512)+dz)).filter(n=>n&&n.id!==s.id);
    const peer=neighbours.find(n=>n?.nodes.some(p=>p.id===portal.id));expect(peer).toBeTruthy();expect(peer!.nodes.find(n=>n.id===portal.id)).toEqual(portal);links++;
  }
  expect(links).toBeGreaterThan(0);
});
it('assigns one render owner across chunks and LODs, and clips roads at shared edges',()=>{
  const s=new SettlementWorld(103).landmarks().city!,ids:string[]=[];
  for(let z=Math.floor((s.z-90)/32);z<=Math.floor((s.z+90)/32);z++)for(let x=Math.floor((s.x-90)/32);x<=Math.floor((s.x+90)/32);x++){
    const base={seed:103,x,z,generator:'regional-v2' as const,structures:true as const};
    const data=generateTerrain({...base,lod:3}),fine=generateTerrain({...base,lod:0});expect(data.buildings).toEqual(fine.buildings);ids.push(...data.buildings!.map(b=>b.id));
    for(const b of data.buildings!){expect(Math.floor(b.x/32)).toBe(x);expect(Math.floor(b.z/32)).toBe(z);}
  }
  expect(new Set(ids).size).toBe(ids.length);expect(ids.sort()).toEqual(s.buildings.map(b=>b.id).sort());
  const spec={seed:103,x:Math.floor(s.x/32),z:Math.floor(s.z/32),lod:0 as const,generator:'regional-v2' as const};expect(signature(spec)).not.toBe(signature({...spec,structures:true}));
  const terrain=generateTerrain({...spec,structures:true});expect([...terrain.normals].every(Number.isFinite)).toBe(true);
  // All road vertices (identified by their upward normals and asphalt colors) are clipped.
  for(let i=0;i<terrain.positions.length;i+=3)if(terrain.colors[i]<.16&&terrain.normals[i+1]===1){expect(terrain.positions[i]).toBeGreaterThanOrEqual(0);expect(terrain.positions[i]).toBeLessThanOrEqual(32);expect(terrain.positions[i+2]).toBeGreaterThanOrEqual(0);expect(terrain.positions[i+2]).toBeLessThanOrEqual(32);}
});
it('resolves fitted swept aircraft collisions and ground navigation without loaded render chunks',()=>{
  const world=new SettlementWorld(103),b=world.landmarks().city!.buildings[0];
  const origin={x:b.minX-20,y:b.y+b.height/2,z:b.z};expect(world.ray(origin,{x:1,y:0,z:0},30)).toBeCloseTo(20);expect(world.ray(origin,{x:1,y:0,z:0},30,6)).toBeCloseTo(14);
  expect(world.ray({x:b.x,y:b.y+1,z:b.z},{x:0,y:1,z:0},10)).toBe(0);
  const flight=new Flight((x,z)=>regionalSample(103,x,z).height,undefined,'fixed-wing',{obstacles:bounds=>world.buildings(bounds).map(b=>({...b,minY:b.bottom,maxY:b.y+b.height}))});flight.position={x:b.x,y:b.y+4,z:b.maxZ+15};flight.start();for(let i=0;i<30;i++)flight.advance(1/60,{pitch:0,bank:0,throttle:0});expect(flight.state).toBe('crashed');expect(flight.reason).toBe('Obstacle collision');
  flight.reset();flight.position={x:b.x,y:Math.max(...world.landmarks().city!.buildings.map(b=>b.y+b.height))+10,z:b.maxZ+15};flight.start();for(let i=0;i<30;i++)flight.advance(1/60,{pitch:0,bank:0,throttle:0});expect(flight.state).toBe('running');
  const runway=world.landmarks().airport!.roads.find(r=>r.kind==='runway')!;expect(world.walkable((runway.minX+runway.maxX)/2,(runway.minZ+runway.maxZ)/2)).toBe(true);
});
it('keeps district lookup bounded and rejects malformed or unbounded queries',()=>{
  expect(()=>new SettlementWorld(NaN)).toThrow();const w=new SettlementWorld(0);
  expect(()=>w.region(1.5,0)).toThrow();expect(()=>w.region(1e30,0)).toThrow();expect(()=>w.inBounds({minX:0,maxX:100000,minZ:0,maxZ:1})).toThrow();expect(()=>w.ray({x:1e30,y:0,z:0},{x:1,y:0,z:0},1)).toThrow();
  for(let x=-40;x<40;x++)w.region(x,0);expect(w.cachedRegions).toBeLessThanOrEqual(64);
});
it('shares authored kit buffers across instances, handles same-chunk replacement and disposes once',async()=>{
  const {createSettlementView}=await import('../../src/rendering/settlement-view');
  const view=createSettlementView(),s=new SettlementWorld(103).landmarks().city!;
  const release=view.attach('same-chunk',s.buildings);view.update();expect(view.count).toBe(s.buildings.length);expect(view.batches).toBe(8);
  const children=[...view.group.children],meshes=children as import('three').InstancedMesh[];
  const geometry=meshes.map(m=>m.geometry);expect(meshes.filter(m=>m.count>1).length).toBeGreaterThan(0);
  const replacement=view.attach('same-chunk',s.buildings);release();release();view.update();expect(view.count).toBe(s.buildings.length);expect(meshes.map(m=>m.geometry)).toEqual(geometry);
  let released=0;for(const m of meshes){m.geometry.addEventListener('dispose',()=>released++);m.addEventListener('dispose',()=>released++);}
  replacement();view.update();expect(view.count).toBe(0);expect(meshes.every(m=>m.count===0)).toBe(true);
  view.dispose();view.dispose();expect(released).toBe(16);expect(view.group.children).toHaveLength(0);expect(()=>view.attach('x',[])).toThrow();
});
it('excludes vegetation crowns from occupied plots, roads and runways',()=>{
  const world=new SettlementWorld(103),s=world.landmarks().city!;
  const data=generateTerrain({seed:103,x:Math.floor(s.x/32),z:Math.floor(s.z/32),lod:0,generator:'regional-v2',structures:true});
  for(let i=0;i<data.positions.length;i+=3)if(Math.abs(data.colors[i]-.16)<1e-6&&Math.abs(data.colors[i+1]-.29)<1e-6){
    const x=data.positions[i]+Math.floor(s.x/32)*32,z=data.positions[i+2]+Math.floor(s.z/32)*32;expect(world.reserved(x,z,0)).toBe(false);
  }
});

it('rejects ground-navigation footprints that extend into water even with a dry centre',()=>{
  const world=new SettlementWorld(103);let edge:number|undefined;const z=1234;
  for(let x=-2000;x<0;x+=.5)if(regionalSample(103,x,z).water===null&&regionalSample(103,x-4,z).water!==null){edge=x;break;}
  expect(edge).toBeDefined();expect(world.walkable(edge!,z,4)).toBe(false);expect(()=>world.walkable(Infinity,0)).toThrow();
});
