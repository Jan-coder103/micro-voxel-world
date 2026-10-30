import { expect, it, vi } from 'vitest';
import { InstancedMesh, Mesh, MeshStandardMaterial, Raycaster, Vector3 } from 'three';
import { createBattlefieldView, vegetationLod } from '../../src/rendering/battlefield-view';
import { battlefieldColor, createBattlefieldGround, woodland } from '../../src/rendering/battlefield-surface';
import { heightAt } from '../../src/streaming/terrain-data';
import { createVoxelMesh } from '../../src/rendering/voxel-mesh';
import { parseSource, serializeSource } from '../../src/assets/voxel-source';
import treeSource from '../../assets/source/ref-field-tree.voxel.json';

it('reproduces a bounded woodland outside encounters and the home approach', () => {
  const trees=woodland(12012);
  expect(trees).toEqual(woodland(12012));expect(trees).not.toEqual(woodland(12013));
  expect(trees.length).toBeGreaterThan(1000);expect(trees.length).toBeLessThan(5000);
  for(const t of trees){expect(t.x<=-134||t.x>=166||t.z<=-134||t.z>=166).toBe(true);expect(Math.abs(t.x-16)>=22||t.z<=160||t.z>=280).toBe(true);}
  expect(battlefieldColor(12012,17,16)).toEqual(battlefieldColor(12012,17,16));
  expect(battlefieldColor(12012,0,0)).not.toEqual(battlefieldColor(12012,11,12));
  for(const c of battlefieldColor(12012,-32,-32))expect(c).toBeGreaterThanOrEqual(0);
});

it('derives much cheaper foliage without changing the authored source or physical height', () => {
  const source=parseSource(JSON.stringify(treeSource)),before=serializeSource(source),lod=vegetationLod(source);
  const full=createVoxelMesh(source),coarse=createVoxelMesh(lod);coarse.mesh.geometry.scale(4,4,4);
  expect(coarse.stats.triangles).toBeLessThan(full.stats.triangles/3);
  expect(coarse.mesh.geometry.boundingBox!.max.y).toBeLessThanOrEqual(6);
  expect(coarse.mesh.geometry.boundingBox!.max.y).toBeGreaterThan(5.5);
  expect(serializeSource(source)).toBe(before);full.dispose();coarse.dispose();
});

it('owns only seven scenic geometries, follows the camera without moving woods, and releases once', () => {
  const view=createBattlefieldView(12012),geometries=new Set<import('three').BufferGeometry>(),materials=new Set<import('three').Material>();
  view.group.traverse(object=>{if(object instanceof Mesh){geometries.add(object.geometry);for(const m of Array.isArray(object.material)?object.material:[object.material])materials.add(m);}});
  expect(geometries.size).toBe(7);const spies=[...geometries,...materials].map(r=>vi.spyOn(r,'dispose')),sun=vi.spyOn(view.sun,'dispose');
  const forest=view.group.getObjectByName('autumn-woodland') as InstancedMesh,matrix=forest.instanceMatrix.array.slice();
  view.update(new Vector3(130,45,-80));expect(view.group.getObjectByName('sunlit-sky')!.position.toArray()).toEqual([130,45,-80]);expect(forest.instanceMatrix.array).toEqual(matrix);
  expect(view.sun.target.position.toArray()).toEqual([128,0,-80]);
  const highCount=view.treeCount;view.setQuality(true);expect(view.quality).toBe('low');expect(view.treeCount).toBeLessThan(highCount);expect(view.treeCount).toBeGreaterThan(1000);view.setQuality(false);expect(view.treeCount).toBe(highCount);
  view.dispose();view.dispose();view.update(new Vector3());for(const spy of spies)expect(spy).toHaveBeenCalledOnce();expect(sun).toHaveBeenCalledOnce();expect(view.group.children).toHaveLength(0);
});

it('grounds the whole city beyond detail streaming and overlaps the mountain foothills across anchor changes',()=>{
  const material=new MeshStandardMaterial(),shared=vi.spyOn(material,'dispose');
  for(const seed of [0,12012,4294967295]){
    const coverage=createBattlefieldGround(seed,material),released=vi.spyOn(coverage.mesh.geometry,'dispose');
    expect(coverage.mesh.material).toBe(material);expect(coverage.mesh.geometry.index!.count/3).toBeLessThan(30000);
    for(const [x,z] of [[16,192],[-.1,63.9],[63.9,-.1],[255.9,-128.1]]){
      coverage.update(x,z);coverage.mesh.geometry.computeBoundingBox();const bounds=coverage.mesh.geometry.boundingBox!.clone().translate(coverage.mesh.position);
      expect(Math.min(x-bounds.min.x,bounds.max.x-x,z-bounds.min.z,bounds.max.z-z)).toBeGreaterThan(1400);
      const p=coverage.mesh.geometry.getAttribute('position');let groundedDepots=0;
      for(let i=0;i<p.count;i++){const wx=p.getX(i)+coverage.mesh.position.x,wz=p.getZ(i)+coverage.mesh.position.z;if(wx>=-112&&wx<=144&&wz>=-112&&wz<=144&&(wx-16)%32===0&&(wz-16)%32===0){expect(p.getY(i)).toBeCloseTo(heightAt(seed,wx,wz)-.12,4);groundedDepots++;}}
      expect(groundedDepots).toBe(81);
    }
    coverage.dispose();coverage.dispose();expect(released).toHaveBeenCalledOnce();
  }
  expect(shared).not.toHaveBeenCalled();material.dispose();
});

it('seals mountain foothills below ground in every viewing direction, including translated views',()=>{
  const ray=new Raycaster(),direction=new Vector3();
  for(const seed of [0,12012,12013]){
    const view=createBattlefieldView(seed),ridge=view.group.getObjectByName('distant-ridgelines') as Mesh;
    for(const position of [new Vector3(0,40,0),new Vector3(639.9,250,-1024.1)]){
      view.update(position);view.group.updateMatrixWorld(true);
      for(let degrees=0;degrees<360;degrees+=15){const angle=degrees*Math.PI/180;ray.set(new Vector3(position.x,-20,position.z),direction.set(Math.cos(angle),0,Math.sin(angle)));const hits=ray.intersectObject(ridge);expect(hits.length,`seed ${seed}, angle ${degrees}`).toBeGreaterThan(0);expect(hits[0].distance).toBeLessThan(1100);}
    }
    view.dispose();
  }
});
