/** Static Phase 7 fixture in metres. Terrain is a surface, never a dense voxel volume. */
export const TERRAIN = { extent: 32, cell: 0.5, bottom: -1 } as const;
export function terrainHeight(x: number, z: number): number {
  x = Math.floor(x / TERRAIN.cell) * TERRAIN.cell + TERRAIN.cell / 2;
  z = Math.floor(z / TERRAIN.cell) * TERRAIN.cell + TERRAIN.cell / 2;
  const edge = Math.max(0, Math.max(Math.abs(x), Math.abs(z)) - 20);
  return Math.round(Math.max(0, edge * 0.25 + Math.sin(x * 0.21) * Math.cos(z * 0.17) * edge * 0.18) * 10) / 10;
}
export interface Placement { x: number; z: number; yaw: number }
export interface CollisionProxy { id: string; min: [number, number, number]; max: [number, number, number] }
export function proxyFor(id: string, size: readonly number[], placement: Placement): CollisionProxy {
  const rotated = Math.abs(Math.sin(placement.yaw)) > 0.5;
  const width = size[rotated ? 2 : 0], depth = size[rotated ? 0 : 2];
  const y = terrainHeight(placement.x, placement.z);
  return { id, min: [placement.x - width / 2, y, placement.z - depth / 2], max: [placement.x + width / 2, y + size[1], placement.z + depth / 2] };
}
export function intersectsBox(a: CollisionProxy, b: CollisionProxy): boolean {
  return a.min.every((value, i) => value < b.max[i] && a.max[i] > b.min[i]);
}
export const buildingPlacements: Placement[] = [{ x: -11, z: -10, yaw: 0 }, { x: -11, z: 9, yaw: 0 }];
export const treePlacements: Placement[] = Array.from({ length: 36 }, (_, i) => ({
  x: i < 20 ? (i % 10) * 6 - 27 : (i < 28 ? -27 : 27),
  z: i < 20 ? (i < 10 ? -26 : 26) : ((i - 20) % 8) * 6 - 21,
  yaw: (i % 4) * Math.PI / 2,
}));
