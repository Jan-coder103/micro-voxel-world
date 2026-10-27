import { BufferAttribute, BufferGeometry, Color, Mesh, MeshStandardMaterial } from 'three';
import { TERRAIN, terrainHeight } from '../world/outdoor';

/** Exposed heightfield faces only; horizontal/vertical positions stay on the 0.1 m lattice. */
export function createTerrain() {
  const positions: number[] = [], colors: number[] = [];
  const grass = new Color('#708251'), earth = new Color('#665c43');
  const quad = (corners: number[][], color: Color) => {
    for (const index of [0, 1, 2, 0, 2, 3]) { positions.push(...corners[index]); colors.push(color.r, color.g, color.b); }
  };
  const { extent, cell, bottom } = TERRAIN;
  const height = (x: number, z: number) => x < -extent || x >= extent || z < -extent || z >= extent ? bottom : terrainHeight(x + cell / 2, z + cell / 2);
  for (let x = -extent; x < extent; x += cell) for (let z = -extent; z < extent; z += cell) {
    const y = height(x, z), x1 = x + cell, z1 = z + cell;
    quad([[x,y,z], [x,y,z1], [x1,y,z1], [x1,y,z]], grass);
    const left = height(x - cell, z), right = height(x1, z), back = height(x, z - cell), front = height(x, z1);
    if (left < y) quad([[x,left,z], [x,left,z1], [x,y,z1], [x,y,z]], earth);
    if (right < y) quad([[x1,right,z1], [x1,right,z], [x1,y,z], [x1,y,z1]], earth);
    if (back < y) quad([[x1,back,z], [x,back,z], [x,y,z], [x1,y,z]], earth);
    if (front < y) quad([[x,front,z1], [x1,front,z1], [x1,y,z1], [x,y,z1]], earth);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3));
  geometry.computeVertexNormals(); geometry.computeBoundingSphere();
  const material = new MeshStandardMaterial({ vertexColors: true, roughness: 1 });
  const mesh = new Mesh(geometry, material); mesh.name = 'static-heightfield'; mesh.receiveShadow = true;
  return { mesh, dispose() { geometry.dispose(); material.dispose(); mesh.removeFromParent(); } };
}
