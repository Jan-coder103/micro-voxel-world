import { BoxGeometry, Color, DirectionalLight, GridHelper, HemisphereLight, Mesh, MeshStandardMaterial, Scene } from 'three';

/** Disposable setup fixture, not a voxel asset format or terrain implementation. */
export function createSetupScene() {
  const scene = new Scene();
  scene.background = new Color('#111f29');
  const geometry = new BoxGeometry(1, 1, 1);
  const material = new MeshStandardMaterial({ color: '#d9b56f', roughness: 0.85 });
  const cube = new Mesh(geometry, material);
  cube.name = 'one-metre-scale-fixture';
  cube.position.y = 0.5;
  scene.add(cube);
  const grid = new GridHelper(20, 20, '#557c80', '#283f4b');
  scene.add(grid, new HemisphereLight('#dceeff', '#546343', 2));
  const sun = new DirectionalLight('#ffe0ae', 3);
  sun.position.set(4, 8, 3);
  scene.add(sun);

  return { scene, dispose() {
    geometry.dispose();
    material.dispose();
    grid.geometry.dispose();
    const materials = Array.isArray(grid.material) ? grid.material : [grid.material];
    materials.forEach((entry) => entry.dispose());
    scene.clear();
  } };
}
