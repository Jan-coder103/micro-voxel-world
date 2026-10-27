import { Box3, Box3Helper, AxesHelper, Color, DirectionalLight, GridHelper, HemisphereLight, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createPreviewObject } from './preview-object';
import type { VoxelSource } from '../../src/assets/voxel-source';

export type View = 'perspective' | 'front' | 'top';

export function mountViewer(host: HTMLElement, status: HTMLElement) {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ antialias: true });
  } catch {
    host.dataset.state = 'unsupported';
    status.textContent = 'WebGL 2 unavailable. Enable hardware acceleration or try a supported desktop browser.';
    return null;
  }
  renderer.domElement.setAttribute('aria-label', 'Voxel asset preview. Drag to orbit, scroll to zoom, right-drag to pan.');
  renderer.domElement.tabIndex = 0;
  host.append(renderer.domElement);
  const scene = new Scene();
  scene.background = new Color('#111f29');
  scene.add(new HemisphereLight('#e0f0ff', '#66705a', 2.4));
  const key = new DirectionalLight('#fff0d8', 2.5);
  key.position.set(-3, 6, -4);
  scene.add(key);
  const grid = new GridHelper(10, 10, '#557c80', '#283f4b');
  const axes = new AxesHelper(0.6);
  axes.position.y = 0.002;
  scene.add(grid, axes);
  const selection = new Box3Helper(new Box3(), new Color('#ffffff'));
  selection.visible = false;
  scene.add(selection);
  const camera = new PerspectiveCamera(40, 1, 0.01, 100);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 0.15;
  controls.maxDistance = 30;
  controls.maxPolarAngle = Math.PI / 2;
  controls.listenToKeyEvents(renderer.domElement);
  let current: ReturnType<typeof createPreviewObject> | undefined;
  let disposed = false;
  let boundsVisible = true;
  const render = () => { if (!disposed) renderer.render(scene, camera); };
  controls.addEventListener('change', render);
  function frame(view: View = 'perspective') {
    if (!current) return;
    const centre = current.bounds.getCenter(new Vector3());
    const radius = current.bounds.getSize(new Vector3()).length() / 2;
    const vertical = camera.fov * Math.PI / 360;
    const angle = Math.min(vertical, Math.atan(Math.tan(vertical) * camera.aspect));
    const distance = radius / Math.sin(angle) * 1.25;
    const direction = view === 'front' ? new Vector3(0, 0, -1)
      : view === 'top' ? new Vector3(0, 1, -0.0001) : new Vector3(1, 0.8, -1);
    controls.maxDistance = Math.max(30, distance * 2);
    camera.far = Math.max(100, controls.maxDistance + radius * 2);
    camera.updateProjectionMatrix();
    controls.target.copy(centre);
    camera.position.copy(centre).addScaledVector(direction.normalize(), distance);
    controls.update();
    render();
  }
  const resize = () => {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(Math.max(host.clientWidth, 1), Math.max(host.clientHeight, 1));
    camera.aspect = Math.max(host.clientWidth, 1) / Math.max(host.clientHeight, 1);
    camera.updateProjectionMatrix();
    render();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  host.dataset.state = 'ready';
  return {
    select(asset: VoxelSource, preserveView = false) {
      current?.dispose();
      current = createPreviewObject(asset);
      current.helper.visible = boundsVisible;
      scene.add(current.group);
      if (!preserveView) frame();
      else render();
      status.textContent = `Viewing ${asset.name} · ${asset.cells.length.toLocaleString()} voxels`;
      return current.stats;
    },
    highlight(asset: VoxelSource, position: [number, number, number]) {
      selection.visible = position.every((n, axis) => Number.isInteger(n) && n >= 0 && n < asset.size[axis]);
      if (selection.visible) {
        const min = new Vector3(position[0] * 0.1 - asset.size[0] * 0.05, position[1] * 0.1, position[2] * 0.1 - asset.size[2] * 0.05);
        selection.box.set(min, min.clone().addScalar(0.1));
      }
      render();
    },
    frame,
    grid(visible: boolean) { grid.visible = visible; axes.visible = visible; render(); },
    bounds(visible: boolean) { boundsVisible = visible; if (current) current.helper.visible = visible; render(); },
    dispose() {
      if (disposed) return;
      disposed = true;
      observer.disconnect();
      controls.removeEventListener('change', render);
      controls.dispose();
      current?.dispose();
      grid.geometry.dispose();
      const materials = Array.isArray(grid.material) ? grid.material : [grid.material];
      materials.forEach((material) => material.dispose());
      axes.dispose();
      selection.dispose();
      scene.clear();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
