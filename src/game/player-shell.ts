/** The root is the player entry; /play/ retains the combat development tools. */
export function mountPlayerShell(app: HTMLElement): () => void {
  if (location.pathname !== '/') return () => {};
  document.body.classList.add('player-game');
  const host = app.querySelector<HTMLElement>('.sortie-scene')!;
  const compass = document.createElement('div');
  compass.className = 'compass-hud'; compass.setAttribute('aria-hidden', 'true');
  compass.innerHTML = '<span>HDG</span><i></i><b id="heading-readout">000°</b><i></i><span>MAG</span>';
  host.append(compass);
  const header = app.querySelector<HTMLElement>('header')!;
  header.innerHTML = '<a class="brand" href="/">MICRO VOXEL WORLD</a><button id="open-menu">Esc · Menu</button>';
  const menu = document.createElement('dialog');
  menu.className = 'game-menu';
  menu.setAttribute('aria-label', 'Game menu');
  menu.innerHTML = '<p class="eyebrow">MICRO VOXEL WORLD</p><h1>Ready for your next sortie?</h1><p>Choose your mission and aircraft, clear the marked hordes, and make it home.</p><button id="launch">Fly / Resume</button> <button id="show-settings" aria-expanded="false">Settings</button><section id="hangar" aria-label="Mission and equipment"></section><section id="player-settings" aria-label="Settings" hidden><h2>Settings</h2><label><input id="developer-tools" type="checkbox"> Enable developer tools</label><nav id="developer-links" aria-label="Developer tools" hidden></nav></section>';
  app.append(menu);
  const hangar = menu.querySelector<HTMLElement>('#hangar')!;
  const settings = menu.querySelector<HTMLElement>('#player-settings')!;
  for (const selector of ['.sortie-title', '.mission-board', '.sortie-controls', '.pilot-help', '.mission-debrief']) hangar.append(app.querySelector(selector)!);
  settings.prepend(app.querySelector('.comfort-controls')!);
  settings.prepend(app.querySelector('#scale')!.closest('label')!);
  settings.prepend(app.querySelector('#sound')!);
  app.querySelector('main > details')!.setAttribute('hidden', '');
  const start = app.querySelector<HTMLButtonElement>('#start')!;
  const pause = app.querySelector<HTMLButtonElement>('#pause')!;
  start.hidden = true; pause.hidden = true;
  const launch = menu.querySelector<HTMLButtonElement>('#launch')!;
  const showSettings = menu.querySelector<HTMLButtonElement>('#show-settings')!;
  const open = () => { if (!menu.open) { pause.click(); menu.showModal(); launch.focus(); } };
  launch.onclick = () => { menu.close(); start.click(); host.focus(); };
  showSettings.onclick = () => {
    settings.hidden = !settings.hidden; hangar.hidden = !settings.hidden;
    showSettings.setAttribute('aria-expanded', String(!settings.hidden));
  };
  const developer = menu.querySelector<HTMLInputElement>('#developer-tools')!;
  const links = menu.querySelector<HTMLElement>('#developer-links')!;
  for (const [url, title] of [
    ['/play/', 'Combat lab and diagnostics'], ['/tools/outdoor/', 'Environment lab'],
    ['/tools/flight/', 'Flight lab'], ['/tools/hordes/', 'Horde lab'],
    ['/tools/weapons/', 'Weapons lab'], ['/tools/streaming/', 'Streaming lab'],
    ['/tools/streaming/?terrain=regional', 'Terrain explorer'], ['/tools/voxel-editor/', 'Voxel workshop'],
  ]) { const link = document.createElement('a'); link.href = url; link.textContent = title; links.append(link); }
  try { developer.checked = localStorage.getItem('mvw-developer-tools') === 'true'; } catch { /* Session fallback. */ }
  links.hidden = !developer.checked;
  developer.onchange = () => {
    links.hidden = !developer.checked;
    try { localStorage.setItem('mvw-developer-tools', String(developer.checked)); } catch { /* Session fallback. */ }
  };
  app.querySelector<HTMLButtonElement>('#open-menu')!.onclick = open;
  const escape = (event: KeyboardEvent) => {
    if (event.code !== 'Escape') return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (menu.open) { menu.close(); host.focus(); } else open();
  };
  window.addEventListener('keydown', escape, true);
  menu.addEventListener('cancel', event => { event.preventDefault(); menu.close(); host.focus(); });
  open();
  return () => { window.removeEventListener('keydown', escape, true); compass.remove(); menu.remove(); document.body.classList.remove('player-game'); };
}
