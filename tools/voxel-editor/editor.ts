import type { VoxelDocument } from '../../src/assets/voxel-document';

/** Coordinate selection keeps orbit gestures separate from explicit edit commands. */
export function mountEditor(host: HTMLElement, current: () => VoxelDocument, changed: () => void, signal: AbortSignal, highlight: (position: [number, number, number]) => void) {
  host.innerHTML = `<h2>Edit source</h2>
    <p id="dirty-state" aria-live="polite"></p>
    <div class="edit-actions"><button id="undo" type="button">Undo</button><button id="redo" type="button">Redo</button></div>
    <p class="quiet">History: up to 64 steps / 8 MiB per asset. Export JSON before closing.</p>
    <form id="edit-properties"><label>Source name<input id="source-name" maxlength="48" required></label>
    <fieldset><legend>Grid envelope · 1–256 per axis</legend><div class="dimensions">
    ${['X', 'Y', 'Z'].map((axis) => `<label>${axis}<input id="size-${axis}" type="number" min="1" max="256" required></label>`).join('')}</div></fieldset>
    <button>Apply name / grid</button></form>
    <fieldset><legend>Selected cell · zero-based grid coordinates</legend><div class="dimensions">
    ${['X', 'Y', 'Z'].map((axis) => `<label>${axis}<input id="cell-${axis}" type="number" min="0" value="0" step="1"></label>`).join('')}</div></fieldset>
    <p id="cell-state" class="quiet" aria-live="polite"></p>
    <label>Active palette<select id="edit-palette"></select></label>
    <div class="edit-actions">${['add', 'remove', 'paint'].map((tool) => `<button type="button" data-edit="${tool}">${tool[0].toUpperCase() + tool.slice(1)} voxel</button>`).join('')}</div>
    <form id="palette-form"><label>Palette ID<input id="palette-id" required maxlength="64"></label>
    <label>Palette color<input id="palette-color" type="color"></label>
    <div class="edit-actions"><button type="submit">Update palette</button><button type="button" id="add-palette">Add palette</button><button type="button" id="remove-palette">Remove palette</button></div></form>
    <p id="edit-error" aria-live="assertive"></p>`;
  const el = <T extends HTMLElement>(id: string) => host.querySelector<T>(`#${id}`)!;
  const input = (id: string) => el<HTMLInputElement>(id);
  const palette = el<HTMLSelectElement>('edit-palette');
  const position = (): [number, number, number] => ['X', 'Y', 'Z'].map((axis) => Number(input(`cell-${axis}`).value || NaN)) as [number, number, number];
  function selection() {
    const source = current().source;
    const p = position();
    highlight(p);
    const valid = p.every((n, axis) => Number.isInteger(n) && n >= 0 && n < source.size[axis]);
    const cell = source.cells.find((item) => item.position.every((n, axis) => n === p[axis]));
    el('cell-state').textContent = valid ? `Cell [${p.join(', ')}]: ${cell ? `occupied · ${cell.palette}` : 'empty'}` : 'Selection outside grid or invalid.';
  }
  function paletteFields() {
    const entry = current().source.palette.find((item) => item.id === palette.value)!;
    input('palette-id').value = entry.id;
    input('palette-color').value = entry.color;
  }
  let preferredPalette = '';
  function refresh() {
    const doc = current();
    const source = doc.source;
    el('dirty-state').textContent = doc.dirty ? 'Unsaved changes · export source JSON to keep edits' : 'Source unchanged since import / JSON export';
    el<HTMLButtonElement>('undo').disabled = !doc.canUndo;
    el<HTMLButtonElement>('redo').disabled = !doc.canRedo;
    input('source-name').value = source.name;
    source.size.forEach((n, axis) => { input(`size-${['X', 'Y', 'Z'][axis]}`).value = String(n); input(`cell-${['X', 'Y', 'Z'][axis]}`).max = String(n - 1); });
    const previous = preferredPalette || palette.value;
    preferredPalette = '';
    palette.replaceChildren(...source.palette.map((item) => new Option(`${item.id} · ${item.color}`, item.id)));
    if (source.palette.some((item) => item.id === previous)) palette.value = previous;
    paletteFields();
    selection();
  }
  function run(action: () => unknown) {
    el('edit-error').textContent = '';
    try { action(); changed(); } catch (cause) { el('edit-error').textContent = cause instanceof Error ? cause.message : 'Edit failed.'; }
  }
  const options = { signal };
  ['X', 'Y', 'Z'].forEach((axis) => input(`cell-${axis}`).addEventListener('input', selection, options));
  palette.addEventListener('change', paletteFields, options);
  host.querySelectorAll<HTMLButtonElement>('[data-edit]').forEach((button) => button.addEventListener('click', () => run(() => current().cell(button.dataset.edit as 'add' | 'remove' | 'paint', position(), palette.value)), options));
  el('undo').addEventListener('click', () => run(() => current().undo()), options);
  el('redo').addEventListener('click', () => run(() => current().redo()), options);
  el('edit-properties').addEventListener('submit', (event) => { event.preventDefault(); run(() => current().properties(input('source-name').value, ['X', 'Y', 'Z'].map((axis) => Number(input(`size-${axis}`).value)) as [number, number, number])); }, options);
  const editPalette = (action: 'add' | 'update' | 'remove') => run(() => {
    const id = input('palette-id').value;
    current().palette(action, id, input('palette-color').value, palette.value);
    if (action !== 'remove') preferredPalette = id;
  });
  el('palette-form').addEventListener('submit', (event) => { event.preventDefault(); editPalette('update'); }, options);
  el('add-palette').addEventListener('click', () => editPalette('add'), options);
  el('remove-palette').addEventListener('click', () => editPalette('remove'), options);
  return { refresh };
}
