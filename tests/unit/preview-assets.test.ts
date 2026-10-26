import { describe, expect, it } from 'vitest';
import { Color } from 'three';
import { assetMetres } from '../../src/assets/voxel-source';
import { createBlock } from '../../src/assets/create-block';
import { createFixtures } from '../../tools/voxel-editor/catalog';
import { createPreviewObject } from '../../tools/voxel-editor/preview-object';

describe('source-backed viewer assets', () => {
  it('creates unique occupied cells and converts dimensions to metres', () => {
    const asset = createBlock('test', ' Small block ', [2, 3, 4], '#abcdef');
    expect(asset.name).toBe('Small block');
    expect(asset.cells).toHaveLength(24);
    expect(new Set(asset.cells.map((cell) => cell.position.join(','))).size).toBe(24);
    assetMetres(asset).forEach((metres, axis) => expect(metres).toBeCloseTo([0.2, 0.3, 0.4][axis]));
  });
  it.each([0, -1, 1.5, 17, NaN, Infinity])('rejects unsafe dimension %s before allocation', (axis) => {
    expect(() => createBlock('test', 'Block', [axis, 1, 1], '#ffffff')).toThrow('whole number');
  });
  it('rejects blank/oversized names and invalid colors', () => {
    for (const name of ['  ', 'x'.repeat(49)]) {
      expect(() => createBlock('test', name, [1, 1, 1], '#ffffff')).toThrow('name');
    }
    expect(() => createBlock('test', 'Block', [1, 1, 1], 'red')).toThrow('color');
  });
  it('ships independent fixtures with occupied bounds matching their declared grid', () => {
    const fixtures = createFixtures();
    for (const fixture of fixtures) {
      for (let axis = 0; axis < 3; axis++) {
        expect(Math.min(...fixture.cells.map((cell) => cell.position[axis]))).toBe(0);
        expect(Math.max(...fixture.cells.map((cell) => cell.position[axis]))).toBe(fixture.size[axis] - 1);
      }
    }
    fixtures[0].cells.length = 0;
    expect(createFixtures()[0].cells.length).toBeGreaterThan(0);
  });
  it('centres the optimized asset on XZ with base at Y=0 and preserves vertex colors', () => {
    const object = createPreviewObject(createBlock('test', 'Block', [2, 4, 6], '#d9b56f'));
    expect(object.stats.voxels).toBe(48);
    expect(object.mesh.geometry.index!.count).toBe(36);
    const min = object.mesh.geometry.boundingBox!.min;
    const max = object.mesh.geometry.boundingBox!.max;
    expect(min.x).toBeCloseTo(-0.1);
    expect(min.y).toBeCloseTo(0);
    expect(min.z).toBeCloseTo(-0.3);
    expect(max.y).toBeCloseTo(0.4);
    expect(max.z).toBeCloseTo(0.3);
    const positions = object.mesh.geometry.getAttribute('position');
    expect(Math.min(...Array.from({ length: positions.count }, (_, i) => positions.getY(i)))).toBeCloseTo(0);
    const color = new Color().fromBufferAttribute(object.mesh.geometry.getAttribute('color'), 0);
    expect(color.getHexString()).toBe('d9b56f');
    object.dispose();
  });
  it('disposes geometry, material and helper resources once on replacement', () => {
    const object = createPreviewObject(createFixtures()[0]);
    const released = [0, 0, 0];
    object.mesh.geometry.addEventListener('dispose', () => released[0]++);
    object.mesh.material.addEventListener('dispose', () => released[1]++);
    object.helper.geometry.addEventListener('dispose', () => released[2]++);
    object.dispose();
    object.dispose();
    expect(released).toEqual([1, 1, 1]);
    expect(object.group.children).toHaveLength(0);
  });
});

it('uses the declared padded envelope for bounds while preserving multiple palette colors', () => {
  const asset = createFixtures()[0];
  asset.size = [256, 256, 256];
  const object = createPreviewObject(asset);
  expect(object.bounds.min.toArray()).toEqual([-12.8, 0, -12.8]);
  expect(object.bounds.max.toArray()).toEqual([12.8, 25.6, 12.8]);
  const colors = object.mesh.geometry.getAttribute('color');
  const actual = new Set(Array.from({ length: colors.count }, (_, i) => new Color().fromBufferAttribute(colors, i).getHexString()));
  expect(actual).toEqual(new Set(asset.palette.map((entry) => entry.color.slice(1))));
  object.dispose();
});
