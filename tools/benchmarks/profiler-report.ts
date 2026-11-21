import { performance } from 'node:perf_hooks';
import { writeFile } from 'node:fs/promises';
import { FrameProfile } from '../../src/performance/frame-profile';
// Retained pre-optimization algorithm from 026d20a, for CPU-only comparison.
function oldReport(frames:Record<string,number>[]){
  const names=new Set(frames.flatMap(f=>Object.keys(f)));
  return Object.fromEntries([...names].map(name=>{const values=frames.filter(()=>true).map(f=>f[name]??0).sort((a,b)=>a-b);return [name,{mean:values.reduce((a,b)=>a+b,0)/values.length,p95:values[Math.ceil(values.length*.95)-1],max:values.at(-1)!,samples:values.length}];}));
}
const p=new FrameProfile();let seed=7;
for(let frame=0;frame<600;frame++){for(let name=0;name<160;name++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;if(seed%5)p.add(`metric:${name}`,(seed%1000)/32);}p.finish();}
const measure=(work:()=>unknown)=>{for(let i=0;i<5;i++)work();const values=[];for(let i=0;i<30;i++){const start=performance.now();work();values.push(performance.now()-start);}return {meanMs:values.reduce((a,b)=>a+b,0)/values.length,maxMs:Math.max(...values)};};
const old=oldReport(p.frames),current=p.report();
for(const name of Object.keys(old))if(Math.abs(old[name].mean-current[name].mean)>1e-10||old[name].p95!==current[name].p95||old[name].max!==current[name].max)throw new Error(`Statistics differ: ${name}`);
const result={frames:600,metrics:160,iterations:30,old:measure(()=>oldReport(p.frames)),current:measure(()=>p.report()),notes:'Synthetic CPU-only aggregation comparison, not browser/device/FPS evidence. UI also skips export-only call/line/point summaries and refreshes at 1 Hz.'};
console.log(JSON.stringify(result,null,2));if(process.argv[2])await writeFile(process.argv[2],JSON.stringify(result,null,2)+'\n');
