import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { parseSource, serializeSource } from '../../src/assets/voxel-source';
import { meshVoxelSource } from '../../src/assets/voxel-mesh';

const kit = [
  ['ref-farmhouse', 'building', [70, 50, 60]],
  ['ref-barn', 'building', [80, 58, 70]],
  ['ref-tractor', 'prop', [24, 29, 42]],
  ['ref-windmill', 'building', [60, 100, 40]],
  ['ref-wooden-bridge', 'prop', [40, 22, 100]],
  ['ref-water-tower', 'prop', [60, 110, 60]],
  ['ref-shipping-container', 'prop', [25, 26, 61]],
  ['ref-bus-shelter', 'prop', [50, 28, 20]],
  ['ref-fuel-tank', 'prop', [48, 40, 70]],
  ['ref-watchtower', 'building', [46, 90, 46]],
  ['ref-pine-tree', 'vegetation', [40, 80, 40]],
  ['ref-derelict-car', 'prop', [20, 15, 44]],
  ['ref-streetlight', 'prop', [10, 65, 24]],
  ['ref-road-barrier', 'prop', [30, 10, 8]],
  ['ref-small-warehouse', 'building', [100, 50, 80]],
  ['ref-zombie', 'character', [9, 18, 7]],
  ['ref-attack-aircraft', 'aircraft', [174, 48, 164]],
  ['ref-field-tree', 'vegetation', [40, 60, 40]],
  ['ref-utility-building', 'building', [80, 40, 60]],
  ['ref-road-landing-pad', 'prop', [120, 1, 160]],
] as const;

describe('original reference kit', () => {
  it.each(kit)('%s preserves scale, editable data and a connected meshable shape', async (id, category, size) => {
    const source = parseSource(await readFile(`assets/source/${id}.voxel.json`, 'utf8'));
    expect(source.id).toBe(id);
    expect(source.category).toBe(category);
    expect(source.size).toEqual(size);
    expect(source.tags).toContain('reference-kit');
    expect(parseSource(serializeSource(source))).toEqual(source);
    const occupied = new Set(source.cells.map((cell) => cell.position.join(',')));
    const pending = [source.cells[0].position];
    const visited = new Set([pending[0].join(',')]);
    while (pending.length) {
      const position = pending.pop()!;
      for (let axis = 0; axis < 3; axis++) for (const sign of [-1, 1]) {
        const neighbor = [...position];
        neighbor[axis] += sign;
        const key = neighbor.join(',');
        if (occupied.has(key) && !visited.has(key)) {
          visited.add(key);
          pending.push(neighbor as [number, number, number]);
        }
      }
    }
    expect(visited.size, 'all occupied cells connect by shared faces').toBe(source.cells.length);
    expect(Math.min(...source.cells.map((cell) => cell.position[1]))).toBe(0);
    const stats = meshVoxelSource(source).stats;
    expect(stats.triangles).toBeGreaterThan(0);
    expect(stats.triangles).toBeLessThan(stats.naiveTriangles);
  });
});
