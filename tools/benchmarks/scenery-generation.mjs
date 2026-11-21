/** CPU-only investigation: benchmark temporary source variants without editing the game.
 * Run: node tools/benchmarks/scenery-generation.mjs
 * Ordered runs/JIT and hashing limit timing interpretation; no GPU/FPS claim. */
import { readFile,writeFile,mkdtemp,rm } from 'node:fs/promises';
import { pathToFileURL,fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const root=fileURLToPath(new URL('../../',import.meta.url)),source=await readFile(root+'src/world/regional-terrain.ts','utf8'),dir=await mkdtemp('/tmp/frontier-generation-');
const variants={baseline:source,cacheLayout:source.replace('export function regionLayout(seed:number) {',`const layouts=new Map<number,ReturnType<typeof buildRegionLayout>>();
export function regionLayout(seed:number){let layout=layouts.get(seed);if(!layout){layout=buildRegionLayout(seed);layouts.set(seed,layout);if(layouts.size>8)layouts.delete(layouts.keys().next().value!);}return layout;}
function buildRegionLayout(seed:number) {`)};
variants.cacheLayoutAndSites=variants.cacheLayout.replace('export function settlementSite(seed:number,rx:number,rz:number):SettlementSite|null {',`const sitesCache=new Map<string,SettlementSite|null>();
export function settlementSite(seed:number,rx:number,rz:number):SettlementSite|null {const key=seed+':'+rx+','+rz;if(sitesCache.has(key))return sitesCache.get(key)!;const site=buildSite(seed,rx,rz);sitesCache.set(key,site);if(sitesCache.size>256)sitesCache.delete(sitesCache.keys().next().value!);return site;}
function buildSite(seed:number,rx:number,rz:number):SettlementSite|null {`);

const slopeLine='    const slope=Math.max(Math.abs(regionalSample(spec.seed,px+2,pz).height-sample.height),Math.abs(regionalSample(spec.seed,px,pz+2).height-sample.height))/2;';
variants.rejectBeforeSlope=variants.cacheLayoutAndSites.replace(slopeLine,'').replace(' || slope>.5','').replace('    result.push({x:px,z:pz,y:sample.height,height:',slopeLine+'\n    if(slope>.5)continue;\n    result.push({x:px,z:pz,y:sample.height,height:');
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
 const report={scope:'Native Node TypeScript; CPU-only generator counterfactual, identical 6208 cells around home; includes JSON hashing; unshipped cache prototypes; not GPU or user-device FPS',reports};console.log(JSON.stringify(report,null,2));
}finally{await rm(dir,{recursive:true,force:true});}
