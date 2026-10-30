import { BoxGeometry,InstancedMesh } from 'three';
import { createNavalView } from '../../src/rendering/naval-view';
import { createMutantView } from '../../src/rendering/mutant-view';
import { expect,it,vi } from 'vitest';
import { Frontier,PilotProgress } from '../../src/game/frontier';
import { SHOP,SKILLS } from '../../src/game/progression';
import { NavalWorld,baseContains,baseSpawn,shipParts } from '../../src/world/naval';
import { Mutants,mutantBounds } from '../../src/hordes/mutants';
import { regionalSample } from '../../src/world/regional-terrain';
import { Combat,raycast } from '../../src/combat/weapons';
import { createFrontierRoads } from '../../src/rendering/frontier-roads';
import { SettlementWorld } from '../../src/world/settlements';
const memory=()=>{const data=new Map<string,string>();return {data,getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);}};};
const idle={pitch:0,bank:0,throttle:0,fire:false,weapon:'minigun' as const,aim:true};
const tick=(g:Frontier,n:number,input=idle)=>{for(let i=0;i<n;i++)g.advance(1/60,input);};

it('keeps naval groups sparse, seeded, ocean-bound and between five and eight battleships',()=>{
  for(const seed of [0,103,12012]){
    const navy=new NavalWorld(seed);expect(navy.flagship).toEqual(new NavalWorld(seed).flagship);const fleets=[navy.flagship];
    for(let z=-3;z<3;z++)for(let x=-4;x<1;x++){const f=navy.fleet(x,z);if(f)fleets.push(f);}
    expect(fleets.length).toBeLessThan(20);
    for(const f of fleets){expect(f.ships.filter(s=>s.kind==='battleship').length).toBeGreaterThanOrEqual(5);expect(f.ships.filter(s=>s.kind==='battleship').length).toBeLessThanOrEqual(8);expect(f.ships.filter(s=>s.kind==='carrier')).toHaveLength(1);for(const s of f.ships)expect(regionalSample(seed,s.x,s.z).biome).toBe('ocean');}
  }
});

it('lands, stops, banks, shops, takes off and recovers at an ocean carrier using the airfield rules',()=>{
  const storage=memory(),g=new Frontier(103,storage),carrier=g.navy.carrierBase(g.navy.flagship.ships[0]);
  expect(g.selectBase(carrier.id)).toBe(true);expect(g.flight.position.x).toBe(0);
  g.launch();g.departed=true;const f=g.flight;f.grounded=false;f.position={x:carrier.x,y:carrier.height+1.84,z:carrier.z+90};f.speed=32;f.throttle=.32;f.pitch=-.055;
  g.combat.kills=7;tick(g,120);expect(f.grounded).toBe(true);expect(g.currentBase.id).toBe(carrier.id);
  tick(g,300,{...idle,throttle:-1});expect(g.state).toBe('hangar');expect(g.progress.data.money).toBe(70);expect(g.progress.data.xp).toBe(105);expect(g.flight.position.x).toBe(carrier.x);expect(g.flight.position.z).toBe(baseSpawn(carrier).z);
  g.progress.bank(1000,300);expect(g.purchase('engine-1')).toBe(true);expect(g.equip('engine','engine-1')).toBe(true);
  g.launch();tick(g,280,{...idle,throttle:1});tick(g,60,{...idle,pitch:1});expect(g.flight.grounded).toBe(false);expect(g.flight.state).toBe('running');
  g.state='crashed';g.crashSeconds=.1;tick(g,7);expect(g.currentBase.id).toBe(carrier.id);expect(g.flight.grounded).toBe(true);expect(baseContains(carrier,g.flight.position.x,g.flight.position.z,10)).toBe(true);
});

it('keeps carrier hulls and islands solid, deck heights authoritative, and open ocean unsafe',()=>{
  const g=new Frontier(103,memory()),ship=g.navy.flagship.ships[0],b=g.navy.carrierBase(ship);
  expect(g.ground(ship.x,ship.z)).toBe(b.height);expect(shipParts(ship).length).toBeGreaterThan(30);
  const island={minX:ship.x+20,maxX:ship.x+30,minY:20,maxY:40,minZ:ship.z,maxZ:ship.z+40};expect(g.navy.obstacles(island).length).toBeGreaterThan(0);
  g.launch();g.flight.grounded=false;g.flight.position={x:ship.x+150,y:1,z:ship.z};g.flight.speed=40;tick(g,2);expect(g.state).toBe('crashed');
});

it('persists mutant wounds and deaths and raycasts their bodies rather than a giant empty sphere',()=>{
  const storage=memory(),m=new Mutants(103,storage),t=m.landmark;expect(t.height).toBeGreaterThan(100);expect(t.maxHealth).toBeGreaterThan(10000);expect(mutantBounds(t).length).toBeGreaterThanOrEqual(10);
  const chest=t.hitSpheres![0],origin={x:chest.position.x,y:chest.position.y,z:chest.position.z-100};
  const index={query:()=>[t]},direction={x:0,y:0,z:1};expect(raycast(index,origin,direction,200,()=>-100)?.target).toBe(t);
  const empty={x:t.position.x+t.height*.65,y:t.ground+t.height*.8,z:t.position.z-100};expect(raycast(index,empty,direction,200,()=>-100)).toBeUndefined();
  const combat=new Combat([],()=>-100,0,{index,onDamage:t=>m.damaged(t)});combat.step(true,'shell',origin,direction);expect(t.health).toBeLessThan(t.maxHealth);expect(new Mutants(103,storage).landmark.health).toBe(t.health);
  combat.damageMultiplier=10000;combat.step(true,'autocannon',origin,direction);expect(t.health).toBe(0);expect(new Mutants(103,storage).nearby(t.position).some(m=>m.id===t.id)).toBe(false);
});

it('gives mutant kills larger unbanked rewards exactly once and loses them after a crash',()=>{
  const g=new Frontier(103,memory()),t=g.mutants.landmark,chest=t.hitSpheres![0];g.launch();g.combat.damageMultiplier=10000;
  const origin={x:chest.position.x,y:chest.position.y,z:chest.position.z-25};g.combat.step(true,'autocannon',origin,{x:0,y:0,z:1});
  expect(t.health).toBe(0);expect(g.pendingMoney).toBe(4000);expect(g.pendingXP).toBe(6000);expect(g.combat.kills).toBe(1);
  g.combat.step(true,'shell',origin,{x:0,y:0,z:1});expect(g.pendingMoney).toBe(4000);g.state='crashed';expect(g.pendingMoney).toBe(0);expect(g.pendingXP).toBe(0);
});

it('migrates old pilot records and makes prerequisite skills, purchased loadouts and bonuses persistent',()=>{
  const storage=memory();storage.setItem('mvw:frontier:pilot:v1',JSON.stringify({schema:1,money:12000,xp:6000,levels:{engine:2,weapons:1,bounty:1}}));
  const p=new PilotProgress(storage);expect(p.data.money).toBe(12000);expect(p.data.levels.engine).toBe(2);expect(p.skillPoints).toBe(20);expect(SKILLS).toHaveLength(18);expect(SHOP.length).toBeGreaterThanOrEqual(18);
  expect(p.learn('ace')).toBe(false);expect(p.learn('thrust')).toBe(true);expect(p.learn('control')).toBe(true);expect(p.skillPoints).toBe(18);
  expect(p.purchase('engine-3')).toBe(false);expect(p.purchase('engine-1')).toBe(true);expect(p.equip('weapon','engine-1')).toBe(false);expect(p.equip('engine','engine-1')).toBe(true);expect(p.bonuses.engine).toBeCloseTo(1.21);
  const loaded=new PilotProgress(storage);expect(loaded.data).toEqual(p.data);expect(loaded.skillPoints).toBe(18);expect(storage.getItem('mvw:frontier:pilot:v1')).toContain('"schema":1');
  const g=new Frontier(103,storage);g.launch();expect(g.flight.enginePower).toBeCloseTo(1.24*1.21);expect(g.learn('brakes')).toBe(false);expect(g.purchase('engine-2')).toBe(false);expect(g.equip('engine','')).toBe(false);
});

it('rejects corrupt progression and mutant records atomically while preserving original bytes',()=>{
  const storage=memory();storage.setItem('mvw:frontier:pilot:v2',JSON.stringify({schema:2,money:5,xp:0,levels:{engine:0,weapons:0,bounty:0},skills:{ace:3},owned:[],equipped:{}}));
  const p=new PilotProgress(storage),bytes=storage.getItem('mvw:frontier:pilot:v2');expect(p.error).toBeTruthy();p.bank(30,40);expect(storage.getItem('mvw:frontier:pilot:v2')).toBe(bytes);
  storage.setItem('mvw:frontier:mutants:v1:103','bad');const m=new Mutants(103,storage);m.landmark.health-=10;m.damaged(m.landmark);expect(storage.getItem(m.key)).toBe('bad');expect(m.error).toBeTruthy();
});

it('generates dirt-surfaced rural roads and renders them beyond the near terrain stream with bounded ownership',async()=>{
  const world=new SettlementWorld(103),rural=world.landmarks().rural;expect(rural).toBeTruthy();expect(rural!.roads.some(r=>r.surface==='dirt')).toBe(true);
  vi.useFakeTimers();try{const view=createFrontierRoads(world);view.update(rural!.x,rural!.z);expect(view.pending).toBe(true);await vi.runAllTimersAsync();expect(view.count).toBe(25);expect(view.group.children.some(m=>Math.hypot(m.position.x-rural!.x,m.position.z-rural!.z)>700)).toBe(true);view.dispose();expect(view.group.children).toHaveLength(0);expect(view.pending).toBe(false);const pending=createFrontierRoads(world);pending.update(0,0);pending.dispose();await vi.runAllTimersAsync();expect(pending.pending).toBe(false);expect(pending.count).toBe(0);}finally{vi.useRealTimers();}
});


it('makes mutants passive collision hazards and keeps distant low flight safe',()=>{
  const g=new Frontier(103,memory()),t=g.mutants.landmark;
  g.launch();g.flight.grounded=false;g.flight.position={x:t.position.x+180,y:t.ground+100,z:t.position.z};g.flight.speed=50;g.flight.throttle=.5;tick(g,60);expect(g.flight.state).toBe('running');expect(t.health).toBe(t.maxHealth);
  g.flight.position={...t.hitSpheres![0].position};tick(g,1);expect(g.state).toBe('crashed');expect(g.flight.reason).toBe('Obstacle collision');
});


it('banks a defeated colossus at a carrier and turns its XP into spendable skill points',()=>{
  const storage=memory(),g=new Frontier(103,storage),t=g.mutants.landmark,chest=t.hitSpheres![0];g.launch();g.combat.damageMultiplier=10000;
  g.combat.step(true,'autocannon',{x:chest.position.x,y:chest.position.y,z:chest.position.z-25},{x:0,y:0,z:1});
  const b=g.navy.carrierBase(g.navy.flagship.ships[0]),f=g.flight;g.departed=true;f.grounded=false;f.position={x:b.x,y:b.height+1.84,z:b.z+90};f.speed=32;f.throttle=.32;f.pitch=-.055;
  tick(g,120);tick(g,300,{...idle,throttle:-1});expect(g.state).toBe('hangar');expect(g.progress.data.money).toBe(4000);expect(g.progress.skillPoints).toBe(20);expect(g.learn('ballistics')).toBe(true);expect(g.progress.skillPoints).toBe(19);
  const loaded=new Frontier(103,storage);expect(loaded.mutants.landmark.health).toBe(0);expect(loaded.progress.data.money).toBe(4000);expect(loaded.progress.skillPoints).toBe(19);
});


it('rebases naval and mutant instance positions and releases their own resources without disposing the shared cube',()=>{
  const cube=new BoxGeometry(1,1,1);let disposed=0;cube.addEventListener('dispose',()=>disposed++);
  const navy=new NavalWorld(103),ships=createNavalView(navy,cube);ships.update(navy.flagship.x,navy.flagship.z);
  const shipMesh=ships.group.children[0] as InstancedMesh,first=shipParts(navy.flagship.ships[0])[0];
  expect(shipMesh.instanceMatrix.array[12]+ships.group.position.x).toBeCloseTo(first.x,3);expect(Math.abs(shipMesh.instanceMatrix.array[12])).toBeLessThan(1000);
  const mutants=new Mutants(103,memory()),bosses=createMutantView(mutants,cube),p=mutants.landmark.position;bosses.update(p.x,p.z);const bossMesh=bosses.group.children[0] as InstancedMesh,count=bossMesh.count;expect(count).toBeGreaterThan(10);
  mutants.landmark.health=0;mutants.damaged(mutants.landmark);bosses.update(p.x,p.z);expect(bossMesh.count).toBeLessThan(count);
  ships.dispose();bosses.dispose();expect(disposed).toBe(0);cube.dispose();expect(disposed).toBe(1);
});
