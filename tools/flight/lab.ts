import { BoxGeometry, Color, DirectionalLight, Fog, Group, HemisphereLight, Mesh, MeshStandardMaterial, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three';
import { Flight } from '../../src/flight/flight';
import { ChunkStream } from '../../src/streaming/chunk-stream';
import { chunkKey, heightAt, wantedChunks, type TerrainData } from '../../src/streaming/terrain-data';
import { createTerrainWorkers } from '../../src/streaming/worker-pool';
import { attachTerrain } from '../../src/rendering/streamed-terrain';
import { Combat, rangeTargets, WEAPONS, type WeaponId } from '../../src/combat/weapons';
import { WeaponAudio } from '../../src/combat/audio';
import { createCombatView } from '../../src/rendering/combat-view';
import '../../src/ui/style.css';
import { regionalSample } from '../../src/world/regional-terrain';
import { createTerrainFallback } from '../../src/rendering/terrain-fallback';
export function mountFlightLab(combatEnabled=false) {
const params=new URLSearchParams(location.search),regional=!combatEnabled && params.get('terrain')==='regional';
const rawSeed=Number(params.get('seed')??103),seed=regional && Number.isInteger(rawSeed) && rawSeed>=0 && rawSeed<=4294967295 ? rawSeed : 103;
const ground=(x:number,z:number)=>{if(!regional)return heightAt(103,x,z);const s=regionalSample(seed,x,z);return Math.max(s.height,s.water??-Infinity);};
const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=`<header><a class="brand" href="/">MVW / DEVELOPMENT</a><nav aria-label="Workspace"><a href="/">Game</a><a href="/tools/flight/" ${combatEnabled?'':'aria-current="page"'}>Flight lab</a><a href="/tools/weapons/" ${combatEnabled?'aria-current="page"':''}>Weapons lab</a><a href="/tools/hordes/">Horde lab</a><a href="/tools/streaming/">Streaming lab</a><a href="/tools/voxel-editor/">Voxel workshop</a></nav></header><main><section class="intro"><p class="eyebrow">${regional?'PHASE 13 / REGIONAL FLIGHT':combatEnabled?'PHASE 10 / WEAPONS':'PHASE 09 / FLIGHT'}</p><h1>${regional?'Regional terrain flight':combatEnabled?'Weapons lab':'Flight lab'}</h1><p>Arcade attack aircraft · seeded terrain · chase camera ${regional?`· generator v2 · seed ${seed} · water contact crashes · vegetation is visual only`:''}</p></section><section class="controls" aria-label="Flight controls"><button id="start">Start / Resume</button><button id="pause">Pause</button><button id="reset">Recover / Reset</button><label>Flight assistance <select id="assist"><option value="assisted">Assisted</option><option value="direct">Direct</option></select></label><p>Focus the scene · W / ↑ nose down · S / ↓ climb · A/D or ←/→ bank to turn · Q/E throttle down/up. Assisted levels on release; Direct holds attitude. Blur pauses; resume explicitly. Terrain contact stops flight.</p>${combatEnabled?'<label>Weapon <select id="weapon" aria-label="Weapon"><option value="minigun">1 · Minigun</option><option value="autocannon">2 · Autocannon</option><option value="shell">3 · Explosive shell</option></select></label><button id="sound">Enable sound</button><p>Space fires forward · 1/2/3 selects weapon · gold spheres are test targets, including a ground cluster. Recover / Reset restores targets. Unlimited test ammunition. Terrain blocks shots and blasts.</p><p id="combat-stats" role="group" aria-label="Combat diagnostics"></p><p id="audio-status" role="group" aria-label="Audio status">Muted</p>':''}<p id="stats" role="group" aria-label="Flight diagnostics"></p></section><section class="viewport" tabindex="0" aria-label="Aircraft flight scene"></section><footer><p role="status">Starting flight…</p><span>${combatEnabled?'TARGET RANGE · STATIC WORLD':'FIXED WING · NO WEAPONS'}</span></footer></main>`;
const host=app.querySelector<HTMLElement>('.viewport')!, status=app.querySelector<HTMLElement>('[role=status]')!, stats=app.querySelector<HTMLElement>('#stats')!;
function mount() {
  let renderer:WebGLRenderer;
  try { renderer=new WebGLRenderer({antialias:true}); } catch { status.textContent='WebGL 2 unavailable.'; app.querySelectorAll('button,select').forEach(b=>(b as HTMLButtonElement).disabled=true); return ()=>{}; }
  host.append(renderer.domElement);
  const scene=new Scene(); scene.background=new Color('#aebec0'); scene.fog=new Fog('#aebec0',80,180);
  const sun=new DirectionalLight('#ffdfb2',2.6); sun.position.set(-30,60,20); scene.add(sun,new HemisphereLight('#d9ebf2','#687052',2));
  const camera=new PerspectiveCamera(65,1,.2,regional?1400:350);
  const fallback=regional?createTerrainFallback(seed,(x,z)=>{const s=regionalSample(seed,x,z);return {height:Math.max(s.height,s.water??-Infinity),color:[...s.color]};}):undefined;
  if(fallback){scene.add(fallback.mesh);scene.fog=new Fog('#aebec0',300,1000);}
  const terrainMaterial=new MeshStandardMaterial({vertexColors:true,roughness:1}), markerGeometry=new BoxGeometry(1,1,1), markerMaterial=new MeshStandardMaterial();
  const bodyMaterial=new MeshStandardMaterial({color:'#69706a',roughness:1}), cockpitMaterial=new MeshStandardMaterial({color:'#283a40',roughness:.65});
  const aircraft=new Group(), parts:BoxGeometry[]=[];
  const box=(w:number,h:number,d:number,x:number,y:number,z:number,material=bodyMaterial)=>{const g=new BoxGeometry(w,h,d);parts.push(g);const m=new Mesh(g,material);m.position.set(x,y,z);aircraft.add(m);};
  box(1.3,1,8,0,0,0); box(10,.25,2.2,0,0,.7); box(4,.2,1,0,.4,3); box(.3,1.7,1.8,0,1,2.8); box(.9,.6,1.8,0,.7,-1.5,cockpitMaterial); scene.add(aircraft);
  let workers:ReturnType<typeof createTerrainWorkers>|undefined;
  let stream:ChunkStream<TerrainData,ReturnType<typeof attachTerrain>>|undefined;
  try { workers=createTerrainWorkers(); stream=new ChunkStream(workers.load,(spec,data)=>{const r=attachTerrain(spec,data,terrainMaterial,markerGeometry,markerMaterial,true);scene.add(r.group);return r;}); }
  catch { status.textContent='Terrain workers unavailable. Reload to retry.'; app.querySelectorAll('button,select').forEach(b=>(b as HTMLButtonElement).disabled=true); }
  const flight=new Flight(ground);
  const resetFlight=()=>{flight.reset();if(regional){const x=Number(params.get('x')??16),z=Number(params.get('z')??16);if(Number.isFinite(x)&&Number.isFinite(z)&&Math.abs(x)<130000&&Math.abs(z)<130000)flight.position={x,z,y:Math.min(240,ground(x,z)+65)};}};
  resetFlight();
  const keys=new Set<string>(), releases:(()=>void)[]=[];
  const listen=(target:EventTarget,type:string,fn:EventListener)=>{target.addEventListener(type,fn);releases.push(()=>target.removeEventListener(type,fn));};
  const combat=combatEnabled?new Combat(rangeTargets((x,z)=>heightAt(103,x,z)),(x,z)=>heightAt(103,x,z)):undefined;
  const combatView=combat?createCombatView(combat):undefined;if(combatView)scene.add(combatView.group);
  const audio=combat?new WeaponAudio():undefined;
  let weapon:WeaponId='minigun',heardShots=0;
  const weaponSelect=app.querySelector<HTMLSelectElement>('#weapon');
  const clear=()=>{keys.clear();audio?.stop();};
  const supported=['KeyW','KeyS','KeyA','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyQ','KeyE',...(combatEnabled?['Space','Digit1','Digit2','Digit3']:[])];
  listen(host,'keydown',e=>{const k=e as KeyboardEvent;if(supported.includes(k.code)){k.preventDefault();keys.add(k.code);if(weaponSelect&&['Digit1','Digit2','Digit3'].includes(k.code)){weapon=(['minigun','autocannon','shell'] as WeaponId[])[Number(k.code.slice(-1))-1];weaponSelect.value=weapon;}}});
  listen(host,'keyup',e=>keys.delete((e as KeyboardEvent).code));
  const pause=()=>{clear();flight.pause();previous=undefined;};
  listen(host,'blur',pause);listen(window,'blur',pause);listen(document,'visibilitychange',pause);
  listen(app.querySelector('#start')!,'click',()=>{if(stream)flight.start();previous=undefined;host.focus();});
  listen(app.querySelector('#pause')!,'click',pause);
  if(weaponSelect)listen(weaponSelect,'change',()=>{weapon=weaponSelect.value as WeaponId;clear();});
  if(audio)listen(app.querySelector('#sound')!,'click',()=>{void audio.toggle().then(()=>{if(disposed)return;app.querySelector('#sound')!.textContent=audio.muted?'Enable sound':'Mute sound';});});
  let snap=true;
  listen(app.querySelector('#reset')!,'click',()=>{clear();resetFlight();combat?.reset();heardShots=0;previous=undefined;snap=true;});
  listen(app.querySelector('#assist')!,'change',e=>{flight.assisted=(e.target as HTMLSelectElement).value==='assisted';clear();});
  const resize=()=>{renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(Math.max(1,host.clientWidth),Math.max(1,host.clientHeight));camera.aspect=host.clientWidth/Math.max(1,host.clientHeight);camera.updateProjectionMatrix();};
  const observer=new ResizeObserver(resize);observer.observe(host);resize();
  let disposed=false,frame=0,previous:number|undefined,lastReport=0;
  const desired=new Vector3(), target=new Vector3();
  const held=(...codes:string[])=>Number(codes.some(c=>keys.has(c)));
  const animate=(now:number)=>{
    if(disposed)return;
    const dt=previous===undefined?0:Math.max(0,(now-previous)/1000);previous=now;
    flight.advance(dt,{pitch:held('KeyS','ArrowDown')-held('KeyW','ArrowUp'),bank:held('KeyD','ArrowRight')-held('KeyA','ArrowLeft'),throttle:held('KeyE')-held('KeyQ')},()=>{
      if(!combat)return;
      const d={x:Math.sin(flight.heading)*Math.cos(flight.pitch),y:Math.sin(flight.pitch),z:-Math.cos(flight.heading)*Math.cos(flight.pitch)},p=flight.position;
      combat.step(keys.has('Space'),weapon,{x:p.x+d.x*4.5,y:p.y+d.y*4.5,z:p.z+d.z*4.5},d);
    });
    combatView?.update();
    if(combat&&audio&&combat.shots!==heardShots){heardShots=combat.shots;audio.play(WEAPONS[combat.lastWeapon].sound);}
    if(flight.state!=='running')audio?.stop();
    const p=flight.position;stream?.update(wantedChunks(seed,p.x+(regional?Math.sin(flight.heading)*64:0),p.z-(regional?Math.cos(flight.heading)*64:0)).map(s=>regional?{...s,generator:'regional-v2' as const}:s));fallback?.update(p.x,p.z);aircraft.position.set(p.x,p.y,p.z);aircraft.rotation.set(flight.pitch,-flight.heading,-flight.bank,'YXZ');
    desired.set(p.x-Math.sin(flight.heading)*21,p.y+8,p.z+Math.cos(flight.heading)*21);
    camera.position.lerp(desired,snap?1:1-Math.exp(-Math.min(dt,.1)*6));snap=false;
    camera.position.y=Math.max(camera.position.y,ground(camera.position.x,camera.position.z)+4);
    target.set(p.x+Math.sin(flight.heading)*20,p.y+Math.sin(flight.pitch)*20,p.z-Math.cos(flight.heading)*20);camera.lookAt(target);renderer.render(scene,camera);
    if(now-lastReport>100){lastReport=now;const current=stream?.resident.has(chunkKey(Math.floor(p.x/32),Math.floor(p.z/32)))??false;
      const sample={...p,state:flight.state,speed:flight.speed,altitude:p.y-ground(p.x,p.z),generator:regional?2:1,seed,pitch:flight.pitch,bank:flight.bank,heading:flight.heading,ticks:flight.ticks,dropped:flight.dropped,resident:stream?.resident.size??0,pending:stream?.pending??0,ready:stream?.completed??0,stale:stream?.stale??0,failures:stream?.failures??0,current,geometries:renderer.info.memory.geometries};stats.dataset.sample=JSON.stringify(sample);
      if(combat){const combatSample={shots:combat.shots,hits:combat.hits,damage:combat.damage,kills:combat.kills,blasts:combat.blasts,weapon,effects:combat.effects.filter(e=>e.active).length,capacity:combat.effects.length,droppedEffects:combat.droppedEffects,voices:audio?.activeVoices??0,targets:combat.targets.map(t=>({id:t.id,health:t.health}))};const panel=app.querySelector<HTMLElement>('#combat-stats')!;panel.dataset.sample=JSON.stringify(combatSample);panel.textContent=`${WEAPONS[weapon].name} · ${combat.shots} shots · ${combat.hits} damaging hits · ${combat.damage.toFixed(0)} damage · ${combat.kills}/${combat.targets.length} targets cleared · ${combat.blasts} blasts · effects ${combatSample.effects}/128 · dropped cosmetics ${combat.droppedEffects}`;app.querySelector('#audio-status')!.textContent=audio?.state??'Muted';}
      stats.textContent=`${flight.state} · ${flight.speed.toFixed(1)} m/s · altitude ${sample.altitude.toFixed(1)} m AGL · throttle ${(flight.throttle*100).toFixed(0)}% · chunk ${current?'visible':'loading gap'} · residents ${sample.resident}/49 · jobs ${sample.pending} · results ${sample.ready} · stale ${sample.stale} · failures ${sample.failures} · dropped ${flight.dropped.toFixed(2)} s`;
      if(stream)status.textContent=stream.lastError?`Terrain generation error: ${stream.lastError}`:flight.state==='crashed'?`${flight.reason} · Recover / Reset to try again.`:`${flight.state} · ${flight.assisted?'Assisted':'Direct'} controls · ${current?'terrain available':'terrain loading; collision active'}`;
    }frame=requestAnimationFrame(animate);
  };frame=requestAnimationFrame(animate);
  return ()=>{if(disposed)return;disposed=true;cancelAnimationFrame(frame);observer.disconnect();releases.forEach(r=>r());clear();audio?.dispose();combatView?.dispose();stream?.dispose();workers?.dispose();fallback?.dispose();parts.forEach(g=>g.dispose());bodyMaterial.dispose();cockpitMaterial.dispose();terrainMaterial.dispose();markerGeometry.dispose();markerMaterial.dispose();scene.clear();renderer.dispose();renderer.domElement.remove();};
}
const release=mount();
const dispose=()=>{window.removeEventListener('pagehide',onHide);release();};
const onHide=(e:PageTransitionEvent)=>{if(!e.persisted)dispose();};window.addEventListener('pagehide',onHide);if(import.meta.hot)import.meta.hot.dispose(dispose);

}
