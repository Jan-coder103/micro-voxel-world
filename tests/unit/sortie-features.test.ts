import { expect,it,vi } from 'vitest';
import { Mesh,MeshBasicMaterial } from 'three';
import { Combat,type Target } from '../../src/combat/weapons';
import { Frontier } from '../../src/game/frontier';
import { Mutants,mutantParts } from '../../src/hordes/mutants';
import { airbaseObstacles,airbaseParts,onRunway } from '../../src/world/airbase';
import { createBaseView,createEngineExhaust,createRescueView,speedWindOpacity } from '../../src/rendering/sortie-presentation';
import { WorldMap } from '../../src/game/world-map';
import { CLOUD_CAPACITY,createFrontierClouds } from '../../src/rendering/frontier-clouds';
const memory=()=>{const data=new Map<string,string>();return {getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);}};};
const idle={pitch:0,bank:0,throttle:0,fire:false,weapon:'minigun' as const,aim:true};
const target=(id='boss'):Target=>({id,position:{x:150,y:50,z:0},radius:4,maxHealth:10000,health:10000});
it('requires an uninterrupted one-second missile lock, resets on loss/change, and cannot fire early',()=>{
  const t=target(),c=new Combat([t],()=>-100),o={x:0,y:50,z:0},d={x:1,y:0,z:0};
  for(let i=0;i<59;i++)c.step(true,'missile',o,d,t);expect(c.shots).toBe(0);expect(c.lockReady).toBe(false);
  c.step(false,'missile',o,d);expect(c.lockTicks).toBe(0);
  for(let i=0;i<30;i++)c.step(false,'missile',o,d,t);c.step(false,'missile',o,d,target('other'));expect(c.lockTicks).toBe(1);
  for(let i=0;i<59;i++)c.step(false,'missile',o,d,t);expect(c.lockReady).toBe(false);c.step(true,'missile',o,d,t);expect(c.shots).toBe(1);expect(c.missiles).toHaveLength(1);
  c.reset();expect(c.missiles).toHaveLength(0);expect(c.lockTicks).toBe(0);
});
it('flies a visible arc, follows a moving target, deals massive damage and obeys terrain collision',()=>{
  const t=target(),c=new Combat([t],()=>-100),o={x:0,y:50,z:0},d={x:1,y:0,z:0};
  for(let i=0;i<60;i++)c.step(i===59,'missile',o,d,t);
  for(let i=0;i<30;i++)c.step(false,'missile',o,d,t);expect(c.missiles[0].position.y).toBeGreaterThan(80);
  t.position.z=20;for(let i=0;i<120;i++)c.step(false,'missile',o,d,t);expect(c.missiles).toHaveLength(0);expect(t.health).toBeLessThanOrEqual(4000);expect(c.blasts).toBe(1);
  const blocked=target(),wall=new Combat([blocked],x=>x>65&&x<100?300:-100);
  for(let i=0;i<60;i++)wall.step(i===59,'missile',o,d,blocked);for(let i=0;i<150;i++)wall.step(false,'minigun',o,d);expect(blocked.health).toBe(10000);expect(wall.missiles).toHaveLength(0);
});
it('retains crash rewards once, persists them, and allows immediate rescue skip',()=>{
  const storage=memory(),g=new Frontier(103,storage);g.launch();g.combat.kills=12;g.flight.state='crashed';g.advance(1/60,idle);
  expect(g.progress.data.money).toBe(120);expect(g.progress.data.xp).toBe(180);g.advance(1,idle);expect(g.progress.data.money).toBe(120);
  expect(new Frontier(103,storage).progress.data.money).toBe(120);g.skipRescue();expect(g.state).toBe('hangar');expect(g.paused).toBe(true);expect(g.pendingMoney).toBe(0);expect(g.flight.grounded).toBe(true);expect(g.progress.data.money).toBe(120);
});
it('adds layered mutant anatomy and telegraphs close attacks that can be evaded',()=>{
  const m=new Mutants(103,memory()),t=m.landmark,p={x:t.position.x+t.height*.6,y:t.ground+t.height*.8,z:t.position.z};
  expect(mutantParts(t).length).toBeGreaterThan(130);expect(mutantParts(t,false).length).toBeLessThan(30);
  for(let i=0;i<59;i++)expect(m.attack(p,1/60)).toBe(false);expect(t.attackCharge).toBeGreaterThan(.9);
  expect(m.attack({...p,y:t.ground+t.height*2},1/60)).toBe(false);expect(t.attackCharge).toBe(0);
  let struck=false;for(let i=0;i<61;i++)struck=m.attack(p,1/60)||struck;expect(struck).toBe(true);expect(m.attack(p,.1)).toBe(false);
});
it('builds fortifications, hangars, tents and armored guards with matching solid bounds clear of the runway',()=>{
  const parts=airbaseParts(103),bounds=airbaseObstacles(103);expect(parts.length).toBeGreaterThan(150);expect(bounds.length).toBe(parts.length+2);
  expect(parts.every(p=>!onRunway(p.x,p.z,-p.w/2))).toBe(true);
  const view=createBaseView(103),release=vi.spyOn((view.group.children[0] as Mesh).geometry,'dispose');view.dispose();expect(release).toHaveBeenCalledOnce();
});
it('switches exhaust to afterburner at 90%, and flies two rescue helicopters down to terrain',()=>{
  const exhaust=createEngineExhaust(),plume=exhaust.group.children[0] as Mesh;
  exhaust.update(.89,1,true);expect((plume.material as MeshBasicMaterial).opacity).toBeLessThan(.2);
  exhaust.update(.90,1,true);expect((plume.material as MeshBasicMaterial).opacity).toBeGreaterThan(.5);exhaust.update(1,1,false);expect(exhaust.group.visible).toBe(false);exhaust.dispose();
  const rescue=createRescueView(),p={x:100,y:0,z:200};rescue.update(p,0,()=>10,true);expect(rescue.group.children).toHaveLength(2);expect(rescue.group.children[0].position.y).toBe(102);
  rescue.update(p,9,()=>10,true);expect(rescue.group.children.every(c=>c.position.y===12)).toBe(true);expect(rescue.group.children[0].position.x).not.toBe(rescue.group.children[1].position.x);rescue.dispose();
});
it('increases distant billboard coverage within a fixed single-draw capacity',()=>{
  const clouds=createFrontierClouds(103);clouds.update(0,0);expect(clouds.mesh.count).toBeGreaterThan(392);expect(clouds.mesh.count).toBeLessThanOrEqual(CLOUD_CAPACITY);expect(CLOUD_CAPACITY).toBe(968);clouds.dispose();
});
it('caches a low-poly top-down map, pans/zooms across the world without streaming or advancing flight',()=>{
  const ctx={fillRect:vi.fn(),drawImage:vi.fn(),beginPath(){},moveTo(){},lineTo(){},stroke(){},fillText(){},fillStyle:'',font:'',strokeStyle:'',lineWidth:1,imageSmoothingEnabled:false};
  const canvas=()=>({width:0,height:0,getContext:()=>ctx});vi.stubGlobal('document',{createElement:()=>canvas()});
  try{const g=new Frontier(103,memory()),pos={...g.flight.position},view=new WorldMap(canvas() as unknown as HTMLCanvasElement,g);view.center();const n=ctx.fillRect.mock.calls.length;expect(n).toBeGreaterThanOrEqual(2304);view.draw();expect(ctx.fillRect.mock.calls.length-n).toBe(n-2304);view.pan(1,0);expect(view.x).toBe(1024);view.zoom(2);expect(view.span).toBe(16384);expect(g.flight.position).toEqual(pos);expect(g.paused).toBe(true);expect(g.terrainPlan()).toHaveLength(49);}finally{vi.unstubAllGlobals();}
});

it('fades peripheral wind stripes in with airspeed and suppresses them while paused, grounded or effects are off',()=>{
  expect(speedWindOpacity(60,false,false,true,false)).toBe(0);expect(speedWindOpacity(115,false,false,true,false)).toBe(.5);expect(speedWindOpacity(250,false,false,true,false)).toBe(.8);
  expect(speedWindOpacity(200,true,false,true,false)).toBe(0);expect(speedWindOpacity(200,false,true,true,false)).toBe(0);expect(speedWindOpacity(200,false,false,false,false)).toBe(0);expect(speedWindOpacity(200,false,false,true,true)).toBe(0);
});
