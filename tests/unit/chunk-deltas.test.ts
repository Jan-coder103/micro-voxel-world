import { describe, expect, it } from 'vitest';
import { beaconId, ChunkDeltas, validateDelta, type StorageLike } from '../../src/persistence/chunk-deltas';
const memory=() => { const data=new Map<string,string>(); return {data,getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);}}; };
describe('versioned chunk deltas', () => {
  it('persists only changes, restores before reentry and isolates seeds', () => {
    const storage=memory(), first=new ChunkDeltas(103,storage); first.clear(beaconId(-1,2)); first.clear(beaconId(-1,2));
    expect(first.count).toBe(1); expect(new ChunkDeltas(103,storage).has(beaconId(-1,2))).toBe(true); expect(new ChunkDeltas(104,storage).count).toBe(0);
  });
  it('rejects incompatible/corrupt saves and preserves their original bytes', () => {
    const storage=memory(), key=new ChunkDeltas(103,storage).key;
    for (const text of ['{bad',JSON.stringify({schemaVersion:2,generatorVersion:1,seed:103,cleared:[]}), 'x'.repeat(262145)]) {
      storage.setItem(key,text); const state=new ChunkDeltas(103,storage); expect(state.error).not.toBe(''); state.clear(beaconId(0,0)); expect(storage.getItem(key)).toBe(text); expect(state.has(beaconId(0,0))).toBe(true);
    }
  });
  it('handles denied/full storage as explicit session-only state', () => {
    const denied:StorageLike={getItem(){throw new Error('denied');},setItem(){throw new Error('full');}};
    const state=new ChunkDeltas(1,denied); state.clear(beaconId(0,0)); expect(state.has(beaconId(0,0))).toBe(true); expect(state.error).toContain('denied');
    const full=new ChunkDeltas(1,{getItem:()=>null,setItem(){throw new Error('full');}}); full.clear(beaconId(0,0)); expect(full.error).toContain('full');
  });
  it('validates IDs, versions, seed, size and unknown fields atomically', () => {
    const base={schemaVersion:1,generatorVersion:1,seed:103,cleared:[]};
    for (const patch of [{seed:104},{generatorVersion:2},{extra:true},{cleared:['beacon:-0,0']},{cleared:['beacon:4097,0']},{cleared:['beacon:0,0','beacon:0,0']},{cleared:Array(4097).fill('beacon:0,0')}]) expect(()=>validateDelta({...base,...patch},103)).toThrow();
    const state=new ChunkDeltas(103,memory()); expect(()=>state.clear('bad')).toThrow(); expect(state.count).toBe(0);
  });
});
