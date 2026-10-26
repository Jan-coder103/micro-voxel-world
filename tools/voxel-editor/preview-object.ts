import { Box3, Box3Helper, BoxGeometry, Color, Group, InstancedMesh, Matrix4, MeshStandardMaterial, Vector3 } from 'three';
import { assetMetres, type VoxelSource } from '../../src/assets/voxel-source';

export function createPreviewObject(asset: VoxelSource) {
  const voxel = asset.voxelSize;
  const [width, height, depth] = assetMetres(asset);
  const geometry = new BoxGeometry(voxel, voxel, voxel);
  const material = new MeshStandardMaterial({ roughness: 0.9 });
  const mesh = new InstancedMesh(geometry, material, asset.cells.length);
  const transform = new Matrix4();
  const color = new Color();
  const palette = new Map(asset.palette.map((entry) => [entry.id, entry.color]));
  asset.cells.forEach((cell, index) => {
    const [x, y, z] = cell.position;
    transform.makeTranslation((x + 0.5) * voxel - width / 2, (y + 0.5) * voxel, (z + 0.5) * voxel - depth / 2);
    mesh.setMatrixAt(index, transform);
    mesh.setColorAt(index, color.set(palette.get(cell.palette)!));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingBox();
  mesh.computeBoundingSphere();
  const bounds = new Box3(new Vector3(-width / 2, 0, -depth / 2), new Vector3(width / 2, height, depth / 2));
  const helper = new Box3Helper(bounds, new Color('#e7c885'));
  const group = new Group();
  group.add(mesh, helper);
  let disposed = false;
  return { group, mesh, helper, bounds, dispose() {
    if (disposed) return;
    disposed = true;
    mesh.dispose();
    geometry.dispose();
    material.dispose();
    helper.dispose();
    group.clear();
    group.removeFromParent();
  } };
}
