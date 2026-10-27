import type { Point } from '../flight/flight';
export type WeaponId = 'minigun' | 'autocannon' | 'shell';
export interface WeaponDefinition { readonly name:string; readonly intervalTicks:number; readonly range:number; readonly damage:number; readonly radius:number; readonly sound:'rapid'|'cannon'|'explosion' }
export const WEAPONS:Readonly<Record<WeaponId,WeaponDefinition>> = Object.freeze({
  minigun:Object.freeze({name:'Minigun',intervalTicks:3,range:240,damage:4,radius:0,sound:'rapid'}),
  autocannon:Object.freeze({name:'Autocannon',intervalTicks:12,range:240,damage:22,radius:0,sound:'cannon'}),
  shell:Object.freeze({name:'Explosive shell',intervalTicks:60,range:240,damage:150,radius:16,sound:'explosion'}),
});
export interface Target { readonly id:string; readonly position:Point; readonly radius:number; readonly maxHealth:number; health:number }
const CELL=32;
const key=(x:number,y:number,z:number)=>`${x},${y},${z}`;
export type BlockerQuery=(origin:Point,direction:Point,range:number)=>number|undefined;
export interface TargetQuery { query(min:Point,max:Point):Iterable<Target> }
export class TargetIndex implements TargetQuery {
  private readonly cells=new Map<string,Set<Target>>();
  constructor(readonly targets:readonly Target[]) {
    if(targets.length>256 || new Set(targets.map(t=>t.id)).size!==targets.length) throw new Error('Invalid target catalog');
    for(const target of targets) {
      if(![target.position.x,target.position.y,target.position.z,target.radius,target.maxHealth,target.health].every(Number.isFinite)||target.radius<=0||target.radius>16||target.maxHealth<=0||target.health<0||target.health>target.maxHealth||Math.max(Math.abs(target.position.x),Math.abs(target.position.y),Math.abs(target.position.z))>131000) throw new Error('Invalid target');
      const p=target.position,r=target.radius;
      this.visit({x:p.x-r,y:p.y-r,z:p.z-r},{x:p.x+r,y:p.y+r,z:p.z+r},k=>{let cell=this.cells.get(k);if(!cell){cell=new Set();this.cells.set(k,cell);}cell.add(target);});
    }
  }
  private visit(min:Point,max:Point,fn:(key:string)=>void) {
    for(let x=Math.floor(min.x/CELL);x<=Math.floor(max.x/CELL);x++) for(let y=Math.floor(min.y/CELL);y<=Math.floor(max.y/CELL);y++) for(let z=Math.floor(min.z/CELL);z<=Math.floor(max.z/CELL);z++) fn(key(x,y,z));
  }
  query(min:Point,max:Point):Set<Target> { if(![min.x,min.y,min.z,max.x,max.y,max.z].every(v=>Number.isFinite(v)&&Math.abs(v)<=134000)||max.x<min.x||max.y<min.y||max.z<min.z||Math.max(max.x-min.x,max.y-min.y,max.z-min.z)>1024)throw new Error('Invalid spatial query');const found=new Set<Target>();this.visit(min,max,k=>this.cells.get(k)?.forEach(t=>found.add(t)));return found; }
}
export interface Hit { distance:number; position:Point; target?:Target }
const along=(o:Point,d:Point,t:number):Point=>({x:o.x+d.x*t,y:o.y+d.y*t,z:o.z+d.z*t});
/** Terrain readiness is independent of GPU chunks; slight clearance is conservative. */
export function terrainDistance(origin:Point,direction:Point,range:number,ground:(x:number,z:number)=>number):number|undefined {
  if(![origin.x,origin.y,origin.z,direction.x,direction.y,direction.z,range].every(Number.isFinite)||Math.max(Math.abs(origin.x),Math.abs(origin.y),Math.abs(origin.z))>132000||range<0||range>512||Math.abs(Math.hypot(direction.x,direction.y,direction.z)-1)>1e-6)throw new Error('Invalid terrain ray');
  const steps=Math.max(1,Math.ceil(range/.25));
  for(let i=0;i<=steps;i++){const distance=range*i/steps,p=along(origin,direction,distance);if(p.y<=ground(p.x,p.z)+.15)return distance;}
  return undefined;
}
export function raycast(index:TargetQuery,origin:Point,direction:Point,range:number,ground:(x:number,z:number)=>number,blocker?:BlockerQuery):Hit|undefined {
  const end=along(origin,direction,range);
  let closest=terrainDistance(origin,direction,range,ground),target:Target|undefined;
  const obstacle=blocker?.(origin,direction,range);if(obstacle!==undefined&&(closest===undefined||obstacle<closest))closest=obstacle;
  for(const candidate of index.query({x:Math.min(origin.x,end.x),y:Math.min(origin.y,end.y),z:Math.min(origin.z,end.z)},{x:Math.max(origin.x,end.x),y:Math.max(origin.y,end.y),z:Math.max(origin.z,end.z)})) {
    if(candidate.health<=0)continue;
    const p=candidate.position,x=origin.x-p.x,y=origin.y-p.y,z=origin.z-p.z,b=x*direction.x+y*direction.y+z*direction.z,c=x*x+y*y+z*z-candidate.radius**2,disc=b*b-c;
    if(disc<0)continue;
    const near=c<=0?0:-b-Math.sqrt(disc);
    if(near>=0&&near<=range&&(closest===undefined||near<closest)){closest=near;target=candidate;}
  }
  return closest===undefined?undefined:{distance:closest,position:along(origin,direction,closest),target};
}
export type EffectKind='tracer'|'muzzle'|'impact'|'blast';
export interface CombatEffect { active:boolean; kind:EffectKind; from:Point; to:Point; age:number; lifetime:number; radius:number }
export class Combat {
  readonly index:TargetQuery;
  readonly effects:CombatEffect[];
  ticks=0;shots=0;hits=0;damage=0;kills=0;blasts=0;droppedEffects=0;
  lastWeapon:WeaponId='minigun';
  private readonly nextFire:Record<WeaponId,number>={minigun:0,autocannon:0,shell:0};
  constructor(readonly targets:readonly Target[],private readonly ground:(x:number,z:number)=>number,effectCapacity=128,private readonly options:{index?:TargetQuery;blocker?:BlockerQuery;onDamage?:(target:Target)=>void}={}) {
    if(!Number.isInteger(effectCapacity)||effectCapacity<0||effectCapacity>128)throw new Error('Invalid effect capacity');
    this.index=options.index??new TargetIndex(targets);
    this.effects=Array.from({length:effectCapacity},()=>({active:false,kind:'tracer',from:{x:0,y:0,z:0},to:{x:0,y:0,z:0},age:0,lifetime:0,radius:0}));
  }
  reset(){this.ticks=this.shots=this.hits=this.damage=this.kills=this.blasts=this.droppedEffects=0;for(const t of this.targets)t.health=t.maxHealth;for(const e of this.effects)e.active=false;for(const id of Object.keys(WEAPONS) as WeaponId[])this.nextFire[id]=0;this.lastWeapon='minigun';}
  private effect(kind:EffectKind,from:Point,to:Point,lifetime:number,radius=1){const e=this.effects.find(e=>!e.active);if(!e){this.droppedEffects++;return;}e.active=true;e.kind=kind;Object.assign(e.from,from);Object.assign(e.to,to);e.age=0;e.lifetime=lifetime;e.radius=radius;}
  private damageTarget(target:Target,amount:number){const dealt=Math.min(target.health,Math.max(0,amount));if(!dealt)return;target.health-=dealt;this.damage+=dealt;this.hits++;if(target.health===0)this.kills++;this.options.onDamage?.(target);}
  explode(centre:Point,radius:number,damage:number) {
    if(![centre.x,centre.y,centre.z,radius,damage].every(Number.isFinite)||Math.max(Math.abs(centre.x),Math.abs(centre.y),Math.abs(centre.z))>132000||radius<=0||radius>32||damage<0)throw new Error('Invalid explosion');
    this.blasts++;this.effect('blast',centre,centre,.7,radius);
    for(const t of this.index.query({x:centre.x-radius,y:centre.y-radius,z:centre.z-radius},{x:centre.x+radius,y:centre.y+radius,z:centre.z+radius})) {
      if(t.health<=0)continue;const p=t.position,dx=p.x-centre.x,dy=p.y-centre.y,dz=p.z-centre.z,distance=Math.hypot(dx,dy,dz);if(distance>=radius)continue;
      if(distance>0){const direction={x:dx/distance,y:dy/distance,z:dz/distance};if(terrainDistance(centre,direction,distance,this.ground)!==undefined||this.options.blocker?.(centre,direction,distance)!==undefined)continue;}
      this.damageTarget(t,damage*(1-distance/radius));
    }
  }
  /** Exactly one successful flight tick. Cosmetic capacity never gates authoritative fire. */
  step(fire:boolean,weapon:WeaponId,origin:Point,direction:Point) {
    if(!Object.hasOwn(WEAPONS,weapon))throw new Error('Unknown weapon');
    const length=Math.hypot(direction.x,direction.y,direction.z);
    if(![origin.x,origin.y,origin.z,length].every(Number.isFinite)||Math.max(Math.abs(origin.x),Math.abs(origin.y),Math.abs(origin.z))>132000||length<1e-8)throw new Error('Invalid muzzle pose');
    for(const e of this.effects)if(e.active){e.age+=1/60;if(e.age+1e-9>=e.lifetime)e.active=false;}
    this.ticks++;if(!fire||this.ticks<this.nextFire[weapon])return;
    const definition=WEAPONS[weapon],d={x:direction.x/length,y:direction.y/length,z:direction.z/length};
    this.nextFire[weapon]=this.ticks+definition.intervalTicks;this.shots++;this.lastWeapon=weapon;
    const hit=raycast(this.index,origin,d,definition.range,this.ground,this.options.blocker),end=hit?.position??along(origin,d,definition.range);
    this.effect('tracer',origin,end,.09);this.effect('muzzle',origin,origin,.05,.7);
    if(hit){this.effect('impact',end,end,.2,1.5);if(definition.radius>0)this.explode(hit.target?end:{x:end.x-d.x*.05,y:Math.max(end.y-d.y*.05,this.ground(end.x,end.z)+.3),z:end.z-d.z*.05},definition.radius,definition.damage);else if(hit.target)this.damageTarget(hit.target,definition.damage);}
  }
}
export function rangeTargets(ground:(x:number,z:number)=>number):Target[] {
  const y=ground(16,16)+40;
  return [{id:'air-1',position:{x:16,y,z:-65},radius:4,maxHealth:100,health:100},{id:'air-2',position:{x:16,y,z:-95},radius:4,maxHealth:160,health:160},{id:'air-3',position:{x:24,y,z:-70},radius:4,maxHealth:100,health:100},...[-8,0,8].map((dx,i)=>({id:`ground-${i}`,position:{x:16+dx,y:ground(16+dx,-110)+3,z:-110},radius:3,maxHealth:100,health:100}))];
}
