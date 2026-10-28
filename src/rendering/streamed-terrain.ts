import { BufferAttribute, BufferGeometry, Group, Mesh, MeshStandardMaterial, type Material } from 'three';
import { CHUNK_SIZE, type ChunkSpec, type TerrainData } from '../streaming/terrain-data';
/** Chunk geometry is owned; terrain/marker materials and marker geometry belong to the scene. */
export function attachTerrain(spec:ChunkSpec,data:TerrainData,material:Material,markerGeometry:BufferGeometry,markerMaterial:MeshStandardMaterial,cleared:boolean) {
  const group=new Group(); group.name=`chunk:${spec.x},${spec.z}`; group.position.set(spec.x*CHUNK_SIZE,0,spec.z*CHUNK_SIZE);
  const geometry=new BufferGeometry();
  geometry.setAttribute('position',new BufferAttribute(data.positions,3));
  geometry.setAttribute('normal',new BufferAttribute(data.normals,3));
  geometry.setAttribute('color',new BufferAttribute(data.colors,3)); geometry.computeBoundingSphere();
  const mesh=new Mesh(geometry,material); mesh.receiveShadow=true; group.add(mesh);
  const marker=new Mesh(markerGeometry,markerMaterial); marker.visible=!cleared; group.add(marker);
  let disposed=false;
  return {group,marker,dispose() { if (disposed) return; disposed=true; geometry.dispose(); group.removeFromParent(); group.clear(); }};
}
