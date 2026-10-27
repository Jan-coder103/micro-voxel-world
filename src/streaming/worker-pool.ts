import type { ChunkSpec, TerrainData } from './terrain-data';
interface Slot { worker: Worker; pending?: { id:number; resolve:(data:TerrainData)=>void; reject:(error:Error)=>void } }
/** Cancelled synchronous jobs occupy their slot until reply; main-thread checks reject stale output. */
export function createTerrainWorkers() {
  let next=0, disposed=false, failed:Error|undefined;
  const slots:Slot[]=[];
  try {
    for (let i=0;i<2;i++) {
      const worker=new Worker(new URL('./terrain.worker.ts',import.meta.url),{type:'module'}), slot:Slot={worker};
      slots.push(slot);
      worker.onmessage=(event:MessageEvent<{id:number;data:TerrainData;error?:string}>) => {
        const pending=slot.pending;
        if (!pending || pending.id!==event.data.id) return;
        slot.pending=undefined;
        if (event.data.error) pending.reject(new Error(event.data.error)); else pending.resolve(event.data.data);
      };
      worker.onerror=(event) => { failed=new Error(event.message); slot.pending?.reject(failed); slot.pending=undefined; };
    }
  } catch (error) { slots.forEach((slot) => slot.worker.terminate()); throw error; }
  return {
    load(spec:ChunkSpec,signal:AbortSignal):Promise<TerrainData> {
      if (failed) return Promise.reject(failed);
      if (disposed || signal.aborted) return Promise.reject(new Error('Generation cancelled'));
      const slot=slots.find((s) => !s.pending);
      if (!slot) return Promise.reject(new Error('Worker capacity exceeded'));
      return new Promise((resolve,reject) => { const id=++next; slot.pending={id,resolve,reject}; slot.worker.postMessage({id,spec}); });
    },
    dispose() { if (disposed) return; disposed=true; slots.forEach((s) => { s.worker.terminate(); s.pending?.reject(new Error('Workers disposed')); s.pending=undefined; }); },
  };
}
