import { describe, expect, it, vi } from 'vitest';
import { ChunkStream } from '../../src/streaming/chunk-stream';
import { generateTerrain, wantedChunks, type ChunkSpec, type Lod } from '../../src/streaming/terrain-data';
const spec=(x=0,lod:Lod=0,seed=103):ChunkSpec => ({x,z:0,lod,seed});
const flush=async () => { for (let i=0;i<5;i++) await Promise.resolve(); };

describe('chunk lifecycle', () => {
  it('bounds work, replaces tiers and releases every resource on traversal and teardown', async () => {
    let created=0, released=0, live=0, maxLive=0;
    const stream=new ChunkStream(async (s:ChunkSpec) => s, () => { created++; live++; maxLive=Math.max(maxLive,live); let disposed=false; return {dispose(){ if (!disposed) { disposed=true; released++; live--; } }}; });
    const settle=async (x:number) => {
      const wanted=wantedChunks(103,x,0);
      for (let i=0;i<100;i++) {
        stream.update(wanted); expect(stream.pending+stream.completed).toBeLessThanOrEqual(2); expect(stream.resident.size).toBeLessThanOrEqual(49); await flush();
        if (stream.settled) break;
      }
      expect(stream.settled).toBe(true); expect(stream.resident.size).toBe(49);
    };
    await settle(0); await settle(256); await settle(-256); await settle(0);
    expect(maxLive).toBeLessThanOrEqual(50); // replacement is attached before its previous tier is released
    stream.dispose(); stream.dispose(); expect(released).toBe(created); expect(live).toBe(0);
  });
  it('rejects cancelled late results even after leaving and returning to the same signature', async () => {
    const jobs:{resolve:(value:number)=>void;signal:AbortSignal}[]=[]; const attached:number[]=[], freed:number[]=[];
    const stream=new ChunkStream<number,{dispose():void}>((_s,signal) => new Promise((resolve) => jobs.push({resolve,signal})), (_s,value) => { attached.push(value); return {dispose(){}}; }, (value) => freed.push(value));
    stream.update([spec(0)]); stream.update([spec(8)]); expect(jobs[0].signal.aborted).toBe(true);
    stream.update([spec(0)]); jobs[0].resolve(10); jobs[1].resolve(20); await flush(); stream.update([spec(0)]);
    expect(attached).toEqual([]); expect(freed).toEqual([10,20]);
    jobs[2].resolve(30); await flush(); stream.update([spec(0)]); expect(attached).toEqual([30]); expect(stream.stale).toBe(2);
    stream.dispose();
  });
  it('drops queued results on unload and results after disposal, without GPU attachment', async () => {
    let resolve!:(v:number)=>void; const freed:number[]=[]; let attached=0;
    const stream=new ChunkStream<number,{dispose():void}>(() => new Promise((r) => {resolve=r;}), () => {attached++;return {dispose(){}};}, (v) => freed.push(v));
    stream.update([spec()]); resolve(1); await flush(); expect(stream.completed).toBe(1);
    stream.update([]); expect(freed).toEqual([1]);
    stream.update([spec()]); stream.dispose(); resolve(2); await flush(); expect(freed).toEqual([1,2]); expect(attached).toBe(0);
  });
  it('wakes an idle owner for ready, failed and stale jobs, never after disposal', async()=>{
    const wake=vi.fn(),jobs:{resolve:(n:number)=>void;reject:(e:Error)=>void}[]=[];
    const stream=new ChunkStream<number,{dispose():void}>(()=>new Promise((resolve,reject)=>jobs.push({resolve,reject})),()=>({dispose(){}}),undefined,wake);
    stream.update([spec()]);expect(wake).not.toHaveBeenCalled();jobs[0].resolve(1);await flush();expect(wake).toHaveBeenCalledTimes(1);expect(stream.pending).toBe(0);expect(stream.completed).toBe(1);
    stream.update([spec()]);expect(stream.settled).toBe(true);stream.update([spec(1)]);jobs[1].reject(new Error('worker failed'));await flush();expect(wake).toHaveBeenCalledTimes(2);expect(stream.failures).toBe(1);
    stream.update([spec(2)]);stream.update([]);jobs[2].resolve(3);await flush();expect(wake).toHaveBeenCalledTimes(3);expect(stream.stale).toBe(1);
    stream.update([spec(3)]);stream.dispose();jobs[3].resolve(4);await flush();expect(wake).toHaveBeenCalledTimes(3);
  });
  it('surfaces generation/integration failures without a per-frame retry loop', async () => {
    let attempts=0;
    const stream=new ChunkStream(async () => {attempts++;throw new Error('worker failed');}, () => ({dispose(){}}));
    stream.update([spec()]); await flush(); for (let i=0;i<10;i++) stream.update([spec()]);
    expect(stream.failures).toBe(1); expect(attempts).toBe(1); expect(stream.lastError).toContain('worker failed'); stream.dispose();
    let released=0;
    const failedAttach=new ChunkStream(async () => 1, () => {throw new Error('upload failed');}, () => released++);
    failedAttach.update([spec()]); await flush(); failedAttach.update([spec()]); expect(failedAttach.failures).toBe(1); expect(released).toBe(1); failedAttach.dispose();
  });
});

describe('seeded four-tier terrain', () => {
  it('regenerates identically and reduces triangles across all four tiers', () => {
    const triangles:number[]=[];
    for (let lod=0;lod<4;lod++) { const s=spec(0,lod as Lod), a=generateTerrain(s), b=generateTerrain(s); expect(a.positions).toEqual(b.positions); triangles.push(a.positions.length/9); expect([...a.normals].every(Number.isFinite)).toBe(true); }
    expect(triangles[0]).toBeGreaterThan(triangles[1]); expect(triangles[1]).toBeGreaterThan(triangles[2]); expect(triangles[2]).toBeGreaterThan(triangles[3]);
    expect(generateTerrain(spec(0,0,4)).positions).not.toEqual(generateTerrain(spec(0,0,5)).positions);
  });
  it('shares the exact full border at every mixed-tier pair, including negative chunks', () => {
    const edge=(s:ChunkSpec,axis:0|2,at:number) => { const p=generateTerrain(s).positions, result=new Map<number,number>(); for (let i=0;i<p.length;i+=3) if (p[i+axis]===at) result.set(p[i+(axis===0?2:0)],p[i+1]); return [...result].sort((a,b)=>a[0]-b[0]); };
    for (let a=0;a<4;a++) for (let b=0;b<4;b++) {
      for (const x of [-1,2]) {
        const left={x,z:-2,lod:a as Lod,seed:103}, right={x:x+1,z:-2,lod:b as Lod,seed:103};
        expect(edge(left,0,32)).toHaveLength(33); expect(edge(left,0,32)).toEqual(edge(right,0,0));
        const north={x,z:-1,lod:b as Lod,seed:103}; expect(edge(left,2,32)).toEqual(edge(north,2,0));
      }
    }
  });
  it('uses mathematical floor for negative positions and always bounds the residency window', () => {
    const wanted=wantedChunks(1,-.1,-.1); expect(wanted[0]).toMatchObject({x:-1,z:-1,lod:0}); expect(wanted).toHaveLength(49);
    expect([0,1,2,3].map((lod)=>wanted.filter((s)=>s.lod===lod).length)).toEqual([1,8,16,24]);
    expect(wantedChunks(1,4096*32,4096*32).length).toBeLessThan(49);
  });
});
