import { describe,it,expect,vi } from 'vitest';
import type { InstancedMesh } from 'three';
import { createFrontierScenery } from '../../src/rendering/frontier-scenery';
import { SettlementWorld } from '../../src/world/settlements';
import { airbaseReserved } from '../../src/world/airbase';
describe('streamed atmosphere and distant forest',()=>{
  it('keeps deterministic bounded trees out of the base, reuses buffers while idle, and disposes once',()=>{
    const view=createFrontierScenery(103,new SettlementWorld(103));view.update(0,30,548);const trees=view.group.children[2] as InstancedMesh;expect(view.treeCount).toBeGreaterThan(0);expect(view.treeCount).toBeLessThanOrEqual(4096);const initial=trees.instanceMatrix.array.slice(),version=trees.instanceMatrix.version;
    for(let i=0;i<60;i++)view.update(0,30,548);expect(view.rebuilds).toBe(1);expect(trees.instanceMatrix.version).toBe(version);
    for(let i=0;i<trees.count;i++)expect(airbaseReserved(initial[i*16+12],initial[i*16+14])).toBe(false);
    view.update(512,30,548);expect(view.rebuilds).toBe(2);view.update(0,30,548);expect(trees.instanceMatrix.array.slice(0,trees.count*16)).toEqual(initial.slice(0,trees.count*16));
    const dispose=vi.spyOn(trees.geometry,'dispose');view.dispose();view.dispose();expect(dispose).toHaveBeenCalledOnce();expect(view.group.children).toHaveLength(0);
  });
});
