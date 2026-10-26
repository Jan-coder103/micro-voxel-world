import { Box3, Box3Helper, Color, Group, Vector3 } from 'three';
import { assetMetres, type VoxelSource } from '../../src/assets/voxel-source';
import { createVoxelMesh } from '../../src/rendering/voxel-mesh';

export function createPreviewObject(asset: VoxelSource) {
  const object = createVoxelMesh(asset);
  const [width, height, depth] = assetMetres(object.source);
  const bounds = new Box3(new Vector3(-width / 2, 0, -depth / 2), new Vector3(width / 2, height, depth / 2));
  const helper = new Box3Helper(bounds, new Color('#e7c885'));
  const group = new Group();
  group.add(object.mesh, helper);
  let disposed = false;
  return { group, mesh: object.mesh, stats: object.stats, helper, bounds, dispose() {
    if (disposed) return;
    disposed = true;
    object.dispose();
    helper.dispose();
    group.clear();
    group.removeFromParent();
  } };
}
