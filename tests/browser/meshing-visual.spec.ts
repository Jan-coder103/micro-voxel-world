import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { stripTypeScriptTypes } from 'node:module';
import { parseSource } from '../../src/assets/voxel-source';
const fixtures = await Promise.all(['direction-marker', 'metre-cube'].map(async (name) => parseSource(await readFile(`assets/source/${name}.voxel.json`, 'utf8'))));
import { createBlock } from '../../src/assets/create-block';

/** Read-only test routes load actual modules without adding a test entry to the product build. */
test('cube reference, culled faces, greedy mesh and reloaded GLB have equivalent rendered silhouettes/colors', async ({ page }) => {
  const root = resolve('.');
  await page.route('**/__mesh-test/**', async (route) => {
    const path = new URL(route.request().url()).pathname.split('/__mesh-test/')[1];
    if (path === 'index.html') {
      await route.fulfill({ contentType: 'text/html', body: `<body style="margin:0"><script type="importmap">{"imports":{"three":"/__mesh-test/node_modules/three/build/three.module.js","three/addons/":"/__mesh-test/node_modules/three/examples/jsm/"}}</script></body>` });
      return;
    }
    const file = resolve(root, path);
    if (!file.startsWith(root + sep) || !/^(src\/(assets|rendering)\/|node_modules\/three\/)/.test(path)) { await route.abort(); return; }
    const contents = await readFile(file, 'utf8');
    await route.fulfill({ contentType: 'text/javascript', body: path.endsWith('.ts') ? stripTypeScriptTypes(contents) : contents });
  });
  await page.goto('/__mesh-test/index.html');
  const pair = createBlock('color-pair', 'Color pair', [2, 1, 1], '#ff3300');
  pair.palette.push({ id: 'blue', color: '#1144ff', material: 'matte' });
  pair.cells[1].palette = 'blue';
  const measurements = await page.evaluate(async (sources) => {
    const threeUrl = '/__mesh-test/node_modules/three/build/three.module.js';
    const meshUrl = '/__mesh-test/src/rendering/voxel-mesh.ts';
    const exportUrl = '/__mesh-test/src/assets/export-glb.ts';
    const loaderUrl = '/__mesh-test/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
    const THREE = await import(threeUrl);
    const { createVoxelMesh } = await import(meshUrl);
    const { exportVoxelGlb } = await import(exportUrl);
    const { GLTFLoader } = await import(loaderUrl);
    const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
    renderer.setSize(320, 320);
    document.body.append(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#111f29');
    scene.add(new THREE.HemisphereLight('#e0f0ff', '#66705a', 2.4));
    const light = new THREE.DirectionalLight('#fff0d8', 2.5);
    light.position.set(-3, 6, -4);
    scene.add(light);
    const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 100);
    const pixels = () => {
      renderer.render(scene, camera);
      const gl = renderer.getContext();
      const data = new Uint8Array(320 * 320 * 4);
      gl.readPixels(0, 0, 320, 320, gl.RGBA, gl.UNSIGNED_BYTE, data);
      return data;
    };
    const results = [];
    for (const source of sources) {
      const width = source.size[0] * source.voxelSize;
      const depth = source.size[2] * source.voxelSize;
      const geometry = new THREE.BoxGeometry(source.voxelSize, source.voxelSize, source.voxelSize);
      const material = new THREE.MeshStandardMaterial({ roughness: 0.9 });
      const cubes = new THREE.InstancedMesh(geometry, material, source.cells.length);
      source.cells.forEach((cell, index) => {
        cubes.setMatrixAt(index, new THREE.Matrix4().makeTranslation((cell.position[0] + 0.5) * source.voxelSize - width / 2, (cell.position[1] + 0.5) * source.voxelSize, (cell.position[2] + 0.5) * source.voxelSize - depth / 2));
        cubes.setColorAt(index, new THREE.Color(source.palette.find((entry) => entry.id === cell.palette)!.color));
      });
      const culled = createVoxelMesh(source, 'culled');
      const greedy = createVoxelMesh(source);
      const loaded = (await new GLTFLoader().parseAsync(await exportVoxelGlb(source), '')).scene;
      const center = new THREE.Vector3(0, source.size[1] * source.voxelSize / 2, 0);
      const distance = new THREE.Vector3(...source.size).length() * source.voxelSize * 2;
      for (const [view, vector] of [['perspective', [1, 0.8, -1]], ['front', [0, 0, -1]], ['top', [0, 1, -0.0001]]] as const) {
        camera.position.copy(center).addScaledVector(new THREE.Vector3(...vector).normalize(), distance);
        camera.lookAt(center);
        scene.add(cubes);
        const reference = pixels();
        scene.remove(cubes);
        for (const [name, object] of [['culled', culled.mesh], ['greedy', greedy.mesh], ['GLB', loaded]]) {
          scene.add(object);
          const actual = pixels();
          scene.remove(object);
          let difference = 0;
          let foreground = 0;
          for (let i = 0; i < actual.length; i += 4) {
            if (reference[i] !== reference[0] || reference[i + 1] !== reference[1] || reference[i + 2] !== reference[2]) foreground++;
            for (let j = 0; j < 3; j++) difference += Math.abs(reference[i + j] - actual[i + j]);
          }
          results.push({ asset: source.id, view, mode: name, foreground, meanRgbDifference: difference / (320 * 320 * 3) });
        }
      }
      cubes.dispose(); geometry.dispose(); material.dispose(); culled.dispose(); greedy.dispose();
      loaded.traverse((object: { isMesh?: boolean; geometry?: { dispose: () => void }; material?: { dispose: () => void } }) => {
        if (object.isMesh) { object.geometry!.dispose(); object.material!.dispose(); }
      });
    }
    renderer.dispose();
    return results;
  }, [...fixtures, pair]);
  for (const result of measurements) {
    expect(result.foreground, JSON.stringify(result)).toBeGreaterThan(1000);
    // Allow subpixel rasterization changes along coplanar cube edges; RGB values are 0–255.
    expect(result.meanRgbDifference, JSON.stringify(result)).toBeLessThan(0.5);
  }
});
