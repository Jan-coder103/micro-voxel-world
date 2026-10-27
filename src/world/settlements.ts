import { regionalHash, regionalSample } from './regional-terrain.ts';
import type { Point } from '../flight/flight';

export const STRUCTURE_VERSION=1;
export const REGION_SIZE=512;
export type District='rural'|'city'|'industrial'|'military'|'airport'|'harbor';
export type BuildingKit='house'|'office'|'warehouse'|'tank'|'tower'|'container'|'pier';
export interface Rect { minX:number; maxX:number; minZ:number; maxZ:number }
export interface Building extends Rect { id:string; kit:BuildingKit; x:number; y:number; z:number; width:number; depth:number; height:number; bottom:number; access:string; yaw:number }
export interface Road extends Rect { id:string; kind:'street'|'driveway'|'runway'|'apron'; from:string; to:string }
export interface RoadNode { id:string; x:number; z:number }
export interface Settlement { id:string; kind:District; x:number; z:number; nodes:RoadNode[]; roads:Road[]; buildings:Building[] }
export const intersects=(a:Rect,b:Rect)=>a.minX<b.maxX && a.maxX>b.minX && a.minZ<b.maxZ && a.maxZ>b.minZ;
export const contains=(r:Rect,x:number,z:number,padding=0)=>x>=r.minX-padding && x<=r.maxX+padding && z>=r.minZ-padding && z<=r.maxZ+padding;
const rect=(x:number,z:number,w:number,d:number):Rect=>({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2});
const kinds:District[]=['rural','city','industrial','military','airport'];

/** Complete footprint samples on a <=2 m lattice, including all edges. */
function foundation(seed:number,r:Rect,waterAllowed=false):{low:number;high:number}|null {
  let low=Infinity,high=-Infinity;
  const nx=Math.ceil((r.maxX-r.minX)/2),nz=Math.ceil((r.maxZ-r.minZ)/2);
  for(let iz=0;iz<=nz;iz++)for(let ix=0;ix<=nx;ix++){
    const s=regionalSample(seed,r.minX+(r.maxX-r.minX)*ix/nx,r.minZ+(r.maxZ-r.minZ)*iz/nz);
    if(!waterAllowed && s.water!==null)return null;
    low=Math.min(low,s.height);high=Math.max(high,s.height);
  }
  return {low,high};
}
function safeRoad(seed:number,r:Rect):boolean {
  const nx=Math.max(1,Math.ceil((r.maxX-r.minX)/3)),nz=Math.max(1,Math.ceil((r.maxZ-r.minZ)/3));
  const heights:number[][]=[];
  for(let iz=0;iz<=nz;iz++){
    const row:number[]=[];heights.push(row);
    for(let ix=0;ix<=nx;ix++){
      const s=regionalSample(seed,r.minX+(r.maxX-r.minX)*ix/nx,r.minZ+(r.maxZ-r.minZ)*iz/nz);if(s.water!==null)return false;
      row.push(s.height);
      if(ix && Math.abs(row[ix]-row[ix-1])/((r.maxX-r.minX)/nx)>.22)return false;
      if(iz && Math.abs(row[ix]-heights[iz-1][ix])/((r.maxZ-r.minZ)/nz)>.22)return false;
    }
  }
  return true;
}
function shoreline(seed:number,rx:number,rz:number):{x:number;z:number}|null {
  // Ocean-only west-to-east transition, away from the river and lake.
  for(const dz of [160,256,352]){
    const z=rz*512+dz;
    for(let x=rx*512+40;x<rx*512+400;x+=8){
      const sea=regionalSample(seed,x-8,z),land=regionalSample(seed,x,z);
      if(sea.biome==='ocean' && land.water===null && land.height<1.4){
        const cx=x+56;if(cx>=rx*512+96 && cx<=rx*512+416)return {x,z};
      }
    }
  }
  return null;
}

/** Whole-region authority: chunk order and LOD never choose plots or IDs. */
function generateSettlement(seed:number,rx:number,rz:number):Settlement|null {
  const shore=shoreline(seed,rx,rz),kind:District=shore?'harbor':kinds[Math.floor(regionalHash(seed,rx,rz,703)*kinds.length)];
  const x=shore?shore.x+56:rx*512+256+(regionalHash(seed,rx,rz,704)-.5)*96;
  const z=shore?shore.z:rz*512+256+(regionalHash(seed,rx,rz,705)-.5)*96;
  const centre=regionalSample(seed,x,z);if(centre.water!==null || centre.biome==='mountains')return null;
  const id=`s1:${seed>>>0}:${rx},${rz}`,nodes:RoadNode[]=[],roads:Road[]=[],buildings:Building[]=[];
  const runway=rect(x,z,14,120);
  if(kind==='airport'){
    const f=foundation(seed,runway);if(!f || f.high-f.low>5 || !safeRoad(seed,runway))return null;
  }
  const grid:RoadNode[][]=[];
  for(let iz=0;iz<7;iz++){
    const row:RoadNode[]=[];grid.push(row);
    for(let ix=0;ix<7;ix++)row.push({id:`${id}:n${ix},${iz}`,x:x+(ix-3)*24,z:z+(iz-3)*24});
  }
  const candidates:Road[]=[];
  for(let iz=0;iz<7;iz++)for(let ix=0;ix<7;ix++)for(const [dx,dz] of [[1,0],[0,1]]){
    const a=grid[iz][ix],b=grid[iz+dz]?.[ix+dx];if(!b)continue;
    const bounds={minX:Math.min(a.x,b.x)-3,maxX:Math.max(a.x,b.x)+3,minZ:Math.min(a.z,b.z)-3,maxZ:Math.max(a.z,b.z)+3};
    if(kind==='airport' && intersects(bounds,runway))continue;
    if(safeRoad(seed,bounds))candidates.push({...bounds,id:`${a.id}-${b.id}`,kind:'street',from:a.id,to:b.id});
  }
  const root=kind==='airport'?grid[3][0]:grid[3][3],reachable=new Set([root.id]);
  let changed=true;while(changed){changed=false;for(const road of candidates)if(reachable.has(road.from)||reachable.has(road.to)){if(!reachable.has(road.from)||!reachable.has(road.to))changed=true;reachable.add(road.from);reachable.add(road.to);}}
  nodes.push(...grid.flat().filter(n=>reachable.has(n.id)));roads.push(...candidates.filter(r=>reachable.has(r.from)&&reachable.has(r.to)));
  if(roads.length<12)return null;
  if(kind==='airport'){roads.push({...runway,id:`${id}:runway`,kind:'runway',from:root.id,to:root.id});const apron={minX:x+7,maxX:x+21,minZ:z-48,maxZ:z+48};if(safeRoad(seed,apron))roads.push({...apron,id:`${id}:apron`,kind:'apron',from:root.id,to:root.id});}
  for(let iz=0;iz<6;iz++)for(let ix=0;ix<6;ix++){
    const px=x+(ix-2.5)*24,pz=z+(iz-2.5)*24;
    const adjacent=roads.find(r=>r.kind==='street'&&contains(r,px-12,pz));
    const alternate=roads.find(r=>r.kind==='street'&&contains(r,px,pz-12));
    const road=adjacent??alternate;if(!road)continue;
    let kit:BuildingKit=kind==='rural'?'house':kind==='city'?'office':kind==='industrial'?(ix%2?'warehouse':'tank'):kind==='military'?(iz%3===0?'tower':'container'):kind==='airport'?(ix===0&&iz===0?'tower':'warehouse'):ix%2?'container':'warehouse';
    if(kind==='city' && (ix+iz)%4===0)kit='house';
    const dimensions:Record<BuildingKit,[number,number,number]>={house:[7,5,6],office:[8,6+Math.floor(regionalHash(seed,ix+rx*6,iz+rz*6,77)*4)*4,6],warehouse:[12,5,12],tank:[6,5,9],tower:[5,11,5],container:[5,3,10],pier:[8,2.2,40]};
    const [w,height,d]=dimensions[kit],yaw=adjacent?Math.PI/2:0,width=adjacent?d:w,depth=adjacent?w:d,bounds=rect(px,pz,width,depth);
    if(kind==='airport'&&intersects({...bounds,minX:bounds.minX-4,maxX:bounds.maxX+4},runway))continue;
    const f=foundation(seed,{minX:bounds.minX-1,maxX:bounds.maxX+1,minZ:bounds.minZ-1,maxZ:bounds.maxZ+1});if(!f||f.high-f.low>1.6)continue;
    const driveway=adjacent?{minX:px-9,maxX:bounds.minX,minZ:pz-1,maxZ:pz+1}:{minX:px-1,maxX:px+1,minZ:pz-9,maxZ:bounds.minZ};
    if(!safeRoad(seed,driveway))continue;
    buildings.push({...bounds,id:`${id}:b${ix},${iz}`,kit,x:px,y:f.high+.1,z:pz,width,depth,height,bottom:f.low-.2,access:road.from,yaw});
    roads.push({...driveway,id:`${id}:d${ix},${iz}`,kind:'driveway',from:road.from,to:road.from});
  }
  if(buildings.length<4)return null;
  if(shore){
    const bounds=rect(shore.x-16,shore.z,40,8),f=foundation(seed,bounds,true);
    // Only build the quay if its entire dry portion fits beneath the fixed deck.
    if(f && f.high<2.2 && regionalSample(seed,shore.x-32,shore.z).biome==='ocean'){
      buildings.push({...bounds,id:`${id}:pier`,kit:'pier',x:shore.x-16,y:0,z:shore.z,width:40,depth:8,height:2.2,bottom:-2,access:root.id,yaw:Math.PI/2});
      const approach={minX:shore.x+4,maxX:x,minZ:shore.z-2,maxZ:shore.z+2};
      if(!safeRoad(seed,approach))return null;roads.push({...approach,id:`${id}:quay-access`,kind:'driveway',from:root.id,to:root.id});
    }else return null;
  }
  return {id,kind,x,z,nodes,roads,buildings};
}

/** Bounded memoization; eviction changes cost, never generation output. */
export class SettlementWorld {
  private readonly cache=new Map<string,Settlement|null>();
  private readonly bases=new Map<string,Settlement|null>();
  constructor(readonly seed:number){if(!Number.isInteger(seed)||seed<0||seed>4294967295)throw new Error('Invalid settlement seed');}
  private base(rx:number,rz:number){const key=`${rx},${rz}`;if(this.bases.has(key))return this.bases.get(key)!;const s=generateSettlement(this.seed,rx,rz);this.bases.set(key,s);if(this.bases.size>64)this.bases.delete(this.bases.keys().next().value!);return s;}
  private connected(rx:number,rz:number):Settlement|null{
    const base=this.base(rx,rz);if(!base)return null;
    const result={...base,nodes:[...base.nodes],roads:[...base.roads]};
    for(const [dx,dz,ix,iz,px,pz] of [[1,0,6,3,0,3],[-1,0,0,3,6,3],[0,1,3,6,3,0],[0,-1,3,0,3,6]]){
      const peer=this.base(rx+dx,rz+dz);if(!peer)continue;
      const a=base.nodes.find(n=>n.id===`${base.id}:n${ix},${iz}`),b=peer.nodes.find(n=>n.id===`${peer.id}:n${px},${pz}`);if(!a||!b)continue;
      const portal={id:`s1:${this.seed}:portal:${Math.min(rx,rx+dx)},${Math.min(rz,rz+dz)}:${dx?'x':'z'}`,x:dx?(rx+(dx>0?1:0))*512:rx*512+256,z:dz?(rz+(dz>0?1:0))*512:rz*512+256};
      const elbow={id:`${base.id}:exit:${dx},${dz}`,x:dx?a.x:portal.x,z:dz?a.z:portal.z};
      const other={id:'peer-elbow',x:dx?b.x:portal.x,z:dz?b.z:portal.z};
      const segment=(from:RoadNode,to:RoadNode):Road=>({id:`${from.id}-${to.id}`,kind:'street',from:from.id,to:to.id,minX:Math.min(from.x,to.x)-3,maxX:Math.max(from.x,to.x)+3,minZ:Math.min(from.z,to.z)-3,maxZ:Math.max(from.z,to.z)+3});
      const path=[segment(a,elbow),segment(elbow,portal)],peerPath=[segment(b,other),segment(other,portal)];
      if([...path,...peerPath].some(r=>!safeRoad(this.seed,r)))continue;
      result.nodes.push(elbow,portal);result.roads.push(...path);
    }
    return result;
  }
  get cachedRegions(){return this.cache.size;}
  region(rx:number,rz:number):Settlement|null{
    if(!Number.isInteger(rx)||!Number.isInteger(rz)||Math.abs(rx)>258||Math.abs(rz)>258)throw new Error('Invalid settlement region');
    const key=`${rx},${rz}`;if(this.cache.has(key))return this.cache.get(key)!;
    const result=this.connected(rx,rz);this.cache.set(key,result);if(this.cache.size>64)this.cache.delete(this.cache.keys().next().value!);return result;
  }
  inBounds(bounds:Rect):Settlement[]{
    if(![bounds.minX,bounds.maxX,bounds.minZ,bounds.maxZ].every(n=>Number.isFinite(n)&&Math.abs(n)<=132000)||bounds.maxX<=bounds.minX||bounds.maxZ<=bounds.minZ||Math.max(bounds.maxX-bounds.minX,bounds.maxZ-bounds.minZ)>1024)throw new Error('Invalid settlement bounds');
    const result:Settlement[]=[];
    for(let rz=Math.floor(bounds.minZ/512);rz<Math.ceil(bounds.maxZ/512);rz++)for(let rx=Math.floor(bounds.minX/512);rx<Math.ceil(bounds.maxX/512);rx++){const s=this.region(rx,rz);if(s)result.push(s);}
    return result;
  }
  buildings(bounds:Rect):Building[]{return this.inBounds(bounds).flatMap(s=>s.buildings.filter(b=>intersects(b,bounds)));}
  reserved(x:number,z:number,padding=3):boolean{
    if(!Number.isFinite(padding)||padding<0||padding>16)throw new Error('Invalid reservation padding');
    const extent=Math.max(.01,padding)*2,bounds=rect(x,z,extent,extent);return this.inBounds(bounds).some(s=>(s.kind==='airport'&&contains(rect(s.x,s.z,160,160),x,z,padding))||s.buildings.some(b=>contains(b,x,z,padding))||s.roads.some(r=>contains(r,x,z,padding)));
  }
  /** Ground navigation contract for Phase 15; buildings and water are blocked. */
  walkable(x:number,z:number,radius=.8):boolean{
    if(![x,z,radius].every(Number.isFinite)||radius<=0||radius>16||Math.max(Math.abs(x),Math.abs(z))>131000)throw new Error('Invalid navigation query');
    const s=regionalSample(this.seed,x,z);if(s.water!==null)return false;
    for(const [dx,dz] of [[-radius,0],[radius,0],[0,-radius],[0,radius],[-radius,-radius],[-radius,radius],[radius,-radius],[radius,radius]]){
      const edge=regionalSample(this.seed,x+dx,z+dz);if(edge.water!==null||Math.abs(edge.height-s.height)/Math.hypot(dx,dz)>.5)return false;
    }
    return !this.buildings(rect(x,z,radius*2,radius*2)).length;
  }
  ray(origin:Point,direction:Point,range:number,padding=0):number|undefined{
    if(![origin.x,origin.y,origin.z,direction.x,direction.y,direction.z,range,padding].every(Number.isFinite)||Math.max(Math.abs(origin.x),Math.abs(origin.y),Math.abs(origin.z))>131000||range<0||range>512||padding<0||padding>12||Math.abs(Math.hypot(direction.x,direction.y,direction.z)-1)>1e-6)throw new Error('Invalid structure ray');
    const end={x:origin.x+direction.x*range,z:origin.z+direction.z*range},bounds={minX:Math.min(origin.x,end.x)-padding-.01,maxX:Math.max(origin.x,end.x)+padding+.01,minZ:Math.min(origin.z,end.z)-padding-.01,maxZ:Math.max(origin.z,end.z)+padding+.01};
    let hit:number|undefined;
    for(const b of this.buildings(bounds)){
      let near=0,far=range;
      for(const [o,d,min,max] of [[origin.x,direction.x,b.minX-padding,b.maxX+padding],[origin.y,direction.y,b.bottom-padding,b.y+b.height+padding],[origin.z,direction.z,b.minZ-padding,b.maxZ+padding]]){
        if(Math.abs(d)<1e-10){if(o<min||o>max){far=-1;break;}}else{const a=(min-o)/d,c=(max-o)/d;near=Math.max(near,Math.min(a,c));far=Math.min(far,Math.max(a,c));}
      }
      if(near<=far&&(hit===undefined||near<hit))hit=near;
    }
    return hit;
  }
  landmarks():Partial<Record<District,Settlement>>{
    const result:Partial<Record<District,Settlement>>={};
    for(let rz=-4;rz<=2;rz++)for(let rx=-4;rx<=4;rx++){const s=this.region(rx,rz);if(s&&!result[s.kind])result[s.kind]=s;}
    return result;
  }
}

const workerWorlds=new Map<number,SettlementWorld>();
export function settlementWorld(seed:number):SettlementWorld{
  let world=workerWorlds.get(seed);if(!world){world=new SettlementWorld(seed);workerWorlds.set(seed,world);if(workerWorlds.size>2)workerWorlds.delete(workerWorlds.keys().next().value!);}return world;
}

/** Clip every road to the chunk before tessellation: no seam duplicates or long spanning meshes. */
export function appendRoads(seed:number,cx:number,cz:number,positions:number[],normals:number[],colors:number[]):Building[]{
  const bounds={minX:cx*32,maxX:(cx+1)*32,minZ:cz*32,maxZ:(cz+1)*32},world=settlementWorld(seed);
  for(const s of world.inBounds(bounds))for(const road of s.roads){
    if(!intersects(road,bounds))continue;
    const minX=Math.max(road.minX,bounds.minX),maxX=Math.min(road.maxX,bounds.maxX),minZ=Math.max(road.minZ,bounds.minZ),maxZ=Math.min(road.maxZ,bounds.maxZ);
    // Global 2 m grid keeps both sides of a chunk seam identical.
    const xs=[minX],zs=[minZ];for(let x=Math.ceil(minX/2)*2;x<maxX;x+=2)if(x>minX)xs.push(x);xs.push(maxX);for(let z=Math.ceil(minZ/2)*2;z<maxZ;z+=2)if(z>minZ)zs.push(z);zs.push(maxZ);
    for(let iz=0;iz<zs.length-1;iz++)for(let ix=0;ix<xs.length-1;ix++){
      const corners=[[xs[ix],zs[iz]],[xs[ix],zs[iz+1]],[xs[ix+1],zs[iz+1]],[xs[ix+1],zs[iz]]];
      for(const i of [0,1,2,0,2,3]){const [x,z]=corners[i];positions.push(x-cx*32,regionalSample(seed,x,z).height+.12,z-cz*32);normals.push(0,1,0);const stripe=road.kind==='runway'&&Math.abs(x-(road.minX+road.maxX)/2)<1.2&&Math.floor(z/8)%2===0;colors.push(...(stripe?[.8,.8,.7]:road.kind==='driveway'?[.35,.34,.30]:[.12,.15,.16]));}
    }
  }
  return world.inBounds(bounds).flatMap(s=>s.buildings.filter(b=>Math.floor(b.x/32)===cx&&Math.floor(b.z/32)===cz));
}
