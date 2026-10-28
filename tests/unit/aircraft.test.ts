import { it,expect,vi } from 'vitest';
import { Matrix4,Vector3,Euler } from 'three';
import { AircraftSetup } from '../../src/flight/aircraft';
import { Flight } from '../../src/flight/flight';
import { Sortie,BASE } from '../../src/game/sortie';
import { createRotorcraft,createWeaponMount } from '../../src/rendering/rotorcraft';
const neutral={pitch:0,bank:0,throttle:0};
const tick=(f:Flight,seconds:number,input=neutral)=>{for(let i=0;i<seconds*60;i++)f.advance(1/60,input);};
it('helicopter hovers, yaws, climbs/descends and recovers without minimum forward speed',()=>{
  const f=new Flight(()=>0,undefined,'helicopter');const start={...f.position};f.start();tick(f,2);expect(f.position).toEqual(start);expect(f.speed).toBe(0);expect(f.ticks).toBe(120);
  tick(f,1,{...neutral,bank:1,throttle:1});expect(f.heading).toBeCloseTo(1.05);expect(f.position.y).toBeCloseTo(start.y+12);expect(f.position.x).toBe(start.x);
  tick(f,1,{...neutral,throttle:-1});expect(f.position.y).toBeCloseTo(start.y);f.pause();const p={...f.position};tick(f,1,{...neutral,throttle:1});expect(f.position).toEqual(p);
  f.reset();expect(f.aircraft).toBe('helicopter');expect(f.speed).toBe(0);expect(f.state).toBe('ready');
});
it('tilt gives helicopter forward/reverse motion, direct holds tilt and assistance brakes toward hover',()=>{
  const f=new Flight(()=>0,undefined,'helicopter');f.start();tick(f,1,{...neutral,pitch:-1});expect(f.position.z).toBeLessThan(16);expect(f.speed).toBeGreaterThan(0);
  f.assisted=false;const pitch=f.pitch;tick(f,1);expect(f.pitch).toBe(pitch);f.assisted=true;tick(f,5);expect(Math.abs(f.speed)).toBeLessThan(.01);
  tick(f,2,{...neutral,pitch:1});expect(f.speed).toBeLessThan(0);expect(f.speed).toBeGreaterThanOrEqual(-55);
});
it('helicopter fixed ticks agree at 30/144 Hz and sweep vertical, reverse and stationary contact safely',()=>{
  const run=(hz:number)=>{const f=new Flight(()=>0,undefined,'helicopter');f.start();for(let i=0;i<hz*3;i++)f.advance(1/hz,{pitch:-.2,bank:.1,throttle:.2});return f;};
  const a=run(30),b=run(144);expect(a.position.x).toBeCloseTo(b.position.x,8);expect(a.position.y).toBeCloseTo(b.position.y,8);expect(a.ticks).toBe(180);
  const obstacle=vi.fn((_origin:unknown,_direction:unknown,range:number)=>range>0?.05:undefined),f=new Flight(()=>0,obstacle,'helicopter');f.start();tick(f,1);expect(obstacle).toHaveBeenLastCalledWith({x:16,y:40,z:16},{x:0,y:1,z:0},0);f.advance(1/60,{...neutral,throttle:1});expect(f.reason).toBe('Obstacle collision');expect(f.position.y).toBeCloseTo(40.05);
  const overlapping=new Flight(()=>0,()=>0,'helicopter');overlapping.start();overlapping.advance(1/60,neutral);expect(overlapping.reason).toBe('Obstacle collision');expect(overlapping.position).toEqual({x:16,y:40,z:16});
  const low=new Flight(()=>0,undefined,'helicopter');low.position.y=8.05;low.start();tick(low,1,{...neutral,throttle:-1});expect(low.reason).toBe('Terrain collision');
  const reverse=new Flight((_,z)=>z>16.1?100:0,undefined,'helicopter');reverse.start();tick(reverse,2,{...neutral,pitch:1});expect(reverse.reason).toBe('Terrain collision');
});
it('configuration validates atomically and rotates side/nose muzzle positions exactly with the airframe',()=>{
  const setup=new AircraftSetup();for(const bad of ['unknown','__proto__','']){expect(()=>setup.setAircraft(bad)).toThrow();expect(()=>setup.setLoadout(bad)).toThrow();expect(()=>setup.setMount(bad)).toThrow();}expect(setup.aircraft).toBe('fixed-wing');
  setup.setLoadout('precision');expect(setup.allows('shell')).toBe(false);expect(setup.allows('autocannon')).toBe(true);
  for(const mount of ['nose','port','starboard']){setup.setMount(mount);const local=setup.muzzle({x:0,y:0,z:0},0,0,0);const expected=new Vector3(local.x,local.y,local.z).applyMatrix4(new Matrix4().makeRotationFromEuler(new Euler(.3,-1.2,-.4,'YXZ'))).add(new Vector3(8,20,-7));const actual=setup.muzzle({x:8,y:20,z:-7},1.2,.3,.4);expect(actual.x).toBeCloseTo(expected.x,10);expect(actual.y).toBeCloseTo(expected.y,10);expect(actual.z).toBeCloseTo(expected.z,10);}
});
it('switching aircraft resets attempt/flyover while preserving casualties; loadouts cannot bypass cooldowns',()=>{
  const data=new Map<string,string>(),storage={getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);}};
  const s=new Sortie(12012,storage);s.start();for(let i=0;i<300;i++)s.advance(1/60,{...neutral,fire:true,weapon:'shell'});const killed=s.store.killed;expect(killed).toBeGreaterThan(0);
  s.visited=true;s.setAircraft('helicopter');expect(s.state).toBe('ready');expect(s.visited).toBe(false);expect(s.store.killed).toBe(killed);expect(s.flight.speed).toBe(0);expect(new Sortie(12012,storage).store.killed).toBe(killed);
  s.setup.setLoadout('precision');s.start();s.advance(1/60,{...neutral,fire:true,weapon:'shell'});expect(s.combat.shots).toBe(0);
  s.setup.setLoadout('siege');s.advance(1/60,{...neutral,fire:true,weapon:'shell'});expect(s.combat.shots).toBe(1);
  s.setup.setLoadout('precision');s.setup.setLoadout('siege');s.advance(1/60,{...neutral,fire:true,weapon:'shell'});expect(s.combat.shots).toBe(1);
  s.setAircraft('fixed-wing');expect(s.flight.speed).toBe(40);expect(s.store.killed).toBe(killed);
});
it('helicopter return assistance physically reaches base without teleporting',()=>{
  const s=new Sortie(12012);s.setAircraft('helicopter');s.state='returning';s.flight.position={x:BASE.x,y:s.ground(BASE.x,BASE.z)+40,z:BASE.z-200};s.returnAssist=true;s.start();
  for(let i=0;i<60*45&&(s.state as string)!=='complete';i++)s.advance(1/60,{...neutral,fire:false,weapon:'minigun'});
  expect(s.state).toBe('complete');expect(Math.hypot(s.flight.position.x-BASE.x,s.flight.position.z-BASE.z)).toBeLessThanOrEqual(20);
});
it('rotorcraft/mount resources dispose once and rotor geometry fits an 8 m envelope',()=>{
  const view=createRotorcraft(),mount=createWeaponMount(),geometries=new Set<import('three').BufferGeometry>();let radius=0;
  view.group.updateMatrixWorld(true);view.group.traverse(object=>{if('geometry' in object){const mesh=object as import('three').Mesh;geometries.add(mesh.geometry);const positions=mesh.geometry.getAttribute('position');for(let i=0;i<positions.count;i++){const p=new Vector3().fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld);radius=Math.max(radius,p.length());}}});
  expect(radius).toBeLessThan(8);const spies=[...geometries].map(g=>vi.spyOn(g,'dispose'));view.update(30);view.dispose();view.dispose();mount.dispose();mount.dispose();for(const spy of spies)expect(spy).toHaveBeenCalledOnce();
});
it('hovering helicopter attacks real persistent members through the shared mounted combat path',()=>{
  const s=new Sortie(12012);s.setAircraft('helicopter');s.setup.setMount('starboard');const position={...s.flight.position};s.start();
  for(let i=0;i<120;i++)s.advance(1/60,{...neutral,fire:true,weapon:'shell'});
  expect(s.flight.position).toEqual(position);expect(s.combat.shots).toBe(2);expect(s.combat.kills).toBeGreaterThan(0);expect(s.store.killed).toBe(s.combat.kills);
});
