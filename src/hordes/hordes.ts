import type { Point } from '../flight/flight';
import type { Target,TargetQuery } from '../combat/weapons';
import { groupId,HordeStore,MEMBERS,HEALTH,patrol,REGION_LIMIT,type GroupState } from './state';
export type HordeTier='near'|'medium'|'far';
export interface ResidentHorde { state:GroupState;tier:HordeTier;elapsed:number;targets:Target[]|undefined }
export const blocked=(x:number,z:number)=>x>=13.5&&x<=18.5&&z>=9.5&&z<=22.5;
export function hordeTier(distance:number,old:HordeTier='far'):HordeTier {
  if(old==='near'&&distance<55||distance<45)return 'near';
  if(old==='medium'&&distance<100||distance<85)return 'medium';return 'far';
}
const clamp=(v:number,min:number,max:number)=>Math.min(max,Math.max(min,v));
/** Stable slot health/formation is authoritative even when individual objects are absent. */
export class Hordes implements TargetQuery {
  readonly resident=new Map<string,ResidentHorde>();
  ticks=0;nearUpdates=0;mediumUpdates=0;farUpdates=0;lastQueryMembers=0;
  private readonly hitUntil=new Map<string,number>();
  constructor(readonly store:HordeStore,readonly ground:(x:number,z:number)=>number){}
  update(observer:Point){
    if(![observer.x,observer.z].every(v=>Number.isFinite(v)&&Math.abs(v)<=130900))throw new Error('Invalid horde observer');
    const cx=Math.floor(observer.x/32),cz=Math.floor(observer.z/32),wanted=new Set<string>();
    for(let z=Math.max(-REGION_LIMIT,cz-3);z<=Math.min(REGION_LIMIT,cz+3);z++)for(let x=Math.max(-REGION_LIMIT,cx-3);x<=Math.min(REGION_LIMIT,cx+3);x++){
      const id=groupId(x,z);wanted.add(id);let r=this.resident.get(id);const tier=hordeTier(Math.hypot(x*32+16-observer.x,z*32+16-observer.z),r?.tier);
      if(!r){r={state:this.store.get(x,z),tier,elapsed:0,targets:undefined};this.resident.set(id,r);}
      if(r.tier!==tier){this.move(r,r.elapsed);r.elapsed=0;r.tier=tier;r.targets=undefined;}
      if(tier!=='far'&&!r.targets)r.targets=this.members(r.state);
    }
    for(const [id,r] of this.resident)if(!wanted.has(id)){this.move(r,r.elapsed);this.resident.delete(id);this.store.changed();}
  }
  step(observer:Point){this.update(observer);this.ticks++;
    for(const r of this.resident.values()){r.elapsed+=1/60;const interval=r.tier==='near'?1/60:r.tier==='medium'?1/10:1;if(r.elapsed+1e-9>=interval){this.move(r,r.elapsed);r.elapsed=0;if(r.tier==='near')this.nearUpdates++;else if(r.tier==='medium')this.mediumUpdates++;else this.farUpdates++;}}
    for(const [id,until] of this.hitUntil)if(until<=this.ticks)this.hitUntil.delete(id);
  }
  private move(r:ResidentHorde,dt:number){if(dt<=0||r.state.health.every(h=>h===0))return;const s=r.state;
    s.progress=(s.progress+1.2*dt)%80;
    if(r.tier==='near'){
      // Local spatial hash bounds separation work to neighbouring 2 m cells.
      const cells=new Map<string,number[]>(),snapshot=[...s.offsets];
      for(let i=0;i<MEMBERS;i++)if(s.health[i]>0){const k=`${Math.floor(snapshot[i*2]/2)},${Math.floor(snapshot[i*2+1]/2)}`;const list=cells.get(k)??[];list.push(i);cells.set(k,list);}
      for(let i=0;i<MEMBERS;i++)if(s.health[i]>0){let sx=0,sz=0;const x=snapshot[i*2],z=snapshot[i*2+1],cx=Math.floor(x/2),cz=Math.floor(z/2);
        for(let ix=cx-1;ix<=cx+1;ix++)for(let iz=cz-1;iz<=cz+1;iz++)for(const j of cells.get(`${ix},${iz}`)??[])if(i!==j){const dx=x-snapshot[j*2],dz=z-snapshot[j*2+1],d=Math.hypot(dx,dz);if(d>1e-6&&d<1.5){sx+=dx/d*(1.5-d);sz+=dz/d*(1.5-d);}}
        const baseX=(i%8-3.5)*1.2,baseZ=(Math.floor(i/8)-1.5)*1.2;
        s.offsets[i*2]=clamp(x+(sx*.7+(baseX-x)*.3)*dt,-4.6,4.6);s.offsets[i*2+1]=clamp(z+(sz*.7+(baseZ-z)*.3)*dt,-2.4,2.4);
      }
    }
    // Route lanes plus bounded formation keep body centres clear of the inflated wall.
    if(r.targets)this.sync(s,r.targets);this.store.changed();
  }
  private member(s:GroupState,i:number):Target{const [ax,az]=patrol(s.progress),x=s.x*32+ax+s.offsets[i*2],z=s.z*32+az+s.offsets[i*2+1];return {id:`${groupId(s.x,s.z)}:${i}`,position:{x,y:this.ground(x,z)+.9,z},radius:.65,maxHealth:HEALTH,health:s.health[i]};}
  private members(s:GroupState){return Array.from({length:MEMBERS},(_,i)=>this.member(s,i));}
  private sync(s:GroupState,targets:Target[]){const [ax,az]=patrol(s.progress);for(let i=0;i<MEMBERS;i++){const p=targets[i].position;p.x=s.x*32+ax+s.offsets[i*2];p.z=s.z*32+az+s.offsets[i*2+1];p.y=this.ground(p.x,p.z)+.9;targets[i].health=s.health[i];}}
  query(min:Point,max:Point):Set<Target>{
    if(![min.x,min.y,min.z,max.x,max.y,max.z].every(v=>Number.isFinite(v)&&Math.abs(v)<=134000)||max.x<min.x||max.y<min.y||max.z<min.z||Math.max(max.x-min.x,max.y-min.y,max.z-min.z)>1024)throw new Error('Invalid horde query');
    const result=new Set<Target>();this.lastQueryMembers=0;
    for(let z=Math.max(-REGION_LIMIT,Math.floor((min.z-.65)/32));z<=Math.min(REGION_LIMIT,Math.floor((max.z+.65)/32));z++)for(let x=Math.max(-REGION_LIMIT,Math.floor((min.x-.65)/32));x<=Math.min(REGION_LIMIT,Math.floor((max.x+.65)/32));x++){
      const s=this.store.get(x,z),r=this.resident.get(groupId(x,z));if(r){this.move(r,r.elapsed);r.elapsed=0;}
      const targets=r?.targets??this.members(s);this.sync(s,targets);
      for(const t of targets){this.lastQueryMembers++;const p=t.position;if(t.health>0&&p.x+.65>=min.x&&p.x-.65<=max.x&&p.y+.65>=min.y&&p.y-.65<=max.y&&p.z+.65>=min.z&&p.z-.65<=max.z)result.add(t);}
    }return result;
  }
  blocker=(origin:Point,direction:Point,range:number):number|undefined=>{
    let nearest:number|undefined;const end={x:origin.x+direction.x*range,z:origin.z+direction.z*range};
    for(let z=Math.max(-REGION_LIMIT,Math.floor(Math.min(origin.z,end.z)/32));z<=Math.min(REGION_LIMIT,Math.floor(Math.max(origin.z,end.z)/32));z++)for(let x=Math.max(-REGION_LIMIT,Math.floor(Math.min(origin.x,end.x)/32));x<=Math.min(REGION_LIMIT,Math.floor(Math.max(origin.x,end.x)/32));x++){
      const y=this.ground(x*32+16,z*32+16),min=[x*32+14,y,z*32+10],max=[x*32+18,y+3,z*32+22],o=[origin.x,origin.y,origin.z],d=[direction.x,direction.y,direction.z];let enter=0,exit=range;
      for(let axis=0;axis<3;axis++){if(Math.abs(d[axis])<1e-10){if(o[axis]<min[axis]||o[axis]>max[axis]){exit=-1;break;}}else{const a=(min[axis]-o[axis])/d[axis],b=(max[axis]-o[axis])/d[axis];enter=Math.max(enter,Math.min(a,b));exit=Math.min(exit,Math.max(a,b));}}
      if(enter<=exit&&exit>=0&&(nearest===undefined||enter<nearest))nearest=enter;
    }return nearest;
  };
  damaged(target:Target){const match=/^horde:(-?\d+),(-?\d+):(\d+)$/.exec(target.id);if(!match)throw new Error('Unknown horde member');const x=Number(match[1]),z=Number(match[2]),i=Number(match[3]);if(target.id!==`${groupId(x,z)}:${i}`||i<0||i>=MEMBERS||!Number.isFinite(target.health)||target.health<0||target.health>HEALTH)throw new Error('Invalid horde damage');const s=this.store.get(x,z);s.health[i]=Math.min(s.health[i],target.health);this.hitUntil.set(target.id,this.ticks+12);this.store.changed(true);}
  flash(id:string){return (this.hitUntil.get(id)??0)>this.ticks;}
  firstSurvivor(x=0,z=0){const s=this.store.get(x,z),i=s.health.findIndex(h=>h>0);return i<0?undefined:this.member(s,i);}
  checkpoint(){for(const r of this.resident.values()){this.move(r,r.elapsed);r.elapsed=0;}this.store.flush(true);}
  get counts(){const counts={near:0,medium:0,far:0,individuals:0,residentAlive:0};for(const r of this.resident.values()){counts[r.tier]++;const alive=r.state.health.filter(h=>h>0).length;counts.residentAlive+=alive;if(r.tier!=='far')counts.individuals+=alive;}return counts;}
}
