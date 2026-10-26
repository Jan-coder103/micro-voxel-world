import { validateSource } from './voxel-source.ts';

export const MESH_VERSION = 1;
export type MeshMode = 'greedy' | 'culled';
export interface VoxelQuad {
  axis: number;
  sign: -1 | 1;
  origin: [number, number, number];
  width: number;
  height: number;
  palette: number;
}
interface Plane { axis: number; sign: -1 | 1; depth: number; mask: Map<number, number> }
const key = (x: number, y: number, z: number) => x + y * 256 + z * 65536;

/** Sparse exposed-face extraction; no dense 256³ volume or rendering objects. */
export function meshVoxelSource(value: unknown, mode: MeshMode = 'greedy') {
  if (mode !== 'greedy' && mode !== 'culled') throw new Error('Unknown meshing mode.');
  const source = validateSource(value);
  const occupied = new Set(source.cells.map(({ position: [x, y, z] }) => key(x, y, z)));
  const palette = new Map(source.palette.map((entry, index) => [entry.id, index]));
  const planes = new Map<number, Plane>();
  let visibleFaces = 0;
  for (const cell of source.cells) {
    for (let axis = 0; axis < 3; axis++) {
      const u = (axis + 1) % 3;
      const v = (axis + 2) % 3;
      for (const sign of [-1, 1] as const) {
        const neighbor = [...cell.position];
        neighbor[axis] += sign;
        if (neighbor[axis] >= 0 && neighbor[axis] < source.size[axis] && occupied.has(key(neighbor[0], neighbor[1], neighbor[2]))) continue;
        const depth = cell.position[axis] + (sign === 1 ? 1 : 0);
        const planeKey = (axis * 2 + (sign === 1 ? 1 : 0)) * 257 + depth;
        let plane = planes.get(planeKey);
        if (!plane) { plane = { axis, sign, depth, mask: new Map() }; planes.set(planeKey, plane); }
        plane.mask.set(cell.position[u] + cell.position[v] * source.size[u], palette.get(cell.palette)!);
        visibleFaces++;
      }
    }
  }
  const quads: VoxelQuad[] = [];
  // Sorted planes and row-major starts give deterministic output regardless of cell order.
  for (const [, plane] of [...planes].sort(([a], [b]) => a - b)) {
    const { axis, sign, depth, mask } = plane;
    const u = (axis + 1) % 3;
    const v = (axis + 2) % 3;
    const stride = source.size[u];
    for (const start of [...mask.keys()].sort((a, b) => a - b)) {
      const entry = mask.get(start);
      if (entry === undefined) continue;
      const x = start % stride;
      const y = Math.floor(start / stride);
      let width = 1;
      let height = 1;
      if (mode === 'greedy') {
        while (x + width < stride && mask.get(start + width) === entry) width++;
        rows: while (y + height < source.size[v]) {
          for (let i = 0; i < width; i++) if (mask.get(start + height * stride + i) !== entry) break rows;
          height++;
        }
      }
      for (let row = 0; row < height; row++) {
        for (let column = 0; column < width; column++) mask.delete(start + row * stride + column);
      }
      const origin: [number, number, number] = [0, 0, 0];
      origin[axis] = depth;
      origin[u] = x;
      origin[v] = y;
      quads.push({ axis, sign, origin, width, height, palette: entry });
    }
  }
  return { source, quads, stats: {
    voxels: source.cells.length, naiveTriangles: source.cells.length * 12,
    visibleFaces, culledTriangles: visibleFaces * 2, quads: quads.length, triangles: quads.length * 2,
    vertices: quads.length * 4,
  } };
}
