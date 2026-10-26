import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { Box3, BufferGeometry, Color, Material, Mesh, MeshStandardMaterial } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { exportVoxelGlb } from '../../src/assets/export-glb';
import { createVoxelMesh } from '../../src/rendering/voxel-mesh';
import { createFixtures } from '../../tools/voxel-editor/catalog';
import { installNodeFileReader } from '../../tools/assets/node-file-reader';
import { createBlock } from '../../src/assets/create-block';
import { serializeSource } from '../../src/assets/voxel-source';

let restore: () => void;
beforeAll(() => { restore = installNodeFileReader(); });
afterAll(() => restore());
afterEach(() => vi.restoreAllMocks());

export function glbJson(buffer: ArrayBuffer) {
  const view = new DataView(buffer);
  expect(view.getUint32(0, true)).toBe(0x46546c67);
  expect(view.getUint32(4, true)).toBe(2);
  expect(view.getUint32(8, true)).toBe(buffer.byteLength);
  const length = view.getUint32(12, true);
  expect(view.getUint32(16, true)).toBe(0x4e4f534a);
  return JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, length)));
}

describe('GLB derivatives', () => {
  it.each([0, 1])('reloads fixture %s with the same geometry, pivot, colors and material and excludes helpers', async (index) => {
    const source = createFixtures()[index];
    const before = serializeSource(source);
    const reference = createVoxelMesh(source);
    const data = await exportVoxelGlb(source);
    const json = glbJson(data);
    expect(json.asset.version).toBe('2.0');
    expect(json.meshes).toHaveLength(1);
    expect(json.materials).toHaveLength(1);
    expect(json.cameras).toBeUndefined();
    expect(json.buffers).toHaveLength(1);
    const loaded = await new GLTFLoader().parseAsync(data, '');
    const mesh = loaded.scene.getObjectByName(source.id) as Mesh<BufferGeometry, MeshStandardMaterial>;
    try {
      expect(mesh.isMesh).toBe(true);
      expect(new Box3().setFromObject(mesh)).toEqual(reference.mesh.geometry.boundingBox);
      expect(mesh.position.toArray()).toEqual([0, 0, 0]);
      expect(mesh.scale.toArray()).toEqual([1, 1, 1]);
      for (const name of ['position', 'normal', 'color']) {
        expect(Array.from(mesh.geometry.getAttribute(name).array)).toEqual(Array.from(reference.mesh.geometry.getAttribute(name).array));
      }
      expect(Array.from(mesh.geometry.index!.array)).toEqual(Array.from(reference.mesh.geometry.index!.array));
      expect(mesh.material).toMatchObject({ roughness: 0.9, metalness: 0, transparent: false, vertexColors: true });
      const colors = mesh.geometry.getAttribute('color');
      expect(new Set(Array.from({ length: colors.count }, (_, i) => new Color().fromBufferAttribute(colors, i).getHexString()))).toEqual(new Set(source.palette.map((entry) => entry.color.slice(1))));
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(before));
      const hash = Buffer.from(digest).toString('hex');
      expect(mesh.userData).toMatchObject({ assetId: source.id, meshVersion: 1, sourceSchemaVersion: 1, sourceHash: hash, units: 'metres', voxelSize: 0.1, pivot: 'base-center', gridSize: source.size, orientation: source.orientation });
      expect(serializeSource(source)).toBe(before);
      expect(new Uint8Array(await exportVoxelGlb(source))).toEqual(new Uint8Array(data));
    } finally { reference.dispose(); mesh.geometry.dispose(); mesh.material.dispose(); }
  });
  it('preserves padding metadata while positions retain their offset from the declared pivot', async () => {
    const source = createBlock('padded', 'Padded', [1, 1, 1], '#ff3300');
    source.size = [10, 10, 10];
    const loaded = await new GLTFLoader().parseAsync(await exportVoxelGlb(source), '');
    const mesh = loaded.scene.getObjectByName('padded') as Mesh<BufferGeometry, MeshStandardMaterial>;
    try {
      const bounds = new Box3().setFromObject(mesh);
      expect(bounds.min.x).toBeCloseTo(-0.5);
      expect(bounds.min.y).toBeCloseTo(0);
      expect(bounds.max.x).toBeCloseTo(-0.4);
      expect(mesh.userData.gridSize).toEqual([10, 10, 10]);
    } finally { mesh.geometry.dispose(); mesh.material.dispose(); }
  });
  it('releases temporary geometry and material even when the exporter rejects', async () => {
    vi.spyOn(GLTFExporter.prototype, 'parseAsync').mockRejectedValueOnce(new Error('Exporter failure'));
    const geometry = vi.spyOn(BufferGeometry.prototype, 'dispose');
    const material = vi.spyOn(Material.prototype, 'dispose');
    await expect(exportVoxelGlb(createFixtures()[0])).rejects.toThrow('Exporter failure');
    expect(geometry).toHaveBeenCalledTimes(1);
    expect(material).toHaveBeenCalledTimes(1);
  });
  it('exports sources from the CLI and reports missing inputs with a nonzero exit', async () => {
    const result = spawnSync(process.execPath, ['tools/assets/export.ts'], { encoding: 'utf8' });
    expect(result.status, result.stderr).toBe(0);
    const bytes = await readFile('assets/generated/fixture-cube.glb');
    const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    expect(glbJson(data).meshes).toHaveLength(1);
    const invalid = spawnSync(process.execPath, ['tools/assets/export.ts', 'missing-source.voxel.json'], { encoding: 'utf8' });
    expect(invalid.status).toBe(1);
    expect(invalid.stderr).toContain('missing-source.voxel.json');
  });
});
