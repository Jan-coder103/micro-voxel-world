import { expect,it,vi } from 'vitest';
import { PilotProgress } from '../../src/game/progression';
import { PLANES } from '../../src/game/aircraft-roster';
import { Frontier } from '../../src/game/frontier';
import { planeHull } from '../../src/flight/roster-hulls';
import { createPlayerAircraft,PLANE_SOURCES } from '../../src/rendering/player-aircraft';
import { validateSource } from '../../src/assets/voxel-source';
const memory=()=>{const data=new Map<string,string>();return {data,getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);}};};
const idle={pitch:0,bank:0,throttle:0,fire:false,weapon:'minigun' as const,aim:true};
it('starts at Tier 1, enforces XP, credits and predecessor ownership, and persists all five unlocks',()=>{
  const s=memory(),p=new PilotProgress(s);expect(p.plane.id).toBe('kestrel');expect(p.data.planes).toEqual(['kestrel']);expect(p.selectPlane('spectre')).toBe(false);
  p.bank(100000,100000);expect(p.unlockPlane('spectre')).toBe(false);expect(p.unlockPlane('frontier')).toBe(false);
  const before=p.data.money;for(const def of PLANES.slice(1)){expect(p.unlockPlane(def.id)).toBe(true);expect(p.unlockPlane(def.id)).toBe(false);expect(p.selectPlane(def.id)).toBe(true);}
  expect(p.data.money).toBe(before-PLANES.reduce((n,p)=>n+p.cost,0));expect(new PilotProgress(s).data).toEqual(p.data);
  const poor=new PilotProgress(memory());poor.bank(599,600);expect(poor.unlockPlane('mule')).toBe(false);poor.bank(1,0);expect(poor.unlockPlane('mule')).toBe(true);
  const novice=new PilotProgress(memory());novice.bank(1000,599);expect(novice.unlockPlane('mule')).toBe(false);
});
it('migrates v2 credits, XP, upgrades, skills and equipment without overwriting the original save',()=>{
  const s=memory(),old={schema:2,money:3200,xp:900,levels:{engine:1,bounty:2,weapons:3},skills:{thrust:1},owned:['engine-1'],equipped:{engine:'engine-1'}};s.setItem('mvw:frontier:pilot:v2',JSON.stringify(old));
  const p=new PilotProgress(s);expect(p.data.money).toBe(3200);expect(p.data.skills).toEqual(old.skills);expect(p.data.equipped).toEqual(old.equipped);expect(p.data.levels).toEqual(old.levels);expect(p.plane.id).toBe('kestrel');expect(p.unlockPlane('mule')).toBe(true);expect(s.getItem('mvw:frontier:pilot:v2')).toBe(JSON.stringify(old));expect(JSON.parse(s.getItem('mvw:frontier:pilot:v3')!).schema).toBe(3);
});
it('rejects skipped, duplicate or forged ownership and malformed debriefs atomically',()=>{
  const original=new PilotProgress(memory()).data;
  for(const change of [{planes:['kestrel','spectre']},{planes:['kestrel','kestrel']},{selectedPlane:'mule'},{runs:-1},{lastRun:{number:1}},{planes:['kestrel','unknown']}]){
    const s=memory(),raw=JSON.stringify({...original,...change});s.setItem('mvw:frontier:pilot:v3',raw);const p=new PilotProgress(s);expect(p.error).toBeTruthy();expect(p.data.planes).toEqual(['kestrel']);p.bank(10,10);expect(s.getItem('mvw:frontier:pilot:v3')).toBe(raw);
  }
});
it('turns a landed run into a saved debrief, an aircraft purchase, upgrades and the next sortie without double payment',()=>{
  const s=memory(),g=new Frontier(103,s);g.launch();g.departed=true;g.combat.kills=40;g.runSeconds=123;
  g.flight.speed=0;g.flight.throttle=0;g.flight.grounded=true;
  for(let i=0;i<61;i++)g.advance(1/60,idle);
  expect(g.state).toBe('hangar');expect(g.progress.data.runs).toBe(1);expect(g.progress.data.lastRun).toMatchObject({outcome:'landed',kills:40,baseMoney:400,baseXP:600,money:800,xp:1200,bonus:100,plane:'kestrel'});
  expect(g.unlockPlane('mule')).toBe(true);expect(g.plane.id).toBe('mule');expect(g.progress.data.money).toBe(200);expect(g.buy('engine')).toBe(true);expect(g.progress.data.money).toBe(100);
  const loaded=new Frontier(103,s);expect(loaded.plane.id).toBe('mule');expect(loaded.progress.data.lastRun?.number).toBe(1);loaded.launch();expect(loaded.runSeconds).toBe(0);loaded.advance(1/60,idle);loaded.pause();const elapsed=loaded.runSeconds;loaded.launch();expect(loaded.runSeconds).toBe(elapsed);expect(loaded.selectPlane('kestrel')).toBe(false);expect(loaded.unlockPlane('comet')).toBe(false);
  loaded.flight.state='crashed';loaded.combat.kills=3;loaded.advance(1/60,idle);expect(loaded.progress.data.lastRun).toMatchObject({number:2,outcome:'crashed',money:30,xp:45,bonus:0});const cash=loaded.progress.data.money;loaded.skipRescue();expect(loaded.progress.data.money).toBe(cash);expect(loaded.progress.data.runs).toBe(2);
});
it('rejects invalid run rewards without mutating cash or run history',()=>{const p=new PilotProgress(memory()),before=structuredClone(p.data);expect(()=>p.finishRun('landed',1,1,Number.MAX_SAFE_INTEGER,5)).toThrow();expect(p.data).toEqual(before);});
it.each(PLANES)('gives $name distinct performance, a source-matched hull, and a safe manual departure',def=>{
  const g=new Frontier(103,memory());g.progress.data.planes=PLANES.map(p=>p.id);expect(g.selectPlane(def.id)).toBe(true);g.launch();expect(g.flight.enginePower).toBeCloseTo(def.engine);expect(g.flight.maxSpeed).toBeCloseTo(100*def.speed);expect(g.combat.damageMultiplier).toBeCloseTo(def.damage);expect(g.flight.position.y-g.currentBase.height).toBeCloseTo(g.clearance);
  for(let i=0;i<900&&g.flight.speed<33;i++)g.advance(1/60,{...idle,throttle:1});expect(g.state).toBe('flying');expect(g.flight.speed).toBeGreaterThanOrEqual(33);
  for(let i=0;i<120&&g.flight.grounded;i++)g.advance(1/60,{...idle,pitch:1});expect(g.flight.grounded).toBe(false);for(let i=0;i<60;i++)g.advance(1/60,{...idle,pitch:1});
  for(let i=0;i<180;i++)g.advance(1/60,idle);expect(g.state).toBe('flying');expect(g.flight.position.y-g.baseHeight).toBeGreaterThan(8);
});
it.each(PLANES)('preserves detailed editable occupancy, rotating props and bounded visual lifetimes for $name',def=>{
  const source=validateSource(PLANE_SOURCES[def.id]);expect(source.cells.length).toBeGreaterThan(8000);expect(source.cells.length).toBeLessThanOrEqual(32768);expect(new Set(source.cells.map(c=>c.palette)).size).toBeGreaterThanOrEqual(8);
  const hull=planeHull(def.id),view=createPlayerAircraft(def.id);expect(view.rotors.length).toBe(def.propellers.length);expect(view.clearance).toBeCloseTo(.08-Math.min(...hull.boxes.map(b=>b[1]-b[4]/2)));view.update(1,2);for(const r of view.rotors)expect(r.rotation.z).not.toBe(0);
  for(const cell of source.cells.filter((_,i)=>i%37===0)){const [i,j,k]=cell.position,x=(i+.5)*.1-source.size[0]*.05,y=(j+.5)*.1-def.pivot,z=(k+.5)*.1-source.size[2]*.05;expect(hull.boxes.some(b=>Math.abs(x-b[0])<=b[3]/2+.001&&Math.abs(y-b[1])<=b[4]/2+.001&&Math.abs(z-b[2])<=b[5]/2+.001)).toBe(true);}
  const body=view.group.children[0] as import('three').Mesh,release=vi.spyOn(body.geometry,'dispose');view.dispose();view.dispose();expect(release).toHaveBeenCalledOnce();expect(view.group.children).toHaveLength(0);
});
