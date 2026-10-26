import { PerspectiveCamera, WebGLRenderer } from 'three';
import { createSetupScene } from './setup-scene';

export function mountPreview(host: HTMLElement, status: HTMLElement): () => void {
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
  host.dataset.state = 'ready';
  status.textContent = 'Renderer ready · 1 m cube / 1 m grid';
  return () => {
    observer.disconnect();
    fixture.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}
