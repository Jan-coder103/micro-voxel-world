import { GENERATOR_VERSION } from '../streaming/terrain-data';
import type { StorageLike } from '../persistence/chunk-deltas';
export const MEMBERS=32, REGION_LIMIT=4, TOTAL_POPULATION=81*MEMBERS, POPULATION_VERSION=1, HEALTH=40;
export const groupId=(x:number,z:number)=>`horde:${x},${z}`;
export interface GroupState { x:number;z:number;progress:number;health:number[];offsets:number[] }
export function patrol(progress:number):[number,number] {
  const side=Math.floor(progress/20),t=progress%20;
  return side===0?[6+t,6]:side===1?[26,6+t]:side===2?[26-t,26]:[6,26-t];
}
export function initialGroup(seed:number,x:number,z:number):GroupState {
  let hash=(Math.imul(x+17,73856093)^Math.imul(z+19,19349663)^seed)>>>0;
  const random=()=>{hash=(Math.imul(hash,1664525)+1013904223)>>>0;return hash/4294967296;};
  const progress=random()*80,offsets:number[]=[];
  for(let i=0;i<MEMBERS;i++)offsets.push((i%8-3.5)*1.2+(random()-.5)*.15,(Math.floor(i/8)-1.5)*1.2+(random()-.5)*.15);
  return {x,z,progress,health:Array(MEMBERS).fill(HEALTH),offsets};
}
function object(v:unknown,keys:string[]):Record<string,unknown>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).sort().join(',')!==keys.sort().join(','))throw new Error('Invalid horde save fields');return v as Record<string,unknown>;}
export function validateHordeSave(value:unknown,seed:number):GroupState[] {
  const v=object(value,['schemaVersion','generatorVersion','populationVersion','seed','groups']);
  if(v.schemaVersion!==1||v.generatorVersion!==GENERATOR_VERSION||v.populationVersion!==POPULATION_VERSION||v.seed!==seed||!Array.isArray(v.groups)||v.groups.length>81)throw new Error('Unsupported horde save');
  const found=new Set<string>(),groups:GroupState[]=[];
  for(const item of v.groups){const g=object(item,['x','z','progress','health','offsets']);
    if(typeof g.x!=='number'||typeof g.z!=='number'||!Number.isInteger(g.x)||!Number.isInteger(g.z)||Math.abs(g.x)>REGION_LIMIT||Math.abs(g.z)>REGION_LIMIT||Object.is(g.x,-0)||Object.is(g.z,-0)||typeof g.progress!=='number'||!Number.isFinite(g.progress)||g.progress<0||g.progress>=80||!Array.isArray(g.health)||g.health.length!==MEMBERS||!g.health.every(h=>typeof h==='number'&&Number.isFinite(h)&&h>=0&&h<=HEALTH)||!Array.isArray(g.offsets)||g.offsets.length!==MEMBERS*2||!g.offsets.every((n,i)=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=(i%2===0?4.6:2.4)))throw new Error('Invalid horde group');
    const id=groupId(g.x,g.z);if(found.has(id))throw new Error('Duplicate horde group');found.add(id);groups.push({x:g.x,z:g.z,progress:g.progress,health:[...g.health] as number[],offsets:[...g.offsets] as number[]});
  }return groups;
}
/** Compact authoritative records survive presentation/region eviction. Maximum 81 groups. */
export class HordeStore {
  readonly groups=new Map<string,GroupState>();
  readonly key:string;
  error='';private writable=true;private dirty=false;private urgent=false;
  constructor(readonly seed:number,private storage?:StorageLike){
    if(!Number.isInteger(seed)||seed<0||seed>4294967295)throw new Error('Invalid horde seed');
    this.key=`mvw:hordes:v1:g${GENERATOR_VERSION}:p${POPULATION_VERSION}:${seed}`;
    try{if(!storage)throw new Error('Browser storage unavailable');const text=storage.getItem(this.key);if(text!==null){if(text.length>524288)throw new Error('Horde save exceeds 512 KiB');for(const g of validateHordeSave(JSON.parse(text),seed))this.groups.set(groupId(g.x,g.z),g);}}
    catch(error){this.error=String(error);this.writable=false;}
  }
  get(x:number,z:number){if(!Number.isInteger(x)||!Number.isInteger(z)||Math.abs(x)>REGION_LIMIT||Math.abs(z)>REGION_LIMIT)throw new Error('Horde outside test region');const id=groupId(x,z);let state=this.groups.get(id);if(!state){state=initialGroup(this.seed,x,z);this.groups.set(id,state);}return state;}
  changed(urgent=false){this.dirty=true;this.urgent ||= urgent;}
  flush(force=false){if(!this.dirty||!force&&!this.urgent)return;this.dirty=false;this.urgent=false;if(!this.writable)return;
    try{const record={schemaVersion:1,generatorVersion:GENERATOR_VERSION,populationVersion:POPULATION_VERSION,seed:this.seed,groups:[...this.groups.values()]};validateHordeSave(record,this.seed);const text=JSON.stringify(record);if(text.length>524288)throw new Error('Horde save exceeds 512 KiB');this.storage!.setItem(this.key,text);}
    catch(error){this.error=String(error);this.writable=false;}
  }
  get killed(){let count=0;for(const g of this.groups.values())for(const h of g.health)if(h===0)count++;return count;}
  get cleared(){let count=0;for(const g of this.groups.values())if(g.health.every(h=>h===0))count++;return count;}
}
