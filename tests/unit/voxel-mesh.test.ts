import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { createBlock } from '../../src/assets/create-block';
import { meshVoxelSource } from '../../src/assets/voxel-mesh';
import { createVoxelMesh } from '../../src/rendering/voxel-mesh';
import { createFixtures } from '../../tools/voxel-editor/catalog';
import type { VoxelSource } from '../../src/assets/voxel-source';

function exposedFaces(source: VoxelSource) {
  const occupied = new Set(source.cells.map((cell) => cell.position.join(',')));
  const result = new Set<string>();
  for (const cell of source.cells) {
    for (let axis = 0; axis < 3; axis++) {
      for (const sign of [-1, 1]) {
        const neighbor = [...cell.position];
        neighbor[axis] += sign;
        if (occupied.has(neighbor.join(','))) continue;
        const boundary = [...cell.position];
        if (sign === 1) boundary[axis]++;
        result.add(`${axis}/${sign}/${boundary.join(',')}/${cell.palette}`);
      }
    }
  }
  return result;
}
function checkCoverage(source: VoxelSource) {
  const result = meshVoxelSource(source);
  const expanded = new Set<string>();
  for (const quad of result.quads) {
    for (let x = 0; x < quad.width; x++) {
      for (let y = 0; y < quad.height; y++) {
        const position = [...quad.origin];
        position[(quad.axis + 1) % 3] += x;
        position[(quad.axis + 2) % 3] += y;
        const key = `${quad.axis}/${quad.sign}/${position.join(',')}/${source.palette[quad.palette].id}`;
        expect(expanded.has(key), 'overlapping output faces').toBe(false);
        expanded.add(key);
      }
    }
  }
  expect(expanded).toEqual(exposedFaces(source));
  expect(result.stats.visibleFaces).toBe(expanded.size);
  return result;
}

describe('sparse exposed-face and greedy meshing', () => {
  it('reduces a solid metre cube from 12000 to 12 triangles', () => {
    const source = createFixtures()[1];
    const result = checkCoverage(source);
    expect(result.stats).toEqual({ voxels: 1000, naiveTriangles: 12000, visibleFaces: 600, culledTriangles: 1200, quads: 6, triangles: 12, vertices: 24 });
    expect(meshVoxelSource(source, 'culled').stats.triangles).toBe(1200);
  });
  it('preserves every exposed colored face of the asymmetric marker', () => {
    const result = checkCoverage(createFixtures()[0]);
    expect(result.stats.triangles).toBe(46);
    expect(result.stats.culledTriangles).toBe(580);
  });
  it('removes shared opaque faces but never merges different palette entries', () => {
    const source = createBlock('pair', 'Pair', [2, 1, 1], '#ff0000');
    expect(checkCoverage(source).stats.quads).toBe(6);
    source.palette.push({ id: 'other', color: '#00ff00', material: 'matte' });
    source.cells[1].palette = 'other';
    expect(checkCoverage(source).stats).toMatchObject({ visibleFaces: 10, quads: 10, triangles: 20 });
    source.palette[1].color = '#ff0000'; // Distinct authoring entries are conservatively kept separate.
    expect(checkCoverage(source).stats.quads).toBe(10);
  });
  it('covers every nonempty 2³ occupancy pattern with two palette entries', () => {
    const source = createBlock('pattern', 'Pattern', [2, 2, 2], '#abcdef');
    source.palette.push({ id: 'other', color: '#123456', material: 'matte' });
    const cells = source.cells;
    for (let mask = 1; mask < 256; mask++) {
      source.cells = cells.filter((_, i) => mask & (1 << i)).map((cell, i) => ({ ...cell, palette: i % 2 ? 'body' : 'other' }));
      checkCoverage(source);
    }
  });
  it('preserves cavity faces, disconnected voxels, thin features and source data', () => {
    const source = createBlock('shell', 'Shell', [3, 3, 3], '#abcdef');
    source.cells = source.cells.filter(({ position: [x, y, z] }) => x !== 1 || y !== 1 || z !== 1);
    const before = structuredClone(source);
    expect(checkCoverage(source).stats.visibleFaces).toBe(60);
    expect(source).toEqual(before);
    source.size = [256, 256, 256];
    source.cells = [{ position: [0, 0, 0], palette: 'body' }, { position: [255, 255, 255], palette: 'body' }];
    expect(checkCoverage(source).stats.quads).toBe(12);
    source.size = [1, 1, 256];
    source.cells = Array.from({ length: 256 }, (_, z) => ({ position: [0, 0, z], palette: 'body' }));
    expect(checkCoverage(source).stats.quads).toBe(6);
  });
  it('is deterministic under cell reordering and rejects invalid input before meshing', () => {
    const source = createFixtures()[0];
    const first = meshVoxelSource(source);
    source.cells.reverse();
    const second = meshVoxelSource(source);
    expect(second.quads).toEqual(first.quads);
    expect(second.stats).toEqual(first.stats);
    source.cells.push(source.cells[0]);
    expect(() => meshVoxelSource(source)).toThrow('duplicate occupied coordinate');
    expect(() => meshVoxelSource({})).toThrow('required field');
  });
});

describe('indexed render geometry', () => {
  it.each(['greedy', 'culled'] as const)('has outward winding, flat unit normals, exact surface area and valid indices (%s)', (mode) => {
    const object = createVoxelMesh(createFixtures()[0], mode);
    try {
      const geometry = object.mesh.geometry;
      const position = geometry.getAttribute('position');
      const normal = geometry.getAttribute('normal');
      const indices = geometry.index!;
      let area = 0;
      for (let i = 0; i < indices.count; i += 3) {
        const ids = [indices.getX(i), indices.getX(i + 1), indices.getX(i + 2)];
        expect(ids.every((id) => id >= 0 && id < position.count)).toBe(true);
        const [a, b, c] = ids.map((id) => new Vector3().fromBufferAttribute(position, id));
        const normals = ids.map((id) => new Vector3().fromBufferAttribute(normal, id));
        const cross = b.sub(a).cross(c.sub(a));
        expect(cross.dot(normals[0])).toBeGreaterThan(0);
        expect(normals[0].length()).toBe(1);
        expect(normals[1]).toEqual(normals[0]);
        expect(normals[2]).toEqual(normals[0]);
        area += cross.length() / 2;
      }
      expect(area).toBeCloseTo(object.stats.visibleFaces * 0.01, 6);
      expect(geometry.boundingBox!.min.x).toBeCloseTo(-0.4);
      expect(geometry.boundingBox!.max.y).toBeCloseTo(0.6);
      expect(object.mesh.material).toMatchObject({ vertexColors: true, roughness: 0.9, metalness: 0, transparent: false });
    } finally { object.dispose(); }
  });
  it('uses 32-bit indices rather than wrapping when sparse geometry exceeds 65536 vertices', () => {
    const source = createBlock('checker', 'Checker', [1, 1, 1], '#abcdef');
    source.size = [32, 32, 8];
    source.cells = [];
    for (let x = 0; x < 32; x++) for (let y = 0; y < 32; y++) for (let z = 0; z < 8; z++) {
      if ((x + y + z) % 2 === 0) source.cells.push({ position: [x, y, z], palette: 'body' });
    }
    const object = createVoxelMesh(source);
    try {
      expect(object.stats.vertices).toBe(98304);
      expect(object.mesh.geometry.index!.array).toBeInstanceOf(Uint32Array);
      expect(Array.from(object.mesh.geometry.index!.array).reduce((max, n) => Math.max(max, n), 0)).toBe(object.stats.vertices - 1);
    } finally { object.dispose(); }
  });
});

it('runs the reproducible reference benchmark without imposing a hardware timing threshold', async () => {
  const { spawnSync } = await import('node:child_process');
  const result = spawnSync(process.execPath, ['tools/assets/benchmark.ts'], { encoding: 'utf8' });
  expect(result.status, result.stderr).toBe(0);
  const report = JSON.parse(result.stdout);
  expect(report.meshVersion).toBe(1);
  expect(report.samples).toBe(9);
  expect(report.results).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: 'fixture-cube', naiveTriangles: 12000, triangles: 12, triangleReductionPercent: 99.9 }),
    expect.objectContaining({ id: 'fixture-marker', naiveTriangles: 1896, triangles: 46 }),
  ]));
  for (const entry of report.results) {
    expect(Number.isFinite(entry.medianMs)).toBe(true);
    expect(entry.maxMs).toBeGreaterThanOrEqual(entry.medianMs);
  }
});
