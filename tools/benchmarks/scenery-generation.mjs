import { performance } from 'node:perf_hooks';
import console from 'node:console';
/** CPU-only investigation: benchmark temporary source variants without editing the game.
 * Run: node tools/benchmarks/scenery-generation.mjs
 * Ordered runs/JIT and hashing limit timing interpretation; no GPU/FPS claim. */
import { readFile,writeFile,mkdtemp,rm } from 'node:fs/promises';
import { pathToFileURL,fileURLToPath,URL } from 'node:url';
import { createHash } from 'node:crypto';
const root=fileURLToPath(new URL('../../',import.meta.url)),source=await readFile(root+'src/world/regional-terrain.ts','utf8'),dir=await mkdtemp('/tmp/frontier-generation-');
const {execFileSync}=await import('node:child_process');
const variants={baseline:execFileSync('git',['show','5ad7ce0:src/world/regional-terrain.ts'],{cwd:root,encoding:'utf8'}),current:source};
const reports=[];
try{for(const [name,code] of Object.entries(variants)){
 const file=dir+'/'+name+'.ts';await writeFile(file,code);const m=await import(pathToFileURL(file));
 const runs=[];for(let run=0;run<3;run++){
  const hash=createHash('sha256');let cells=0,trees=0;const t=performance.now();
  for(let dz=-5;dz<=5;dz++)for(let dx=-5;dx<=5;dx++){if(Math.hypot(dx*256,dz*256)>1408)continue;
   for(let i=0;i<64;i++){const result=m.regionTrees({seed:103,x:dx*8+i%8,z:(dz+2)*8+Math.floor(i/8),lod:0,generator:'regional-v2'});trees+=result.length;cells++;hash.update(JSON.stringify(result));}}
  runs.push({ms:performance.now()-t,cells,trees,sha256:hash.digest('hex')});
 }reports.push({name,runs});}
 if(reports.some(r=>r.runs.some(run=>run.sha256!==reports[0].runs[0].sha256)))throw Error('Tree output changed');
 const report={scope:'Native Node TypeScript; baseline 5ad7ce0 vs current, identical 6208 cells around home; includes JSON hashing; not GPU or user-device FPS',reports};console.log(JSON.stringify(report,null,2));
}finally{await rm(dir,{recursive:true,force:true});}
