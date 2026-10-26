import { describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { assetMetres, parseSource, serializeSource, SOURCE_LIMITS, validateSource } from '../../src/assets/voxel-source';
import { createBlock } from '../../src/assets/create-block';
import { createFixtures } from '../../tools/voxel-editor/catalog';

const sample = () => createFixtures()[0];
describe('voxel source v1', () => {
  it('round-trips reference colors, material references, occupancy, placement and metadata without mutation', () => {
    for (const asset of createFixtures()) {
      const before = structuredClone(asset);
      const source = serializeSource(asset);
      expect(parseSource(source)).toEqual(asset);
      expect(serializeSource(parseSource(source))).toBe(source);
      expect(asset).toEqual(before);
    }
  });
  it('owns imported values and keeps sources independent of consumers', () => {
    const original = sample();
    const copy = validateSource(original);
    copy.cells[0].position[0] = 7;
    copy.palette[0].color = '#ffffff';
    expect(copy.cells[0]).not.toEqual(original.cells[0]);
    expect(copy.palette[0]).not.toEqual(original.palette[0]);
  });
  it.each([
    [null, 'expected an object'], [[], 'expected an object'], [{}, 'required field'],
    [{ ...sample(), schemaVersion: 2 }, 'schemaVersion'],
    [{ ...sample(), operations: [] }, 'unknown field'],
    [{ ...sample(), id: '../asset' }, 'asset.id'],
    [{ ...sample(), name: ' ' }, 'asset.name'],
    [{ ...sample(), category: 'unknown' }, 'asset.category'],
    [{ ...sample(), units: 'cm' }, 'asset.units'],
    [{ ...sample(), voxelSize: 1 }, 'asset.voxelSize'],
    [{ ...sample(), pivot: [0, 0, 0] }, 'asset.pivot'],
    [{ ...sample(), orientation: { up: '+Y', front: '+Z' } }, 'orientation.front'],
    [{ ...sample(), orientation: { up: '+Y', front: '-Z', socket: [] } }, 'unknown field'],
    [{ ...sample(), size: [0, 1, 1] }, 'asset.size'],
    [{ ...sample(), size: [257, 1, 1] }, 'asset.size'],
    [{ ...sample(), size: [1.2, 1, 1] }, 'safe integers'],
    [{ ...sample(), size: [Infinity, 1, 1] }, 'safe integers'],
    [{ ...sample(), size: [1, 1] }, 'exactly three'],
    [{ ...sample(), palette: [] }, 'asset.palette'],
    [{ ...sample(), palette: [{ id: 'a', color: 'red', material: 'matte' }] }, 'color'],
    [{ ...sample(), palette: [{ id: 'a', color: '#ffffff', material: 'glass' }] }, 'material'],
    [{ ...sample(), cells: [] }, 'asset.cells'],
    [{ ...sample(), cells: [{ position: [-1, 0, 0], palette: 'body' }] }, 'outside'],
    [{ ...sample(), cells: [{ position: [8, 0, 0], palette: 'body' }] }, 'outside'],
    [{ ...sample(), cells: [{ position: [0.5, 0, 0], palette: 'body' }] }, 'safe integers'],
    [{ ...sample(), cells: [{ position: [0, 0, 0], palette: 'missing' }] }, 'unknown palette'],
    [{ ...sample(), tags: ['a', 'a'] }, 'duplicate tag'],
    [{ ...sample(), tags: ['not a tag'] }, 'asset.tags'],
    [{ ...sample(), provenance: '' }, 'asset.provenance'],
  ])('rejects malformed source %# with an actionable field path', (source, message) => {
    expect(() => validateSource(source)).toThrow(message);
  });
  it('rejects duplicate positions and palette IDs', () => {
    const asset = sample();
    asset.cells.push(structuredClone(asset.cells[0]));
    expect(() => validateSource(asset)).toThrow('duplicate occupied coordinate');
    asset.cells.pop();
    asset.palette.push(structuredClone(asset.palette[0]));
    expect(() => validateSource(asset)).toThrow('duplicate palette ID');
  });
  it('bounds collection sizes and checks exports rather than trusting TypeScript', () => {
    const asset = sample();
    asset.cells = Array.from({ length: SOURCE_LIMITS.cells + 1 }, () => asset.cells[0]);
    expect(() => serializeSource(asset)).toThrow('asset.cells');
    asset.cells.length = 1;
    asset.palette = Array.from({ length: SOURCE_LIMITS.palette + 1 }, () => asset.palette[0]);
    expect(() => validateSource(asset)).toThrow('asset.palette');
    asset.palette.length = 1;
    asset.cells[0].palette = asset.palette[0].id;
    asset.tags = Array.from({ length: 17 }, () => 'tag');
    expect(() => validateSource(asset)).toThrow('asset.tags');
  });
  it('accepts the sparse grid and occupied-cell limits and can export them within the byte budget', () => {
    const asset = sample();
    asset.size = [256, 256, 256];
    const id = 'p'.repeat(64);
    asset.palette = [{ id, color: '#fF00aA', material: 'matte' }];
    asset.cells = Array.from({ length: SOURCE_LIMITS.cells }, (_, i) => ({ position: [i % 256, Math.floor(i / 256), 255], palette: id }));
    expect(parseSource(serializeSource(asset))).toEqual(asset);
    expect(assetMetres(asset)).toEqual([25.6, 25.6, 25.6]);
  });
  it('reports invalid JSON and rejects oversized UTF-8 input before parsing', () => {
    expect(() => parseSource('{')).toThrow('invalid JSON');
    expect(() => parseSource('é'.repeat(SOURCE_LIMITS.bytes / 2 + 1))).toThrow('maximum size');
  });
  it('authors a correctly scaled sparse 1.8 m reference using the documented conventions', () => {
    const asset = createBlock('person-scale', 'Person scale', [1, 1, 1], '#ffffff');
    asset.category = 'character';
    asset.size = [6, 18, 4];
    asset.cells = [{ position: [3, 0, 2], palette: 'body' }, { position: [3, 17, 2], palette: 'body' }];
    const restored = parseSource(serializeSource(asset));
    expect(assetMetres(restored)[1]).toBe(1.8);
    expect(restored.pivot).toBe('base-center');
    expect(restored.orientation).toEqual({ up: '+Y', front: '-Z' });
  });
  it('validates committed sources and reports CLI failures with a nonzero exit status', async () => {
    const valid = spawnSync(process.execPath, ['tools/assets/validate.ts'], { encoding: 'utf8' });
    expect(valid.status, valid.stderr).toBe(0);
    expect(valid.stdout).toContain('direction-marker.voxel.json: valid v1');
    const directory = await mkdtemp(join(tmpdir(), 'mvw-assets-'));
    try {
      const path = join(directory, 'bad.voxel.json');
      await writeFile(path, '{"schemaVersion":2}');
      const invalid = spawnSync(process.execPath, ['tools/assets/validate.ts', path], { encoding: 'utf8' });
      expect(invalid.status).toBe(1);
      expect(invalid.stderr).toContain('required field');
      const source = await readFile('assets/source/direction-marker.voxel.json', 'utf8');
      expect(parseSource(source)).toEqual(sample());
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
});

it('accepts a UTF-8 BOM from Windows authoring tools', () => {
  const asset = createFixtures()[0];
  expect(parseSource(`\uFEFF${serializeSource(asset)}`)).toEqual(asset);
});

it('rejects sparse JavaScript arrays before serialization can turn holes into null', () => {
  const asset = createFixtures()[0];
  expect(() => validateSource({ ...asset, size: new Array(3) })).toThrow('safe integers');
  expect(() => validateSource({ ...asset, palette: new Array(1) })).toThrow('expected an object');
  expect(() => validateSource({ ...asset, cells: new Array(1) })).toThrow('expected an object');
});
