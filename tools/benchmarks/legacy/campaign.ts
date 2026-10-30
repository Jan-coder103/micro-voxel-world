import type { StorageLike } from '../../../src/persistence/chunk-deltas.ts';
import { MISSIONS,missionId,type MissionId } from './missions.ts';
const LIMIT=4096;
function decode(text:string):MissionId[]{
  if(text.length>LIMIT)throw new Error('Campaign save exceeds 4 KiB');
  const v=JSON.parse(text);
  if(!v||Object.keys(v).sort().join(',')!=='completed,schema'||v.schema!==1||!Array.isArray(v.completed)||v.completed.length>2||!v.completed.every((id:unknown)=>typeof id==='string'&&Object.hasOwn(MISSIONS,id))||new Set(v.completed).size!==v.completed.length||v.completed.includes('relief')&&!v.completed.includes('clearpass'))throw new Error('Invalid campaign save');
  return [...v.completed];
}
/** One atomic record; rewards/rank derive from a bounded unique completion set. */
export class Campaign {
  readonly key='mvw:campaign:v1:g1:p1';
  private completed=new Set<MissionId>();private writable=true;
  error='';
  constructor(private readonly storage?:StorageLike){
    try{if(!storage)throw new Error('Campaign storage unavailable');const text=storage.getItem(this.key);if(text!==null)this.completed=new Set(decode(text));}
    catch(error){this.error=String(error);this.writable=false;}
  }
  get completions():readonly MissionId[]{return [...this.completed].sort();}
  get stars(){return this.completions.reduce((total,id)=>total+MISSIONS[id].stars,0);}
  get rank(){return this.stars>=3?'Flight lead':this.stars?'Wingmate':'Cadet';}
  has(id:MissionId){return this.completed.has(id);}
  unlocked(id:MissionId){const requirement=MISSIONS[id].requires;return !requirement||this.has(requirement);}
  complete(value:string,populationSaved=true):number{
    const id=missionId(value);if(!this.unlocked(id))throw new Error('Mission locked: complete Operation Clearpass first');
    if(this.completed.has(id))return 0;
    // Save casualty authority before unlocking anything durably. Failed storage remains session-only.
    if(!populationSaved){this.error='Population save unavailable; campaign changes are session only';this.writable=false;}
    const next=new Set(this.completed);next.add(id);
    let awarded=MISSIONS[id].stars;
    if(this.writable){
      try{const current=this.storage!.getItem(this.key),saved=current===null?[]:decode(current);for(const previous of saved)next.add(previous);
        if(saved.includes(id))awarded=0;
        this.storage!.setItem(this.key,JSON.stringify({schema:1,completed:[...next].sort()}));this.completed=next;
        return awarded;
      }catch(error){this.error=String(error);this.writable=false;}
    }
    this.completed=next;return awarded;
  }
}
