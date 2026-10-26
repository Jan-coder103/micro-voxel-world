import { readFile, readdir } from 'node:fs/promises';
import { cpus, platform, arch } from 'node:os';
import { meshVoxelSource, MESH_VERSION } from '../../src/assets/voxel-mesh.ts';
import { parseSource } from '../../src/assets/voxel-source.ts';

const results = [];
for (const name of (await readdir('assets/source')).filter((name) => name.endsWith('.voxel.json')).sort()) {
  const source = parseSource(await readFile(`assets/source/${name}`, 'utf8'));
  meshVoxelSource(source); // Warm-up; timings include validation and meshing, exclude file I/O/GPU/export.
  const times: number[] = [];
  let result = meshVoxelSource(source);
  for (let i = 0; i < 9; i++) {
    const start = performance.now();
    result = meshVoxelSource(source);
    times.push(performance.now() - start);
  }
  times.sort((a, b) => a - b);
  results.push({ id: source.id, ...result.stats, triangleReductionPercent: Number((100 * (1 - result.stats.triangles / result.stats.naiveTriangles)).toFixed(2)),
    medianMs: Number(times[4].toFixed(3)), maxMs: Number(times[8].toFixed(3)) });
}
console.log(JSON.stringify({ meshVersion: MESH_VERSION, node: process.version, platform: `${platform()} ${arch()}`, cpu: cpus()[0]?.model ?? 'unavailable', samples: 9, results }, null, 2));
