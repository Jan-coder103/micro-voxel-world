import type { ChunkSpec } from '../streaming/terrain-data';

/** Independent v2 field: old combat/marker worlds retain generator v1. Units are metres. */
export const REGIONAL_VERSION = 2;
export type Biome = 'ocean' | 'coast' | 'river' | 'lake' | 'plains' | 'forest' | 'mountains';
const clamp = (n:number) => Math.max(0,Math.min(1,n));
const smooth = (n:number) => { const t=clamp(n); return t*t*(3-2*t); };
export function regionalHash(seed:number,x:number,z:number,salt=0):number {
  let h=(seed^Math.imul(x,374761393)^Math.imul(z,668265263)^salt)>>>0;
  h=Math.imul(h^(h>>>13),1274126177); return ((h^(h>>>16))>>>0)/4294967296;
}
function noise(seed:number,x:number,z:number,scale:number,salt:number):number {
  const ax=Math.floor(x/scale),az=Math.floor(z/scale),tx=smooth(x/scale-ax),tz=smooth(z/scale-az);
  const a=regionalHash(seed,ax,az,salt),b=regionalHash(seed,ax+1,az,salt),c=regionalHash(seed,ax,az+1,salt),d=regionalHash(seed,ax+1,az+1,salt);
  return (a+(b-a)*tx)*(1-tz)+(c+(d-c)*tx)*tz;
}
export function regionLayout(seed:number) {
  const offset=(regionalHash(seed,0,0,71)-.5)*400;
  const coast=-1400+offset;
  return {coast, lakeX:500+offset, riverZ:(x:number)=>offset+100*Math.sin(x/570+regionalHash(seed,0,0,99)*6.28)};
}
export interface RegionalSample { height:number; water:number|null; biome:Biome; moisture:number; color:readonly number[] }
/** Global continuous fields, terraced to 0.1 m only after valley/shore shaping. */
export function regionalSample(seed:number,x:number,z:number):RegionalSample {
  const layout=regionLayout(seed),coast=layout.coast+noise(seed,0,z,700,8)*160;
  const inland=x-coast;
  const broad=noise(seed,x,z,620,1),detail=noise(seed,x,z,95,2),fine=noise(seed,x,z,23,3);
  const moisture=noise(seed,x,z,400,4);
  const mountain=smooth((z-450)/550)*smooth((inland-1000)/650);
  // Ridged elevation with a smooth valley envelope approximates erosion-shaped drainage.
  const ridge=1-Math.abs(noise(seed,x,z,240,5)*2-1);
  let height=Math.max(-55,Math.min(60,inland*.018))-7+(broad-.5)*18+(detail-.5)*5+(fine-.5)*.8+mountain*ridge*125;
  const riverDistance=Math.abs(z-layout.riverZ(x));
  const reach=x<layout.lakeX-210 ? layout.coast+(x-layout.coast)*(layout.lakeX-layout.coast)/(layout.lakeX-210-layout.coast) : x<=layout.lakeX+210 ? layout.lakeX : x-210;
  const riverLevel=Math.max(0,Math.min(55,(reach-layout.coast)*.012));
  const valley=smooth((100-riverDistance)/75);
  height=height*(1-valley)+Math.min(height,riverLevel-3+Math.max(0,riverDistance-12)*.18)*valley;
  const lakeZ=layout.riverZ(layout.lakeX)+65;
  const lakeDistance=Math.hypot((x-layout.lakeX)/155,(z-lakeZ)/110);
  const lakeLevel=(layout.lakeX-layout.coast)*.012;
  if(lakeDistance<1.3) height=Math.min(height,lakeLevel-5+Math.max(0,lakeDistance-.65)*19);
  let water:number|null=height<0 ? 0 : null;
  let biome:Biome=height<0 ? 'ocean' : height<3 || inland<180 ? 'coast' : mountain>.45 ? 'mountains' : moisture>.48 ? 'forest' : 'plains';
  if(riverLevel>0 && riverDistance<42 && height<riverLevel){water=riverLevel;biome='river';}
  if(lakeDistance<1.3 && height<lakeLevel){water=lakeLevel;biome='lake';}
  if(water===0)biome='ocean';
  height=Math.round(height*10)/10;
  const color=water!==null ? [.10,.36,.49] : biome==='coast' ? [.62,.57,.37] : biome==='mountains' ? [.46,.47,.40] : biome==='forest' ? [.22,.36,.16] : [.43,.52,.24];
  return {height,water,biome,moisture,color};
}
export interface RegionalTree { x:number; z:number; y:number; height:number }
/** Global 8 m placement lattice; half-open ownership prevents duplicates at chunk edges. */
export function regionTrees(spec:ChunkSpec):RegionalTree[] {
  const result:RegionalTree[]=[];
  const sites=nearbySites(spec);
  if(spec.lod>1)return result;
  for(let z=spec.z*32;z<(spec.z+1)*32;z+=8)for(let x=spec.x*32;x<(spec.x+1)*32;x+=8){
    const px=x+1+regionalHash(spec.seed,x,z,21)*6,pz=z+1+regionalHash(spec.seed,x,z,22)*6;
    const sample=regionalSample(spec.seed,px,pz);
    const slope=Math.max(Math.abs(regionalSample(spec.seed,px+2,pz).height-sample.height),Math.abs(regionalSample(spec.seed,px,pz+2).height-sample.height))/2;
    if(sites.some(site=>Math.hypot(site.x-px,site.z-pz)<site.radius+3) || sample.water!==null || slope>.5 || !['forest','plains'].includes(sample.biome) || regionalHash(spec.seed,x,z,23)>(sample.biome==='forest'?.8:.08))continue;
    result.push({x:px,z:pz,y:sample.height,height:4+regionalHash(spec.seed,x,z,24)*5});
  }
  return result;
}
export interface SettlementSite { id:string; x:number; z:number; y:number; radius:number }
/** Regional candidates only; roads/buildings and collision are Phase 14. */
export function settlementSite(seed:number,rx:number,rz:number):SettlementSite|null {
  for(let attempt=0;attempt<12;attempt++){
    const x=(rx+regionalHash(seed,rx,rz,100+attempt*2))*512,z=(rz+regionalHash(seed,rx,rz,101+attempt*2))*512;
    const s=regionalSample(seed,x,z),radius=18;
    if(s.water!==null || !['plains','forest'].includes(s.biome))continue;
    if([[radius,0],[-radius,0],[0,radius],[0,-radius],[radius,radius],[-radius,radius],[radius,-radius],[-radius,-radius]].some(([dx,dz])=>{const edge=regionalSample(seed,x+dx,z+dz);return edge.water!==null || Math.abs(edge.height-s.height)>2;}))continue;
    return {id:`v2:${seed>>>0}:settlement:${rx},${rz}`,x,z,y:s.height,radius};
  }
  return null;
}
function nearbySites(spec:ChunkSpec):SettlementSite[]{
  const sites:SettlementSite[]=[];
  const minX=spec.x*32-21,maxX=(spec.x+1)*32+21,minZ=spec.z*32-21,maxZ=(spec.z+1)*32+21;
  for(let z=Math.floor(minZ/512);z<=Math.floor(maxZ/512);z++)for(let x=Math.floor(minX/512);x<=Math.floor(maxX/512);x++){
    const site=settlementSite(spec.seed,x,z);if(site && site.x>=minX && site.x<=maxX && site.z>=minZ && site.z<=maxZ)sites.push(site);
  }
  return sites;
}
/** Baked cuboids share the chunk's owned buffers/material; no per-tree GPU objects. */
export function decorateRegion(spec:ChunkSpec,positions:number[],normals:number[],colors:number[]) {
  const box=(x:number,y:number,z:number,w:number,h:number,color:number[])=>{
    const corners=[[x-w/2,y,z-w/2],[x+w/2,y,z-w/2],[x+w/2,y+h,z-w/2],[x-w/2,y+h,z-w/2],[x-w/2,y,z+w/2],[x+w/2,y,z+w/2],[x+w/2,y+h,z+w/2],[x-w/2,y+h,z+w/2]];
    for(const [a,b,c,d,nx,ny,nz] of [[0,3,2,1,0,0,-1],[4,5,6,7,0,0,1],[0,4,7,3,-1,0,0],[1,2,6,5,1,0,0],[3,7,6,2,0,1,0],[0,1,5,4,0,-1,0]]){
      for(const i of [a,b,c,a,c,d]){positions.push(...corners[i]);normals.push(nx,ny,nz);colors.push(...color);}
    }
  };
  // A low site beacon is a descriptor preview, not a generated building.
  for(const site of nearbySites(spec))if(Math.floor(site.x/32)===spec.x && Math.floor(site.z/32)===spec.z){
    box(site.x-spec.x*32,site.y,site.z-spec.z*32,2,4,[.85,.65,.24]);
  }
  for(const tree of regionTrees(spec)){
    const x=tree.x-spec.x*32,z=tree.z-spec.z*32;
    box(x,tree.y-.2,z,.65,tree.height,[.26,.19,.12]);
    box(x,tree.y+tree.height*.45,z,3.5,tree.height*.6,[.16,.29,.12]);
    box(x,tree.y+tree.height*.85,z,2.2,tree.height*.35,[.22,.37,.15]);
  }
}

export function regionalLandmarks(seed:number) {
  const l=regionLayout(seed);
  let forest={x:0,z:350},plains={x:0,z:300},coast={x:l.coast+80,z:-400};
  outer:for(let z=200;z<900;z+=64)for(let x=-300;x<700;x+=64)if(regionalSample(seed,x,z).biome==='plains'){plains={x,z};break outer;}
  for(let x=l.coast;x<l.coast+1000;x+=4)if(regionalSample(seed,x,-400).biome==='coast'){coast={x,z:-400};break;}
  outer:for(let z=200;z<900;z+=64)for(let x=-300;x<700;x+=64)if(regionalSample(seed,x,z).biome==='forest'){forest={x,z};break outer;}
  let settlement:SettlementSite|null=null;
  outer:for(let z=0;z<4;z++)for(let x=-1;x<3;x++)if((settlement=settlementSite(seed,x,z)))break outer;
  return {Plains:plains,Forest:forest,Mountains:{x:1100,z:1100},River:{x:0,z:l.riverZ(0)},Lake:{x:l.lakeX,z:l.riverZ(l.lakeX)+65},Coast:coast,Ocean:{x:l.coast-220,z:0},Settlement:settlement};
}
