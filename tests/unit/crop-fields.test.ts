import { expect,it } from 'vitest';
import { cropFields,cropFieldAt,regionalSample,regionalHeightCeiling,regionTrees } from '../../src/world/regional-terrain';

it('generates varied repeatable rectangular fields with flat interiors and clear vegetation',()=>{
  const crops=new Set<number>(),shapes=new Set<string>();let count=0;
  for(const seed of [103,12012,0])for(let bz=-4;bz<2;bz++)for(let bx=-2;bx<4;bx++)for(const f of cropFields(seed,bx,bz)){
    count++;crops.add(f.crop);shapes.add(`${Math.round(f.maxX-f.minX)},${Math.round(f.maxZ-f.minZ)}`);
    expect(cropFields(seed,bx,bz)).toContainEqual(f);
    for(const tx of [.05,.5,.95])for(const tz of [.05,.5,.95]){
      const x=f.minX+(f.maxX-f.minX)*tx,z=f.minZ+(f.maxZ-f.minZ)*tz,s=regionalSample(seed,x,z);
      expect(s.water).toBeNull();expect(s.height).toBe(f.height);expect(cropFieldAt(seed,x,z)).toEqual(f);
      expect(regionalHeightCeiling(seed,{minX:x,maxX:x+1,minZ:z,maxZ:z+1})).toBeGreaterThanOrEqual(f.height);
    }
    const x=(f.minX+f.maxX)/2,z=(f.minZ+f.maxZ)/2;
    for(const tree of regionTrees({seed,x:Math.floor(x/32),z:Math.floor(z/32),lod:0}))expect(cropFieldAt(seed,tree.x,tree.z)).toBeUndefined();
    // The headland meets the flat plateau continuously, including at negative blocks.
    expect(Math.abs(regionalSample(seed,f.minX-.001,z).height-f.height)).toBeLessThan(.001);
  }
  expect(count).toBeGreaterThan(40);expect(crops.size).toBe(5);expect(shapes.size).toBeGreaterThan(20);
});

it('raises mountain peaks while retaining a traversable ceiling and more foothill coverage',()=>{
  expect(regionalSample(0,800,900).height).toBeGreaterThan(180);
  expect(regionalSample(103,1100,750).biome).toBe('mountains');
  for(const seed of [0,103,12012])for(let x=0;x<3000;x+=100)for(let z=300;z<2000;z+=100){
    const s=regionalSample(seed,x,z);expect(s.height).toBeLessThan(235);
  }
});
