import { assetMetres, createBlock, createFixtures, MAX_ASSETS } from './provisional-assets';
import { mountViewer, type View } from './viewer';

export function mountWorkshop() {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) throw new Error('Missing application root');
  app.innerHTML = `
    <header><a class="brand" href="/">MVW <span>/ DEVELOPMENT</span></a>
    <nav aria-label="Workspace"><a href="/">Game</a><a href="/tools/voxel-editor/" aria-current="page">Voxel workshop</a></nav></header>
    <main class="workshop"><section class="intro"><p class="eyebrow">PHASE 02 / ASSET VIEWER</p>
    <h1>Voxel workshop</h1><p>Inspect form, color, and scale before it enters the world.</p></section>
    <div class="workbench"><aside class="asset-panel" aria-label="Asset catalog">
      <h2>Session assets <span id="asset-count"></span></h2>
      <label for="asset-list">Selected asset</label><select id="asset-list" size="5"></select>
      <p class="quiet">Session only. Reloading discards created assets.</p>
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
      <p class="quiet">1 voxel = 0.1 m · grid spacing 1 m · +Y up · front −Z<br>Axes: X red, Y green, Z blue. Origin: base centre.</p>
    </section></div><footer><p role="status">Starting renderer…</p><span>PROVISIONAL ASSETS · NO FILE SAVING YET</span></footer></main>`;
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
  let sequence = 1;
  const viewer = mountViewer(host, status);
  const events = new AbortController();
  const options = { signal: events.signal };
  function display() {
    const asset = assets.find((entry) => entry.id === select.value);
    if (!asset) return;
    viewer?.select(asset);
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
      const asset = createBlock(`session-${sequence}`, String(data.get('assetName')),
        [Number(data.get('width')), Number(data.get('height')), Number(data.get('depth'))], String(data.get('color')));
      sequence++;
      assets.push(asset);
      refresh(asset.id);
    } catch (cause) {
      error.textContent = cause instanceof Error ? cause.message : 'Unable to create asset.';
    }
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
  return () => { events.abort(); viewer?.dispose(); };
}
