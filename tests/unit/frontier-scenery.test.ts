import { describe,it,expect,vi } from 'vitest';
import type { Group,InstancedMesh,MeshStandardMaterial } from 'three';
import { createFrontierScenery } from '../../src/rendering/frontier-scenery';
import { FOREST_MAX_TILES } from '../../src/rendering/frontier-forest';
import { SettlementWorld } from '../../src/world/settlements';
import { airbaseReserved } from '../../src/world/airbase';
import { regionTrees,regionalLandmarks } from '../../src/world/regional-terrain';

describe('streamed atmosphere and dense distant forest',()=>{
  it('generates dense canonical cuboids at matching linear green, reuses settled tiles and disposes safely',()=>{
    vi.useFakeTimers();const world=new SettlementWorld(103),wake=vi.fn(),view=createFrontierScenery(103,world,wake);
    try{
      view.update(0,30,548);expect(view.pending).toBe(true);vi.runAllTimers();expect(view.pending).toBe(false);
      const forest=view.group.children[2] as Group,tiles=forest.children as InstancedMesh[];
      expect(tiles.length).toBe(FOREST_MAX_TILES);expect(view.treeCount).toBeGreaterThan(4096);expect(view.treeCount).toBeLessThanOrEqual(FOREST_MAX_TILES*1024);
      expect((tiles[0].material as MeshStandardMaterial).color.toArray()).toEqual([.16,.29,.12]);
      for(const tile of tiles)for(let i=0;i<tile.count;i++){
        const a=tile.instanceMatrix.array,x=a[i*16+12]+tile.position.x,z=a[i*16+14]+tile.position.z;
        expect(airbaseReserved(x,z)).toBe(false);expect(tile.geometry).toBe(tiles[0].geometry);
      }
      const initial=tiles.map(t=>[t.name,t.instanceMatrix.version]);for(let i=0;i<60;i++)view.update(0,30,548);
      expect(view.rebuilds).toBe(1);expect(tiles.map(t=>[t.name,t.instanceMatrix.version])).toEqual(initial);
      const kept=forest.getObjectByName('forest:0,2');view.update(512,30,548);vi.runAllTimers();expect(view.rebuilds).toBe(2);expect(forest.getObjectByName('forest:0,2')).toBe(kept);
      view.update(0,30,548);vi.runAllTimers();expect(view.rebuilds).toBe(3);expect(view.treeCount).toBeGreaterThan(4096);
      const dispose=vi.spyOn(tiles[0].geometry,'dispose');view.dispose();view.dispose();expect(dispose).toHaveBeenCalledOnce();expect(view.group.children).toHaveLength(0);expect(vi.getTimerCount()).toBe(0);expect(wake).toHaveBeenCalled();
    }finally{view.dispose();vi.useRealTimers();}
  });
  it('hides a proxy only when its actual detailed chunk is resident, then restores it at the same position',()=>{
    vi.useFakeTimers();const world=new SettlementWorld(103),view=createFrontierScenery(103,world),p=regionalLandmarks(103).Forest;
    try{
      view.update(p.x,40,p.z);vi.runAllTimers();const forest=view.group.children[2] as Group;
      let selected:{tile:InstancedMesh;x:number;z:number;index:number}|undefined;
      outer:for(const object of forest.children){const tile=object as InstancedMesh;for(let i=0;i<tile.count;i++){
        const a=tile.instanceMatrix.array,x=a[i*16+12]+tile.position.x,z=a[i*16+14]+tile.position.z;
        if(Math.hypot(x-p.x,z-p.z)>500&&Math.hypot(x-p.x,z-p.z)<1100){selected={tile,x,z,index:i};break outer;}
      }}
      expect(selected).toBeDefined();const {tile,x,z,index}=selected!,cx=Math.floor(x/32),cz=Math.floor(z/32),before=tile.instanceMatrix.array.slice(index*16,index*16+16);
      expect(regionTrees({seed:103,x:cx,z:cz,lod:0,generator:'regional-v2'}).some(t=>Math.abs(t.x-x)<.001&&Math.abs(t.z-z)<.001)).toBe(true);
      view.update(p.x,40,p.z,[{spec:{seed:103,x:cx,z:cz,lod:1}}]);expect(tile.instanceMatrix.array[index*16]).toBe(0);
      view.update(p.x,40,p.z);expect(tile.instanceMatrix.array.slice(index*16,index*16+16)).toEqual(before);
    }finally{view.dispose();vi.useRealTimers();}
  });
  it('cancels unfinished generation on disposal without notifying or retaining timers',()=>{
    vi.useFakeTimers();const wake=vi.fn(),view=createFrontierScenery(103,new SettlementWorld(103),wake);
    view.update(0,40,400);view.dispose();vi.runAllTimers();expect(wake).not.toHaveBeenCalled();expect(vi.getTimerCount()).toBe(0);vi.useRealTimers();
  });
});
