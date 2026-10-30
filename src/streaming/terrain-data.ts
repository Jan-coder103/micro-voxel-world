import { airbaseSample, airbaseReserved } from '../world/airbase.ts';
import { regionalSample, decorateRegion } from '../world/regional-terrain.ts';
import { appendRoads, settlementWorld, type Building } from '../world/settlements.ts';
export const CHUNK_SIZE = 32;
export const WORLD_LIMIT = 4096;
export const GENERATOR_VERSION = 1;
export type Lod = 0 | 1 | 2 | 3;
export interface ChunkSpec { x: number; z: number; lod: Lod; seed: number; generator?: 'regional-v2'; structures?: true; airbase?: true }
export interface TerrainData { positions: Float32Array; normals: Float32Array; colors: Float32Array; buildings?: Building[] }
export const chunkKey = (x: number, z: number) => `${x},${z}`;
export const signature = (s: ChunkSpec) => `${s.seed}:${s.x},${s.z}:${s.lod}${s.generator ? `:${s.generator}` : ''}${s.structures ? ':s1' : ''}${s.airbase ? ':a1' : ''}`;
export function heightAt(seed: number, x: number, z: number): number {
  let hash=seed>>>0;
  hash=Math.imul(hash^(hash>>>16),0x7feb352d); hash=Math.imul(hash^(hash>>>15),0x846ca68b); hash^=hash>>>16;
  const phase = (hash >>> 0) / 4294967296 * Math.PI * 2;
  return Math.round((6 + 4 * Math.sin(x / 73 + phase) * Math.cos(z / 91 - phase) + 1.5 * Math.sin((x + z) / 27 + phase)) * 10) / 10;
}
export function wantedChunks(seed: number, worldX: number, worldZ: number): ChunkSpec[] {
  const cx = Math.floor(worldX / CHUNK_SIZE), cz = Math.floor(worldZ / CHUNK_SIZE);
  const result: ChunkSpec[] = [];
  for (let z = cz-3; z <= cz+3; z++) for (let x = cx-3; x <= cx+3; x++) {
    if (Math.abs(x) > WORLD_LIMIT || Math.abs(z) > WORLD_LIMIT) continue;
    result.push({ seed, x, z, lod: Math.max(Math.abs(x-cx), Math.abs(z-cz)) as Lod });
  }
  return result.sort((a,b) => a.lod-b.lod || a.z-b.z || a.x-b.x);
}

/** Every tier keeps the full 1 m perimeter. Boundary cell fans stitch coarse interiors to that perimeter. */
export function generateTerrain(spec: ChunkSpec): TerrainData {
  const positions: number[] = [], normals: number[] = [], colors: number[] = [];
  const step = 2 ** spec.lod, ox = spec.x * CHUNK_SIZE, oz = spec.z * CHUNK_SIZE;
  const palette = [[.29,.40,.18],[.24,.35,.19],[.21,.31,.22],[.19,.28,.25]][spec.lod];
  const vertex = (x: number,z: number) => {
    const sample = spec.generator ? (spec.airbase?airbaseSample:regionalSample)(spec.seed, ox+x, oz+z) : undefined;
    return [x, sample ? Math.max(sample.height, sample.water ?? -Infinity) : heightAt(spec.seed, ox+x, oz+z), z];
  };
  const triangle = (a: number[], b: number[], c: number[]) => {
    const ux=b[0]-a[0], uy=b[1]-a[1], uz=b[2]-a[2], vx=c[0]-a[0], vy=c[1]-a[1], vz=c[2]-a[2];
    const nx=uy*vz-uz*vy, ny=uz*vx-ux*vz, nz=ux*vy-uy*vx, length=Math.hypot(nx,ny,nz);
    for (const p of [a,b,c]) { positions.push(...p); normals.push(nx/length,ny/length,nz/length); colors.push(...(spec.generator ? (spec.airbase?airbaseSample:regionalSample)(spec.seed,ox+p[0],oz+p[2]).color : palette)); }
  };
  for (let x=0; x<CHUNK_SIZE; x+=step) for (let z=0; z<CHUNK_SIZE; z+=step) {
    const perimeter: number[][] = [];
    const edge = (ax: number,az: number,bx: number,bz: number,fine: boolean) => {
      const segments = fine ? step : 1;
      for (let i=0; i<segments; i++) perimeter.push(vertex(ax+(bx-ax)*i/segments,az+(bz-az)*i/segments));
    };
    edge(x,z,x,z+step,x===0);
    edge(x,z+step,x+step,z+step,z+step===CHUNK_SIZE);
    edge(x+step,z+step,x+step,z,x+step===CHUNK_SIZE);
    edge(x+step,z,x,z,z===0);
    const centre=vertex(x+step/2,z+step/2);
    perimeter.forEach((p,i) => triangle(centre,p,perimeter[(i+1)%perimeter.length]));
  }
  const structures=spec.generator && spec.structures;
  if (spec.generator) decorateRegion(spec,positions,normals,colors,spec.airbase||structures?(x,z)=>(!!spec.airbase&&airbaseReserved(x,z))||!!structures&&settlementWorld(spec.seed).reserved(x,z):undefined);
  const buildings=structures ? appendRoads(spec.seed,spec.x,spec.z,positions,normals,colors,spec.airbase?airbaseReserved:undefined,!spec.airbase) : undefined;
  return { positions: new Float32Array(positions), normals: new Float32Array(normals), colors: new Float32Array(colors),...(buildings?{buildings}: {}) };
}
