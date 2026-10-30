import { describe,it,expect } from 'vitest';
import { Frontier,PilotProgress } from '../../src/game/frontier';
import { AIRBASE,airbaseHeight,airbaseSample,airbaseReserved } from '../../src/world/airbase';
import { RegionalPopulation } from '../../src/hordes/regional-population';
import { generateTerrain } from '../../src/streaming/terrain-data';
const memory=()=>{const data=new Map<string,string>();return {data,getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);}};};
const idle={pitch:0,bank:0,throttle:0,fire:false,weapon:'minigun' as const,aim:true};
function tick(game:Frontier,n:number,input=idle){for(let i=0;i<n;i++)game.advance(1/60,input);}
function approach(game:Frontier,overrides:Partial<{x:number;z:number;pitch:number;bank:number;speed:number;heading:number}>={}){
  const f=game.flight;game.launch();game.departed=true;f.grounded=false;f.position={x:overrides.x??0,z:overrides.z??400,y:game.baseHeight+2};f.speed=overrides.speed??32;f.throttle=f.speed/100;f.pitch=overrides.pitch??-.055;f.bank=overrides.bank??0;f.heading=overrides.heading??0;
}
describe('frontier runway runs',()=>{
  it('starts stationary, takes off manually, and never banks by merely flying over home',()=>{
    const game=new Frontier(103,memory());expect(game.flight.grounded).toBe(true);expect(game.flight.speed).toBe(0);expect(game.flight.position.z).toBe(AIRBASE.spawnZ);game.launch();tick(game,280,{...idle,throttle:1});expect(game.flight.speed).toBeGreaterThan(28);expect(game.flight.grounded).toBe(true);tick(game,60,{...idle,pitch:1});expect(game.flight.grounded).toBe(false);expect(game.departed).toBe(true);expect(game.flight.state).toBe('running');expect(game.state).toBe('flying');expect(game.progress.data.money).toBe(0);
  });
  it('accepts a gentle aligned touchdown, brakes to a stop, banks exactly once, and reopens the hangar',()=>{
    const storage=memory(),game=new Frontier(103,storage);approach(game);game.combat.kills=7;tick(game,120);expect(game.flight.grounded).toBe(true);expect(game.state).toBe('flying');expect(game.progress.data.money).toBe(0);
    tick(game,300,{...idle,throttle:-1});expect(game.state).toBe('hangar');expect(game.progress.data.money).toBe(70);expect(game.progress.data.xp).toBe(105);expect(game.flight.speed).toBe(0);expect(game.combat.kills).toBe(0);tick(game,120);expect(game.progress.data.money).toBe(70);expect(new Frontier(103,storage).progress.data.money).toBe(70);
  });
  it('accepts the opposite runway direction',()=>{const game=new Frontier(103,memory());approach(game,{z:260,heading:Math.PI});tick(game,120);expect(game.flight.grounded).toBe(true);expect(game.state).toBe('flying');});
  it.each([{pitch:-.3},{bank:.4},{speed:70},{x:100},{heading:Math.PI/2}])('crashes unsafe runway approaches %j',bad=>{const game=new Frontier(103,memory());approach(game,bad);tick(game,180);expect(game.state).toBe('crashed');expect(game.progress.data.money).toBe(0);});
  it('holds the crash for ten active seconds, pauses safely, and loses unbanked rewards',()=>{
    const game=new Frontier(103,memory());approach(game,{pitch:-.3});game.combat.kills=5;for(let i=0;i<180&&game.state!=='crashed';i++)tick(game,1);expect(game.crashSeconds).toBe(10);const wreck={...game.flight.position};tick(game,540);expect(game.state).toBe('crashed');expect(game.flight.position).toEqual(wreck);game.pause();tick(game,600);expect(game.crashSeconds).toBeCloseTo(1);game.paused=false;tick(game,61);expect(game.state).toBe('hangar');expect(game.progress.data.money).toBe(0);expect(game.pendingMoney).toBe(0);expect(game.flight.position.z).toBe(AIRBASE.spawnZ);
  });
  it('upgrades cost banked money, persist, affect play, and are disabled in flight',()=>{
    const storage=memory(),game=new Frontier(103,storage);game.progress.bank(1000,300);expect(game.buy('weapons')).toBe(true);expect(game.buy('engine')).toBe(true);expect(game.buy('bounty')).toBe(true);expect(game.progress.data.money).toBe(700);game.launch();expect(game.flight.enginePower).toBeCloseTo(1.12);expect(game.combat.damageMultiplier).toBeCloseTo(1.2);game.combat.kills=2;expect(game.pendingMoney).toBe(24);expect(game.buy('engine')).toBe(false);const loaded=new Frontier(103,storage);expect(loaded.progress.data.levels).toEqual({engine:1,bounty:1,weapons:1});
  });
  it('keeps four terrain LODs, stable plans and bounded populations beyond the previous world limits',()=>{
    const game=new Frontier(103,memory()),plan=game.terrainPlan();expect(plan.length).toBe(49);expect(new Set(plan.map(s=>s.lod)).size).toBe(4);expect(game.terrainPlan()).toBe(plan);expect(plan.every(s=>s.airbase&&s.generator==='regional-v2')).toBe(true);
    game.flight.position={x:200000,y:200,z:-200000};expect(game.terrainPlan().length).toBe(49);game.population.update(game.flight.position);expect(game.population.counts.resident).toBe(49);expect(game.population.counts.cache).toBeLessThanOrEqual(64);expect(()=>new RegionalPopulation(103,memory()).encounter(32,0)).toThrow();
  });
  it('keeps the base flattened in authoritative collision and streamed geometry, free of trees and procedural buildings',()=>{
    const seed=103,y=airbaseHeight(seed);for(const [x,z] of [[0,120],[0,600],[-20,360],[20,360]]){const s=airbaseSample(seed,x,z);expect(s.height).toBe(y);expect(s.water).toBe(null);}
    const data=generateTerrain({seed,x:0,z:10,lod:0,generator:'regional-v2',structures:true,airbase:true});for(let i=1;i<data.positions.length;i+=3)expect(data.positions[i]).toBeCloseTo(y,4);expect(data.buildings?.some(b=>airbaseReserved(b.x,b.z))).toBe(false);
  });
  it('isolates roaming casualties and pilot saves from all legacy records',()=>{
    const storage=memory(),p=new RegionalPopulation(103,storage,true,true),legacy=new RegionalPopulation(103,storage);const e=p.encounter(80,-5);expect(e.members.length).toBeGreaterThan(0);const t=p.targets(e)[0];t.health=0;p.damaged(t);expect(new RegionalPopulation(103,storage,true,true).targets(e)[0].health).toBe(0);expect(storage.getItem(legacy.key)).toBe(null);expect(p.key).not.toBe(legacy.key);
  });
  it('preserves corrupt pilot bytes and keeps progress in the session when storage fails',()=>{
    const storage=memory();storage.setItem('mvw:frontier:pilot:v1','broken');const p=new PilotProgress(storage);p.bank(10,15);expect(p.error).toBeTruthy();expect(p.data.money).toBe(10);expect(storage.getItem('mvw:frontier:pilot:v1')).toBe('broken');const q=new PilotProgress({getItem:()=>null,setItem:()=>{throw new Error('quota');}});q.bank(100,20);expect(q.error).toContain('quota');expect(q.buy('engine')).toBe(true);expect(q.data.levels.engine).toBe(1);
  });
});
