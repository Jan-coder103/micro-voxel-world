import { parseSource, serializeSource, validateSource, type VoxelSource } from './voxel-source';

type Position = [number, number, number];
const HISTORY_BYTES = 8 * 1024 * 1024;
const HISTORY_STEPS = 64;

/** Validated atomic edits. History holds serialized sources, bounded by bytes and steps. */
export class VoxelDocument {
  private value: VoxelSource;
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private saved: string | undefined;
  constructor(source: VoxelSource, saved = true) {
    this.value = validateSource(source);
    this.saved = saved ? serializeSource(this.value) : undefined;
  }
  get source() { return structuredClone(this.value); }
  get canUndo() { return this.undoStack.length > 0; }
  get canRedo() { return this.redoStack.length > 0; }
  get dirty() { return serializeSource(this.value) !== this.saved; }
  markExported(source: VoxelSource) { this.saved = serializeSource(source); }
  private trim() {
    const bytes = (items: string[]) => items.reduce((sum, item) => sum + new TextEncoder().encode(item).byteLength, 0);
    while (this.undoStack.length + this.redoStack.length > HISTORY_STEPS || bytes(this.undoStack) + bytes(this.redoStack) > HISTORY_BYTES) {
      if (this.undoStack.length) this.undoStack.shift(); else this.redoStack.shift();
    }
  }
  private edit(change: (draft: VoxelSource) => void) {
    const draft = this.source;
    change(draft);
    const next = serializeSource(draft); // Validate before touching state or history.
    const previous = serializeSource(this.value);
    if (next === previous) return false;
    this.undoStack.push(previous);
    this.redoStack = [];
    this.value = validateSource(draft);
    this.trim();
    return true;
  }
  cell(tool: 'add' | 'remove' | 'paint', position: Position, palette: string) {
    if (position.some((n, axis) => !Number.isSafeInteger(n) || n < 0 || n >= this.value.size[axis])) throw new Error('Selection must be an integer coordinate inside the grid.');
    return this.edit((draft) => {
      const index = draft.cells.findIndex((cell) => cell.position.every((n, axis) => n === position[axis]));
      if (tool === 'add') {
        if (index !== -1) throw new Error('Selected cell is occupied. Use Paint to recolor it.');
        draft.cells.push({ position: [...position], palette });
      } else {
        if (index === -1) throw new Error('Selected cell is empty. Use Add first.');
        if (tool === 'remove') draft.cells.splice(index, 1);
        else draft.cells[index].palette = palette;
      }
    });
  }
  palette(action: 'add' | 'update' | 'remove', id: string, color: string, selected: string) {
    return this.edit((draft) => {
      const entry = draft.palette.find((item) => item.id === selected);
      if (action === 'add') draft.palette.push({ id, color, material: 'matte' });
      else {
        if (!entry) throw new Error('Select a palette entry.');
        if (action === 'remove') {
          if (draft.cells.some((cell) => cell.palette === selected)) throw new Error('Palette entry is in use. Paint its cells before removing it.');
          draft.palette = draft.palette.filter((item) => item.id !== selected);
        } else {
          entry.id = id;
          entry.color = color;
          draft.cells.forEach((cell) => { if (cell.palette === selected) cell.palette = id; });
        }
      }
    });
  }
  properties(name: string, size: Position) { return this.edit((draft) => { draft.name = name; draft.size = [...size]; }); }
  undo() {
    const previous = this.undoStack.pop();
    if (!previous) return false;
    this.redoStack.push(serializeSource(this.value));
    this.value = parseSource(previous);
    this.trim();
    return true;
  }
  redo() {
    const next = this.redoStack.pop();
    if (!next) return false;
    this.undoStack.push(serializeSource(this.value));
    this.value = parseSource(next);
    this.trim();
    return true;
  }
}
