import { Flight,type FlightInput,type Point } from '../flight/flight.ts';
import { Combat,type WeaponId } from '../combat/weapons.ts';
import { Hordes } from '../hordes/hordes.ts';
import { HordeStore } from '../hordes/state.ts';
import type { StorageLike } from '../persistence/chunk-deltas.ts';
import { heightAt } from '../streaming/terrain-data.ts';
export const OBJECTIVE_GROUPS:readonly (readonly [number,number])[]=[[-1,0],[0,0],[1,0]];
export const BASE={x:16,z:192},SECTOR={x:16,z:16};
export type SortieState='ready'|'active'|'returning'|'complete'|'failed';
export interface PilotInput extends FlightInput { fire:boolean;weapon:WeaponId }
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
const angle=(v:number)=>Math.atan2(Math.sin(v),Math.cos(v));
export function returnControls(flight:Flight,ground:(x:number,z:number)=>number):FlightInput {
  const p=flight.position,error=angle(Math.atan2(BASE.x-p.x,-(BASE.z-p.z))-flight.heading),bank=clamp(error*1.2,-.95,.95),pitch=clamp((ground(BASE.x,BASE.z)+32-p.y)/100,-.2,.2);
  return {bank:clamp((bank-flight.bank)*3,-1,1),pitch:clamp((pitch-flight.pitch)*3,-1,1),throttle:clamp((35-flight.speed)*.08,-1,1)};
}
/** One attempt. Population is durable; aircraft, visit and objective state are transient. */
export class Sortie {
  readonly store:HordeStore;readonly hordes:Hordes;readonly flight:Flight;readonly combat:Combat;
  state:SortieState='ready';visited=false;aimAssist=true;returnAssist=false;attempts=0;
  readonly ground:(x:number,z:number)=>number;
  constructor(readonly seed=12012,storage?:StorageLike,readonly benchmark=false){
    this.ground=(x,z)=>heightAt(seed,x,z);this.store=new HordeStore(seed,storage);this.hordes=new Hordes(this.store,this.ground);
    this.flight=new Flight((x,z)=>this.ground(x,z)+6,(o,d,r)=>this.hordes.blocker(o,d,r,9));
    this.combat=new Combat([],this.ground,128,{index:this.hordes,blocker:this.hordes.blocker,onDamage:t=>this.hordes.damaged(t)});this.recover();
  }
  recover(){this.pause();this.flight.reset();this.flight.position={x:BASE.x,y:this.ground(BASE.x,BASE.z)+32,z:BASE.z};this.flight.speed=40;this.flight.throttle=1/7;this.combat.reset();this.state='ready';this.visited=false;this.returnAssist=false;this.hordes.update(this.crowdObserver);}
  start(){if(this.state==='complete'||this.state==='failed')return;if(this.state==='ready'){this.state='active';this.attempts++;}this.flight.start();}
  pause(){this.flight.pause();this.hordes.checkpoint();}
  get crowdObserver():Point{const p=this.flight.position,d=this.forward;return {x:clamp(p.x+d.x*64,-130850,130850),y:p.y,z:clamp(p.z+d.z*64,-130850,130850)};}
  get remaining(){return OBJECTIVE_GROUPS.reduce((count,[x,z])=>count+this.store.get(x,z).health.filter(h=>h>0).length,0);}
  get forward():Point{return {x:Math.sin(this.flight.heading)*Math.cos(this.flight.pitch),y:Math.sin(this.flight.pitch),z:-Math.cos(this.flight.heading)*Math.cos(this.flight.pitch)};}
  get muzzle():Point{const p=this.flight.position,d=this.forward;return {x:p.x+d.x*9,y:p.y+d.y*9,z:p.z+d.z*9};}
  get lock(){const origin=this.muzzle,nose=this.forward;let closest:ReturnType<Hordes['firstSurvivor']>,best=Infinity;
    const groups:readonly (readonly [number,number])[]=this.benchmark?[...this.hordes.resident.values()].map(r=>[r.state.x,r.state.z] as const):OBJECTIVE_GROUPS;
    for(const [x,z] of groups){const t=this.hordes.firstSurvivor(x,z);if(!t)continue;const p=t.position,dx=p.x-origin.x,dy=p.y-origin.y,dz=p.z-origin.z,d=Math.hypot(dx,dy,dz);if(d>0&&d<=240&&d<best&&(dx*nose.x+dy*nose.y+dz*nose.z)/d>=Math.cos(70*Math.PI/180)){closest=t;best=d;}}
    return closest;
  }
  advance(dt:number,input:PilotInput){
    if(input.bank||input.pitch||input.throttle)this.returnAssist=false;
    const controls=this.returnAssist&&this.state==='returning'?returnControls(this.flight,this.ground):input;
    this.flight.advance(dt,controls,()=>{
      const p=this.flight.position;this.hordes.step(this.crowdObserver);const origin=this.muzzle,lock=this.aimAssist?this.lock:undefined;
      const direction=lock?{x:lock.position.x-origin.x,y:lock.position.y-origin.y,z:lock.position.z-origin.z}:this.forward;
      this.combat.step(input.fire,input.weapon,origin,direction);
      if(Math.hypot(p.x-SECTOR.x,p.z-SECTOR.z)<=60&&p.y-this.ground(p.x,p.z)<=70)this.visited=true;
      if(!this.benchmark&&this.state==='active'&&this.visited&&this.remaining===0)this.state='returning';
      if(!this.benchmark&&this.state==='returning'&&Math.hypot(p.x-BASE.x,p.z-BASE.z)<=20&&p.y-this.ground(p.x,p.z)>6){this.state='complete';this.returnAssist=false;this.pause();}
    });
    if(this.flight.state==='crashed'){this.state='failed';this.returnAssist=false;this.hordes.checkpoint();}
    this.store.flush();
  }
}
