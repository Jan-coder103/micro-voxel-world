import { expect,it } from 'vitest';
import { Group,Mesh,type WebGLRenderer } from 'three';
import { DrawProfile } from '../../src/performance/draw-profile';
it('classifies streamed children and records actual instanced/shadow counts with idle frames as zero',()=>{
  const p=new DrawProfile(),root=new Group(),chunk=new Group(),tree=new Mesh(),other=new Mesh();chunk.name='chunk:2,3';chunk.add(other);root.add(tree);p.register(root,'Trees');
  expect(p.category(tree)).toBe('Trees');expect(p.category(other)).toBe('Terrain chunks');expect(p.category(new Mesh())).toBe('Other');
  const before={calls:3,triangles:100,lines:0,points:0,frame:1} as WebGLRenderer['info']['render'];p.record('Shadow / Trees',4,before,{...before,calls:4,triangles:460});p.finish();p.finish();
  const [row]=p.report();expect(row.cpu.mean).toBe(2);expect(row.calls.mean).toBe(.5);expect(row.triangles.mean).toBe(180);expect(row.triangles.max).toBe(360);p.reset();expect(p.report()).toEqual([]);
});
