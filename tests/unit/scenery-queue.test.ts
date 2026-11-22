import { createHash } from 'node:crypto';
import { expect,it,vi } from 'vitest';
import { createSceneryQueue,sceneryKey } from '../../src/streaming/scenery-queue';
import { generateScenery,type ForestData,type ScenerySpec } from '../../src/streaming/scenery-data';
import { SettlementWorld } from '../../src/world/settlements';
import { airbaseReserved } from '../../src/world/airbase';
import { regionTrees,settlementSite,regionLayout } from '../../src/world/regional-terrain';
const spec:ScenerySpec={kind:'forest',x:0,z:0},data:ForestData={kind:'forest',cells:[]};
function fakeWorker(){return {postMessage:vi.fn(),terminate:vi.fn(),onmessage:undefined as ((e:{data:unknown})=>void)|undefined,onerror:undefined as (()=>void)|undefined,onmessageerror:undefined as (()=>void)|undefined};}
it('prioritizes nearby jobs, stages replies and publishes at most one per timer before starting another',()=>{
  vi.useFakeTimers();const worker=fakeWorker(),q=createSceneryQueue(103,()=>{},()=>worker as unknown as Worker),publish=vi.fn();
  try{
    q.request({...spec,x:5},500,publish);q.request(spec,0,publish);vi.advanceTimersByTime(16);
    expect(worker.postMessage.mock.calls[0][0].spec).toEqual(spec);expect(q.stats.queued).toBe(1);
    const id=worker.postMessage.mock.calls[0][0].id;worker.onmessage!({data:{id,data}});expect(publish).not.toHaveBeenCalled();expect(q.stats.ready).toBe(true);
    vi.advanceTimersByTime(16);expect(publish).toHaveBeenCalledTimes(1);expect(worker.postMessage).toHaveBeenCalledTimes(2);
    q.dispose();expect(worker.terminate).toHaveBeenCalledOnce();expect(q.pending).toBe(false);
  }finally{q.dispose();vi.useRealTimers();}
});
it('discards obsolete replies and isolates reused coordinates with job ids, then restores a cooperative fallback on failure',()=>{
  vi.useFakeTimers();const worker=fakeWorker(),q=createSceneryQueue(103,()=>{},()=>worker as unknown as Worker),old=vi.fn(),fresh=vi.fn();
  try{
    q.request(spec,0,old);vi.advanceTimersByTime(16);const first=worker.postMessage.mock.calls[0][0].id;
    q.retain('forest',new Set());q.request(spec,0,fresh);worker.onmessage!({data:{id:first,data}});vi.advanceTimersByTime(16);
    expect(old).not.toHaveBeenCalled();expect(fresh).not.toHaveBeenCalled();expect(q.stats.stale).toBe(1);
    worker.onmessage!({data:{id:first,data}});expect(q.stats.ready).toBe(false);
    worker.onerror!();vi.runAllTimers();expect(q.stats.failed).toBe(true);expect(fresh).toHaveBeenCalledOnce();expect(q.pending).toBe(false);
    expect(sceneryKey(spec)).toBe('forest:0,0');
  }finally{q.dispose();vi.useRealTimers();}
});
it('cooperative forest jobs preserve canonical reservations and yield before returning a tile',()=>{
  const world=new SettlementWorld(103),job=generateScenery(103,world,spec);let step=job.next(),yields=0;
  while(!step.done){yields++;step=job.next();}expect(yields).toBe(64);expect(step.value.kind).toBe('forest');if(step.value.kind!=='forest')throw Error('Wrong result');
  for(const cell of step.value.cells){const [x,z]=cell.key.split(',').map(Number);expect(cell.trees).toEqual(regionTrees({seed:103,x,z,lod:0,generator:'regional-v2'}).filter(t=>!airbaseReserved(t.x,t.z)&&!world.reserved(t.x,t.z)));}
});
it('incremental settlement discovery matches synchronous queries including negative parcel boundaries',()=>{
  for(const seed of [0,103])for(const x of [-513,-384,0,383]){
    const a=new SettlementWorld(seed),b=new SettlementWorld(seed),bounds={minX:x,maxX:x+512,minZ:-512,maxZ:0};
    const job=a.inBoundsGradually(bounds);let step=job.next();while(!step.done)step=job.next();expect(step.value).toEqual(b.inBounds(bounds));
  }
});

it('preserves canonical multi-seed tree records across cache eviction (pre-change Git fixtures)',()=>{
  const golden=['eefa5380da2d07cee284d0aaead93ce1d68bfbf2baef687b9397249b5dd07022','3bcced7bad9c9d259a22bcf19419f50c710ce810532426bd1be969c98aa0062e','b4a1b637d33f455aa947be2b63a54ce97cec91312a86662b5693f9253b43f43a','941703ed6858f3c5e5564fb06df20d84b8e9c06c875a94a38d29e1683e91578d'];
  for(const [index,seed] of [0,103,12012,4294967295].entries()){
    const digest=()=>{const hash=createHash('sha256');for(const z of [-49,-16,-1,0,1,16,48])for(const x of [-49,-16,-1,0,1,16,48])hash.update(JSON.stringify(regionTrees({seed,x,z,lod:0,generator:'regional-v2'})));return hash.digest('hex');};
    expect(digest()).toBe(golden[index]);for(let i=0;i<270;i++)settlementSite(seed,i,-i);for(let i=0;i<10;i++)regionLayout(1000+i);expect(digest()).toBe(golden[index]);
  }
});
it('retains pre-worker road positions/colors and finite unit normals across parcel boundaries',()=>{
  const fixtures:[number,number,number,string][]=[
    [0,-2,-1,'099efa00ed02f47756e7982abdb95cac9dd45f7703e51b0e7246b2315a2f83db'],
    [0,0,0,'583947fd8bfd418ac598228c7fb162822a4b9e6d9a43c586928cbf193ac9a54e'],
    [0,1,1,'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
    [103,-2,-1,'7c633ed55e22c81646bc20f5f1bdc6a3f81526b064ad0bbf0b2cc09191d9cf8a']
  ];
  for(const [seed,x,z,hash] of fixtures){
    const job=generateScenery(seed,new SettlementWorld(seed),{kind:'roads',x,z});let step=job.next(),yields=0;while(!step.done){yields++;step=job.next();}
    expect(step.value.kind).toBe('roads');if(step.value.kind!=='roads')throw Error('Wrong data');expect(yields).toBeGreaterThan(1);
    const data=step.value,digest=createHash('sha256');for(const a of [data.positions,data.colors])digest.update(new Uint8Array(a.buffer));expect(digest.digest('hex')).toBe(hash);
    for(let i=0;i<data.normals.length;i+=3)expect(Math.hypot(...data.normals.slice(i,i+3))).toBeCloseTo(1,5);
  }
});
