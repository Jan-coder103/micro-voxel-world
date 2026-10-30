import { regionalSample } from './regional-terrain.ts';

/** Shared by workers, collision, coarse LOD and navigation. */
export const AIRBASE={x:0,z:360,minZ:120,maxZ:600,halfWidth:22,spawnZ:548};
export function airbaseReserved(x:number,z:number,padding=0){return Math.abs(x)<178+padding&&z>AIRBASE.minZ-146-padding&&z<AIRBASE.maxZ+146+padding;}
export function onRunway(x:number,z:number,margin=0){return Math.abs(x)<=AIRBASE.halfWidth-margin&&z>=AIRBASE.minZ+margin&&z<=AIRBASE.maxZ-margin;}
const heights=new Map<number,number>();
export function airbaseHeight(seed:number){let height=heights.get(seed);if(height===undefined){height=regionalSample(seed,0,AIRBASE.z).height+1;heights.set(seed,height);if(heights.size>8)heights.delete(heights.keys().next().value!);}return height;}
export function airbaseSample(seed:number,x:number,z:number){
  const s=regionalSample(seed,x,z);
  const distance=Math.max(Math.abs(x)-82,AIRBASE.minZ-50-z,z-AIRBASE.maxZ-50,0);
  if(distance>=96)return s;
  const t=distance/96,w=t*t*(3-2*t),height=airbaseHeight(seed)*(1-w)+s.height*w;
  return {...s,height,water:distance===0?null:s.water!==null&&s.water>height?s.water:null,color:distance===0?[.36,.43,.22]:s.color};
}

export function airbaseObstacles(seed:number){const y=airbaseHeight(seed);return [
  {minX:43,maxX:73,minZ:461,maxZ:499,minY:y,maxY:y+12.6},
  {minX:46,maxX:58,minZ:394,maxZ:406,minY:y,maxY:y+20},
];}
