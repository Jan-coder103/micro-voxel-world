import { chunkKey, signature, type ChunkSpec } from './terrain-data';
export interface OwnedChunk { dispose(): void }
interface Job { spec: ChunkSpec; controller: AbortController }
/** Bounded async state machine. Stale outputs never reach the renderer. */
export class ChunkStream<T, R extends OwnedChunk> {
  readonly resident = new Map<string, { spec: ChunkSpec; resource: R }>();
  private desired = new Map<string, ChunkSpec>();
  private jobs = new Set<Job>();
  private ready: { spec: ChunkSpec; data: T }[] = [];
  private disposed = false;
  private failed = new Set<string>();
  stale = 0;
  failures = 0;
  lastError = '';
  constructor(private load: (spec: ChunkSpec, signal: AbortSignal) => Promise<T>, private attach: (spec: ChunkSpec,data: T) => R, private release: (data: T) => void = () => {}) {}
  get pending() { return this.jobs.size; }
  get completed() { return this.ready.length; }
  get wanted() { return this.desired.size; }
  get settled() { return this.resident.size === this.desired.size && [...this.desired].every(([key,s]) => this.resident.has(key) && signature(this.resident.get(key)!.spec) === signature(s)) && !this.jobs.size && !this.ready.length; }
  private current(spec: ChunkSpec) { const s=this.desired.get(chunkKey(spec.x,spec.z)); return !this.disposed && s !== undefined && signature(s)===signature(spec); }
  update(specs: ChunkSpec[]) {
    if (this.disposed) return;
    this.desired = new Map(specs.map((s) => [chunkKey(s.x,s.z), {...s}]));
    const signatures=new Set(specs.map(signature)); this.failed.forEach((id) => { if (!signatures.has(id)) this.failed.delete(id); });
    for (const job of this.jobs) if (!this.current(job.spec)) job.controller.abort();
    this.ready = this.ready.filter((result) => { if (this.current(result.spec)) return true; this.release(result.data); this.stale++; return false; });
    for (const [key,entry] of this.resident) if (!this.desired.has(key)) { entry.resource.dispose(); this.resident.delete(key); }
    // At most two GPU integrations and two total outstanding payloads, per frame.
    for (let i=0; i<2 && this.ready.length; i++) {
      const result=this.ready.shift()!;
      try {
        const resource=this.attach(result.spec,result.data), key=chunkKey(result.spec.x,result.spec.z);
        this.resident.get(key)?.resource.dispose(); this.resident.set(key,{spec:result.spec,resource});
      } catch (error) { this.failures++; this.lastError=String(error); this.failed.add(signature(result.spec)); }
      finally { this.release(result.data); }
    }
    for (const spec of this.desired.values()) {
      if (this.jobs.size+this.ready.length >= 2) break;
      if (this.failed.has(signature(spec))) continue;
      const active=this.resident.get(chunkKey(spec.x,spec.z));
      if (active && signature(active.spec)===signature(spec)) continue;
      if ([...this.jobs].some((j) => !j.controller.signal.aborted && signature(j.spec)===signature(spec)) || this.ready.some((r) => signature(r.spec)===signature(spec))) continue;
      const job={spec,controller:new AbortController()}; this.jobs.add(job);
      void this.load(spec,job.controller.signal).then((data) => {
        if (job.controller.signal.aborted || !this.current(spec)) { this.release(data); this.stale++; }
        else this.ready.push({spec,data});
      }).catch((error: unknown) => { if (!job.controller.signal.aborted && !this.disposed) { this.failures++; this.lastError=String(error); this.failed.add(signature(spec)); } }).finally(() => this.jobs.delete(job));
    }
  }
  dispose() {
    if (this.disposed) return; this.disposed=true; this.desired.clear();
    this.jobs.forEach((j) => j.controller.abort());
    this.ready.forEach((r) => this.release(r.data)); this.ready=[];
    this.resident.forEach((r) => r.resource.dispose()); this.resident.clear();
  }
}
