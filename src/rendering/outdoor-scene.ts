import { Box3, Box3Helper, BoxGeometry, Color, DirectionalLight, Fog, HemisphereLight, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, Scene, Vector3 } from 'three';
import building from '../../assets/source/ref-utility-building.voxel.json';
import barn from '../../assets/source/ref-barn.voxel.json';
import tree from '../../assets/source/ref-field-tree.voxel.json';
import barrier from '../../assets/source/ref-road-barrier.voxel.json';
import lamp from '../../assets/source/ref-streetlight.voxel.json';
import { createVoxelMesh } from './voxel-mesh';
import { createTerrain } from './terrain';
import { assetMetres } from '../assets/voxel-source';
import { buildingPlacements, intersectsBox, proxyFor, terrainHeight, treePlacements, type CollisionProxy, type Placement } from '../world/outdoor';

export function createOutdoorScene() {
  const scene = new Scene(); scene.background = new Color('#aebec0'); scene.fog = new Fog('#aebec0', 55, 140);
  const releases: (() => void)[] = [];
  const proxies: CollisionProxy[] = [];
  const batches: InstancedMesh[] = [];
  const terrain = createTerrain(); scene.add(terrain.mesh); releases.push(terrain.dispose);
  const batch = (source: unknown, placements: Placement[]) => {
    const asset = createVoxelMesh(source);
    const instances = new InstancedMesh(asset.mesh.geometry, asset.mesh.material, placements.length);
    instances.name = asset.source.id; instances.castShadow = instances.receiveShadow = true;
    placements.forEach((p, i) => {
      const matrix = new Matrix4().makeRotationY(p.yaw); matrix.setPosition(p.x, terrainHeight(p.x, p.z), p.z);
      instances.setMatrixAt(i, matrix); proxies.push(proxyFor(`${asset.source.id}-${i}`, assetMetres(asset.source), p));
    });
    instances.computeBoundingSphere(); scene.add(instances); batches.push(instances);
    releases.push(() => { instances.dispose(); asset.dispose(); });
  };
  batch(building, buildingPlacements);
  batch(barn, [{ x: 13, z: -11, yaw: 0 }]);
  batch(tree, treePlacements);
  batch(barrier, Array.from({ length: 6 }, (_, i) => ({ x: 5, z: i * 5 - 13, yaw: Math.PI / 2 })));
  batch(lamp, Array.from({ length: 6 }, (_, i) => ({ x: -4, z: i * 9 - 23, yaw: -Math.PI / 2 })));
  const box = (name: string, w: number, h: number, d: number, color: string, x: number, y: number, z: number) => {
    const geometry = new BoxGeometry(w,h,d), material = new MeshStandardMaterial({ color, roughness: 1 });
    const mesh = new Mesh(geometry, material); mesh.name = name; mesh.position.set(x,y,z); mesh.receiveShadow = true; scene.add(mesh);
    releases.push(() => { geometry.dispose(); material.dispose(); }); return mesh;
  };
  box('road', 6, .1, 40, '#454b4b', 0, .05, 0);
  box('farm-track-west', 10.5, .1, 3, '#8c8063', -8.25, .05, 6);
  box('farm-track-east', 10.5, .1, 3, '#8c8063', 8.25, .05, 6);
  const markingGeometry = new BoxGeometry(.12,.01,1.8), markingMaterial = new MeshStandardMaterial({ color: '#ddd4af', roughness: 1 });
  const markings = new InstancedMesh(markingGeometry, markingMaterial, 12);
  for (let i = 0; i < 12; i++) markings.setMatrixAt(i, new Matrix4().makeTranslation(0,.106,i * 3.2 - 18));
  markings.name = 'road-markings'; scene.add(markings); batches.push(markings);
  releases.push(() => { markings.dispose(); markingGeometry.dispose(); markingMaterial.dispose(); });
  const cube = box('one-metre-scale-fixture', 1,1,1,'#e2b15f',0,.6,0); cube.castShadow = true;
  const sun = new DirectionalLight('#ffdfb2', 3); sun.position.set(-25,40,20); sun.castShadow = true;
  sun.shadow.mapSize.set(2048,2048); Object.assign(sun.shadow.camera, { left: -42, right: 42, top: 42, bottom: -42, near: 1, far: 110 });
  sun.shadow.normalBias = .08; sun.shadow.bias = -.0002;
  scene.add(sun, new HemisphereLight('#d9ebf2','#687052', 2));
  releases.push(() => sun.dispose());
  const helpers = proxies.map((p) => {
    const helper = new Box3Helper(new Box3(new Vector3(...p.min), new Vector3(...p.max)), '#ffe08a');
    helper.visible = false; scene.add(helper);
    releases.push(() => { helper.geometry.dispose(); (Array.isArray(helper.material) ? helper.material : [helper.material]).forEach((m) => m.dispose()); });
    return helper;
  });
  const groundHeight = (x: number, z: number) => Math.max(terrainHeight(x,z), Math.abs(x) <= 3 && Math.abs(z) <= 20 || Math.abs(x) <= 13.5 && Math.abs(z - 6) <= 1.5 ? .1 : 0);
  let disposed = false;
  return { scene, cube, proxies, batches, groundHeight,
    canOccupy(x: number, z: number) {
      const y = groundHeight(x,z);
      return !proxies.some((p) => intersectsBox({ id: 'test-cube', min: [x-.5,y,z-.5], max: [x+.5,y+1,z+.5] }, p));
    },
    showProxies(enabled: boolean) { helpers.forEach((helper) => { helper.visible = enabled; }); }, setFog(enabled: boolean) { scene.fog = enabled ? new Fog('#aebec0',55,140) : null; }, dispose() {
    if (disposed) return; disposed = true; releases.reverse().forEach((release) => release()); scene.clear();
  } };
}
