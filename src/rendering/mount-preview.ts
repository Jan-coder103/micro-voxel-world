import { Simulation } from '../engine/simulation';
import { bindInput } from '../engine/input';
import { BoxGeometry, Mesh, MeshBasicMaterial, PerspectiveCamera, WebGLRenderer } from 'three';
import { createSetupScene } from './setup-scene';

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
  const fixture = createSetupScene();
  const camera = new PerspectiveCamera(45, 1, 0.1, 200);
  camera.position.set(7, 5, 9);
  camera.lookAt(0, 0, 0);
  host.append(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', 'One metre cube on a metre grid');
  const resize = () => {
    const width = host.clientWidth;
    const height = host.clientHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(Math.max(width, 1), Math.max(height, 1));
    camera.aspect = Math.max(width, 1) / Math.max(height, 1);
    camera.updateProjectionMatrix();
    renderer.render(fixture.scene, camera);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  const simulation = new Simulation();
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
  const animate = (now: number) => {
    if (disposed) return;
    simulation.advance(previous === undefined ? 0 : (now - previous) / 1000, input.sample());
    previous = now;
    fixture.cube.position.set(simulation.x, 0.5, simulation.z);
    simulation.pulses.forEach((p, index) => {
      pulses[index].visible = p.active;
      pulses[index].position.set(p.x, 0.5 + p.age * 2, p.z);
    });
    update(); renderer.render(fixture.scene, camera);
    frame = requestAnimationFrame(animate);
  };
  update(); frame = requestAnimationFrame(animate);
  host.dataset.state = 'ready';
  status.textContent = 'Renderer ready · 1 m cube / 1 m grid';
  return () => {
    if (disposed) return;
    disposed = true; cancelAnimationFrame(frame);
    start.removeEventListener('click', onStart); pause.removeEventListener('click', onPause); reset.removeEventListener('click', onReset);
    document.removeEventListener('visibilitychange', onVisibility); window.removeEventListener('blur', onPause);
    input.dispose(); simulation.dispose(); pulseGeometry.dispose(); pulseMaterial.dispose();
    observer.disconnect();
    fixture.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}
