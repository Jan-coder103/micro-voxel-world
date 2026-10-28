import { expect, it, vi } from 'vitest';
import { Box3, InstancedMesh, Mesh, Vector3 } from 'three';
import { createBattlefieldView, vegetationLod } from '../../src/rendering/battlefield-view';
import { battlefieldColor, woodland } from '../../src/rendering/battlefield-surface';
import { createHordeView } from '../../src/rendering/horde-view';
import { createVoxelMesh } from '../../src/rendering/voxel-mesh';
import { Sortie } from '../../src/game/sortie';
import { parseSource, serializeSource } from '../../src/assets/voxel-source';
import treeSource from '../../assets/source/ref-field-tree.voxel.json';
import depotSource from '../../assets/source/clearpass-depot.voxel.json';

it('reproduces a bounded woodland outside encounters and the home approach', () => {
  const trees=woodland(12012);
  expect(trees).toEqual(woodland(12012));expect(trees).not.toEqual(woodland(12013));
  expect(trees.length).toBeGreaterThan(1000);expect(trees.length).toBeLessThan(5000);
  for(const t of trees){expect(t.x<-136||t.x>=176||t.z<-136||t.z>=176).toBe(true);expect(Math.abs(t.x-16)>=14||t.z<=160||t.z>=280).toBe(true);}
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

it('keeps detailed depots exactly inside legacy collision bounds and retains casualties across visual LODs', () => {
  const source=parseSource(JSON.stringify(depotSource));expect(source.size).toEqual([40,30,120]);expect(parseSource(serializeSource(source))).toEqual(source);
  const sortie=new Sortie(),view=createHordeView(sortie.hordes,true);view.update();
  const walls=view.group.children[3] as InstancedMesh;walls.geometry.computeBoundingBox();
  expect(walls.geometry.boundingBox).toEqual(new Box3(new Vector3(-2,0,-6),new Vector3(2,3,6)));
  const health=[...sortie.store.groups.values()].map(g=>[...g.health]);
  expect(view.counts.near+view.counts.medium+view.counts.far).toBe(sortie.hordes.counts.residentAlive);
  view.update(false);expect([...sortie.store.groups.values()].map(g=>g.health)).toEqual(health);
  const released=vi.spyOn(walls.geometry,'dispose');view.dispose();view.dispose();expect(released).toHaveBeenCalledOnce();
});
