import { mountPreview } from '../rendering/mount-preview';
import './style.css';

export function bootstrap(mode: 'game' | 'tool') {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) throw new Error('Missing application root');
  const tool = mode === 'tool';
  app.innerHTML = `
    <header><a class="brand" href="/">MVW <span>/ DEVELOPMENT</span></a>
    <nav aria-label="Workspace"><a href="/" ${tool ? '' : 'aria-current="page"'}>Game</a><a href="/tools/voxel-editor/" ${tool ? 'aria-current="page"' : ''}>Voxel workshop</a></nav></header>
    <main><section class="intro"><p class="eyebrow">PHASE 01 / FOUNDATION</p>
    <h1>${tool ? 'Voxel workshop' : 'Micro Voxel World'}</h1>
    <p>${tool ? 'Asset tools begin here. The viewer arrives in phase 2.' : 'A world built small. A vision that flies large.'}</p></section>
    <section class="viewport" aria-label="Setup scene"></section>
    <footer><p role="status">Starting renderer…</p><span>SETUP SCENE · NO GAMEPLAY YET</span></footer></main>`;
  const host = app.querySelector<HTMLElement>('.viewport');
  const status = app.querySelector<HTMLElement>('[role="status"]');
  if (!host || !status) throw new Error('Missing preview elements');
  const dispose = mountPreview(host, status);
  if (import.meta.hot) import.meta.hot.dispose(dispose);
  window.addEventListener('pagehide', dispose, { once: true });
}
