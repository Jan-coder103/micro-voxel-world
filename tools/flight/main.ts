import { BoxGeometry, Color, DirectionalLight, Fog, Group, HemisphereLight, Mesh, MeshStandardMaterial, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three';
import { Flight } from '../../src/flight/flight';
import { ChunkStream } from '../../src/streaming/chunk-stream';
import { chunkKey, heightAt, wantedChunks, type TerrainData } from '../../src/streaming/terrain-data';
import { createTerrainWorkers } from '../../src/streaming/worker-pool';
import { attachTerrain } from '../../src/rendering/streamed-terrain';
import '../../src/ui/style.css';
const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=`<header><a class="brand" href="/">MVW / DEVELOPMENT</a><nav aria-label="Workspace"><a href="/">Game</a><a href="/tools/flight/" aria-current="page">Flight lab</a><a href="/tools/streaming/">Streaming lab</a><a href="/tools/voxel-editor/">Voxel workshop</a></nav></header><main><section class="intro"><p class="eyebrow">PHASE 09 / FLIGHT</p><h1>Flight lab</h1><p>Arcade attack aircraft · seeded terrain · chase camera</p></section><section class="controls" aria-label="Flight controls"><button id="start">Start / Resume</button><button id="pause">Pause</button><button id="reset">Recover / Reset</button><label>Flight assistance <select id="assist"><option value="assisted">Assisted</option><option value="direct">Direct</option></select></label><p>Focus the scene · W / ↑ nose down · S / ↓ climb · A/D or ←/→ bank to turn · Q/E throttle down/up. Assisted levels on release; Direct holds attitude. Blur pauses; resume explicitly. Terrain contact stops flight.</p><p id="stats" role="group" aria-label="Flight diagnostics"></p></section><section class="viewport" tabindex="0" aria-label="Aircraft flight scene"></section><footer><p role="status">Starting flight…</p><span>FIXED WING · NO WEAPONS</span></footer></main>`;
const host=app.querySelector<HTMLElement>('.viewport')!, status=app.querySelector<HTMLElement>('[role=status]')!, stats=app.querySelector<HTMLElement>('#stats')!;
function mount() {
  let renderer:WebGLRenderer;
  try { renderer=new WebGLRenderer({antialias:true}); } catch { status.textContent='WebGL 2 unavailable.'; app.querySelectorAll('button,select').forEach(b=>(b as HTMLButtonElement).disabled=true); return ()=>{}; }
  host.append(renderer.domElement);
  const scene=new Scene(); scene.background=new Color('#aebec0'); scene.fog=new Fog('#aebec0',80,180);
  const sun=new DirectionalLight('#ffdfb2',2.6); sun.position.set(-30,60,20); scene.add(sun,new HemisphereLight('#d9ebf2','#687052',2));
  const camera=new PerspectiveCamera(65,1,.2,350);
  const terrainMaterial=new MeshStandardMaterial({vertexColors:true,roughness:1}), markerGeometry=new BoxGeometry(1,1,1), markerMaterial=new MeshStandardMaterial();
  const bodyMaterial=new MeshStandardMaterial({color:'#69706a',roughness:1}), cockpitMaterial=new MeshStandardMaterial({color:'#283a40',roughness:.65});
  const aircraft=new Group(), parts:BoxGeometry[]=[];
  const box=(w:number,h:number,d:number,x:number,y:number,z:number,material=bodyMaterial)=>{const g=new BoxGeometry(w,h,d);parts.push(g);const m=new Mesh(g,material);m.position.set(x,y,z);aircraft.add(m);};
  box(1.3,1,8,0,0,0); box(10,.25,2.2,0,0,.7); box(4,.2,1,0,.4,3); box(.3,1.7,1.8,0,1,2.8); box(.9,.6,1.8,0,.7,-1.5,cockpitMaterial); scene.add(aircraft);
  let workers:ReturnType<typeof createTerrainWorkers>|undefined;
  let stream:ChunkStream<TerrainData,ReturnType<typeof attachTerrain>>|undefined;
  try { workers=createTerrainWorkers(); stream=new ChunkStream(workers.load,(spec,data)=>{const r=attachTerrain(spec,data,terrainMaterial,markerGeometry,markerMaterial,true);scene.add(r.group);return r;}); }
  catch { status.textContent='Terrain workers unavailable. Reload to retry.'; app.querySelectorAll('button,select').forEach(b=>(b as HTMLButtonElement).disabled=true); }
  const flight=new Flight((x,z)=>heightAt(103,x,z)), keys=new Set<string>(), releases:(()=>void)[]=[];
  const listen=(target:EventTarget,type:string,fn:EventListener)=>{target.addEventListener(type,fn);releases.push(()=>target.removeEventListener(type,fn));};
  const clear=()=>keys.clear();
  const supported=['KeyW','KeyS','KeyA','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyQ','KeyE'];
  listen(host,'keydown',e=>{const k=e as KeyboardEvent;if(supported.includes(k.code)){k.preventDefault();keys.add(k.code);}});
  listen(host,'keyup',e=>keys.delete((e as KeyboardEvent).code));
  const pause=()=>{clear();flight.pause();previous=undefined;};
  listen(host,'blur',pause);listen(window,'blur',pause);listen(document,'visibilitychange',pause);
  listen(app.querySelector('#start')!,'click',()=>{if(stream)flight.start();previous=undefined;host.focus();});
  listen(app.querySelector('#pause')!,'click',pause);
  let snap=true;
  listen(app.querySelector('#reset')!,'click',()=>{clear();flight.reset();previous=undefined;snap=true;});
  listen(app.querySelector('#assist')!,'change',e=>{flight.assisted=(e.target as HTMLSelectElement).value==='assisted';clear();});
  const resize=()=>{renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(Math.max(1,host.clientWidth),Math.max(1,host.clientHeight));camera.aspect=host.clientWidth/Math.max(1,host.clientHeight);camera.updateProjectionMatrix();};
  const observer=new ResizeObserver(resize);observer.observe(host);resize();
  let disposed=false,frame=0,previous:number|undefined,lastReport=0;
  const desired=new Vector3(), target=new Vector3();
  const held=(...codes:string[])=>Number(codes.some(c=>keys.has(c)));
  const animate=(now:number)=>{
    if(disposed)return;
    const dt=previous===undefined?0:Math.max(0,(now-previous)/1000);previous=now;
    flight.advance(dt,{pitch:held('KeyS','ArrowDown')-held('KeyW','ArrowUp'),bank:held('KeyD','ArrowRight')-held('KeyA','ArrowLeft'),throttle:held('KeyE')-held('KeyQ')});
    const p=flight.position;stream?.update(wantedChunks(103,p.x,p.z));aircraft.position.set(p.x,p.y,p.z);aircraft.rotation.set(flight.pitch,-flight.heading,-flight.bank,'YXZ');
    desired.set(p.x-Math.sin(flight.heading)*21,p.y+8,p.z+Math.cos(flight.heading)*21);
    camera.position.lerp(desired,snap?1:1-Math.exp(-Math.min(dt,.1)*6));snap=false;
    camera.position.y=Math.max(camera.position.y,heightAt(103,camera.position.x,camera.position.z)+4);
    target.set(p.x+Math.sin(flight.heading)*20,p.y+Math.sin(flight.pitch)*20,p.z-Math.cos(flight.heading)*20);camera.lookAt(target);renderer.render(scene,camera);
    if(now-lastReport>100){lastReport=now;const current=stream?.resident.has(chunkKey(Math.floor(p.x/32),Math.floor(p.z/32)))??false;
      const sample={...p,state:flight.state,speed:flight.speed,altitude:p.y-heightAt(103,p.x,p.z),pitch:flight.pitch,bank:flight.bank,heading:flight.heading,ticks:flight.ticks,dropped:flight.dropped,resident:stream?.resident.size??0,pending:stream?.pending??0,ready:stream?.completed??0,stale:stream?.stale??0,failures:stream?.failures??0,current,geometries:renderer.info.memory.geometries};stats.dataset.sample=JSON.stringify(sample);
      stats.textContent=`${flight.state} · ${flight.speed.toFixed(1)} m/s · altitude ${sample.altitude.toFixed(1)} m AGL · throttle ${(flight.throttle*100).toFixed(0)}% · chunk ${current?'visible':'loading gap'} · residents ${sample.resident}/49 · jobs ${sample.pending} · results ${sample.ready} · stale ${sample.stale} · failures ${sample.failures} · dropped ${flight.dropped.toFixed(2)} s`;
      if(stream)status.textContent=stream.lastError?`Terrain generation error: ${stream.lastError}`:flight.state==='crashed'?`${flight.reason} · Recover / Reset to try again.`:`${flight.state} · ${flight.assisted?'Assisted':'Direct'} controls · ${current?'terrain available':'terrain loading; collision active'}`;
    }frame=requestAnimationFrame(animate);
  };frame=requestAnimationFrame(animate);
  return ()=>{if(disposed)return;disposed=true;cancelAnimationFrame(frame);observer.disconnect();releases.forEach(r=>r());clear();stream?.dispose();workers?.dispose();parts.forEach(g=>g.dispose());bodyMaterial.dispose();cockpitMaterial.dispose();terrainMaterial.dispose();markerGeometry.dispose();markerMaterial.dispose();scene.clear();renderer.dispose();renderer.domElement.remove();};
}
const release=mount();
const dispose=()=>{window.removeEventListener('pagehide',onHide);release();};
const onHide=(e:PageTransitionEvent)=>{if(!e.persisted)dispose();};window.addEventListener('pagehide',onHide);if(import.meta.hot)import.meta.hot.dispose(dispose);
