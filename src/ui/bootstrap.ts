import { mountPreview } from '../rendering/mount-preview';
import './style.css';

export function bootstrap() {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) throw new Error('Missing application root');
  app.innerHTML = `
    <header><a class="brand" href="/">MVW <span>/ DEVELOPMENT</span></a>
    <nav aria-label="Workspace"><a href="/" aria-current="page">Game</a><a href="/tools/voxel-editor/">Voxel workshop</a></nav></header>
    <main><section class="intro"><p class="eyebrow">PHASE 06 / ENGINE</p>
    <h1>Micro Voxel World</h1>
    <p>A world built small. A vision that flies large.</p></section>
    <section aria-label="Simulation controls" class="controls"><button id="start">Start</button><button id="pause">Pause</button><button id="reset">Reset</button><p>Focus the scene · WASD / arrows to move · hold Space for test pulses</p><div id="diagnostics" role="group" aria-label="Engine diagnostics"></div></section><section tabindex="0" class="viewport" aria-label="Setup scene"></section>
    <footer><p role="status">Starting renderer…</p><span>ENGINE TEST SCENE · NO FLIGHT OR COMBAT</span></footer></main>`;
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
