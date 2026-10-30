import { FrontierTrees } from '../world/frontier-collision.ts';
import { Flight, type Point, type FlightInput } from '../flight/flight.ts';
import { PLAYER_FIXED_HULL } from '../flight/aircraft-hulls.ts';
import { AircraftSetup } from '../flight/aircraft.ts';
import { Combat, type Target, type WeaponId } from '../combat/weapons.ts';
import { RegionalPopulation } from '../hordes/regional-population.ts';
import type { StorageLike } from '../persistence/chunk-deltas.ts';
import { AIRBASE,airbaseHeight,airbaseSample,airbaseReserved,airbaseObstacles,onRunway } from '../world/airbase.ts';
import type { ChunkSpec, Lod } from '../streaming/terrain-data.ts';

export type Upgrade='engine'|'bounty'|'weapons';
const upgrades:Upgrade[]=['engine','bounty','weapons'];
interface Progress {schema:1;money:number;xp:number;levels:Record<Upgrade,number>}
const fresh=():Progress=>({schema:1,money:0,xp:0,levels:{engine:0,bounty:0,weapons:0}});
const KEY='mvw:frontier:pilot:v1';
export class PilotProgress {
  data=fresh();error='';private writable=true;
  constructor(private storage?:StorageLike){
    try{if(!storage)throw new Error('Storage unavailable');const text=storage.getItem(KEY);if(text===null)return;if(text.length>2048)throw new Error('Invalid pilot record');const v=JSON.parse(text);
      if(!v||Object.keys(v).sort().join(',')!=='levels,money,schema,xp'||v.schema!==1||!Number.isSafeInteger(v.money)||v.money<0||!Number.isSafeInteger(v.xp)||v.xp<0||!v.levels||Object.keys(v.levels).sort().join(',')!=='bounty,engine,weapons'||!upgrades.every(k=>Number.isInteger(v.levels[k])&&v.levels[k]>=0&&v.levels[k]<=5))throw new Error('Invalid pilot record');this.data=v;
    }catch(e){this.error=String(e);this.writable=false;}
  }
  private save(){if(!this.writable)return;try{this.storage!.setItem(KEY,JSON.stringify(this.data));}catch(e){this.error=String(e);this.writable=false;}}
  bank(money:number,xp:number){if(!Number.isSafeInteger(money)||money<0||!Number.isSafeInteger(xp)||xp<0)throw new Error('Invalid reward');this.data.money+=money;this.data.xp+=xp;this.save();}
  cost(id:Upgrade){return 100*(this.data.levels[id]+1);}
  buy(id:Upgrade){if(!upgrades.includes(id)||this.data.levels[id]>=5||this.data.money<this.cost(id))return false;this.data.money-=this.cost(id);this.data.levels[id]++;this.save();return true;}
}
/** Complete run state. Rendering and menus do not decide landing, banking or recovery. */
export class Frontier {
  readonly progress:PilotProgress;readonly population:RegionalPopulation;readonly flight:Flight;readonly combat:Combat;readonly trees:FrontierTrees;readonly setup=new AircraftSetup();
  readonly ground:(x:number,z:number)=>number;
  state:'hangar'|'flying'|'crashed'='hangar';crashSeconds=0;departed=false;paused=true;notice='';
  private plan:ChunkSpec[]=[];private planCell='';private stopTicks=0;
  get pendingMoney(){return this.state==='crashed'?0:this.combat.kills*(10+this.progress.data.levels.bounty*2);}
  get pendingXP(){return this.state==='crashed'?0:this.combat.kills*15;}
  get baseHeight(){return airbaseHeight(this.seed);}
  constructor(readonly seed=103,storage?:StorageLike){
    this.progress=new PilotProgress(storage);this.population=new RegionalPopulation(seed,storage,true,true);
    this.ground=(x,z)=>{const s=airbaseSample(seed,x,z);return onRunway(x,z)?this.baseHeight+.16:Math.max(s.height,s.water??-Infinity);};
    this.trees=new FrontierTrees(seed,this.population.world);
    const clearance=.08-Math.min(...PLAYER_FIXED_HULL.points.map(p=>p.y));
    this.flight=new Flight(this.ground,undefined,'fixed-wing',{fixedWing:PLAYER_FIXED_HULL,maxGroundHeight:191,maxObstacleHeight:210,worldLimit:900000000,runway:{height:this.baseHeight+.16,clearance,contains:onRunway},obstacles:b=>[...this.trees.query(b),...airbaseObstacles(seed).filter(v=>v.minX<=b.maxX&&v.maxX>=b.minX&&v.minZ<=b.maxZ&&v.maxZ>=b.minZ),...this.population.world.buildings(b).filter(v=>!airbaseReserved(v.x,v.z,Math.max(v.width,v.depth)/2)).map(v=>({...v,minY:v.bottom,maxY:v.y+v.height}))]});
    this.combat=new Combat([],this.ground,128,{index:this.population,blocker:(o,d,r)=>{
      // The cleared airfield has no procedural structures.
      if(airbaseReserved(o.x,o.z)&&airbaseReserved(o.x+d.x*r,o.z+d.z*r))return undefined;
      return this.population.world.ray(o,d,r,0,b=>airbaseReserved(b.x,b.z,Math.max(b.width,b.depth)/2));
    },onDamage:t=>this.population.damaged(t)});
    this.rearm();
  }
  rearm(){this.flight.reset();this.flight.position={x:0,y:this.baseHeight+.16+.08-Math.min(...PLAYER_FIXED_HULL.points.map(p=>p.y)),z:AIRBASE.spawnZ};this.flight.speed=this.flight.throttle=0;this.flight.grounded=true;this.combat.reset();this.stopTicks=0;this.departed=false;this.crashSeconds=0;this.state='hangar';this.paused=true;this.population.update(this.flight.position);}
  launch(){if(this.state==='crashed')return;this.state='flying';this.paused=false;this.flight.enginePower=1+this.progress.data.levels.engine*.12;this.combat.damageMultiplier=1+this.progress.data.levels.weapons*.2;this.flight.start();this.notice='';}
  pause(){this.paused=true;this.flight.pause();this.population.checkpoint();}
  buy(id:Upgrade){return this.state==='hangar'&&this.progress.buy(id);}
  get forward():Point{const f=this.flight;return {x:Math.sin(f.heading)*Math.cos(f.pitch),y:Math.sin(f.pitch),z:-Math.cos(f.heading)*Math.cos(f.pitch)};}
  get muzzle(){const f=this.flight;return this.setup.muzzle(f.position,f.heading,f.pitch,f.bank,2);}
  get lock():Target|undefined{
    const p=this.muzzle,d=this.forward;let best:Target|undefined,distance=240;
    for(const r of this.population.resident.values())for(const t of r.targets){if(t.health<=0)continue;const x=t.position.x-p.x,y=t.position.y-p.y,z=t.position.z-p.z,l=Math.hypot(x,y,z);if(l<distance&&l>0&&(x*d.x+y*d.y+z*d.z)/l>Math.cos(Math.PI*70/180)){best=t;distance=l;}}
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
      if(!f.grounded)this.departed=true;
      const origin=this.muzzle,lock=input.aim?this.lock:undefined;
      this.combat.step(input.fire&&!f.grounded,input.weapon,origin,lock?{x:lock.position.x-origin.x,y:lock.position.y-origin.y,z:lock.position.z-origin.z}:this.forward);
      if(this.departed&&f.grounded&&f.speed<.5&&f.throttle<.05)this.stopTicks++;else this.stopTicks=0;
      if(this.stopTicks>=60){const cash=this.pendingMoney,xp=this.pendingXP;this.progress.bank(cash,xp);this.rearm();this.notice=`Safe landing · banked $${cash} and ${xp} XP. Upgrade or fly again.`;}
    });
    if(this.flight.state==='crashed'){this.state='crashed';this.crashSeconds=10;this.population.checkpoint();}
  }
  terrainPlan():readonly ChunkSpec[]{
    const p=this.flight.position,d=this.forward,cx=Math.floor((p.x+d.x*48)/32),cz=Math.floor((p.z+d.z*48)/32),key=`${cx},${cz}`;
    if(key!==this.planCell){this.planCell=key;this.plan=[];for(let z=cz-3;z<=cz+3;z++)for(let x=cx-3;x<=cx+3;x++)this.plan.push({x,z,seed:this.seed,lod:Math.max(Math.abs(x-cx),Math.abs(z-cz)) as Lod,generator:'regional-v2',structures:true,airbase:true});this.plan.sort((a,b)=>a.lod-b.lod);}
    return this.plan;
  }
}
