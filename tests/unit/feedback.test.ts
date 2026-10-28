import { expect,it,vi } from 'vitest';
import { CombatFeedback,comfortDefaults } from '../../src/game/feedback';
import { Combat } from '../../src/combat/weapons';
import { createCombatView } from '../../src/rendering/combat-view';
import { Sortie } from '../../src/game/sortie';
const neutral={pitch:0,bank:0,throttle:0,fire:true,weapon:'shell' as const};
it('feedback confirms authoritative hits/kills even with no cosmetics, expires on ticks and rebases safely',()=>{
  const c=new Combat([{id:'t',position:{x:0,y:10,z:-10},radius:1,health:1,maxHealth:1}],()=>0,0),f=new CombatFeedback();
  c.step(true,'minigun',{x:0,y:10,z:0},{x:0,y:0,z:-1});f.update(c);expect(c.effects).toHaveLength(0);expect(f.hit).toBe(true);expect(f.cleared).toBe(true);expect(f.newKills).toBe(1);
  f.update(c);expect(f.newHits).toBe(0);expect(f.hit).toBe(true);for(let i=0;i<30;i++)c.step(false,'minigun',{x:0,y:10,z:0},{x:0,y:0,z:-1});f.update(c);expect(f.hit).toBe(false);expect(f.cleared).toBe(false);
  f.reset(c);f.update(c);expect(f.newHits).toBe(0);expect(f.cleared).toBe(false);c.reset();f.update(c);expect(f.newKills).toBe(0);expect(f.hit).toBe(false);
});
it('camera offsets are deterministic, strictly bounded, opt-in and stop when paused',()=>{
  const f=new CombatFeedback();f.update({ticks:1,shots:1,hits:1,kills:0,blasts:1});const offset=f.offset(true,true);expect(Math.abs(offset.x)).toBeLessThanOrEqual(.18);expect(Math.abs(offset.y)).toBeLessThanOrEqual(.108);expect(f.offset(true,true)).toEqual(offset);expect(f.offset(false,true)).toEqual({x:0,y:0});expect(f.offset(true,false)).toEqual({x:0,y:0});
  f.update({ticks:20,shots:1,hits:1,kills:0,blasts:1});expect(f.offset(true,true)).toEqual({x:0,y:0});
});
it('reduced-motion defaults disable flashes/smoke and motion; settings never start sound',()=>{
  expect(comfortDefaults(true)).toMatchObject({effects:'reduced',smoke:false,flashes:false,shake:false,contrast:true});expect(comfortDefaults()).toMatchObject({effects:'full',smoke:true,flashes:true,shake:false});
});
it('smoke saturates at sixteen, freezes on pause, expires/resets and reuses both geometries',()=>{
  const c=new Combat([],()=>0),view=createCombatView(c),children=[...view.group.children],geometries=new Set(children.map(m=>(m as import('three').Mesh).geometry)),spies=[...geometries].map(g=>vi.spyOn(g,'dispose'));
  for(let i=0;i<24;i++)c.explode({x:i,y:10,z:0},16,0);view.update();expect(view.smokeCapacity).toBe(16);expect(view.activeSmoke).toBe(16);expect(view.droppedSmoke).toBe(8);
  const positions=view.group.children.map(m=>m.position.y);view.update();expect(view.group.children.map(m=>m.position.y)).toEqual(positions);expect(view.activeSmoke).toBe(16);
  for(let i=0;i<80;i++)c.step(false,'minigun',{x:0,y:10,z:0},{x:0,y:0,z:-1});view.update();expect(view.activeSmoke).toBe(0);expect(view.group.children).toEqual(children);expect(geometries.size).toBe(2);
  c.explode({x:0,y:10,z:0},16,0);view.update();expect(view.activeSmoke).toBe(1);c.reset();view.update();expect(view.activeSmoke).toBe(0);view.dispose();view.dispose();view.update();expect(view.activeSmoke).toBe(0);for(const spy of spies)expect(spy).toHaveBeenCalledOnce();
});
it('off/reduced/flash-free visuals cannot alter damage, kills, mission state or persistence',()=>{
  const run=(effects:'full'|'reduced'|'off')=>{const data=new Map<string,string>(),storage={getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);}},s=new Sortie(12012,storage),view=createCombatView(s.combat);s.start();for(let i=0;i<300;i++){s.advance(1/60,neutral);view.update({effects,flashes:false,smoke:true});}s.pause();if(effects!=='full')expect(view.activeSmoke).toBe(0);if(effects==='off')expect(view.group.children.every(m=>!m.visible)).toBe(true);const result={health:[...s.store.groups.values()].map(g=>g.health),damage:s.combat.damage,kills:s.store.killed,state:s.state,save:storage.getItem(s.store.key)};view.dispose();return result;};
  expect(run('off')).toEqual(run('full'));expect(run('reduced')).toEqual(run('full'));
});
