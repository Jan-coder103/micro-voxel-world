import type { Point } from '../flight/flight';
import type { Target, TargetQuery } from '../combat/weapons';
import type { StorageLike } from '../persistence/chunk-deltas';
import { regionalHash, regionalSample } from '../world/regional-terrain.ts';
import { SettlementWorld } from '../world/settlements.ts';
import { hordeTier, type HordeTier } from './hordes.ts';

export const POPULATION_SIZE=128, POPULATION_LIMIT=32, REGIONAL_HEALTH=40;
export interface Encounter { id:string; x:number; z:number; habitat:string; members:Point[] }
interface Resident { encounter:Encounter; tier:HordeTier; targets:Target[] }
const encounterId=(x:number,z:number)=>`rp1:${x},${z}`;
const inside=(x:number,z:number)=>Number.isInteger(x)&&Number.isInteger(z)&&x>=-POPULATION_LIMIT&&x<POPULATION_LIMIT&&z>=-POPULATION_LIMIT&&z<POPULATION_LIMIT;
const SAVE_LIMIT=2*1024*1024;

/** One half-open 128 m owner per encounter. Geometry residency never controls population. */
export class RegionalPopulation implements TargetQuery {
  readonly world:SettlementWorld;
  readonly resident=new Map<string,Resident>();
  private readonly cache=new Map<string,Encounter>();
  private readonly damage=new Map<string,number[]>();
  readonly key:string;
  error=''; private writable=true;private dirty=false;
  private cellX:number|undefined;private cellZ:number|undefined;private renderRevision=0;
  /** Changes only when resident presentation can differ: membership, tier or health. */
  get revision(){return this.renderRevision;}
  constructor(readonly seed:number,private readonly storage?:StorageLike,structures=true){
    this.world=new SettlementWorld(seed);this.structures=structures;
    this.key=`mvw:regional-population:v1:g2:s${structures?1:0}:p1:${seed}`;
    try {
      if(!storage)throw new Error('Browser storage unavailable; population changes are session only');
      const text=storage.getItem(this.key);if(text===null)return;
      if(text.length>SAVE_LIMIT)throw new Error('Population save exceeds 2 MiB');
      const v=JSON.parse(text);
      if(!v||Object.keys(v).sort().join(',')!=='generator,population,schema,seed,structures,wounds'||v.schema!==1||v.generator!==2||v.population!==1||v.seed!==seed||v.structures!==structures||!Array.isArray(v.wounds)||v.wounds.length>4096)throw new Error('Unsupported regional population save');
      const loaded=new Map<string,number[]>();
      for(const entry of v.wounds){
        if(!Array.isArray(entry)||entry.length!==3)throw new Error('Invalid encounter record');
        const [x,z,health]=entry;
        if(!inside(x,z)||!Array.isArray(health)||health.length>32||!health.every(h=>Number.isFinite(h)&&h>=0&&h<=REGIONAL_HEALTH))throw new Error('Invalid encounter health');
        const e=this.encounter(x,z);if(health.length!==e.members.length||loaded.has(e.id))throw new Error('Invalid or duplicate encounter');
        loaded.set(e.id,[...health]);
      }
      for(const [id,health] of loaded)this.damage.set(id,health);
    }catch(error){this.error=String(error);this.writable=false;}
  }
  private readonly structures:boolean;
  encounter(x:number,z:number):Encounter {
    if(!inside(x,z))throw new Error('Encounter outside supported 8 km region');
    const id=encounterId(x,z),cached=this.cache.get(id);if(cached)return cached;
    const minX=x*128,minZ=z*128;
    const settlements=this.structures?this.world.inBounds({minX,maxX:minX+128,minZ,maxZ:minZ+128}):[];
    const nodes=settlements.flatMap(s=>s.nodes.map(n=>({...n,kind:s.kind}))).filter(n=>Math.floor(n.x/128)===x&&Math.floor(n.z/128)===z);
    const centre=regionalSample(this.seed,minX+64,minZ+64),habitat:string=nodes.length?nodes[0].kind:centre.biome;
    const budget=nodes.length?(habitat==='city'?32:habitat==='rural'?16:24):centre.water!==null?0:habitat==='forest'?12:habitat==='mountains'?4:8;
    const members:Point[]=[];
    for(let attempt=0;attempt<96&&members.length<budget;attempt++){
      const node=nodes[attempt%Math.max(1,nodes.length)];
      const anchorX=minX+16+regionalHash(this.seed,x,z,810)*96,anchorZ=minZ+16+regionalHash(this.seed,x,z,811)*96;
      const px=node?node.x+(regionalHash(this.seed,x,z,900+attempt*2)-.5)*12:anchorX+(regionalHash(this.seed,x,z,900+attempt*2)-.5)*20;
      const pz=node?node.z+(regionalHash(this.seed,x,z,901+attempt*2)-.5)*12:anchorZ+(regionalHash(this.seed,x,z,901+attempt*2)-.5)*20;
      if(Math.floor(px/128)!==x||Math.floor(pz/128)!==z||members.some(p=>Math.hypot(p.x-px,p.z-pz)<2))continue;
      if(this.structures?!this.world.walkable(px,pz,1):!this.dry(px,pz))continue;
      members.push({x:px,y:regionalSample(this.seed,px,pz).height+.9,z:pz});
    }
    const encounter={id,x,z,habitat,members};this.cache.set(id,encounter);if(this.cache.size>64)this.cache.delete(this.cache.keys().next().value!);return encounter;
  }
  private dry(x:number,z:number){const s=regionalSample(this.seed,x,z);return s.water===null&&[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]].every(([dx,dz])=>{const p=regionalSample(this.seed,x+dx,z+dz);return p.water===null&&Math.abs(p.height-s.height)<=.5;});}
  targets(e:Encounter):Target[]{const health=this.damage.get(e.id);return e.members.map((p,i)=>({id:`${e.id}:${i}`,position:{...p},radius:.65,maxHealth:REGIONAL_HEALTH,health:health?.[i]??REGIONAL_HEALTH}));}
  update(observer:Point){
    if(![observer.x,observer.z].every(n=>Number.isFinite(n)&&Math.abs(n)<131000))throw new Error('Invalid population observer');
    const cx=Math.floor(observer.x/128),cz=Math.floor(observer.z/128);
    let changed=false;
    if(cx!==this.cellX||cz!==this.cellZ){
      this.cellX=cx;this.cellZ=cz;
      for(let z=Math.max(-32,cz-3);z<=Math.min(31,cz+3);z++)for(let x=Math.max(-32,cx-3);x<=Math.min(31,cx+3);x++){
        const id=encounterId(x,z);
        if(!this.resident.has(id)){const encounter=this.encounter(x,z);this.resident.set(id,{encounter,tier:'far',targets:this.targets(encounter)});changed=true;}
      }
      for(const [id,r] of this.resident)if(Math.abs(r.encounter.x-cx)>3||Math.abs(r.encounter.z-cz)>3){this.resident.delete(id);changed=true;}
    }
    for(const r of this.resident.values()){
      const tier=hordeTier(Math.hypot(r.encounter.x*128+64-observer.x,r.encounter.z*128+64-observer.z)/3,r.tier);
      if(tier!==r.tier){r.tier=tier;changed=true;}
    }
    if(changed)this.renderRevision++;
  }

  query(min:Point,max:Point):Target[]{
    if(![min.x,min.y,min.z,max.x,max.y,max.z].every(n=>Number.isFinite(n)&&Math.abs(n)<=134000)||max.x<min.x||max.y<min.y||max.z<min.z||Math.max(max.x-min.x,max.y-min.y,max.z-min.z)>1024)throw new Error('Invalid population query');
    const result:Target[]=[];
    for(let z=Math.max(-32,Math.floor((min.z-.65)/128));z<=Math.min(31,Math.floor((max.z+.65)/128));z++)for(let x=Math.max(-32,Math.floor((min.x-.65)/128));x<=Math.min(31,Math.floor((max.x+.65)/128));x++){
      const e=this.encounter(x,z),targets=this.resident.get(e.id)?.targets??this.targets(e);
      for(const t of targets){const p=t.position;if(t.health>0&&p.x+.65>=min.x&&p.x-.65<=max.x&&p.y+.65>=min.y&&p.y-.65<=max.y&&p.z+.65>=min.z&&p.z-.65<=max.z)result.push(t);}
    }return result;
  }
  damaged(target:Target){
    const match=/^rp1:(-?\d+),(-?\d+):(\d+)$/.exec(target.id);if(!match)throw new Error('Unknown regional target');
    const x=Number(match[1]),z=Number(match[2]),i=Number(match[3]),e=this.encounter(x,z);
    if(target.id!==`${e.id}:${i}`||!e.members[i]||!Number.isFinite(target.health)||target.health<0||target.health>REGIONAL_HEALTH)throw new Error('Invalid regional damage');
    const health=this.damage.get(e.id)??e.members.map(()=>REGIONAL_HEALTH),previous=health[i];health[i]=Math.min(previous,target.health);
    const resident=this.resident.get(e.id);if(resident)resident.targets[i].health=health[i];
    if(health[i]===previous)return;
    this.damage.set(e.id,health);this.renderRevision++;this.dirty=true;this.checkpoint();
  }
  checkpoint(){
    if(!this.writable||!this.dirty)return;
    try{const wounds=[...this.damage].map(([id,h])=>{const [x,z]=id.slice(4).split(',').map(Number);return [x,z,h];});const text=JSON.stringify({schema:1,generator:2,population:1,structures:this.structures,seed:this.seed,wounds});if(text.length>SAVE_LIMIT)throw new Error('Population save exceeds 2 MiB');this.storage!.setItem(this.key,text);this.dirty=false;}
    catch(error){this.error=String(error);this.writable=false;}
  }
  get counts(){let alive=0,cleared=0,killed=0;for(const r of this.resident.values())alive+=r.targets.filter(t=>t.health>0).length;for(const h of this.damage.values()){killed+=h.filter(n=>n===0).length;if(h.length&&h.every(n=>n===0))cleared++;}return {resident:this.resident.size,alive,cleared,killed,changed:this.damage.size,cache:this.cache.size};}
}
