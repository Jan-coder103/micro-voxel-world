import type { InstancedMesh } from 'three';
import { describe,it,expect,vi } from 'vitest';
import { RegionalPopulation } from '../../src/hordes/regional-population';
import { regionalSample } from '../../src/world/regional-terrain';
import { Combat } from '../../src/combat/weapons';
import { createRegionalPopulationView } from '../../src/rendering/regional-population-view';
const memory=()=>{const data=new Map<string,string>();return {data,getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);}};};
const observer={x:64,y:80,z:-192};
function populated(p:RegionalPopulation){for(let z=-4;z<1;z++)for(let x=-2;x<3;x++){const e=p.encounter(x,z);if(e.members.length>=4)return e;}throw new Error('Missing population fixture');}
describe('regional population authority',()=>{
  it('reproduces seed-specific descriptors and only places dry, separated members outside buildings',()=>{
    for(const seed of [103,12012,0,4294967295]){
      const p=new RegionalPopulation(seed,memory()),q=new RegionalPopulation(seed,memory());
      for(let z=-3;z<2;z++)for(let x=-3;x<2;x++){
        const e=p.encounter(x,z);expect(e).toEqual(q.encounter(x,z));
        for(const [i,m] of e.members.entries()){expect(Math.floor(m.x/128)).toBe(x);expect(Math.floor(m.z/128)).toBe(z);expect(p.world.walkable(m.x,m.z,1)).toBe(true);expect(regionalSample(seed,m.x,m.z).water).toBe(null);expect(m.y).toBeCloseTo(regionalSample(seed,m.x,m.z).height+.9);for(const n of e.members.slice(i+1))expect(Math.hypot(m.x-n.x,m.z-n.z)).toBeGreaterThanOrEqual(2);}
      }
    }
    expect(populated(new RegionalPopulation(103,memory())).members).not.toEqual(populated(new RegionalPopulation(104,memory())).members);
  });
  it('uses district roads for denser populations and omits ocean',()=>{
    const p=new RegionalPopulation(103,memory());const city=p.world.landmarks().city!;const x=Math.floor(city.x/128),z=Math.floor(city.z/128);const e=p.encounter(x,z);expect(e.habitat).toBe('city');expect(e.members.length).toBeGreaterThan(8);
    expect(p.encounter(-20,-20).members).toEqual([]);
  });
  it('preserves partial damage and clearance through tiers, eviction, query and reload without touching legacy saves',()=>{
    const storage=memory();storage.setItem('mvw:hordes:v1:g1:p1:103','legacy');const p=new RegionalPopulation(103,storage),e=populated(p),t=p.targets(e);t[0].health=17;p.damaged(t[0]);for(const m of t.slice(1)){m.health=0;p.damaged(m);}
    for(const x of [e.x*128,e.x*128+180,e.x*128+350,8000,e.x*128]){p.update({x,y:80,z:e.z*128});expect(p.counts.resident).toBeLessThanOrEqual(49);expect(p.counts.cache).toBeLessThanOrEqual(64);}
    const loaded=new RegionalPopulation(103,storage);expect(loaded.error).toBe('');expect(loaded.targets(loaded.encounter(e.x,e.z)).map(t=>t.health)).toEqual(t.map(t=>t.health));expect(loaded.counts.killed).toBe(t.length-1);
    const survivor=loaded.targets(e)[0];survivor.health=0;loaded.damaged(survivor);expect(new RegionalPopulation(103,storage).counts.cleared).toBe(1);expect([...loaded.query({x:e.x*128,y:-100,z:e.z*128},{x:(e.x+1)*128,y:300,z:(e.z+1)*128})].filter(t=>t.id.startsWith(e.id+':'))).toEqual([]);
    expect(storage.getItem('mvw:hordes:v1:g1:p1:103')).toBe('legacy');expect(new RegionalPopulation(104,storage).counts.killed).toBe(0);expect(new RegionalPopulation(103,storage,false).counts.killed).toBe(0);
  });
  it('damage queries work without residents and overlapping boundary queries deduplicate stable IDs',()=>{
    const p=new RegionalPopulation(103,memory()),e=populated(p),t=p.targets(e)[0],q={x:t.position.x-1,y:t.position.y-1,z:t.position.z-1},max={x:t.position.x+1,y:t.position.y+1,z:t.position.z+1};
    expect(p.resident.size).toBe(0);expect(p.query(q,max).map(t=>t.id)).toContain(t.id);const c=new Combat([],()=>-100,0,{index:p,onDamage:t=>p.damaged(t)});c.explode(t.position,1,23);expect(p.targets(e)[0].health).toBe(17);
    const wide=p.query({x:-128,y:-100,z:-384},{x:128,y:300,z:-128});expect(new Set(wide.map(t=>t.id)).size).toBe(wide.length);expect(p.resident.size).toBe(0);
  });
  it('rejects malformed/versioned/duplicate saves atomically and preserves corrupt data',()=>{
    const storage=memory(),p=new RegionalPopulation(103,storage),e=populated(p),t=p.targets(e)[0];t.health=1;p.damaged(t);const valid=storage.getItem(p.key)!;
    for(const alter of [(v:{generator:number;wounds:[number,number,number[]][]})=>{v.generator=1;},(v:{generator:number;wounds:[number,number,number[]][]})=>{v.wounds.push(v.wounds[0]);},(v:{generator:number;wounds:[number,number,number[]][]})=>{v.wounds[0][2][0]=-1;},(v:{generator:number;wounds:[number,number,number[]][]})=>{v.wounds[0][2].pop();},(v:{generator:number;wounds:[number,number,number[]][]})=>{v.wounds[0][0]=-33;}]){
      const v=JSON.parse(valid);alter(v);const text=JSON.stringify(v);storage.setItem(p.key,text);const broken=new RegionalPopulation(103,storage);expect(broken.error).not.toBe('');expect(broken.counts.changed).toBe(0);broken.checkpoint();expect(storage.getItem(p.key)).toBe(text);
    }
    const failed=new RegionalPopulation(103,{getItem:()=>null,setItem:()=>{throw new Error('Quota');}});const ft=failed.targets(populated(failed))[0];ft.health=0;failed.damaged(ft);expect(failed.error).toContain('Quota');expect(failed.counts.killed).toBe(1);
    expect(new RegionalPopulation(103).error).toContain('session only');
  });
  it('bounds resident/cache/render allocation and disposes shared resources once',()=>{
    const p=new RegionalPopulation(103,memory());p.update(observer);const view=createRegionalPopulationView(p);view.update();expect(view.group.children).toHaveLength(3);const dispose=vi.spyOn((view.group.children[0] as InstancedMesh).geometry,'dispose');
    for(let x=-3900;x<4000;x+=512){p.update({x,y:80,z:observer.z});view.update();expect(p.counts.resident).toBeLessThanOrEqual(49);expect(p.counts.cache).toBeLessThanOrEqual(64);}view.dispose();view.dispose();expect(dispose).toHaveBeenCalledOnce();
    expect(()=>p.encounter(32,0)).toThrow();expect(()=>p.update({x:NaN,y:0,z:0})).toThrow();expect(()=>p.query({x:0,y:0,z:0},{x:1025,y:0,z:0})).toThrow();
  });
});
