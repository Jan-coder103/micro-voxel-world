import { regionalSample,regionalHeightCeiling,regionalHeightBounds } from './regional-terrain.ts';

/** Shared by workers, collision, coarse LOD and navigation. */
export const AIRBASE={x:0,z:360,minZ:120,maxZ:600,halfWidth:22,spawnZ:548};
export function airbaseReserved(x:number,z:number,padding=0){return Math.abs(x)<178+padding&&z>AIRBASE.minZ-146-padding&&z<AIRBASE.maxZ+146+padding;}
export function onRunway(x:number,z:number,margin=0){return Math.abs(x)<=AIRBASE.halfWidth-margin&&z>=AIRBASE.minZ+margin&&z<=AIRBASE.maxZ-margin;}
const heights=new Map<number,number>();
export function airbaseHeight(seed:number){let height=heights.get(seed);if(height===undefined){height=regionalSample(seed,0,AIRBASE.z).height+1;heights.set(seed,height);if(heights.size>8)heights.delete(heights.keys().next().value!);}return height;}
export function airbaseSample(seed:number,x:number,z:number){
  const s=regionalSample(seed,x,z);
  const distance=Math.max(Math.abs(x)-82,AIRBASE.minZ-12-z,z-AIRBASE.maxZ-50,0);
  if(distance>=96)return s;
  const t=distance/96,w=t*t*(3-2*t),height=airbaseHeight(seed)*(1-w)+s.height*w;
  const water=s.water===null?null:airbaseHeight(seed)*(1-w)+s.water*w;
  return {...s,height,water:distance===0?null:water!==null&&water>height?water:null,color:distance===0?[.36,.43,.22]:s.color};
}

/** Includes raised runway paint and the convex blend into the surrounding landscape. */
export function airbaseHeightCeiling(seed:number,b:{minX:number;maxX:number;minZ:number;maxZ:number}){
  if(b.minX>=-82&&b.maxX<=82&&b.minZ>=AIRBASE.minZ-12&&b.maxZ<=AIRBASE.maxZ+50)return airbaseHeight(seed)+.16;
  if(b.minX>=178||b.maxX<=-178||b.maxZ<=AIRBASE.minZ-146||b.minZ>=AIRBASE.maxZ+146)return regionalHeightCeiling(seed,b);
  const bounds=regionalHeightBounds(seed,b),distance=Math.max(0,Math.max(0,b.minX,-b.maxX)-82,AIRBASE.minZ-12-b.maxZ,b.minZ-AIRBASE.maxZ-50);
  const farDistance=Math.max(0,Math.abs(b.minX)-82,Math.abs(b.maxX)-82,AIRBASE.minZ-12-b.minZ,b.maxZ-AIRBASE.maxZ-50);
  const blend=(d:number,height:number)=>{const t=Math.min(1,d/96),w=t*t*(3-2*t);return airbaseHeight(seed)*(1-w)+height*w;};
  const runway=b.minX<=AIRBASE.halfWidth&&b.maxX>=-AIRBASE.halfWidth&&b.minZ<=AIRBASE.maxZ&&b.maxZ>=AIRBASE.minZ;
  return Math.max(blend(distance,bounds.height),blend(farDistance,bounds.height),blend(distance,bounds.water),blend(farDistance,bounds.water),runway?airbaseHeight(seed)+.16:-Infinity);
}

export function airbaseObstacles(seed:number){const y=airbaseHeight(seed);return [
  {minX:43,maxX:73,minZ:461,maxZ:499,minY:y,maxY:y+12.6},
  {minX:46,maxX:58,minZ:394,maxZ:406,minY:y,maxY:y+20},
  ...airbaseParts(seed).map(p=>({minX:p.x-p.w/2,maxX:p.x+p.w/2,minZ:p.z-p.d/2,maxZ:p.z+p.d/2,minY:p.y-p.h/2,maxY:p.y+p.h/2})),
];}

export interface BasePart {x:number;y:number;z:number;w:number;h:number;d:number;color:string}
/** Original modular fortifications. Shared geometry supplies rendering and collision. */
export function airbaseParts(seed:number):BasePart[]{
  const parts:BasePart[]=[],box=(x:number,z:number,w:number,h:number,d:number,color:string,offset=0)=>{parts.push({x,y:Math.max(airbaseSample(seed,x,z).height,airbaseSample(seed,x,z).water??-Infinity)+offset+h/2,z,w,h,d,color});};
  for(const side of [-1,1]){
    for(let z=155;z<=620;z+=15){box(side*125,z,3,5,14,'#686c58');if(z%3===2)box(side*125,z,4,1,3,'#a39570',5);}
    for(const z of [158,615]){box(side*114,z,14,12,14,'#656b50');box(side*114,z,16,1,16,'#3e493b',12);}
    for(const z of [205,325,565]){
      box(side*99,z,7,2.4,12,'#3e503c');box(side*99,z,8,1.6,7,'#303b2e',2.4);box(side*99,z-7, .6,.6,11,'#424c3a',3.2);
      for(const dx of [-3.8,3.8])box(side*99+dx,z,1.2,2.4,13,'#242c29');
    }
  }
  for(const z of [170,260,350]){box(-65,z,22,7,32,'#596447');box(-65,z,24,1.3,34,'#81765b',7);box(-65,z-16.1,9,5,.25,'#28342a');for(const x of [-72,-58])box(x,z-16.3,3,1.5,.3,'#bdb181',3);}
  for(const z of [245,320]){box(66,z,30,14,46,'#6b7366');box(66,z,32,1.5,48,'#4b584c',14);box(66,z-23.1,23,11,.3,'#29372f');for(let n=0;n<6;n++)box(51+n*6,z, .3,1.7,46,'#87907b',14);}
  for(const z of [420,460,505]){box(-65,z,19,4,27,'#687454');box(-65,z,13,2,27,'#7e8360',4);box(-65,z-13.6,5,3,.2,'#313e2d');}
  for(let i=0;i<12;i++){box(87+(i%3)*7,385+Math.floor(i/3)*8,5,4,6,i%2?'#8a7855':'#526449');}
  for(const side of [-1,1])for(const z of [180,300,420,580])box(side*30,z,.3,1,.3,'#e7c378');
  return parts;
}
