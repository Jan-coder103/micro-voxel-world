import { createTerrainFallback } from '../rendering/terrain-fallback';
import { airbaseSample } from '../world/airbase';
import { FRONTIER_COVERAGE,type CoverageData } from './coverage-data';
import { terrainBounds } from './terrain-bounds';
let view:ReturnType<typeof createTerrainFallback>|undefined,seed:number|undefined;
self.onmessage=(event:MessageEvent<{id:number;seed:number;x:number;z:number}>)=>{
  const request=event.data;
  try{
    if(seed!==request.seed||!view){view?.dispose();seed=request.seed;const currentSeed=seed;view=createTerrainFallback(seed,(x,z)=>{const s=airbaseSample(currentSeed,x,z);return {height:Math.max(s.height,s.water??-Infinity),color:[...s.color],waterDepth:s.water!==null?Math.max(0,s.water-s.height):1000};},FRONTIER_COVERAGE.spacing,FRONTIER_COVERAGE);}
    view.update(request.x,request.z);const geometry=view.mesh.geometry;
    const data:CoverageData={id:request.id,x:view.mesh.position.x,z:view.mesh.position.z,positions:new Float32Array(geometry.getAttribute('position').array),normals:new Float32Array(geometry.getAttribute('normal').array),colors:new Float32Array(geometry.getAttribute('color').array),waterDepth:new Float32Array(geometry.getAttribute('waterDepth').array),bounds:terrainBounds(geometry.getAttribute('position').array as Float32Array)};
    self.postMessage(data,{transfer:[data.positions.buffer,data.normals.buffer,data.colors.buffer,data.waterDepth.buffer]});
  }catch(error){self.postMessage({id:request.id,error:String(error)});}
};
