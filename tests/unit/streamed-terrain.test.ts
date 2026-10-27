import { expect, it } from 'vitest';
import { BoxGeometry, MeshStandardMaterial } from 'three';
import { attachTerrain } from '../../src/rendering/streamed-terrain';
import { generateTerrain } from '../../src/streaming/terrain-data';
it('owns each terrain buffer and preserves shared marker/material resources on unload', () => {
  const spec={x:-1,z:2,lod:2 as const,seed:103}, data=generateTerrain(spec);
  const material=new MeshStandardMaterial(), markerMaterial=new MeshStandardMaterial(), markerGeometry=new BoxGeometry();
  let sharedReleased=0,terrainReleased=0;
  for (const resource of [material,markerMaterial,markerGeometry]) resource.addEventListener('dispose',()=>sharedReleased++);
  const chunk=attachTerrain(spec,data,material,markerGeometry,markerMaterial,true);
  const terrain=chunk.group.children[0] as import('three').Mesh;
  terrain.geometry.addEventListener('dispose',()=>terrainReleased++);
  expect(chunk.group.position.toArray()).toEqual([-32,0,64]); expect(chunk.marker.visible).toBe(false);
  expect(terrain.geometry.getAttribute('position').array).toBe(data.positions);
  chunk.dispose(); chunk.dispose(); expect(terrainReleased).toBe(1); expect(sharedReleased).toBe(0); expect(chunk.group.children).toHaveLength(0);
  material.dispose(); markerMaterial.dispose(); markerGeometry.dispose(); expect(sharedReleased).toBe(3);
});
