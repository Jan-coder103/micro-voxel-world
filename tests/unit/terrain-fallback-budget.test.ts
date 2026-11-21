import { expect,it,vi } from 'vitest';
import { MeshStandardMaterial } from 'three';
import { createTerrainFallback } from '../../src/rendering/terrain-fallback';

it('reuses overlap and publishes budgeted coverage atomically with unchanged world samples',()=>{
  const sample=vi.fn((x:number,z:number)=>({height:x*.2+z*.1,color:[.2,.4,.6],waterDepth:x-z}));
  const material=new MeshStandardMaterial();
  const view=createTerrainFallback(103,sample,128,{innerExtent:512,innerSpacing:16,drop:1,material,samplesPerUpdate:128});
  const geometry=view.mesh.geometry,positions=geometry.getAttribute('position'),original=positions.array.slice(),origin=view.mesh.position.clone();
  const vertices=positions.count;sample.mockClear();
  view.update(128,144);expect(view.pending).toBe(true);expect(sample).toHaveBeenCalledTimes(128);
  expect(view.mesh.position).toEqual(origin);expect(positions.array).toEqual(original);
  let frames=1;
  while(view.pending){const before=sample.mock.calls.length;view.update(128,144);expect(sample.mock.calls.length-before).toBeLessThanOrEqual(128);expect(++frames).toBeLessThan(100);}
  expect(sample.mock.calls.length).toBeLessThan(vertices/4);expect(view.cachedSamples).toBe(vertices);
  expect(view.mesh.position.x).toBe(128);expect(geometry.getAttribute('position')).toBe(positions);
  const colors=geometry.getAttribute('color'),depth=geometry.getAttribute('waterDepth');
  for(let i=0;i<positions.count;i++){
    const x=positions.getX(i)+128,z=positions.getZ(i)+origin.z;
    expect(positions.getY(i)).toBeCloseTo(x*.2+z*.1-1,4);expect(depth.getX(i)).toBeCloseTo(x-z,4);expect(colors.getY(i)).toBeCloseTo(.4);
  }
  const calls=sample.mock.calls.length;view.update(128,144);expect(sample.mock.calls.length).toBe(calls);
  const release=vi.spyOn(material,'dispose');view.dispose();expect(view.cachedSamples).toBe(0);expect(release).not.toHaveBeenCalled();material.dispose();
});

it('abandons distant obsolete work, completes negative-coordinate grids and cancels on dispose',()=>{
  const sample=vi.fn((x:number,z:number)=>({height:x-z,color:[.2,.4,.6]}));
  const view=createTerrainFallback(103,sample,32,{samplesPerUpdate:100});
  view.update(2048,2048);expect(view.pending).toBe(true);
  for(let i=0;i<30;i++){view.update(-4096,-4096);if(!view.pending)break;}
  expect(view.pending).toBe(false);expect(view.mesh.position.x).toBe(-4096);expect(view.mesh.position.z).toBe(-4096);
  view.update(4096,4096);expect(view.pending).toBe(true);view.dispose();expect(view.pending).toBe(false);
  sample.mockClear();view.update(0,0);expect(sample).not.toHaveBeenCalled();
});

it('checks the time budget between small vertex batches',()=>{
  const clock=vi.spyOn(performance,'now').mockReturnValue(0);
  const view=createTerrainFallback(103,(x,z)=>({height:x+z,color:[1,1,1]}),32,{budgetMs:2});
  clock.mockReturnValueOnce(0).mockReturnValue(3);view.update(4096,4096);expect(view.pending).toBe(true);
  clock.mockReturnValue(0);view.update(4096,4096);expect(view.pending).toBe(false);view.dispose();clock.mockRestore();
});

it('finishes a nearby moving target without starvation and stays pending until the latest anchor publishes',()=>{
  const view=createTerrainFallback(103,(x,z)=>({height:x-z,color:[1,1,1]}),32,{samplesPerUpdate:25});
  view.update(64,144);expect(view.pending).toBe(true);
  let sawFirst=false;
  for(let i=0;i<100;i++){view.update(128,144);if(view.mesh.position.x===64){sawFirst=true;expect(view.pending).toBe(true);}if(!view.pending)break;}
  expect(sawFirst).toBe(true);expect(view.pending).toBe(false);expect(view.mesh.position.x).toBe(128);view.dispose();
});
