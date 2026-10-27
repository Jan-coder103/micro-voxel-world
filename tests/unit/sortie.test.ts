import aircraftSource from '../../assets/source/ref-attack-aircraft.voxel.json';
import { spawnSync } from 'node:child_process';
import {it,expect,describe,vi} from 'vitest';
import {Sortie,BASE,OBJECTIVE_GROUPS} from '../../src/game/sortie';
import {createTerrainFallback} from '../../src/rendering/terrain-fallback';
import {heightAt} from '../../src/streaming/terrain-data';
import {FrameMetrics} from '../../src/game/metrics';
const neutral={pitch:0,bank:0,throttle:0,fire:false,weapon:'shell' as const};
function memory(){const data=new Map<string,string>();return {data,getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);}};}
describe('combat sortie',()=>{
  it('flies, attacks all objective groups, visits the sector and physically returns using assistance',()=>{
    const s=new Sortie(12012,memory());s.start();for(let i=0;i<60*15&&s.state!=='returning';i++)s.advance(1/60,{...neutral,fire:true});expect(s.remaining).toBe(0);expect(s.visited).toBe(true);expect(s.state).toBe('returning');expect(s.combat.kills).toBeGreaterThanOrEqual(96);const before={...s.flight.position};s.returnAssist=true;
    for(let i=0;i<60*40&&s.state!=='complete';i++)s.advance(1/60,neutral);expect(s.state).toBe('complete');expect(s.flight.position).not.toEqual(before);expect(Math.hypot(s.flight.position.x-BASE.x,s.flight.position.z-BASE.z)).toBeLessThanOrEqual(20);expect(s.flight.state).toBe('paused');
  });
  it('cannot complete from recovery/teleport; retry/reload retain casualties and require another flyover',()=>{
    const storage=memory(),s=new Sortie(12012,storage);s.start();for(let i=0;i<400&&s.state!=='returning';i++)s.advance(1/60,{...neutral,fire:true});const killed=s.store.killed;s.recover();expect(s.state).toBe('ready');expect(s.visited).toBe(false);expect(s.store.killed).toBe(killed);expect(s.remaining).toBe(0);s.start();s.advance(1/60,neutral);expect(s.state).toBe('active');expect(s.visited).toBe(false);s.pause();const reload=new Sortie(12012,storage);expect(reload.remaining).toBe(0);expect(reload.state).toBe('ready');expect(new Sortie(12013,storage).remaining).toBe(96);
  });
  it('freezes fire on pause/crash and allows explicit retry without resurrection',()=>{
    const s=new Sortie(12012,memory());s.start();s.advance(.1,{...neutral,fire:true});s.pause();const shots=s.combat.shots,ticks=s.flight.ticks;s.advance(1,{...neutral,fire:true});expect(s.combat.shots).toBe(shots);expect(s.flight.ticks).toBe(ticks);s.start();s.flight.position.y=0;s.advance(1/60,neutral);expect(s.state).toBe('failed');s.start();expect(s.state).toBe('failed');s.recover();expect(s.state).toBe('ready');expect(s.flight.ticks).toBe(0);
  });
  it('sweeps the expanded aircraft envelope against wall obstacles',()=>{
    const s=new Sortie(12012,memory());s.start();s.flight.position={x:4,y:s.ground(16,16)+10,z:16};s.flight.heading=Math.PI/2;s.advance(.1,neutral);expect(s.flight.reason).toBe('Obstacle collision');expect(s.state).toBe('failed');
  });
  it('locks only within range/cone, manual controls cancel return assist and damage matches 30/144 Hz',()=>{
    const run=(hz:number)=>{const s=new Sortie(12012,memory());s.start();for(let i=0;i<hz*3;i++)s.advance(1/hz,{...neutral,fire:true});return s;};const a=run(30),b=run(144);expect(a.flight.ticks).toBe(b.flight.ticks);expect(a.combat.damage).toBeCloseTo(b.combat.damage,8);expect(a.remaining).toBe(b.remaining);
    const s=new Sortie(12012,memory());expect(s.lock).toBeDefined();s.flight.heading=Math.PI;expect(s.lock).toBeUndefined();s.returnAssist=true;s.advance(0,{...neutral,bank:1});expect(s.returnAssist).toBe(false);expect(OBJECTIVE_GROUPS).toHaveLength(3);
  });
});
it('coarse terrain coverage reuses buffers and disposes once after high-speed travel',()=>{
  const f=createTerrainFallback(12012),geometry=f.mesh.geometry,positions=geometry.getAttribute('position'),g=vi.spyOn(geometry,'dispose'),m=vi.spyOn(f.mesh.material,'dispose');
  expect(positions.count).toBe(33*33);for(const x of [0,64,256,2048,-256]){f.update(x,144);expect(f.mesh.geometry).toBe(geometry);expect(geometry.getAttribute('position')).toBe(positions);const px=positions.getX(0)+f.mesh.position.x,pz=positions.getZ(0)+f.mesh.position.z;expect(positions.getY(0)).toBeCloseTo(heightAt(12012,px,pz)-2.5,5);}f.dispose();f.dispose();expect(g).toHaveBeenCalledOnce();expect(m).toHaveBeenCalledOnce();
});
it('frame histories exclude warmup, bound memory and distinguish submission CPU from rAF intervals',()=>{
  const m=new FrameMetrics(2,3);for(let i=0;i<20;i++)m.add(i*10,i,i*2,i*3);expect(m.interval).toEqual([20,30,40]);expect(m.frames).toBe(5);expect(m.summary.frameIntervalMs.median).toBe(30);expect(m.summary.submissionCpuMs.median).toBe(9);expect(m.done).toBe(true);
});

it('CPU benchmark CLI reports reproducible population/work invariants without hardware timing thresholds',()=>{
  const result=spawnSync(process.execPath,['--experimental-transform-types','tools/benchmarks/combat.ts'],{encoding:'utf8',timeout:20000});expect(result.status,result.stderr).toBe(0);const report=JSON.parse(result.stdout);expect(report.cpu).toBeTruthy();expect(report.scenarios.map((s:{scenario:string})=>s.scenario)).toEqual(['crowd','fire']);for(const scenario of report.scenarios){expect(scenario.measuredTicks).toBe(3600);expect(scenario.peaks.residents).toBeLessThanOrEqual(49);expect(scenario.peaks.effects).toBeLessThanOrEqual(128);expect(scenario.killed+scenario.remainingPopulation).toBe(2592);expect(scenario.droppedSimulationSeconds).toBe(0);expect(scenario.flightState).toBe('running');}expect(report.scenarios[0].shots).toBe(0);expect(report.scenarios[1].shots).toBe(1220);expect(report.scenarios[1].killed).toBeGreaterThan(0);
},25000);

it('authored aircraft fits its 9 m conservative all-attitude collision envelope',()=>{
  const [w,h,d]=aircraftSource.size.map(n=>n*.1);let radius=0;for(const c of aircraftSource.cells){const [x,y,z]=c.position;radius=Math.max(radius,Math.hypot((x+.5)*.1-w/2,(y+.5)*.1-h/2,(z+.5)*.1-d/2)+Math.sqrt(3)*.05);}expect(radius).toBeLessThan(9);
  const s=new Sortie(12012,memory());s.start();s.flight.position={x:180,y:s.ground(180,180)+8,z:180};s.advance(1/60,neutral);expect(s.state).toBe('failed');expect(s.flight.reason).toBe('Terrain collision');
});

it('forward lookahead stays bounded until the aircraft reports world-boundary failure',()=>{
  const s=new Sortie(12012,memory());s.start();s.flight.position={x:130849,y:s.ground(130849,16)+32,z:16};s.flight.heading=Math.PI/2;expect(()=>s.advance(.1,neutral)).not.toThrow();expect(s.state).toBe('failed');expect(s.flight.reason).toBe('World boundary');
});
