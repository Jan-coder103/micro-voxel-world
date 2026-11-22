import { airbaseReserved,airbaseSample } from '../world/airbase';
import { cropFields,FARM_BLOCK_SIZE,regionTrees,type RegionalTree } from '../world/regional-terrain';
import { SettlementWorld,type Road,type Building } from '../world/settlements';
import { terrainBounds,type TerrainBounds } from './terrain-bounds';
export interface ScenerySpec {kind:'forest'|'roads'|'settlements';x:number;z:number}
export interface ForestData {kind:'forest';cells:{key:string;trees:RegionalTree[]}[]}
export interface RoadData {kind:'roads';positions:Float32Array;normals:Float32Array;colors:Float32Array;bounds:TerrainBounds}
export interface SettlementData {kind:'settlements';detail:Building[];far:Building[]}
export type SceneryData=ForestData|RoadData|SettlementData;
/** Both the worker and its cooperative fallback use the same authoritative generators. */
export function* generateScenery(seed:number,world:SettlementWorld,spec:ScenerySpec):Generator<void,SceneryData>{
  if(spec.kind==='forest'){
    const cells:ForestData['cells']=[];
    for(let index=0;index<64;index++){
      const x=spec.x*8+index%8,z=spec.z*8+Math.floor(index/8);
      const trees=regionTrees({seed,x,z,lod:0,generator:'regional-v2'}).filter(t=>!airbaseReserved(t.x,t.z)&&!world.reserved(t.x,t.z));
      cells.push({key:`${x},${z}`,trees});yield;
    }
    return {kind:'forest',cells};
  }
  if(spec.kind==='settlements'){
    const cx=spec.x*128,cz=spec.z*128,unique=new Map<string,Building>();
    for(const dx of [-1024,0])for(const dz of [-1024,0]){
      const query=world.inBoundsGradually({minX:cx+dx,maxX:cx+dx+1024,minZ:cz+dz,maxZ:cz+dz+1024});
      let part=query.next();while(!part.done){yield;part=query.next();}
      for(const s of part.value)for(const b of s.buildings)if(!airbaseReserved(b.x,b.z,Math.max(b.width,b.depth)/2)&&Math.hypot(b.x-cx,b.z-cz)<1024)unique.set(b.id,b);
      yield;
    }
    const sorted=[...unique.values()].sort((a,b)=>Math.hypot(a.x-cx,a.z-cz)-Math.hypot(b.x-cx,b.z-cz)),detail=sorted.filter(b=>Math.hypot(b.x-cx,b.z-cz)<360).slice(0,512),ids=new Set(detail.map(b=>b.id));
    return {kind:'settlements',detail,far:sorted.filter(b=>!ids.has(b.id)).slice(0,2048)};
  }
  const ox=spec.x*512,oz=spec.z*512,positions:number[]=[],colors:number[]=[],roads:Road[]=[];
  const query=world.inBoundsGradually({minX:ox,maxX:ox+512,minZ:oz,maxZ:oz+512});
  let part=query.next();while(!part.done){yield;part=query.next();}for(const s of part.value)roads.push(...s.roads);
  for(let bz=Math.floor(oz/FARM_BLOCK_SIZE);bz<=Math.floor((oz+512)/FARM_BLOCK_SIZE);bz++)for(let bx=Math.floor(ox/FARM_BLOCK_SIZE);bx<=Math.floor((ox+512)/FARM_BLOCK_SIZE);bx++){
    for(const f of cropFields(seed,bx,bz))roads.push({minX:f.minX-2.5,maxX:f.maxX+2.5,minZ:f.minZ-2.5,maxZ:f.minZ-.2,id:'farm-lane',kind:'driveway',surface:'dirt',from:'farm',to:'farm'});yield;
  }
  for(const r of roads){
    const x0=Math.max(ox,r.minX),x1=Math.min(ox+512,r.maxX),z0=Math.max(oz,r.minZ),z1=Math.min(oz+512,r.maxZ);if(x1<=x0||z1<=z0)continue;
    const nx=Math.ceil((x1-x0)/8),nz=Math.ceil((z1-z0)/8);
    for(let iz=0;iz<nz;iz++)for(let ix=0;ix<nx;ix++){
      const corners=[[x0+(x1-x0)*ix/nx,z0+(z1-z0)*iz/nz],[x0+(x1-x0)*ix/nx,z0+(z1-z0)*(iz+1)/nz],[x0+(x1-x0)*(ix+1)/nx,z0+(z1-z0)*(iz+1)/nz],[x0+(x1-x0)*(ix+1)/nx,z0+(z1-z0)*iz/nz]];
      const samples=corners.map(([x,z])=>airbaseSample(seed,x,z));
      if(!corners.some(([x,z],i)=>airbaseReserved(x,z)||samples[i].water!==null))for(const i of [0,1,2,0,2,3]){const [x,z]=corners[i];positions.push(x-ox,samples[i].height+.16,z-oz);colors.push(...(r.surface==='dirt'||r.id==='farm-lane'?[.38,.28,.16]:r.kind==='driveway'?[.34,.33,.29]:[.12,.15,.16]));}
      yield;
    }
  }
  const p=new Float32Array(positions),normals=new Float32Array(p.length);
  for(let i=0;i<p.length;i+=9){
    const ax=p[i+6]-p[i+3],ay=p[i+7]-p[i+4],az=p[i+8]-p[i+5],bx=p[i]-p[i+3],by=p[i+1]-p[i+4],bz=p[i+2]-p[i+5];
    const x=ay*bz-az*by,y=az*bx-ax*bz,z=ax*by-ay*bx,length=Math.hypot(x,y,z)||1;
    for(let j=0;j<9;j+=3){normals[i+j]=x/length;normals[i+j+1]=y/length;normals[i+j+2]=z/length;}
    if(i%2304===0)yield;
  }
  return {kind:'roads',positions:p,normals,colors:new Float32Array(colors),bounds:terrainBounds(p)};
}
