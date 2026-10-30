import { expect,it } from 'vitest';
import { Campaign } from '../../tools/benchmarks/legacy/campaign';
import { Sortie,BASE } from '../../tools/benchmarks/legacy/sortie';
const neutral={pitch:0,bank:0,throttle:0,fire:false,weapon:'shell' as const};
function memory(){const data=new Map<string,string>();let writes=0;return {data,get writes(){return writes;},getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{writes++;data.set(k,v);}};}
function campaignReady(){const storage=memory(),campaign=new Campaign(storage);campaign.complete('clearpass');return {storage,campaign};}
function runToReturn(s:Sortie){s.start();for(let i=0;i<900&&(s.state as string)!=='returning';i++)s.advance(1/60,{...neutral,fire:true});expect(s.remaining).toBe(0);expect(s.state).toBe('returning');s.returnAssist=true;for(let i=0;i<3600&&(s.state as string)!=='complete';i++)s.advance(1/60,neutral);expect(s.state).toBe('complete');}
it('awards a bounded unique completion set, derives rank and unlocks Relief across reload/seeds',()=>{
  const storage=memory(),c=new Campaign(storage);expect(c.rank).toBe('Cadet');expect(c.unlocked('relief')).toBe(false);expect(()=>c.complete('relief')).toThrow('locked');
  expect(c.complete('clearpass')).toBe(1);const writes=storage.writes;expect(c.complete('clearpass')).toBe(0);expect(storage.writes).toBe(writes);expect(new Campaign(storage).unlocked('relief')).toBe(true);
  expect(c.complete('relief')).toBe(2);expect(c.stars).toBe(3);expect(c.rank).toBe('Flight lead');expect(new Campaign(storage).completions).toEqual(['clearpass','relief']);expect(new Sortie(123,storage).campaign!.stars).toBe(3);
});
it('preserves malformed/unsupported/oversize campaign bytes and gives explicit session-only progression',()=>{
  for(const text of ['broken','null',JSON.stringify({schema:2,completed:[]}),JSON.stringify({schema:1,completed:['relief']}),JSON.stringify({schema:1,completed:['clearpass','clearpass']}),JSON.stringify({schema:1,completed:['__proto__']}),JSON.stringify({schema:1,completed:[],stars:999}),' '.repeat(4097)]){
    const storage=memory(),c0=new Campaign(storage);storage.data.set(c0.key,text);const c=new Campaign(storage);expect(c.error).not.toBe('');expect(c.complete('clearpass')).toBe(1);expect(c.stars).toBe(1);expect(storage.getItem(c.key)).toBe(text);
  }
});
it('storage denial/quota and casualty persistence failure never overwrite existing records',()=>{
  const storage=memory(),c=new Campaign(storage);c.complete('clearpass');const before=storage.getItem(c.key);
  const blocked=new Campaign({getItem:storage.getItem,setItem:()=>{throw new Error('quota');}});expect(blocked.complete('relief')).toBe(2);expect(blocked.error).toContain('quota');expect(storage.getItem(c.key)).toBe(before);expect(new Campaign(storage).stars).toBe(1);
  const noPopulation=new Campaign(storage);expect(noPopulation.complete('relief',false)).toBe(2);expect(noPopulation.error).toContain('Population save');expect(storage.getItem(c.key)).toBe(before);
  const denied=new Campaign({getItem:()=>{throw new Error('denied');},setItem:()=>{throw new Error('should not write');}});expect(denied.complete('clearpass')).toBe(1);expect(denied.error).toContain('denied');
});
it('merges a fresh completion read and does not double-award stale instances',()=>{
  const storage=memory(),a=new Campaign(storage),b=new Campaign(storage);a.complete('clearpass');expect(b.complete('clearpass')).toBe(0);expect(b.stars).toBe(1);b.complete('relief');expect(a.complete('relief')).toBe(0);expect(a.stars).toBe(3);
});
it('locks unknown missions atomically and retains equipment when selecting an unlocked sortie',()=>{
  const {storage}=campaignReady(),s=new Sortie(12012,storage);s.setup.setLoadout('precision');s.setup.setMount('port');s.setAircraft('helicopter');s.start();s.advance(.1,neutral);
  expect(()=>s.selectMission('__proto__')).toThrow();expect(s.state).toBe('active');s.selectMission('relief');expect(s.mission.id).toBe('relief');expect(s.state).toBe('ready');expect(s.lastResult?.mission).toBe('clearpass');expect(s.lastResult?.outcome).toBe('aborted');expect(s.lastResult?.stars).toBe(0);expect(s.flight.aircraft).toBe('helicopter');expect(s.setup.mount).toBe('port');expect(s.setup.loadout).toBe('precision');
  const locked=new Sortie(12012,memory());expect(()=>locked.selectMission('relief')).toThrow();expect(locked.mission.id).toBe('clearpass');
});
it('supply post attrition freezes on pause and fails under live hordes; retry retains casualties without rewards',()=>{
  const {storage}=campaignReady(),s=new Sortie(12012,storage,false,'relief');s.setAircraft('helicopter');s.start();for(let i=0;i<60;i++)s.advance(1/60,neutral);const integrity=s.integrity;expect(integrity).toBeLessThan(100);s.pause();s.advance(60,neutral);expect(s.integrity).toBe(integrity);s.start();
  for(let i=0;i<60*80&&(s.state as string)!=='failed';i++)s.advance(1/60,neutral);
  expect(s.state).toBe('failed');expect(s.flight.state).toBe('paused');expect(s.lastResult?.reason).toBe('Supply post overrun');expect(s.lastResult?.stars).toBe(0);expect(s.campaign!.stars).toBe(1);const result=s.lastResult;s.advance(5,{...neutral,fire:true});expect(s.lastResult).toBe(result);s.recover();expect(s.integrity).toBe(100);expect(s.visited).toBe(false);expect(s.remaining).toBe(96);
});
it('physical mission returns award once, record results, unlock Relief and preserve partial/complete casualties on reload',()=>{
  const storage=memory(),s=new Sortie(12012,storage);runToReturn(s);expect(s.lastResult?.stars).toBe(1);expect(s.lastResult?.progressSaved).toBe(true);expect(s.lastResult?.kills).toBeGreaterThanOrEqual(96);const bytes=storage.getItem(s.campaign!.key);s.advance(2,neutral);expect(storage.getItem(s.campaign!.key)).toBe(bytes);
  const reload=new Sortie(12012,storage);expect(reload.state).toBe('ready');expect(reload.visited).toBe(false);expect(reload.remaining).toBe(0);expect(reload.lastResult).toBeUndefined();expect(reload.campaign!.stars).toBe(1);
  reload.selectMission('relief');runToReturn(reload);expect(reload.integrity).toBeGreaterThan(0);expect(reload.lastResult?.stars).toBe(2);expect(reload.campaign!.stars).toBe(3);expect(reload.flight.state).toBe('paused');expect(Math.hypot(reload.flight.position.x-BASE.x,reload.flight.position.z-BASE.z)).toBeLessThanOrEqual(20);
  reload.recover();expect(reload.remaining).toBe(0);expect(reload.combat.shots).toBe(0);expect(reload.state).toBe('ready');expect(new Sortie(12013,storage,false,'relief').remaining).toBe(96);
});
it('cleared-sector replay still requires flyover/return and awards zero additional stars',()=>{
  const storage=memory(),s=new Sortie(12012,storage);runToReturn(s);const stars=s.campaign!.stars;s.recover();s.start();s.advance(1/60,neutral);expect(s.state).toBe('active');expect(s.visited).toBe(false);runToReturn(s);expect(s.lastResult?.stars).toBe(0);expect(s.campaign!.stars).toBe(stars);
});
it('crashes and recovery aborts never award progression or clear damage; benchmarks never access campaign storage',()=>{
  const storage=memory(),s=new Sortie(12012,storage);s.start();s.advance(.1,{...neutral,fire:true});const killed=s.store.killed;s.recover();expect(s.lastResult?.outcome).toBe('aborted');expect(s.lastResult?.stars).toBe(0);expect(s.store.killed).toBe(killed);s.start();s.flight.position.y=0;s.advance(1/60,neutral);expect(s.lastResult?.outcome).toBe('failed');expect(s.campaign!.stars).toBe(0);
  const accesses:string[]=[];new Sortie(12012,{getItem:key=>{accesses.push(key);return null;},setItem:key=>{accesses.push(key);}},true);expect(accesses.some(key=>key.includes('campaign'))).toBe(false);
});
it('population write failure prevents durable reward even when campaign storage itself is available',()=>{
  const storage=memory(),adapter={getItem:storage.getItem,setItem:(key:string,value:string)=>{if(key.includes('hordes'))throw new Error('population quota');storage.setItem(key,value);}},s=new Sortie(12012,adapter);runToReturn(s);expect(s.lastResult?.progressSaved).toBe(false);expect(s.lastResult?.stars).toBe(1);expect(storage.getItem(s.campaign!.key)).toBeNull();expect(s.campaign!.error).toContain('Population save');
});
it('mid-sortie reload keeps partial casualties and earned stars but restarts post integrity and requires another flyover',()=>{
  const {storage}=campaignReady(),s=new Sortie(12012,storage,false,'relief');s.setAircraft('helicopter');s.start();for(let i=0;i<30;i++)s.advance(1/60,{...neutral,fire:true});s.pause();expect(s.store.killed).toBeGreaterThan(0);expect(s.integrity).toBeLessThan(100);expect(s.campaign!.stars).toBe(1);expect(s.visited).toBe(false);
  const reload=new Sortie(12012,storage,false,'relief');expect(reload.store.killed).toBe(s.store.killed);expect(reload.integrity).toBe(100);expect(reload.state).toBe('ready');expect(reload.visited).toBe(false);expect(reload.campaign!.stars).toBe(1);expect(reload.lastResult).toBeUndefined();
});
