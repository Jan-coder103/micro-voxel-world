import { meshVoxelSource } from '../../src/assets/voxel-mesh';
import { assetMetres, parseSource, serializeSource, SOURCE_LIMITS } from '../../src/assets/voxel-source';
import { createBlock } from '../../src/assets/create-block';
import { createFixtures, MAX_ASSETS } from './catalog';
import { mountViewer, type View } from './viewer';

export function mountWorkshop() {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) throw new Error('Missing application root');
  app.innerHTML = `
    <header><a class="brand" href="/">MVW <span>/ DEVELOPMENT</span></a>
    <nav aria-label="Workspace"><a href="/">Game</a><a href="/tools/voxel-editor/" aria-current="page">Voxel workshop</a></nav></header>
    <main class="workshop"><section class="intro"><p class="eyebrow">PHASE 04 / OPTIMIZED MESHES</p>
    <h1>Voxel workshop</h1><p>Inspect form, color, and scale before it enters the world.</p></section>
    <div class="workbench"><aside class="asset-panel" aria-label="Asset catalog">
      <h2>Session assets <span id="asset-count"></span></h2>
      <label for="asset-list">Selected asset</label><select id="asset-list" size="5"></select>
      <p class="quiet">Export sources to keep your work. Reloading discards session assets.</p>
      <div class="file-controls">
        <label for="import-source">Import voxel JSON</label>
        <input id="import-source" type="file" accept=".json,application/json">
        <button id="export-source" type="button">Export selected source</button>
        <button id="export-glb" type="button">Export runtime GLB</button>
        <p class="quiet">GLB is derived. Keep source JSON for editing.</p>
        <p id="file-result" class="quiet" aria-live="polite"></p>
      </div>
      <form id="create-asset"><h2>Create a block</h2>
        <label for="asset-name">Name</label><input id="asset-name" name="assetName" value="Untitled block" required maxlength="48">
        <fieldset><legend>Dimensions in voxels · 1–16 per axis</legend><div class="dimensions">
          <label>Width X<input name="width" type="number" value="4" min="1" max="16" step="1" required></label>
          <label>Height Y<input name="height" type="number" value="4" min="1" max="16" step="1" required></label>
          <label>Depth Z<input name="depth" type="number" value="4" min="1" max="16" step="1" required></label>
        </div></fieldset>
        <label for="asset-color">Color</label><input id="asset-color" name="color" type="color" value="#d9b56f">
        <button type="submit">Create asset</button><p id="create-error" role="alert"></p>
      </form>
    </aside><section class="inspection" aria-label="Asset inspection">
      <div class="viewer-toolbar" aria-label="Camera and display controls">
        <button type="button" data-view="perspective">Frame asset</button>
        <button type="button" data-view="front">Front −Z</button><button type="button" data-view="top">Top +Y</button>
        <label><input id="show-grid" type="checkbox" checked> Grid / axes</label>
        <label><input id="show-bounds" type="checkbox" checked> Bounds</label>
      </div>
      <div class="viewport" aria-label="Voxel asset scene"></div>
      <p class="viewer-help">Left-drag orbit · scroll zoom · right-drag pan · focus canvas for arrow-key pan</p>
      <dl class="asset-stats" aria-label="Asset measurements"></dl>
      <p id="mesh-stats" class="quiet" aria-label="Mesh statistics"></p>
      <p class="quiet">1 voxel = 0.1 m · grid spacing 1 m · +Y up · front −Z<br>Axes: X red, Y green, Z blue. Origin: base centre.</p>
    </section></div><footer><p role="status">Starting renderer…</p><span>SOURCE JSON + OPTIMIZED GLB</span></footer></main>`;
  function element<T extends HTMLElement>(selector: string): T {
    const result = app!.querySelector<T>(selector);
    if (!result) throw new Error(`Missing workshop element: ${selector}`);
    return result;
  }
  const host = element('.viewport');
  const status = element('[role="status"]');
  const select = element<HTMLSelectElement>('#asset-list');
  const form = element<HTMLFormElement>('#create-asset');
  const stats = element('.asset-stats');
  const error = element('#create-error');
  const assets = createFixtures();
  const downloads = new Map<ReturnType<typeof setTimeout>, string>();
  const viewer = mountViewer(host, status);
  const events = new AbortController();
  const options = { signal: events.signal };
  function display() {
    const asset = assets.find((entry) => entry.id === select.value);
    if (!asset) return;
    const meshStats = viewer?.select(asset) ?? meshVoxelSource(asset).stats;
    element('#mesh-stats').textContent = `Triangles: ${meshStats.naiveTriangles.toLocaleString()} → ${meshStats.triangles.toLocaleString()} · Exposed faces: ${meshStats.visibleFaces.toLocaleString()} · Merged quads: ${meshStats.quads.toLocaleString()}`;
    const values = [
      ['Asset', asset.name], ['Grid dimensions', `${asset.size.join(' × ')} voxels`],
      ['Bounds (X × Y × Z)', `${assetMetres(asset).map((value) => value.toFixed(2)).join(' × ')} m`],
      ['Occupied voxels', asset.cells.length.toLocaleString()],
    ];
    stats.replaceChildren(...values.flatMap(([label, value]) => {
      const term = document.createElement('dt');
      const detail = document.createElement('dd');
      term.textContent = label;
      detail.textContent = value;
      return [term, detail];
    }));
  }
  function refresh(id: string) {
    select.replaceChildren(...assets.map((asset) => new Option(asset.name, asset.id)));
    select.value = id;
    element('#asset-count').textContent = `${assets.length} / ${MAX_ASSETS}`;
    display();
  }
  select.addEventListener('change', display, options);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    error.textContent = '';
    try {
      if (assets.length >= MAX_ASSETS) throw new Error('Session limit reached (24 assets). Reload to start a new session.');
      const data = new FormData(form);
      const asset = createBlock(`block-${crypto.randomUUID()}`, String(data.get('assetName')),
        [Number(data.get('width')), Number(data.get('height')), Number(data.get('depth'))], String(data.get('color')));
      assets.push(asset);
      refresh(asset.id);
    } catch (cause) {
      error.textContent = cause instanceof Error ? cause.message : 'Unable to create asset.';
    }
  }, options);
  const file = element<HTMLInputElement>('#import-source');
  const fileResult = element('#file-result');
  file.addEventListener('change', async () => {
    const source = file.files?.[0];
    if (!source) return;
    file.disabled = true;
    error.textContent = '';
    fileResult.textContent = '';
    try {
      if (source.size > SOURCE_LIMITS.bytes) throw new Error('file: maximum size is 8 MiB.');
      const contents = await source.text();
      if (events.signal.aborted) return;
      const asset = parseSource(contents);
      if (assets.some((entry) => entry.id === asset.id)) throw new Error('asset.id: already in this session. Use a distinct ID for a different source.');
      if (assets.length >= MAX_ASSETS) throw new Error('Session limit reached (24 assets). Export your work and reload.');
      assets.push(asset);
      refresh(asset.id);
      fileResult.textContent = `Imported ${asset.name}.`;
    } catch (cause) {
      if (!events.signal.aborted) error.textContent = cause instanceof Error ? cause.message : 'Unable to import source.';
    } finally {
      if (!events.signal.aborted) { file.value = ''; file.disabled = false; }
    }
  }, options);
  function download(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    const timer = setTimeout(() => { URL.revokeObjectURL(url); downloads.delete(timer); }, 1000);
    downloads.set(timer, url);
  }
  element('#export-source').addEventListener('click', () => {
    error.textContent = '';
    const asset = assets.find((entry) => entry.id === select.value);
    if (!asset) return;
    download(new Blob([serializeSource(asset)], { type: 'application/json' }), `${asset.id}.voxel.json`);
    fileResult.textContent = `Exported ${asset.name}. Keep the downloaded JSON to reopen it.`;
  }, options);
  const glbButton = element<HTMLButtonElement>('#export-glb');
  glbButton.addEventListener('click', async () => {
    const asset = assets.find((entry) => entry.id === select.value);
    if (!asset) return;
    glbButton.disabled = true;
    error.textContent = '';
    fileResult.textContent = `Exporting ${asset.name}…`;
    try {
      const { exportVoxelGlb } = await import('../../src/assets/export-glb');
      if (events.signal.aborted) return;
      const data = await exportVoxelGlb(asset);
      if (events.signal.aborted) return;
      download(new Blob([data], { type: 'model/gltf-binary' }), `${asset.id}.glb`);
      fileResult.textContent = `Exported ${asset.name} as GLB. Keep source JSON for editing.`;
    } catch (cause) {
      if (!events.signal.aborted) {
        fileResult.textContent = '';
        error.textContent = cause instanceof Error ? cause.message : 'Unable to export GLB.';
      }
    } finally { if (!events.signal.aborted) glbButton.disabled = false; }
  }, options);
  app.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((button) => {
    button.disabled = !viewer;
    button.addEventListener('click', () => viewer?.frame(button.dataset.view as View), options);
  });
  element<HTMLInputElement>('#show-grid').addEventListener('change', (event) => {
    viewer?.grid((event.target as HTMLInputElement).checked);
  }, options);
  element<HTMLInputElement>('#show-bounds').addEventListener('change', (event) => {
    viewer?.bounds((event.target as HTMLInputElement).checked);
  }, options);
  refresh(assets[0].id);
  return () => { events.abort(); downloads.forEach((url, timer) => { clearTimeout(timer); URL.revokeObjectURL(url); }); downloads.clear(); viewer?.dispose(); };
}
