import { validateSource, type VoxelSource } from './voxel-source';

/** Block creator budget is deliberately smaller than the sparse source grid limit. */
export const MAX_BLOCK_AXIS = 16;
export function createBlock(id: string, name: string, size: [number, number, number], color: string): VoxelSource {
  if (!name.trim() || name.trim().length > 48) throw new Error('Use a name between 1 and 48 characters.');
  if (size.length !== 3 || size.some((axis) => !Number.isInteger(axis) || axis < 1 || axis > MAX_BLOCK_AXIS)) {
    throw new Error(`Each dimension must be a whole number from 1 to ${MAX_BLOCK_AXIS}.`);
  }
  if (!/^#[\da-f]{6}$/i.test(color)) throw new Error('Choose a six-digit hex color.');
  const cells: VoxelSource['cells'] = [];
  for (let x = 0; x < size[0]; x++) {
    for (let y = 0; y < size[1]; y++) {
      for (let z = 0; z < size[2]; z++) cells.push({ position: [x, y, z], palette: 'body' });
    }
  }
  return validateSource({ schemaVersion: 1, id, name: name.trim(), category: 'prop', units: 'metres', voxelSize: 0.1,
    size: [...size], pivot: 'base-center', orientation: { up: '+Y', front: '-Z' },
    palette: [{ id: 'body', color, material: 'matte' }], cells, tags: [], provenance: 'Original block created in the MVW voxel workshop.' });
}
