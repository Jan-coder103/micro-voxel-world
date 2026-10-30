import { PilotProgress,type Upgrade,type GearSlot } from './progression';
import { Mutants,type Mutant } from '../hordes/mutants';
import { NavalWorld,baseContains,baseSpawn,type LandingBase } from '../world/naval';
import { REGIONAL_HEIGHT_CEILING } from '../world/regional-terrain';
import { FrontierTrees } from '../world/frontier-collision.ts';
import { Flight, type Point, type FlightInput } from '../flight/flight.ts';
import { PLAYER_FIXED_HULL } from '../flight/aircraft-hulls.ts';
import { AircraftSetup } from '../flight/aircraft.ts';
import { Combat, type Target, type WeaponId } from '../combat/weapons.ts';
import { RegionalPopulation } from '../hordes/regional-population.ts';
import type { StorageLike } from '../persistence/chunk-deltas.ts';
import { airbaseHeight,airbaseHeightCeiling,airbaseSample,airbaseReserved,airbaseObstacles,onRunway } from '../world/airbase.ts';
import type { ChunkSpec, Lod } from '../streaming/terrain-data.ts';

export { PilotProgress,type Upgrade } from './progression';
/** Complete run state. Rendering and menus do not decide landing, banking or recovery. */
export class Frontier {
  readonly progress:PilotProgress;readonly navy:NavalWorld;readonly mutants:Mutants;currentBase:LandingBase;navigationBase:LandingBase;readonly population:RegionalPopulation;readonly flight:Flight;readonly combat:Combat;readonly trees:FrontierTrees;readonly setup=new AircraftSetup();
  readonly ground:(x:number,z:number)=>number;
  state:'hangar'|'flying'|'crashed'='hangar';crashSeconds=0;departed=false;paused=true;notice='';
  private bonusMoney=0;private bonusXP=0;
  private plan:ChunkSpec[]=[];private planCell='';private stopTicks=0;
  get pendingMoney(){return this.state==='crashed'?0:Math.round((this.combat.kills*(10+this.progress.data.levels.bounty*2)+this.bonusMoney)*this.progress.bonuses.cash);}
  get pendingXP(){return this.state==='crashed'?0:Math.round((this.combat.kills*15+this.bonusXP)*this.progress.bonuses.xp);}
  get baseHeight(){return airbaseHeight(this.seed);}
  constructor(readonly seed=103,storage?:StorageLike){
    this.progress=new PilotProgress(storage);this.navy=new NavalWorld(seed);this.mutants=new Mutants(seed,storage);this.currentBase=this.navigationBase=this.navy.home;this.population=new RegionalPopulation(seed,storage,true,true);
    this.ground=(x,z)=>{const s=airbaseSample(seed,x,z);const deck=this.navy.deckAt(x,z);if(deck!==undefined)return Math.max(deck,s.height,s.water??-Infinity);return onRunway(x,z)?this.baseHeight+.16:Math.max(s.height,s.water??-Infinity);};
    this.trees=new FrontierTrees(seed,this.population.world);
    const clearance=.08-Math.min(...PLAYER_FIXED_HULL.points.map(p=>p.y));
    this.flight=new Flight(this.ground,undefined,'fixed-wing',{fixedWing:PLAYER_FIXED_HULL,maxGroundHeight:REGIONAL_HEIGHT_CEILING+1,groundCeiling:b=>Math.max(airbaseHeightCeiling(seed,b),b.minX<this.navy.oceanEdge?24:0),maxObstacleHeight:400,worldLimit:900000000,runway:{height:this.baseHeight+.16,clearance,contains:onRunway},runwayAt:(x,z)=>{const b=this.navy.landingAt(x,z);return b?{height:b.height,clearance,contains:(x,z,m=0)=>baseContains(b,x,z,m)}:undefined;},obstacles:b=>[...this.navy.obstacles(b),...this.mutants.obstacles(b),...this.trees.query(b),...airbaseObstacles(seed).filter(v=>v.minX<=b.maxX&&v.maxX>=b.minX&&v.minZ<=b.maxZ&&v.maxZ>=b.minZ),...this.population.world.buildings(b).filter(v=>!airbaseReserved(v.x,v.z,Math.max(v.width,v.depth)/2)).map(v=>({...v,minY:v.bottom,maxY:v.y+v.height}))]});
    this.combat=new Combat([],this.ground,128,{index:{query:(min,max)=>[...this.population.query(min,max),...this.mutants.query(min,max)]},blocker:(o,d,r)=>{
      // The cleared airfield has no procedural structures.
      if(airbaseReserved(o.x,o.z)&&airbaseReserved(o.x+d.x*r,o.z+d.z*r))return undefined;
      return this.population.world.ray(o,d,r,0,b=>airbaseReserved(b.x,b.z,Math.max(b.width,b.depth)/2));
    },onDamage:t=>{if(t.id.startsWith('mutant:'))this.mutants.damaged(t);else this.population.damaged(t);},onKill:t=>{if(t.id.startsWith('mutant:')){const m=t as Mutant;this.bonusMoney+=m.cash-10;this.bonusXP+=m.xp-15;this.notice=`${m.kind==='colossus'?'Colossus':'Brute'} defeated · return to any base to bank rewards.`;}}});
    this.rearm();
  }
  rearm(){this.flight.reset();this.flight.position={...baseSpawn(this.currentBase),y:this.currentBase.height+.08-Math.min(...PLAYER_FIXED_HULL.points.map(p=>p.y))};this.flight.speed=this.flight.throttle=0;this.flight.grounded=true;this.combat.reset();this.bonusMoney=this.bonusXP=0;this.stopTicks=0;this.departed=false;this.crashSeconds=0;this.state='hangar';this.paused=true;this.population.update(this.flight.position);}
  launch(){if(this.state==='crashed')return;this.state='flying';this.paused=false;const b=this.progress.bonuses;this.flight.enginePower=(1+this.progress.data.levels.engine*.12)*b.engine;this.flight.handling=b.handling;this.flight.brakePower=b.brakes;this.flight.maxSpeed=100*b.speed;this.combat.damageMultiplier=(1+this.progress.data.levels.weapons*.2)*b.damage;this.combat.fireRateMultiplier=b.rate;this.combat.rangeMultiplier=b.range;this.combat.blastMultiplier=b.blast;this.combat.mutantMultiplier=b.boss;this.flight.start();this.notice='';}
  pause(){this.paused=true;this.flight.pause();this.population.checkpoint();}
  buy(id:Upgrade){return this.state==='hangar'&&this.progress.buy(id);}
  learn(id:string){return this.state==='hangar'&&this.progress.learn(id);}
  purchase(id:string){return this.state==='hangar'&&this.progress.purchase(id);}
  equip(slot:GearSlot,id:string){return this.state==='hangar'&&this.progress.equip(slot,id);}
  get bases(){const list=this.navy.bases(this.flight.position);if(!list.some(b=>b.id===this.currentBase.id))list.push(this.currentBase);if(!list.some(b=>b.id===this.navigationBase.id))list.push(this.navigationBase);return list;}
  selectBase(id:string){const b=this.bases.find(b=>b.id===id);if(!b)return false;this.navigationBase=b;return true;}
  nearestMutant(){const p=this.flight.position;return this.mutants.nearby(p).sort((a,b)=>Math.hypot(a.position.x-p.x,a.position.z-p.z)-Math.hypot(b.position.x-p.x,b.position.z-p.z))[0];}
  get forward():Point{const f=this.flight;return {x:Math.sin(f.heading)*Math.cos(f.pitch),y:Math.sin(f.pitch),z:-Math.cos(f.heading)*Math.cos(f.pitch)};}
  get muzzle(){const f=this.flight;return this.setup.muzzle(f.position,f.heading,f.pitch,f.bank,2);}
  get lock():Target|undefined{
    const p=this.muzzle,d=this.forward;let best:Target|undefined,distance=Math.min(480,240*this.combat.rangeMultiplier);
    for(const t of [...[...this.population.resident.values()].flatMap(r=>r.targets),...this.mutants.nearby(this.flight.position,480)]){if(t.health<=0)continue;const x=t.position.x-p.x,y=t.position.y-p.y,z=t.position.z-p.z,l=Math.hypot(x,y,z);if(l<distance&&l>0&&(x*d.x+y*d.y+z*d.z)/l>Math.cos(Math.PI*70/180)){best=t;distance=l;}}
    return best;
  }
  nearestHorde(){let target:Target|undefined,best=Infinity;for(const r of this.population.resident.values())for(const t of r.targets)if(t.health>0){const d=Math.hypot(t.position.x-this.flight.position.x,t.position.z-this.flight.position.z);if(d<best){target=t;best=d;}}return target;}
  advance(dt:number,input:FlightInput&{fire:boolean;weapon:WeaponId;aim:boolean}){
    if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid elapsed time');
    if(this.paused)return;
    if(this.state==='crashed'){this.crashSeconds=Math.max(0,this.crashSeconds-dt);if(this.crashSeconds===0){this.rearm();this.notice='Aircraft replaced. Unbanked rewards lost.';}return;}
    if(this.state!=='flying')return;
    this.flight.advance(dt,input,()=>{
      const f=this.flight;this.population.update(f.position);
      if(!f.grounded)this.departed=true;else {const b=this.navy.landingAt(f.position.x,f.position.z);if(b)this.currentBase=b;}
      const origin=this.muzzle,lock=input.aim?this.lock:undefined;
      this.combat.step(input.fire&&!f.grounded,input.weapon,origin,lock?{x:lock.position.x-origin.x,y:lock.position.y-origin.y,z:lock.position.z-origin.z}:this.forward);
      if(this.departed&&f.grounded&&f.speed<.5&&f.throttle<.05)this.stopTicks++;else this.stopTicks=0;
      if(this.stopTicks>=60){const cash=this.pendingMoney,xp=this.pendingXP;this.progress.bank(cash,xp);this.navigationBase=this.currentBase;this.rearm();this.notice=`Safe landing · banked $${cash} and ${xp} XP. Upgrade or fly again.`;}
    });
    if(this.flight.state==='crashed'){this.state='crashed';this.crashSeconds=10;this.population.checkpoint();}
  }
  terrainPlan():readonly ChunkSpec[]{
    const p=this.flight.position,d=this.forward,cx=Math.floor((p.x+d.x*48)/32),cz=Math.floor((p.z+d.z*48)/32),key=`${cx},${cz}`;
    if(key!==this.planCell){this.planCell=key;this.plan=[];for(let z=cz-3;z<=cz+3;z++)for(let x=cx-3;x<=cx+3;x++)this.plan.push({x,z,seed:this.seed,lod:Math.max(Math.abs(x-cx),Math.abs(z-cz)) as Lod,generator:'regional-v2',structures:true,airbase:true});this.plan.sort((a,b)=>a.lod-b.lod);}
    return this.plan;
  }
}
