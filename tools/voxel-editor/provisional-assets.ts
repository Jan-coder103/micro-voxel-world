import { WORLD_SCALE } from '../../src/core/scale';

/** Phase 2 adapter only. Not a serialized or stable asset format. */
export interface PreviewAsset {
  id: string;
  name: string;
  size: [number, number, number];
  cells: { position: [number, number, number]; color: string }[];
}

export const MAX_ASSETS = 24;
export const MAX_AXIS = 16;

export function createBlock(id: string, name: string, size: [number, number, number], color: string): PreviewAsset {
  if (!name.trim() || name.trim().length > 48) throw new Error('Use a name between 1 and 48 characters.');
  if (size.some((axis) => !Number.isInteger(axis) || axis < 1 || axis > MAX_AXIS)) {
    throw new Error(`Each dimension must be a whole number from 1 to ${MAX_AXIS}.`);
  }
  if (!/^#[\da-f]{6}$/i.test(color)) throw new Error('Choose a six-digit hex color.');
  const cells: PreviewAsset['cells'] = [];
  for (let x = 0; x < size[0]; x++) {
    for (let y = 0; y < size[1]; y++) {
      for (let z = 0; z < size[2]; z++) cells.push({ position: [x, y, z], color });
    }
  }
  return { id, name: name.trim(), size: [...size], cells };
}

export function assetMetres(asset: PreviewAsset): [number, number, number] {
  return asset.size.map((axis) => axis * WORLD_SCALE.assetVoxelMetres) as [number, number, number];
}

export function createFixtures(): PreviewAsset[] {
  const marker = createBlock('fixture-marker', 'Direction marker', [8, 6, 10], '#9daeb2');
  // Asymmetric stepped fixture: gold front (-Z), coral right (+X), pale tower.
  marker.cells = marker.cells.filter(({ position: [x, y, z] }) =>
    y === 0 || (x < 3 && z > 5) || (y < 3 && x > 4 && z < 3));
  marker.cells.forEach((cell) => {
    if (cell.position[2] < 3) cell.color = '#d9b56f';
    else if (cell.position[0] > 4) cell.color = '#d17d68';
  });
  return [marker, createBlock('fixture-cube', 'Metre cube', [10, 10, 10], '#77a898')];
}
