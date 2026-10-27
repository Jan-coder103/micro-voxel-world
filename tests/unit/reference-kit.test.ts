import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { parseSource, serializeSource } from '../../src/assets/voxel-source';
import { meshVoxelSource } from '../../src/assets/voxel-mesh';

const kit = [
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
