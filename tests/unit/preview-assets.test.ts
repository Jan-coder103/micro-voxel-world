import { describe, expect, it } from 'vitest';
import { Color, Matrix4, Vector3 } from 'three';
import { assetMetres, createBlock, createFixtures } from '../../tools/voxel-editor/provisional-assets';
import { createPreviewObject } from '../../tools/voxel-editor/preview-object';

describe('provisional viewer assets', () => {
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
  it('centres the asset on XZ with base at Y=0 and preserves instance colors', () => {
    const object = createPreviewObject(createBlock('test', 'Block', [2, 4, 6], '#d9b56f'));
    expect(object.mesh.count).toBe(48);
    const min = object.mesh.boundingBox!.min;
    const max = object.mesh.boundingBox!.max;
    expect(min.x).toBeCloseTo(-0.1);
    expect(min.y).toBeCloseTo(0);
    expect(min.z).toBeCloseTo(-0.3);
    expect(max.y).toBeCloseTo(0.4);
    expect(max.z).toBeCloseTo(0.3);
    const matrix = new Matrix4();
    object.mesh.getMatrixAt(0, matrix);
    expect(new Vector3().setFromMatrixPosition(matrix).y).toBeCloseTo(0.05);
    const color = new Color();
    object.mesh.getColorAt(0, color);
    expect(color.getHexString()).toBe('d9b56f');
    object.dispose();
  });
  it('disposes instance, geometry, material and helper resources once on replacement', () => {
    const object = createPreviewObject(createFixtures()[0]);
    const released = [0, 0, 0, 0];
    object.mesh.addEventListener('dispose', () => released[0]++);
    object.mesh.geometry.addEventListener('dispose', () => released[1]++);
    object.mesh.material.addEventListener('dispose', () => released[2]++);
    object.helper.geometry.addEventListener('dispose', () => released[3]++);
    object.dispose();
    object.dispose();
    expect(released).toEqual([1, 1, 1, 1]);
    expect(object.group.children).toHaveLength(0);
  });
});
