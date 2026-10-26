/** Authoritative editable source. Rendering and meshing must consume validated data. */
export interface VoxelSource {
  schemaVersion: 1;
  id: string;
  name: string;
  category: 'reference' | 'prop' | 'vegetation' | 'building' | 'aircraft' | 'character';
  units: 'metres';
  voxelSize: 0.1;
  size: [number, number, number];
  pivot: 'base-center';
  orientation: { up: '+Y'; front: '-Z' };
  palette: { id: string; color: string; material: 'matte' }[];
  cells: { position: [number, number, number]; palette: string }[];
  tags: string[];
  provenance: string;
}

export const SOURCE_LIMITS = Object.freeze({ axis: 256, cells: 32768, palette: 64, bytes: 8 * 1024 * 1024 });
const categories = ['reference', 'prop', 'vegetation', 'building', 'aircraft', 'character'];
const idPattern = /^[a-z][a-z0-9-]{0,63}$/;
function fail(path: string, message: string): never { throw new Error(`${path}: ${message}`); }
function record(value: unknown, path: string, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(path, 'expected an object.');
  const result = value as Record<string, unknown>;
  for (const key of Object.keys(result)) if (!keys.includes(key)) fail(`${path}.${key}`, 'unknown field.');
  for (const key of keys) if (!Object.hasOwn(result, key)) fail(`${path}.${key}`, 'required field.');
  return result;
}
function literal(value: unknown, expected: unknown, path: string) {
  if (value !== expected) fail(path, `expected ${JSON.stringify(expected)}.`);
}
function text(value: unknown, path: string, max: number): asserts value is string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) fail(path, `use nonblank text up to ${max} characters.`);
}
function identifier(value: unknown, path: string): asserts value is string {
  if (typeof value !== 'string' || !idPattern.test(value)) fail(path, 'use 1–64 lowercase letters/digits/hyphens, starting with a letter.');
}
function tuple(value: unknown, path: string): asserts value is [number, number, number] {
  if (!Array.isArray(value) || value.length !== 3 || Array.from(value).some((n) => !Number.isSafeInteger(n))) {
    fail(path, 'expected exactly three safe integers.');
  }
}

/** Strict fields prevent silently dropping future authoring data. Returns an owned copy. */
export function validateSource(value: unknown): VoxelSource {
  const asset = record(value, 'asset', ['schemaVersion', 'id', 'name', 'category', 'units', 'voxelSize', 'size', 'pivot', 'orientation', 'palette', 'cells', 'tags', 'provenance']);
  literal(asset.schemaVersion, 1, 'asset.schemaVersion');
  identifier(asset.id, 'asset.id');
  text(asset.name, 'asset.name', 48);
  if (!categories.includes(asset.category as string)) fail('asset.category', `expected one of ${categories.join(', ')}.`);
  literal(asset.units, 'metres', 'asset.units');
  literal(asset.voxelSize, 0.1, 'asset.voxelSize');
  tuple(asset.size, 'asset.size');
  if (asset.size.some((n) => n < 1 || n > SOURCE_LIMITS.axis)) fail('asset.size', `each dimension must be 1–${SOURCE_LIMITS.axis}.`);
  literal(asset.pivot, 'base-center', 'asset.pivot');
  const orientation = record(asset.orientation, 'asset.orientation', ['up', 'front']);
  literal(orientation.up, '+Y', 'asset.orientation.up');
  literal(orientation.front, '-Z', 'asset.orientation.front');
  if (!Array.isArray(asset.palette) || asset.palette.length < 1 || asset.palette.length > SOURCE_LIMITS.palette) fail('asset.palette', 'expected 1–64 entries.');
  const paletteIds = new Set<string>();
  Array.from(asset.palette).forEach((entry: unknown, i: number) => {
    const path = `asset.palette[${i}]`;
    const item = record(entry, path, ['id', 'color', 'material']);
    identifier(item.id, `${path}.id`);
    if (paletteIds.has(item.id)) fail(`${path}.id`, 'duplicate palette ID.');
    paletteIds.add(item.id);
    if (typeof item.color !== 'string' || !/^#[\da-f]{6}$/i.test(item.color)) fail(`${path}.color`, 'expected six-digit hex color.');
    literal(item.material, 'matte', `${path}.material`);
  });
  if (!Array.isArray(asset.cells) || asset.cells.length < 1 || asset.cells.length > SOURCE_LIMITS.cells) fail('asset.cells', 'expected 1–32768 occupied cells.');
  const occupied = new Set<string>();
  const size = asset.size;
  Array.from(asset.cells).forEach((entry: unknown, i: number) => {
    const path = `asset.cells[${i}]`;
    const cell = record(entry, path, ['position', 'palette']);
    tuple(cell.position, `${path}.position`);
    if (cell.position.some((n, axis) => n < 0 || n >= size[axis])) fail(`${path}.position`, 'outside declared grid bounds.');
    const key = cell.position.join(',');
    if (occupied.has(key)) fail(`${path}.position`, 'duplicate occupied coordinate.');
    occupied.add(key);
    if (typeof cell.palette !== 'string' || !paletteIds.has(cell.palette)) fail(`${path}.palette`, 'unknown palette reference.');
  });
  if (!Array.isArray(asset.tags) || asset.tags.length > 16) fail('asset.tags', 'expected at most 16 tags.');
  Array.from(asset.tags).forEach((tag: unknown, i: number) => identifier(tag, `asset.tags[${i}]`));
  if (new Set(asset.tags).size !== asset.tags.length) fail('asset.tags', 'duplicate tag.');
  text(asset.provenance, 'asset.provenance', 256);
  return structuredClone(value) as VoxelSource;
}

export function parseSource(source: string): VoxelSource {
  if (new TextEncoder().encode(source).byteLength > SOURCE_LIMITS.bytes) fail('file', 'maximum size is 8 MiB.');
  let value: unknown;
  try { value = JSON.parse(source.startsWith('\uFEFF') ? source.slice(1) : source); } catch { return fail('file', 'invalid JSON.'); }
  return validateSource(value);
}
export function serializeSource(asset: VoxelSource): string {
  const source = `${JSON.stringify(validateSource(asset), null, 2)}\n`;
  if (new TextEncoder().encode(source).byteLength > SOURCE_LIMITS.bytes) fail('file', 'maximum size is 8 MiB.');
  return source;
}
export function assetMetres(asset: VoxelSource): [number, number, number] {
  return asset.size.map((axis) => axis * asset.voxelSize) as [number, number, number];
}
