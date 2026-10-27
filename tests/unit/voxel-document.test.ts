import { describe, expect, it } from 'vitest';
import { VoxelDocument } from '../../src/assets/voxel-document';
import { createBlock } from '../../src/assets/create-block';
import { parseSource, serializeSource } from '../../src/assets/voxel-source';

const source = () => createBlock('test-block', 'Test block', [2, 2, 2], '#aabbcc');
describe('voxel editing document', () => {
  it('adds, paints, removes, undoes and redoes source edits without losing metadata', () => {
    const original = source();
    const doc = new VoxelDocument(original);
    const palette = original.palette[0].id;
    doc.cell('remove', [0, 0, 0], palette);
    doc.cell('add', [0, 0, 0], palette);
    doc.palette('add', 'red', '#ff0000', palette);
    doc.cell('paint', [0, 0, 0], 'red');
    const edited = doc.source;
    expect(edited.cells.find((cell) => cell.position.join() === '0,0,0')?.palette).toBe('red');
    expect(parseSource(serializeSource(edited))).toEqual(edited);
    for (let i = 0; i < 4; i++) expect(doc.undo()).toBe(true);
    expect(doc.source).toEqual(original);
    expect(doc.dirty).toBe(false);
    for (let i = 0; i < 4; i++) expect(doc.redo()).toBe(true);
    expect(doc.source).toEqual(edited);
    expect(original).toEqual(source());
  });
  it('keeps state and redo history atomic when edits fail; branches discard redo', () => {
    const doc = new VoxelDocument(source());
    doc.properties('Changed', [2, 2, 2]);
    doc.undo();
    for (const edit of [
      () => doc.cell('add', [0, 0, 0], 'body'),
      () => doc.cell('remove', [2, 0, 0], 'body'),
      () => doc.cell('paint', [0.5, 0, 0], 'body'),
      () => doc.cell('paint', [0, 0, 0], 'missing'),
      () => doc.properties('Invalid shrink', [1, 1, 1]),
      () => doc.palette('add', 'bad id', '#ff0000', 'body'),
    ]) {
      expect(edit).toThrow();
      expect(doc.source).toEqual(source());
      expect(doc.canRedo).toBe(true);
      expect(doc.dirty).toBe(false);
    }
    doc.properties('Branch', [3, 2, 2]);
    expect(doc.canRedo).toBe(false);
    expect(doc.source.size).toEqual([3, 2, 2]);
  });
  it('renames palette references and rejects duplicates, removal in use, and the final voxel', () => {
    const doc = new VoxelDocument(source());
    const id = doc.source.palette[0].id;
    doc.palette('update', 'renamed', '#112233', id);
    expect(doc.source.cells.every((cell) => cell.palette === 'renamed')).toBe(true);
    expect(() => doc.palette('remove', '', '', 'renamed')).toThrow('in use');
    expect(() => doc.palette('add', 'renamed', '#112233', '')).toThrow('duplicate');
    doc.palette('add', 'unused', '#ffffff', '');
    doc.palette('remove', '', '', 'unused');
    expect(doc.source.palette).toHaveLength(1);
    const single = new VoxelDocument(createBlock('single', 'Single', [1, 1, 1], '#ffffff'));
    expect(() => single.cell('remove', [0, 0, 0], '')).toThrow('1–32768');
    expect(single.canUndo).toBe(false);
  });
  it('tracks JSON export independently of GLB and selection; protects owned state', () => {
    const doc = new VoxelDocument(source(), false);
    expect(doc.dirty).toBe(true);
    doc.markExported(doc.source);
    doc.properties('Changed', [2, 2, 2]);
    expect(doc.dirty).toBe(true);
    doc.undo();
    expect(doc.dirty).toBe(false);
    doc.redo();
    doc.markExported(doc.source);
    expect(doc.dirty).toBe(false);
    doc.undo();
    expect(doc.dirty).toBe(true);
    const copy = doc.source;
    copy.cells.length = 0;
    expect(doc.source.cells).toHaveLength(8);
  });
  it('evicts history by UTF-8 byte budget for larger sources', () => {
    const doc = new VoxelDocument(createBlock('large', 'Large', [16, 16, 16], '#ffffff'));
    for (let i = 0; i < 24; i++) doc.properties(`Large ${i}`, [16, 16, 16]);
    let bytes = 0;
    let steps = 0;
    while (doc.undo()) {
      bytes += new TextEncoder().encode(serializeSource(doc.source)).byteLength;
      steps++;
    }
    expect(steps).toBeGreaterThan(0);
    expect(steps).toBeLessThan(24);
    expect(bytes).toBeLessThanOrEqual(8 * 1024 * 1024);
  });

  it('bounds history, ignores no-ops and keeps histories independent', () => {
    const doc = new VoxelDocument(source());
    expect(doc.properties('Test block', [2, 2, 2])).toBe(false);
    expect(doc.canUndo).toBe(false);
    for (let i = 0; i < 70; i++) doc.properties(`Name ${i}`, [2, 2, 2]);
    let steps = 0;
    while (doc.undo()) steps++;
    expect(steps).toBe(64);
    expect(new VoxelDocument(source()).canUndo).toBe(false);
  });
});
