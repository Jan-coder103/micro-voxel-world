import { BoxGeometry, Color, DirectionalLight, Fog, HemisphereLight, MeshStandardMaterial, PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { bindInput } from '../../src/engine/input';
import { ChunkDeltas, beaconId, type StorageLike } from '../../src/persistence/chunk-deltas';
import { attachTerrain } from '../../src/rendering/streamed-terrain';
import { ChunkStream } from '../../src/streaming/chunk-stream';
import { CHUNK_SIZE, chunkKey, heightAt, wantedChunks, type TerrainData } from '../../src/streaming/terrain-data';
import { createTerrainWorkers } from '../../src/streaming/worker-pool';
import '../../src/ui/style.css';
import { regionalLandmarks, regionalSample } from '../../src/world/regional-terrain';
import { createTerrainFallback } from '../../src/rendering/terrain-fallback';
const regional=new URLSearchParams(location.search).get('terrain')==='regional';
const title=regional ? 'Regional terrain explorer' : 'Streaming lab';
const sampleGround=(seed:number,x:number,z:number)=>regional ? regionalSample(seed,x,z).height : heightAt(seed,x,z);

const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=`<header><a class="brand" href="/">MVW <span>/ DEVELOPMENT</span></a><nav aria-label="Workspace"><a href="/">Game</a><a href="/tools/streaming/" ${regional?'':'aria-current="page"'}>Streaming lab</a><a href="/tools/streaming/?terrain=regional" ${regional?'aria-current="page"':''}>Terrain explorer</a><a href="/tools/voxel-editor/">Voxel workshop</a></nav></header>
<main><section class="intro"><p class="eyebrow">${regional ? 'PHASE 13 / REGIONAL GENERATION' : 'PHASE 08 / STREAMING'}</p><h1>${title}</h1><p>${regional ? 'Layered elevation · connected water · biomes · vegetation · settlement sites' : 'Seeded terrain · four visual tiers · saved marker clearance'}</p></section>
<section class="controls" aria-label="Traversal controls"><label>World seed <input id="seed" type="number" min="0" max="4294967295" value="103"></label><button id="apply">Load seed</button><button id="west">Travel west 256 m</button><button id="east">Travel east 256 m</button><button id="home">Return home</button><button id="clear">Clear current marker</button><p>Focus the scene · WASD / arrows to move the test camera at 80 m/s. ${regional ? 'Choose a landmark or fly this region. Gold beacons mark reserved settlement sites.' : 'Markers are persistence tests; terrain stays intact.'}</p>${regional ? '<div id="landmarks" aria-label="Region landmarks"></div><a id="fly-region" href="/tools/flight/?terrain=regional">Fly this region</a><p id="region" aria-label="Regional terrain diagnostics"></p>' : ''}<p id="stream-stats" role="group" aria-label="Streaming diagnostics"></p><p id="marker" role="group" aria-label="Current marker"></p><p id="save" role="group" aria-label="Save status"></p><p>LOD 0: 1 m · LOD 1: 2 m · LOD 2: 4 m · LOD 3: 8 m interiors. All borders retain 1 m samples.</p></section>
<section class="viewport" tabindex="0" aria-label="Streamed terrain"></section><footer><p role="status">Starting terrain workers…</p><span>TEST CAMERA · NO AIRCRAFT</span></footer></main>`;
const host=app.querySelector<HTMLElement>('.viewport')!, status=app.querySelector<HTMLElement>('[role=status]')!;
const stats=app.querySelector<HTMLElement>('#stream-stats')!, markerStatus=app.querySelector<HTMLElement>('#marker')!, saveStatus=app.querySelector<HTMLElement>('#save')!;
const seedInput=app.querySelector<HTMLInputElement>('#seed')!;
const buttons=[...app.querySelectorAll<HTMLButtonElement>('button')];

function mount() {
  let renderer:WebGLRenderer;
  try { renderer=new WebGLRenderer({antialias:true}); }
  catch { host.dataset.state='unsupported'; status.textContent='WebGL 2 unavailable. Enable hardware acceleration or try a supported desktop browser.'; buttons.forEach((b) => { b.disabled=true; }); return () => {}; }
  host.append(renderer.domElement); renderer.domElement.setAttribute('aria-label','Seeded terrain with four chunk detail tiers');
  const scene=new Scene(); scene.background=new Color('#aebec0'); scene.fog=new Fog('#aebec0',110,235);
  const sun=new DirectionalLight('#ffdfb2',2.6); sun.position.set(-30,60,20); scene.add(sun,new HemisphereLight('#d9ebf2','#687052',2));
  const camera=new PerspectiveCamera(50,1,.5,400);
  const material=new MeshStandardMaterial({vertexColors:true,roughness:1});
  const markerGeometry=new BoxGeometry(1,5,1), markerMaterial=new MeshStandardMaterial({color:'#e2b15f',roughness:1});
  let workers:ReturnType<typeof createTerrainWorkers>;
  try { workers=createTerrainWorkers(); }
  catch (error) { renderer.dispose(); renderer.domElement.remove(); material.dispose(); markerGeometry.dispose(); markerMaterial.dispose(); buttons.forEach((b) => { b.disabled=true; }); host.dataset.state='unsupported'; status.textContent=`Terrain workers unavailable: ${String(error)}`; return () => {}; }
  let storage:StorageLike|undefined;
  try { if(!regional)storage=window.localStorage; } catch { /* ChunkDeltas reports session-only fallback. */ }
  let seed=103, deltas=new ChunkDeltas(seed,storage), x=16,z=16, notice='';
  const makeFallback=()=>regional ? createTerrainFallback(seed,(px,pz)=>{const s=regionalSample(seed,px,pz);return {height:Math.max(s.height,s.water??-Infinity),color:[...s.color]};}) : undefined;
  let fallback=makeFallback(); if(fallback)scene.add(fallback.mesh);
  if(regional){scene.fog=new Fog('#aebec0',250,850);camera.far=1400; app.querySelector<HTMLButtonElement>('#clear')!.hidden=true; markerStatus.hidden=true; saveStatus.hidden=true;}
  const createStream=() => new ChunkStream<TerrainData,ReturnType<typeof attachTerrain>>(workers.load,(spec,data) => {
    const resource=attachTerrain(spec,data,material,markerGeometry,markerMaterial,deltas.has(beaconId(spec.x,spec.z)));
    resource.marker.position.set(16,sampleGround(spec.seed,spec.x*CHUNK_SIZE+16,spec.z*CHUNK_SIZE+16)+2.5,16);
    if(regional)resource.marker.visible=false; scene.add(resource.group); return resource;
  });
  let stream=createStream();
  const input=bindInput(host);
  const listeners: (() => void)[]=[];
  const invalidate=() => { stats.dataset.sample=JSON.stringify({settled:false}); host.dataset.state='loading'; };
  const bind=(id:string,action:()=>void) => { const button=app.querySelector<HTMLButtonElement>(`#${id}`)!; button.addEventListener('click',action); listeners.push(() => button.removeEventListener('click',action)); };
  bind('apply',() => {
    const candidate=Number(seedInput.value);
    if (seedInput.value.trim()==='' || !Number.isInteger(candidate) || candidate<0 || candidate>4294967295) { notice='Seed must be a whole number from 0 to 4294967295.'; status.textContent=notice; return; }
    let replacement:ReturnType<typeof createTerrainWorkers>;
    try { replacement=createTerrainWorkers(); } catch (error) { notice=String(error); return; }
    stream.dispose(); workers.dispose(); workers=replacement; notice=''; seed=candidate; deltas=new ChunkDeltas(seed,storage); stream=createStream(); fallback?.dispose();fallback=makeFallback();if(fallback)scene.add(fallback.mesh); x=z=16; input.clear(); invalidate(); status.textContent='Seed loaded.';
  });
  if(regional){
    const landmarks=app.querySelector<HTMLElement>('#landmarks')!;
    for(const name of Object.keys(regionalLandmarks(seed))){
      const button=document.createElement('button');button.textContent=name;landmarks.append(button);
      const go=()=>{const point=regionalLandmarks(seed)[name as keyof ReturnType<typeof regionalLandmarks>];if(!point){notice='No dry settlement site found in this inspection region.';status.textContent=notice;return;}notice='';x=point.x;z=point.z;input.clear();invalidate();};
      button.addEventListener('click',go);listeners.push(()=>button.removeEventListener('click',go));
    }
  }
  bind('west',() => { x=Math.max(-130900,x-256); input.clear(); invalidate(); });
  bind('east',() => { x=Math.min(130900,x+256); input.clear(); invalidate(); });
  bind('home',() => { x=z=16; input.clear(); invalidate(); });
  bind('clear',() => {
    const cx=Math.floor(x/32),cz=Math.floor(z/32),id=beaconId(cx,cz);
    try { deltas.clear(id); const active=stream.resident.get(chunkKey(cx,cz)); if (active) active.resource.marker.visible=false; }
    catch (error) { notice=String(error); status.textContent=notice; }
  });
  const resize=() => { renderer.setPixelRatio(Math.min(devicePixelRatio,1.5)); renderer.setSize(Math.max(1,host.clientWidth),Math.max(1,host.clientHeight)); camera.aspect=host.clientWidth/Math.max(1,host.clientHeight); camera.updateProjectionMatrix(); };
  const observer=new ResizeObserver(resize); observer.observe(host); resize();
  let disposed=false,frame=0,previous:number|undefined,lastReport=0;
  const animate=(now:number) => {
    if (disposed) return;
    const dt=previous===undefined ? 0 : Math.min(.1,(now-previous)/1000); previous=now;
    const held=input.sample(), length=Math.max(1,Math.hypot(held.x,held.z));
    if (!document.hidden) { x=Math.max(-130900,Math.min(130900,x+held.x/length*80*dt)); z=Math.max(-130900,Math.min(130900,z+held.z/length*80*dt)); }
    stream.update(wantedChunks(seed,x,z).map(s=>regional ? {...s,generator:'regional-v2' as const} : s));fallback?.update(x,z);
    const field=regional ? regionalSample(seed,x,z) : undefined; const y=field ? Math.max(field.height,field.water??-Infinity) : heightAt(seed,x,z); camera.position.set(x+(regional?100:42),y+(regional?110:42),z+(regional?120:50)); camera.lookAt(x,y,z);
    renderer.render(scene,camera);
    if (now-lastReport>100) {
      lastReport=now;
      const cx=Math.floor(x/32),cz=Math.floor(z/32),counts=[0,0,0,0]; stream.resident.forEach((r) => counts[r.spec.lod]++);
      if(field){const region=app.querySelector<HTMLElement>('#region')!;region.textContent=`Generator v2 · ${field.biome} · ground ${field.height.toFixed(1)} m · water ${field.water?.toFixed(1)??'none'} m · settlement sites reserve space for Phase 14`;region.dataset.sample=JSON.stringify(field);app.querySelector<HTMLAnchorElement>('#fly-region')!.href=`/tools/flight/?terrain=regional&seed=${seed}&x=${x}&z=${z}`;}
      const sample={generator:regional?2:1,seed,x,z,chunk:chunkKey(cx,cz),resident:stream.resident.size,wanted:stream.wanted,pending:stream.pending,ready:stream.completed,settled:stream.settled,lods:counts,stale:stream.stale,failures:stream.failures,geometries:renderer.info.memory.geometries,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles};
      stats.dataset.sample=JSON.stringify(sample);
      stats.textContent=`Camera ${x.toFixed(1)}, ${z.toFixed(1)} m · chunk ${sample.chunk} · resident ${sample.resident}/49 · jobs ${sample.pending}/2 · ready ${sample.ready}/2 · LOD ${counts.join(' / ')} · stale ${sample.stale} · failures ${sample.failures} · ${sample.geometries} geometries · ${sample.calls} calls · ${sample.triangles.toLocaleString()} triangles`;
      const cleared=deltas.has(beaconId(cx,cz)); markerStatus.textContent=`${beaconId(cx,cz)} · ${cleared ? 'cleared' : 'present'}`;
      const active=stream.resident.get(chunkKey(cx,cz)); app.querySelector<HTMLButtonElement>('#clear')!.disabled=cleared || !active || active.spec.seed!==seed;
      saveStatus.textContent=deltas.error ? `Session only: ${deltas.error}. Existing saved data will not be overwritten.` : `Saved locally for seed ${seed} · ${deltas.count} cleared markers`;
      if (notice) status.textContent=notice;
      else if (stream.lastError) status.textContent=`Generation error: ${stream.lastError}`;
      else if (stream.settled) status.textContent='Terrain ready · four LOD tiers · bounded streaming';
      host.dataset.state=stream.settled ? 'ready' : 'loading';
    }
    frame=requestAnimationFrame(animate);
  };
  frame=requestAnimationFrame(animate);
  const stopClock=() => { previous=undefined; input.clear(); };
  window.addEventListener('blur',stopClock); document.addEventListener('visibilitychange',stopClock);
  return () => { if (disposed) return; disposed=true; cancelAnimationFrame(frame); observer.disconnect(); input.dispose(); listeners.forEach((release) => release()); window.removeEventListener('blur',stopClock); document.removeEventListener('visibilitychange',stopClock); stream.dispose(); workers.dispose(); fallback?.dispose(); material.dispose(); markerGeometry.dispose(); markerMaterial.dispose(); scene.clear(); renderer.dispose(); renderer.domElement.remove(); };
}
const release=mount();
const dispose=() => { window.removeEventListener('pagehide',onHide); release(); };
const onHide=(event:PageTransitionEvent) => { if (!event.persisted) dispose(); };
window.addEventListener('pagehide',onHide);
if (import.meta.hot) import.meta.hot.dispose(dispose);
