import { describe,it,expect,vi } from 'vitest';
import { Combat,TargetIndex,raycast,WEAPONS,type Target,type WeaponId } from '../../src/combat/weapons';
import { Flight } from '../../src/flight/flight';
import { createCombatView } from '../../src/rendering/combat-view';
const origin={x:0,y:10,z:0},forward={x:0,y:0,z:-1};
const target=(id:string,x=0,y=10,z=-50,radius=1,health=1000):Target=>({id,position:{x,y,z},radius,maxHealth:health,health});
describe('reusable weapons',()=>{
  it.each(['minigun','autocannon','shell'] as WeaponId[])('%s deals identical damage and cadence at 30/144 Hz',weapon=>{
    const run=(hz:number)=>{const c=new Combat([target('thin',0,10,-50,.05,10000)],()=>0),f=new Flight(()=>0);f.start();for(let i=0;i<hz*3;i++)f.advance(1/hz,{pitch:0,bank:0,throttle:0},()=>c.step(true,weapon,origin,forward));return {c,f};};
    const a=run(30),b=run(144);expect(a.c.shots).toBe(180/WEAPONS[weapon].intervalTicks);expect(a.c.shots).toBe(b.c.shots);expect(a.c.damage).toBeCloseTo(b.c.damage,9);expect(a.c.damage).toBeGreaterThan(0);expect(a.c.targets[0].health).toBe(b.c.targets[0].health);
    a.f.pause();a.f.advance(1,{pitch:0,bank:0,throttle:0},()=>a.c.step(true,weapon,origin,forward));expect(a.c.ticks).toBe(180);
  });
  it('finds nearest thin sphere, handles inside origins and respects terrain obstruction',()=>{
    const near=target('near',0,10,-100,.05),far=target('far',0,10,-101,.1),index=new TargetIndex([far,near]);
    expect(raycast(index,origin,forward,240,()=>0)?.target).toBe(near);
    expect(raycast(index,{x:0,y:10,z:-100},forward,240,()=>0)?.distance).toBe(0);
    const hit=raycast(index,origin,forward,240,(_,z)=>z<-40&&z>-41?20:0);expect(hit?.target).toBeUndefined();expect(hit?.distance).toBeCloseTo(40.25);
    expect(raycast(index,origin,{x:1,y:0,z:0},240,()=>0)).toBeUndefined();
    near.health=0;expect(raycast(index,origin,forward,240,()=>0)?.target).toBe(far);
  });
  it('spatially excludes distant targets and deduplicates spheres crossing negative cell boundaries',()=>{
    const crossing=target('cross',-32,10,-32,8),distant=target('far',1000,10,1000),index=new TargetIndex([crossing,distant]);
    expect([...index.query({x:-40,y:0,z:-40},{x:-20,y:20,z:-20})]).toEqual([crossing]);
    expect(()=>new TargetIndex([target('same'),target('same')])).toThrow();expect(()=>new TargetIndex([target('bad',0,10,0,Infinity)])).toThrow();
  });
  it('applies blast falloff once per live target and never damages radius edge/outside or dead targets',()=>{
    const targets=[target('centre',0,10,0,4),target('half',8,10,0,4),target('edge',16,10,0,4),target('outside',20,10,0,4)];
    const c=new Combat(targets,()=>0);c.explode(origin,16,150);expect(targets.map(t=>t.health)).toEqual([850,925,1000,1000]);expect(c.hits).toBe(2);expect(c.damage).toBe(225);
    const dead=target('dead',0,10,0);dead.health=0;const d=new Combat([dead],()=>0);d.explode(origin,16,150);expect(d.hits).toBe(0);expect(d.kills).toBe(0);
  });
  it('terrain shields blast targets; target hulls do not shield blasts',()=>{
    const behind=target('behind',10,10,0),c=new Combat([behind],x=>x>4&&x<6?20:0);c.explode(origin,16,150);expect(behind.health).toBe(1000);
    const a=target('front',4,10,0,4),b=target('back',8,10,0,4),open=new Combat([a,b],()=>0);open.explode(origin,16,150);expect(a.health).toBe(887.5);expect(b.health).toBe(925);
  });
  it('explosive hits have blast damage only; ground impact blasts can reach grounded targets',()=>{
    const t=target('shell',0,10,-10,2),c=new Combat([t],()=>0);c.step(true,'shell',origin,forward);expect(c.blasts).toBe(1);expect(c.hits).toBe(1);expect(c.damage).toBe(150*(1-2/16));
    const grounded=target('ground',4,3,0,1),g=new Combat([grounded],()=>0);g.step(true,'shell',origin,{x:0,y:-1,z:0});expect(g.blasts).toBe(1);expect(g.damage).toBeGreaterThan(0);
  });
  it('weapon switching cannot bypass each weapon cooldown; health never drops below zero',()=>{
    const t=target('small',0,10,-10,1,5),c=new Combat([t],()=>0);c.step(true,'minigun',origin,forward);c.step(true,'autocannon',origin,forward);c.step(true,'minigun',origin,forward);expect(c.shots).toBe(2);c.step(true,'minigun',origin,forward);expect(c.shots).toBe(3);expect(t.health).toBe(0);expect(c.kills).toBe(1);expect(c.damage).toBe(5);
  });
  it('saturated cosmetic pools never suppress damage, expire and reuse allocations on reset',()=>{
    const run=(cap:number)=>{const c=new Combat([target('durable',0,10,-50,1,100000)],()=>0,cap);for(let i=0;i<600;i++)c.step(true,'minigun',origin,forward);return c;};
    const c=run(1),none=run(0);expect(c.damage).toBe(none.damage);expect(c.shots).toBe(200);expect(c.droppedEffects).toBeGreaterThan(0);expect(c.effects.filter(e=>e.active).length).toBeLessThanOrEqual(1);
    for(let i=0;i<60;i++)c.step(false,'minigun',origin,forward);expect(c.effects.every(e=>!e.active)).toBe(true);const slots=[...c.effects],point=c.effects[0].from;c.reset();expect(c.effects).toEqual(slots);expect(c.effects[0].from).toBe(point);expect(c.shots).toBe(0);expect(c.targets[0].health).toBe(100000);
    expect(()=>c.step(true,'minigun',origin,{x:0,y:0,z:0})).toThrow();expect(()=>c.explode(origin,0,1)).toThrow();expect(()=>c.explode({x:1e100,y:0,z:0},16,1)).toThrow();expect(()=>c.step(true,'minigun',{x:1e100,y:0,z:0},forward)).toThrow();expect(()=>c.index.query({x:NaN,y:0,z:0},origin)).toThrow();
  });
  it('combat view retains fixed geometry allocations through fire/reset and disposes once',()=>{
    const c=new Combat([target('range')],()=>0),view=createCombatView(c),meshes=view.group.children,geometries=new Set(meshes.map(m=>(m as import('three').Mesh).geometry)),spies=[...geometries].map(g=>vi.spyOn(g,'dispose'));
    for(let i=0;i<100;i++){c.step(true,'minigun',origin,forward);view.update();}c.reset();view.update();expect(view.group.children).toEqual(meshes);expect(geometries.size).toBe(2);view.dispose();view.dispose();spies.forEach(s=>expect(s).toHaveBeenCalledTimes(1));expect(view.group.children).toHaveLength(0);
  });
});

it('flight callbacks exclude crash ticks and cap weapon work with simulation catchup',()=>{
  const flight=new Flight(()=>0),callback=vi.fn();flight.start();flight.advance(10,{pitch:0,bank:0,throttle:0},callback);expect(callback).toHaveBeenCalledTimes(8);flight.position.y=0;flight.advance(1/60,{pitch:0,bank:0,throttle:0},callback);expect(flight.state).toBe('crashed');expect(callback).toHaveBeenCalledTimes(8);
});
