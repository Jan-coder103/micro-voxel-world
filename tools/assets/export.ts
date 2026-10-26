import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { parseSource, SOURCE_LIMITS } from '../../src/assets/voxel-source.ts';
import { exportVoxelGlb } from '../../src/assets/export-glb.ts';
import { installNodeFileReader } from './node-file-reader.ts';

const restore = installNodeFileReader();
try {
  const paths = process.argv.slice(2);
  if (!paths.length) for (const name of await readdir('assets/source')) if (name.endsWith('.voxel.json')) paths.push(`assets/source/${name}`);
  if (!paths.length) throw new Error('No .voxel.json sources found.');
  const seen = new Set<string>();
  for (const path of paths) {
    try {
      if ((await stat(path)).size > SOURCE_LIMITS.bytes) throw new Error('file: maximum size is 8 MiB.');
      const source = parseSource(await readFile(path, 'utf8'));
      if (seen.has(source.id)) throw new Error('Duplicate source ID in export batch.');
      seen.add(source.id);
      const data = await exportVoxelGlb(source);
      await mkdir('assets/generated', { recursive: true });
      const destination = `assets/generated/${source.id}.glb`;
      await writeFile(destination, new Uint8Array(data));
      console.log(`${path} → ${destination} (${data.byteLength} bytes)`);
    } catch (error) { console.error(`${path}: ${error instanceof Error ? error.message : error}`); process.exitCode = 1; }
  }
} finally { restore(); }
