import { readFile, readdir, stat } from 'node:fs/promises';
import { parseSource, serializeSource, SOURCE_LIMITS } from '../../src/assets/voxel-source.ts';


const files = process.argv.slice(2);
if (!files.length) {
  for (const name of await readdir('assets/source')) if (name.endsWith('.voxel.json')) files.push(`assets/source/${name}`);
}
if (!files.length) { console.error('No .voxel.json sources found.'); process.exitCode = 1; }
for (const path of files) {
  try {
    if ((await stat(path)).size > SOURCE_LIMITS.bytes) throw new Error('file: maximum size is 8 MiB.');
    const asset = parseSource(await readFile(path, 'utf8'));
    const restored = parseSource(serializeSource(asset));
    if (JSON.stringify(restored) !== JSON.stringify(asset)) throw new Error('Source round-trip mismatch.');
    console.log(`${path}: valid v${asset.schemaVersion}, ${asset.cells.length} cells, ${asset.size.map((n) => (n * asset.voxelSize).toFixed(2)).join(' × ')} m`);
  } catch (error) { console.error(`${path}: ${error instanceof Error ? error.message : error}`); process.exitCode = 1; }
}
