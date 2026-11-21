import {expect,it,vi} from 'vitest';
import {Matrix4,ShaderMaterial} from 'three';
import {CLOUD_CAPACITY,CLOUD_CELL,cloudCell,createFrontierClouds} from '../../src/rendering/frontier-clouds';
it('streams seeded cloud banks at fixed world coordinates, reuses settled cells and releases resources',()=>{
  const view=createFrontierClouds(103),matrix=new Matrix4();
  const positions=()=>Array.from({length:view.mesh.count},(_,i)=>{view.mesh.getMatrixAt(i,matrix);return [matrix.elements[12]+view.group.position.x,matrix.elements[13],matrix.elements[14]+view.group.position.z].map(n=>Math.round(n*100)/100).join(',');});
  view.update(0,0);const initial=positions(),version=view.mesh.instanceMatrix.version;
  expect(initial.length).toBeGreaterThan(100);expect(initial.length).toBeLessThanOrEqual(CLOUD_CAPACITY);
  view.update(300,500);expect(positions()).toEqual(initial);expect(view.mesh.instanceMatrix.version).toBe(version);
  view.update(CLOUD_CELL,0);const moved=positions();expect(moved).not.toEqual(initial);
  expect(moved.filter(p=>initial.includes(p)).length).toBeGreaterThan(initial.length*.6);
  view.update(0,0);expect(positions()).toEqual(initial);expect(cloudCell(103,0,0)).toEqual(cloudCell(103,0,0));
  expect(cloudCell(103,0,0)).not.toEqual(cloudCell(104,0,0));
  const material=view.mesh.material as ShaderMaterial;expect(material.transparent).toBe(true);expect(material.depthWrite).toBe(false);
  const release=vi.spyOn(view.mesh.geometry,'dispose');view.dispose();view.dispose();expect(release).toHaveBeenCalledOnce();
});
