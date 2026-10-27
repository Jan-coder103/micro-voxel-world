import { expect, it } from 'vitest';
import { ChunkPlan } from '../../src/streaming/chunk-plan';
import { wantedChunks } from '../../src/streaming/terrain-data';

it('reuses a frozen plan inside a cell and matches uncached plans across boundaries and turns', () => {
  for (const regional of [false, true]) for (const structures of [false, true]) {
    const plan = new ChunkPlan(103, regional, structures);
    const first = plan.at(0, 0);
    for (let i = 0; i < 120; i++) expect(plan.at(i / 120 * 31, 16)).toBe(first);
    expect(plan.rebuilds).toBe(1);
    expect(Object.isFrozen(first)).toBe(true);
    expect(first.every(Object.isFrozen)).toBe(true);
    for (const [x,z] of [[-.1,-.1],[32,0],[256,256],[-256,0],[0,0],[131072,131072]]) {
      expect(plan.at(x,z)).toEqual(wantedChunks(103,x,z).map(s => ({...s,
        ...(regional ? {generator:'regional-v2'} : {}), ...(regional && structures ? {structures:true} : {}),
      })));
    }
  }
});
