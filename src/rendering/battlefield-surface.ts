import { Color, type MeshStandardMaterial } from 'three';
import { heightAt } from '../streaming/terrain-data';
import { createTerrainFallback } from './terrain-fallback';

export const BATTLEFIELD_GROUND_EXTENT=1536;
/** Continuous city/forest ground overlaps the scenic mountains even between anchor updates. */
export function createBattlefieldGround(seed:number,material:MeshStandardMaterial){
  const coverage=createTerrainFallback(seed,(x,z)=>({height:heightAt(seed,x,z),color:battlefieldColor(seed,x,z,false)}),BATTLEFIELD_GROUND_EXTENT/16,{innerExtent:768,innerSpacing:16,drop:.12,material});
  coverage.mesh.name='battlefield-ground';coverage.mesh.receiveShadow=false;return coverage;
}

const grass = new Color('#858958'), dry = new Color('#a39564'), soil = new Color('#817457');
const road = new Color('#535957'), concrete = new Color('#949789');
const fract = (n: number) => n - Math.floor(n);
export const sceneryRandom = (seed: number, x: number, z: number) => fract(Math.sin(x * 127.1 + z * 311.7 + seed * .013) * 43758.5453);

/** World-space colors only: never changes the seeded terrain or saved world. */
export function battlefieldColor(seed: number, x: number, z: number, detail=true): number[] {
  const cx = Math.floor(x / 32), cz = Math.floor(z / 32), lx = x - cx * 32, lz = z - cz * 32;
  const yard = cx >= -4 && cx <= 4 && cz >= -4 && cz <= 4;
  const field = sceneryRandom(seed, Math.floor(x / 48), Math.floor(z / 48));
  const color = grass.clone().lerp(dry, field * .8);
  color.multiplyScalar(.98 + sceneryRandom(seed, Math.floor(x * 2), Math.floor(z * 2)) * .04);
  if (yard && detail) {
    if (Math.min(lx, 32 - lx, lz, 32 - lz) < 1.8) color.copy(road);
    else if (Math.abs(lx - 16) < 3.4 && Math.abs(lz - 16) < 7.2) color.copy(concrete);
    else if (Math.min(Math.abs(lx - 6), Math.abs(lx - 26), Math.abs(lz - 6), Math.abs(lz - 26)) < 1.4) color.lerp(soil, .8);
    // Small baked contact darkening complements the real shadow map.
    const distance = Math.hypot(Math.max(0, Math.abs(lx - 16) - 2), Math.max(0, Math.abs(lz - 16) - 6));
    color.multiplyScalar(1 - .25 * Math.exp(-distance * 1.4));
  }
  return color.toArray();
}

export interface WoodlandTree { x: number; z: number; pine: boolean; yaw: number; tint: number }
/** Vegetation stays outside the encounter square and beneath the flight safety envelope. */
export function woodland(seed: number): WoodlandTree[] {
  const trees: WoodlandTree[] = [];
  for (let z = -480; z <= 480; z += 9) for (let x = -480; x <= 480; x += 9) {
    const px=x+sceneryRandom(seed+2,x,z)*8,pz=z+sceneryRandom(seed+1,x,z)*8;
    // Six-metre verge measured after jitter keeps canopies clear of the city.
    if (px > -134 && px < 166 && pz > -134 && pz < 166) continue;
    if (Math.abs(px - 16) < 22 && pz > 160 && pz < 280) continue; // Home approach.
    const r = sceneryRandom(seed, x, z);
    const density = .5 + .28 * Math.sin(x / 73) * Math.cos(z / 67);
    if (r > density || Math.hypot(x, z) > 490) continue;
    trees.push({ x:px, z:pz, pine: r < .16, yaw: r * Math.PI * 2, tint: .8 + r * .4 });
  }
  return trees;
}
