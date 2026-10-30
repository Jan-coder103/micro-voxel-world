import { describe,it,expect,vi } from 'vitest';
import { Combat } from '../../src/combat/weapons';
import { Hordes,blocked,hordeTier } from '../../src/hordes/hordes';
import { HordeStore,HEALTH,TOTAL_POPULATION,patrol,validateHordeSave,groupId,initialGroup } from '../../src/hordes/state';
const observer={x:16,y:0,z:16};
function memory(){const data=new Map<string,string>();return {data,getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);}};}
const world=(seed=103)=>{const storage=memory(),store=new HordeStore(seed,storage),hordes=new Hordes(store,()=>0);hordes.update(observer);return {storage,store,hordes};};
function wound(h:Hordes,amount:number){const t=h.firstSurvivor()!;t.health=Math.max(0,t.health-amount);h.damaged(t);return t;}
describe('bounded horde simulation',()=>{
  it('has seeded stable slots, bounded residents and conserves total population',()=>{
    const {hordes,store}=world();expect(initialGroup(103,0,0)).toEqual(initialGroup(103,0,0));expect(initialGroup(103,0,0).offsets).not.toEqual(initialGroup(104,0,0).offsets);
    expect(hordes.resident.size).toBe(49);expect(hordes.counts.residentAlive).toBe(49*32);expect(store.killed).toBe(0);expect(TOTAL_POPULATION).toBe(2592);
    for(const x of [-128,16,128,272,16]){hordes.update({...observer,x});expect(hordes.resident.size).toBeLessThanOrEqual(49);expect(store.groups.size).toBeLessThanOrEqual(81);}expect(store.killed).toBe(0);
  });
  it('uses hysteresis and 60/10/1 Hz work while formation members remain damageable',()=>{
    expect(hordeTier(50,'near')).toBe('near');expect(hordeTier(50,'far')).toBe('medium');expect(hordeTier(90,'medium')).toBe('medium');expect(hordeTier(90,'far')).toBe('far');
    const {hordes}=world();for(let i=0;i<60;i++)hordes.step(observer);expect(hordes.nearUpdates).toBe(5*60);expect(hordes.mediumUpdates).toBe(16*10);expect(hordes.farUpdates).toBe(28);
    hordes.update({...observer,x:80});expect(hordes.resident.get(groupId(0,0))!.tier).toBe('medium');hordes.update({...observer,x:120});expect(hordes.resident.get(groupId(0,0))!.tier).toBe('far');expect(hordes.resident.get(groupId(0,0))!.targets).toBeUndefined();
    const t=hordes.firstSurvivor()!,hits=[...hordes.query({x:t.position.x-1,y:0,z:t.position.z-1},{x:t.position.x+1,y:2,z:t.position.z+1})];expect(hits.some(m=>m.id===t.id)).toBe(true);expect(hordes.resident.get(groupId(0,0))!.targets).toBeUndefined();
  });
  it('keeps health and formation pose across all tiers, eviction, checkpoint and reload',()=>{
    const {hordes,store,storage}=world();for(let i=0;i<21;i++)hordes.step(observer);const killed=wound(hordes,HEALTH),hurt=wound(hordes,7);const state=JSON.parse(JSON.stringify(store.get(0,0)));
    for(const x of [80,120,272,16])hordes.update({...observer,x});expect(store.get(0,0)).toEqual(state);expect(hordes.firstSurvivor()!.id).toBe(hurt.id);expect(hordes.firstSurvivor()!.health).toBe(33);expect(store.killed).toBe(1);expect(killed.id).not.toBe(hurt.id);
    hordes.checkpoint();const loaded=new HordeStore(103,storage);expect(loaded.error).toBe('');expect(loaded.get(0,0)).toEqual(state);expect(loaded.killed).toBe(1);expect(new HordeStore(104,storage).killed).toBe(0);
  });
  it('fully cleared encounters stay empty across regeneration and no query can resurrect a member',()=>{
    const {hordes,store,storage}=world();for(let i=0;i<32;i++)wound(hordes,HEALTH);hordes.checkpoint();expect(store.cleared).toBe(1);expect(hordes.firstSurvivor()).toBeUndefined();
    const loaded=new Hordes(new HordeStore(103,storage),()=>0);loaded.update(observer);expect(loaded.firstSurvivor()).toBeUndefined();expect(loaded.store.killed).toBe(32);expect([...loaded.query({x:0,y:0,z:0},{x:32,y:2,z:32})].some(t=>t.id.startsWith('horde:0,0:'))).toBe(false);
  });
  it('near agents separate, ground and follow coarse obstacle-safe patrols through corners',()=>{
    const {hordes,store}=world();const s=store.get(0,0);s.progress=0;const before=[...s.offsets];
    for(let i=0;i<4200;i++){hordes.step(observer);if(i%60===0)for(const t of hordes.resident.get(groupId(0,0))!.targets!){expect(blocked(t.position.x,t.position.z)).toBe(false);expect(t.position.y).toBe(.9);expect(t.position.x).toBeGreaterThan(.65);expect(t.position.x).toBeLessThan(31.35);}}
    expect(s.offsets).not.toEqual(before);expect(s.progress).toBeCloseTo(4,6);const [ax,az]=patrol(s.progress);const member=hordes.firstSurvivor()!;expect(Math.hypot(member.position.x-ax,member.position.z-az)).toBeLessThan(6);
  });
  it('weapons resolve dynamic, far and unloaded members without resident growth or duplicate blast damage',()=>{
    const {hordes,store}=world();hordes.update({...observer,x:272});expect(hordes.resident.size).toBe(0);const t=hordes.firstSurvivor()!,p=t.position;
    const combat=new Combat([],()=>0,128,{index:hordes,blocker:hordes.blocker,onDamage:m=>hordes.damaged(m)});combat.step(true,'autocannon',{x:p.x,y:10,z:p.z},{x:0,y:-1,z:0});expect(store.get(0,0).health[0]).toBe(18);expect(hordes.resident.size).toBe(0);combat.explode({x:p.x,y:1,z:p.z},16,150);expect(store.get(0,0).health[0]).toBe(0);expect(store.killed).toBeGreaterThan(0);const killed=store.killed;combat.explode({x:p.x,y:1,z:p.z},16,150);expect(store.killed).toBeGreaterThanOrEqual(killed);expect(combat.kills).toBe(store.killed);expect(store.get(0,0).health[0]).toBe(0);
  });
  it('refreshes moving sphere positions before attacks and walls block rays/blasts',()=>{
    const {hordes}=world(),old=hordes.firstSurvivor()!;for(let i=0;i<100;i++)hordes.step(observer);const next=hordes.firstSurvivor()!;expect(next.position).not.toEqual(old.position);
    const distance=hordes.blocker({x:5,y:1,z:16},{x:1,y:0,z:0},30);expect(distance).toBe(9);expect(hordes.blocker({x:5,y:4,z:16},{x:1,y:0,z:0},30)).toBeUndefined();
    const target={id:'behind',position:{x:24,y:1,z:16},radius:1,maxHealth:100,health:100},combat=new Combat([target],()=>0,128,{blocker:hordes.blocker});combat.step(true,'autocannon',{x:5,y:1,z:16},{x:1,y:0,z:0});expect(target.health).toBe(100);combat.explode({x:10,y:1,z:16},20,150);expect(target.health).toBe(100);
  });
});
describe('horde persistence validation',()=>{
  it('batches movement until checkpoints, flushes wounds, scopes seeds and preserves corrupt bytes',()=>{
    const {hordes,store,storage}=world();const writes=vi.spyOn(storage,'setItem');hordes.step(observer);store.flush();expect(writes).not.toHaveBeenCalled();wound(hordes,4);store.flush();expect(writes).toHaveBeenCalledOnce();store.flush();expect(writes).toHaveBeenCalledOnce();
    storage.setItem(store.key,'corrupt');const broken=new HordeStore(103,storage);broken.get(0,0).health[0]=0;broken.changed(true);broken.flush();expect(broken.error).not.toBe('');expect(storage.getItem(store.key)).toBe('corrupt');
  });
  it('reports denied/quota storage as session-only while conserving wounds and kills',()=>{
    const store=new HordeStore(103,{getItem:()=>null,setItem:()=>{throw new Error('quota');}}),hordes=new Hordes(store,()=>0);wound(hordes,40);store.flush();expect(store.error).toContain('quota');hordes.update({...observer,x:272});hordes.update(observer);expect(store.killed).toBe(1);expect(new HordeStore(103).error).toContain('unavailable');
  });
  it('rejects incompatible seeds/versions/fields, duplicates, invalid slots/poses and oversized bytes',()=>{
    const {hordes,store,storage}=world();hordes.checkpoint();store.changed(true);store.flush();const record=JSON.parse(storage.getItem(store.key)!);expect(validateHordeSave(record,103).length).toBe(49);
    for(const patch of [{seed:104},{populationVersion:2},{extra:true},{groups:[record.groups[0],record.groups[0]]},{groups:[{...record.groups[0],health:[-1]}]},{groups:[{...record.groups[0],progress:80}]},{groups:[{...record.groups[0],offsets:Array(64).fill(10)}]}])expect(()=>validateHordeSave({...record,...patch},103)).toThrow();
    storage.setItem(store.key,' '.repeat(524289));expect(new HordeStore(103,storage).error).toContain('512 KiB');expect(()=>store.get(5,0)).toThrow();expect(()=>hordes.update({x:Infinity,y:0,z:0})).toThrow();expect(()=>hordes.query({x:NaN,y:0,z:0},observer)).toThrow();
  });
});
