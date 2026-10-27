import { Simulation } from '../engine/simulation';
import { bindInput } from '../engine/input';
import { BoxGeometry, Mesh, MeshBasicMaterial, PCFShadowMap, PerspectiveCamera, WebGLRenderer } from 'three';
import { createOutdoorScene } from './outdoor-scene';

export function mountPreview(host: HTMLElement, status: HTMLElement): () => void {
  const start = document.querySelector<HTMLButtonElement>('#start')!;
  const pause = document.querySelector<HTMLButtonElement>('#pause')!;
  const reset = document.querySelector<HTMLButtonElement>('#reset')!;
  const diagnostics = document.querySelector<HTMLElement>('#diagnostics')!;
  start.disabled = pause.disabled = reset.disabled = true;
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ antialias: true });
  } catch {
    status.textContent = 'WebGL 2 unavailable. Enable hardware acceleration or try a supported desktop browser.';
    host.dataset.state = 'unsupported';
    return () => {};
  }
  const buildStart = performance.now();
  const fixture = createOutdoorScene();
  const buildMs = performance.now() - buildStart;
  const quality = document.querySelector<HTMLSelectElement>('#quality')!;
  const fog = document.querySelector<HTMLInputElement>('#fog')!;
  const proxies = document.querySelector<HTMLInputElement>('#proxies')!;
  const measurements = document.querySelector<HTMLElement>('#render-stats')!;
  quality.disabled = fog.disabled = proxies.disabled = false;
  const frameTimes: number[] = [];
  renderer.shadowMap.type = PCFShadowMap;
  const onQuality = () => {
    frameTimes.length = 0; renderer.shadowMap.enabled = quality.value === 'high';
    fixture.scene.traverse((object) => {
      if (object instanceof Mesh) (Array.isArray(object.material) ? object.material : [object.material]).forEach((material) => { material.needsUpdate = true; });
    });
    resize();
  };
  const onFog = () => fixture.setFog(fog.checked);
  const onProxies = () => fixture.showProxies(proxies.checked);
  quality.addEventListener('change', onQuality); fog.addEventListener('change', onFog); proxies.addEventListener('change', onProxies);
  const camera = new PerspectiveCamera(45, 1, 0.1, 200);
  camera.position.set(48, 38, 52);
  camera.lookAt(0, 0, 0);
  host.append(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', 'Static voxel countryside with road, buildings and instanced trees');
  const resize = () => {
    const width = host.clientWidth;
    const height = host.clientHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.value === 'high' ? 1.5 : 1));
    renderer.setSize(Math.max(width, 1), Math.max(height, 1));
    camera.aspect = Math.max(width, 1) / Math.max(height, 1);
    camera.updateProjectionMatrix();
    renderer.render(fixture.scene, camera);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  onQuality();
  const simulation = new Simulation(fixture.canOccupy);
  const input = bindInput(host);
  const pulseGeometry = new BoxGeometry(0.15, 0.15, 0.15);
  const pulseMaterial = new MeshBasicMaterial({ color: '#e7c885' });
  const pulses = simulation.pulses.map(() => {
    const mesh = new Mesh(pulseGeometry, pulseMaterial);
    mesh.visible = false; fixture.scene.add(mesh); return mesh;
  });
  let disposed = false;
  let previous: number | undefined;
  let frame = 0;
  const update = () => {
    start.textContent = simulation.status === 'paused' ? 'Resume' : 'Start';
    start.disabled = simulation.status === 'running';
    pause.disabled = simulation.status !== 'running'; reset.disabled = false;
    diagnostics.textContent = `${simulation.status} · tick ${simulation.ticks} · 60 Hz · position ${simulation.x.toFixed(2)}, ${simulation.z.toFixed(2)} m · pulses ${simulation.pulses.filter((p) => p.active).length}/16 · dropped ${simulation.droppedSeconds.toFixed(3)} s`;
    host.dataset.lifecycle = simulation.status;
  };
  const onStart = () => { simulation.start(); previous = undefined; input.clear(); host.focus(); update(); };
  const onPause = () => { simulation.pause(); previous = undefined; input.clear(); update(); };
  const onReset = () => { simulation.reset(); previous = undefined; input.clear(); update(); };
  const onVisibility = () => { if (document.hidden) onPause(); };
  start.addEventListener('click', onStart); pause.addEventListener('click', onPause); reset.addEventListener('click', onReset);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('blur', onPause);
  let lastReport = 0;
  const animate = (now: number) => {
    if (disposed) return;
    simulation.advance(previous === undefined ? 0 : (now - previous) / 1000, input.sample());
    previous = now;
    fixture.cube.position.set(simulation.x, fixture.groundHeight(simulation.x, simulation.z) + .5, simulation.z);
    simulation.pulses.forEach((p, index) => {
      pulses[index].visible = p.active;
      pulses[index].position.set(p.x, fixture.groundHeight(p.x,p.z) + .5 + p.age * 2, p.z);
    });
    update();
    const renderStart = performance.now();
    renderer.render(fixture.scene, camera);
    frameTimes.push(performance.now() - renderStart);
    if (frameTimes.length > 120) frameTimes.shift();
    if (now - lastReport > 250) {
      lastReport = now;
      const sorted = [...frameTimes].sort((a,b) => a-b);
      const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
      measurements.textContent = `${quality.value} · ${renderer.info.render.calls} calls · ${renderer.info.render.triangles.toLocaleString('en-US')} triangles · ${renderer.info.memory.geometries} geometries · CPU submit median ${median.toFixed(2)} ms · scene build ${buildMs.toFixed(1)} ms · ${fixture.proxies.length} proxies`;
      measurements.dataset.sample = JSON.stringify({ quality: quality.value, calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, cpuSubmitMedianMs: median, sceneBuildMs: buildMs, samples: frameTimes.length, width: renderer.domElement.width, height: renderer.domElement.height });
    }
    frame = requestAnimationFrame(animate);
  };
  update(); frame = requestAnimationFrame(animate);
  host.dataset.state = 'ready';
  status.textContent = 'Renderer ready · 64 × 64 m static terrain · 0.1 m asset voxels';
  return () => {
    if (disposed) return;
    disposed = true; cancelAnimationFrame(frame);
    start.removeEventListener('click', onStart); pause.removeEventListener('click', onPause); reset.removeEventListener('click', onReset);
    document.removeEventListener('visibilitychange', onVisibility); window.removeEventListener('blur', onPause);
    quality.removeEventListener('change', onQuality); fog.removeEventListener('change', onFog); proxies.removeEventListener('change', onProxies);
    input.dispose(); simulation.dispose(); pulseGeometry.dispose(); pulseMaterial.dispose();
    observer.disconnect();
    fixture.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}
