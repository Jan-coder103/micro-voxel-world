import { GENERATOR_VERSION, WORLD_LIMIT } from '../streaming/terrain-data';
export interface StorageLike { getItem(key:string): string|null; setItem(key:string,value:string): void }
export const beaconId = (x:number,z:number) => `beacon:${x},${z}`;
export function validateDelta(value: unknown, seed: number): string[] {
  if (!value || typeof value!=='object' || Array.isArray(value)) throw new Error('Invalid save object');
  const v=value as Record<string,unknown>;
  if (Object.keys(v).sort().join(',')!=='cleared,generatorVersion,schemaVersion,seed' || v.schemaVersion!==1 || v.generatorVersion!==GENERATOR_VERSION || v.seed!==seed || !Array.isArray(v.cleared) || v.cleared.length>4096) throw new Error('Unsupported save version, seed or fields');
  const ids=v.cleared;
  for (const id of ids) {
    if (typeof id!=='string' || !/^beacon:-?\d+,-?\d+$/.test(id)) throw new Error('Invalid saved marker ID');
    const [x,z]=id.slice(7).split(',').map(Number);
    if (!Number.isInteger(x) || !Number.isInteger(z) || Math.abs(x)>WORLD_LIMIT || Math.abs(z)>WORLD_LIMIT || id!==beaconId(x,z)) throw new Error('Saved marker outside supported world');
  }
  if (new Set(ids).size!==ids.length) throw new Error('Duplicate saved marker');
  return [...ids] as string[];
}
export class ChunkDeltas {
  private cleared=new Set<string>();
  private writable=true;
  error='';
  readonly key: string;
  constructor(readonly seed:number, private storage?: StorageLike) {
    this.key=`mvw:chunk-deltas:v1:g${GENERATOR_VERSION}:${seed}`;
    try {
      if (!storage) throw new Error('Browser storage unavailable');
      const text=storage.getItem(this.key);
      if (text!==null) {
        if (text.length>262144) throw new Error('Save exceeds 256 KiB');
        this.cleared=new Set(validateDelta(JSON.parse(text),seed));
      }
    } catch (error) { this.error=String(error); this.writable=false; }
  }
  has(id:string) { return this.cleared.has(id); }
  get count() { return this.cleared.size; }
  clear(id:string) {
    if (this.cleared.has(id)) return;
    const next=[...this.cleared,id].sort();
    const record={schemaVersion:1,generatorVersion:GENERATOR_VERSION,seed:this.seed,cleared:next};
    validateDelta(record,this.seed);
    if (this.writable) {
      try { this.storage!.setItem(this.key,JSON.stringify(record)); }
      catch (error) { this.error=String(error); this.writable=false; }
    }
    this.cleared=new Set(next);
  }
}
