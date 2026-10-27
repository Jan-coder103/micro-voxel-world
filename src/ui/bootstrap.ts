import { mountPreview } from '../rendering/mount-preview';
import './style.css';

export function bootstrap() {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) throw new Error('Missing application root');
  app.innerHTML = `
    <header><a class="brand" href="/">MVW <span>/ DEVELOPMENT</span></a>
    <nav aria-label="Workspace"><a href="/tools/flight/">Flight lab</a><a href="/tools/hordes/">Horde lab</a><a href="/tools/weapons/">Weapons lab</a><a href="/" aria-current="page">Game</a><a href="/tools/streaming/">Streaming lab</a><a href="/tools/voxel-editor/">Voxel workshop</a></nav></header>
    <main><section class="intro"><p class="eyebrow">PHASE 07 / ENVIRONMENT</p>
    <h1>Micro Voxel World</h1>
    <p>A world built small. A vision that flies large.</p></section>
    <section aria-label="Simulation controls" class="controls"><button id="start">Start</button><button id="pause">Pause</button><button id="reset">Reset</button><p>Focus the scene · WASD / arrows to move · hold Space for test pulses · cube stops at static proxies</p><label>Render quality <select id="quality" disabled><option value="high">High · shadows</option><option value="low">Low · no shadows</option></select></label> <label><input id="fog" type="checkbox" checked disabled> Distance fog</label> <label><input id="proxies" type="checkbox" disabled> Collision bounds</label><p id="render-stats" role="group" aria-label="Rendering measurements"></p><div id="diagnostics" role="group" aria-label="Engine diagnostics"></div></section><section tabindex="0" class="viewport" aria-label="Outdoor test scene"></section>
    <footer><p role="status">Starting renderer…</p><span>STATIC OUTDOOR SCENE · NO FLIGHT OR COMBAT</span></footer></main>`;
  const host = app.querySelector<HTMLElement>('.viewport');
  const status = app.querySelector<HTMLElement>('[role="status"]');
  if (!host || !status) throw new Error('Missing preview elements');
  const releasePreview = mountPreview(host, status);
  const dispose = () => {
    window.removeEventListener('pagehide', onPageHide);
    releasePreview();
  };
  const onPageHide = (event: PageTransitionEvent) => { if (!event.persisted) dispose(); };
  if (import.meta.hot) import.meta.hot.dispose(dispose);
  window.addEventListener('pagehide', onPageHide);
}
