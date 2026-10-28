import { FlightCamera, bindFlightOrbit } from '../../src/rendering/flight-camera';
import { createAircraftShadow } from '../../src/rendering/aircraft-shadow';
import type { FlightPose } from '../../src/flight/flight';
import { AircraftSetup } from '../../src/flight/aircraft';
import { AIRCRAFT_SELECTORS, AIRCRAFT_CONTROLS } from '../../src/ui/aircraft-controls';
import { createRotorcraft, createWeaponMount } from '../../src/rendering/rotorcraft';
import { ChunkPlan } from '../../src/streaming/chunk-plan';
import { BoxGeometry, Color, DirectionalLight, Fog, Group, HemisphereLight, Mesh, MeshStandardMaterial, PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { demandFrames } from '../../src/rendering/demand-frames';
import { RegionalPopulation } from '../../src/hordes/regional-population';
import { createRegionalPopulationView } from '../../src/rendering/regional-population-view';
import { Flight } from '../../src/flight/flight';
import { ChunkStream } from '../../src/streaming/chunk-stream';
import { chunkKey, heightAt, type TerrainData } from '../../src/streaming/terrain-data';
import { createTerrainWorkers } from '../../src/streaming/worker-pool';
import { attachTerrain } from '../../src/rendering/streamed-terrain';
import { Combat, rangeTargets, WEAPONS, type WeaponId } from '../../src/combat/weapons';
import { WeaponAudio } from '../../src/combat/audio';
import { createCombatView } from '../../src/rendering/combat-view';
import '../../src/ui/style.css';
import { regionalSample } from '../../src/world/regional-terrain';
import { SettlementWorld } from '../../src/world/settlements';
import { createSettlementView } from '../../src/rendering/settlement-view';
import { createTerrainFallback } from '../../src/rendering/terrain-fallback';
export function mountFlightLab(combatEnabled=false) {
const params=new URLSearchParams(location.search),regional=!combatEnabled && params.get('terrain')==='regional';
combatEnabled ||= regional;
const structures=regional && params.get('structures')!=='0';
const rawSeed=Number(params.get('seed')??103),seed=regional && Number.isInteger(rawSeed) && rawSeed>=0 && rawSeed<=4294967295 ? rawSeed : 103;
const ground=(x:number,z:number)=>{if(!regional)return heightAt(103,x,z);const s=regionalSample(seed,x,z);return Math.max(s.height,s.water??-Infinity);};
const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=`<header><a class="brand" href="/">MVW / DEVELOPMENT</a><nav aria-label="Workspace"><a href="/">Game</a><a href="/tools/flight/" ${!combatEnabled||regional?'aria-current="page"':''}>Flight lab</a><a href="/tools/weapons/" ${combatEnabled&&!regional?'aria-current="page"':''}>Weapons lab</a><a href="/tools/hordes/">Horde lab</a><a href="/tools/streaming/">Streaming lab</a><a href="/tools/voxel-editor/">Voxel workshop</a></nav></header><main><section class="intro"><p class="eyebrow">${regional?'PHASE 17 / REGIONAL AIRCRAFT':combatEnabled?'PHASE 10 / WEAPONS':'PHASE 09 / FLIGHT'}</p><h1>${regional?'Regional terrain flight':combatEnabled?'Weapons lab':'Flight lab'}</h1><p>Arcade attack aircraft · seeded terrain · chase camera ${regional?`· generator v2 · seed ${seed} · water contact crashes · building collision active · vegetation is visual only · regional hordes within ±4096 m`:''}</p></section><section class="controls" aria-label="Flight controls"><button id="start">Start / Resume</button><button id="pause">Pause</button><button id="reset">Recover / Reset</button>${AIRCRAFT_SELECTORS}<p>${AIRCRAFT_CONTROLS} Equipment changes pause; aircraft changes reset the approach and preserve casualties. Choices are session only.</p><label>Flight assistance <select id="assist"><option value="assisted">Assisted</option><option value="direct">Direct</option></select></label><p>Focus the scene; arrows mirror W/S and A/D. Blur pauses; resume explicitly. Terrain, water and building contact stop flight.</p>${combatEnabled?'<label>Weapon <select id="weapon" aria-label="Weapon"><option value="minigun">1 · Minigun</option><option value="autocannon">2 · Autocannon</option><option value="shell">3 · Explosive shell</option></select></label><button id="sound">Enable sound</button><p>Space fires forward · 1/2/3 selects weapon · '+(regional?'gold markers represent distant hordes; green figures are zombies. ':'gold spheres are test targets, including a ground cluster. ')+''+(regional?'Recover preserves population damage.':'Recover / Reset restores targets.')+' Unlimited test ammunition. Terrain blocks shots and blasts.</p>'+(regional?'<button id="approach-horde">Approach nearby horde</button><p>Regional encounters persist by seed. Recover resets the aircraft and weapon counters; population damage remains. Clear a local encounter by eliminating its members. Population coverage: −4096 to 4096 m on each axis.</p><p id="population-stats" role="group" aria-label="Population diagnostics"></p>':'')+'<p id="combat-stats" role="group" aria-label="Combat diagnostics"></p><p id="audio-status" role="group" aria-label="Audio status">Muted</p>':''}<p id="stats" role="group" aria-label="Flight diagnostics"></p></section><section class="viewport" tabindex="0" aria-label="Aircraft flight scene"></section><footer><p role="status">Starting flight…</p><span>${regional?'REGIONAL ENCOUNTERS · PERSISTENT CLEARANCE':combatEnabled?'TARGET RANGE · STATIC WORLD':'AIRCRAFT · NO WEAPONS'}</span></footer></main>`;
const host=app.querySelector<HTMLElement>('.viewport')!, status=app.querySelector<HTMLElement>('[role=status]')!, stats=app.querySelector<HTMLElement>('#stats')!;
function mount() {
  let renderer:WebGLRenderer;
  try { renderer=new WebGLRenderer({antialias:true}); } catch { status.textContent='WebGL 2 unavailable.'; app.querySelectorAll('button,select').forEach(b=>(b as HTMLButtonElement).disabled=true); return ()=>{}; }
  host.append(renderer.domElement);
  let wake=()=>{};
  const scene=new Scene(); scene.background=new Color('#aebec0'); scene.fog=new Fog('#aebec0',80,180);
  const sun=new DirectionalLight('#ffdfb2',2.6); sun.position.set(-30,60,20); scene.add(sun,new HemisphereLight('#d9ebf2','#687052',2));
  const camera=new PerspectiveCamera(65,1,.2,regional?1400:350),chase=new FlightCamera(21,8,20),groundShadow=createAircraftShadow();scene.add(groundShadow.mesh);
  const fallback=regional?createTerrainFallback(seed,(x,z)=>{const s=regionalSample(seed,x,z);return {height:Math.max(s.height,s.water??-Infinity),color:[...s.color]};}):undefined;
  if(fallback){scene.add(fallback.mesh);scene.fog=new Fog('#aebec0',300,1000);}
  const terrainMaterial=new MeshStandardMaterial({vertexColors:true,roughness:1}), markerGeometry=new BoxGeometry(1,1,1), markerMaterial=new MeshStandardMaterial();
  const bodyMaterial=new MeshStandardMaterial({color:'#69706a',roughness:1}), cockpitMaterial=new MeshStandardMaterial({color:'#283a40',roughness:.65});
  const aircraft=new Group(), parts:BoxGeometry[]=[];
  const box=(w:number,h:number,d:number,x:number,y:number,z:number,material=bodyMaterial)=>{const g=new BoxGeometry(w,h,d);parts.push(g);const m=new Mesh(g,material);m.position.set(x,y,z);aircraft.add(m);};
  box(1.3,1,8,0,0,0); box(10,.25,2.2,0,0,.7); box(4,.2,1,0,.4,3); box(.3,1.7,1.8,0,1,2.8); box(.9,.6,1.8,0,.7,-1.5,cockpitMaterial); const airframe=new Group(),rotorcraft=createRotorcraft(),gunMount=createWeaponMount(),setup=new AircraftSetup();
  airframe.add(aircraft,rotorcraft.group,gunMount.group);rotorcraft.group.visible=false;gunMount.group.visible=combatEnabled;scene.add(airframe);
  const world=structures?new SettlementWorld(seed):undefined,cityView=structures?createSettlementView():undefined;if(cityView)scene.add(cityView.group);
  let workers:ReturnType<typeof createTerrainWorkers>|undefined;
  let stream:ChunkStream<TerrainData,ReturnType<typeof attachTerrain>>|undefined;
  try { workers=createTerrainWorkers(); stream=new ChunkStream(workers.load,(spec,data)=>{const r=attachTerrain(spec,data,terrainMaterial,markerGeometry,markerMaterial,true);const release=cityView?.attach(`${spec.x},${spec.z}`,data.buildings??[]),dispose=r.dispose;r.dispose=()=>{release?.();dispose();};scene.add(r.group);return r;},undefined,()=>wake()); }
  catch { status.textContent='Terrain workers unavailable. Reload to retry.'; app.querySelectorAll('button,select').forEach(b=>(b as HTMLButtonElement).disabled=true); }
  const chunkPlan=new ChunkPlan(seed,regional,structures);
  const flight:Flight=new Flight(ground,world?(origin,direction,range)=>world.ray(origin,direction,range,flight.aircraft==='helicopter'?8:6):undefined);
  const resetFlight=()=>{flight.reset();if(regional){const x=Number(params.get('x')??16),z=Number(params.get('z')??16);if(Number.isFinite(x)&&Number.isFinite(z)&&Math.abs(x)<130000&&Math.abs(z)<130000)flight.position={x,z,y:Math.min(240,ground(x,z)+65)};}};
  resetFlight();
  const keys=new Set<string>(), releases:(()=>void)[]=[];
  const listen=(target:EventTarget,type:string,fn:EventListener)=>{const handler:EventListener=e=>{fn(e);wake();};target.addEventListener(type,handler);releases.push(()=>target.removeEventListener(type,handler));};
  let storage:Storage|undefined;try{storage=localStorage;}catch{/* Session-only diagnostics below. */}
  const population=regional?new RegionalPopulation(seed,storage,structures):undefined;
  const populationView=population?createRegionalPopulationView(population):undefined;if(populationView)scene.add(populationView.group);
  const combat=population?new Combat([],ground,128,{index:population,blocker:world?(o,d,r)=>world.ray(o,d,r):undefined,onDamage:t=>population.damaged(t)}):combatEnabled?new Combat(rangeTargets((x,z)=>heightAt(103,x,z)),(x,z)=>heightAt(103,x,z)):undefined;
  const combatView=combat?createCombatView(combat):undefined;if(combatView)scene.add(combatView.group);
  const audio=combat?new WeaponAudio():undefined;
  let weapon:WeaponId='minigun',heardShots=0;
  const weaponSelect=app.querySelector<HTMLSelectElement>('#weapon');
  releases.push(bindFlightOrbit(host,chase,()=>wake()));
  const clear=()=>{keys.clear();chase.held=false;host.style.cursor='';audio?.stop();};
  const supported=['KeyW','KeyS','KeyA','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyQ','KeyE',...(combatEnabled?['Space','Digit1','Digit2','Digit3']:[])];
  listen(host,'keydown',e=>{const k=e as KeyboardEvent;if(supported.includes(k.code)){k.preventDefault();keys.add(k.code);if(weaponSelect&&['Digit1','Digit2','Digit3'].includes(k.code)){const candidate=(['minigun','autocannon','shell'] as WeaponId[])[Number(k.code.slice(-1))-1];if(setup.allows(candidate)){weapon=candidate;weaponSelect.value=weapon;}}}});
  listen(host,'keyup',e=>keys.delete((e as KeyboardEvent).code));
  let selectedEncounter:string|undefined;
  const approach=app.querySelector('#approach-horde');
  if(approach)listen(approach,'click',()=>{population!.update(flight.position);const choices=[...population!.resident.values()].filter(r=>r.targets.some(t=>t.health>0)).sort((a,b)=>Math.hypot(a.encounter.members[0].x-flight.position.x,a.encounter.members[0].z-flight.position.z)-Math.hypot(b.encounter.members[0].x-flight.position.x,b.encounter.members[0].z-flight.position.z));const r=choices[0];if(!r)return;selectedEncounter=r.encounter.id;const t=r.targets.find(t=>t.health>0)!;clear();flight.reset();flight.position={x:t.position.x,y:ground(t.position.x,t.position.z+100)+45,z:t.position.z+100};flight.pitch=-.35;previous=undefined;snap=true;host.focus();});
  const pause=()=>{population?.checkpoint();clear();flight.pause();previous=undefined;};
  listen(host,'blur',pause);listen(window,'blur',pause);listen(document,'visibilitychange',pause);
  listen(app.querySelector('#start')!,'click',()=>{if(stream)flight.start();previous=undefined;host.focus();});
  listen(app.querySelector('#pause')!,'click',pause);
  const configure=()=>{
    if(weaponSelect){for(const option of weaponSelect.options)option.disabled=!setup.allows(option.value as WeaponId);if(!setup.allows(weapon))weapon=setup.weapons[0];weaponSelect.value=weapon;}
    const p=setup.muzzle({x:0,y:0,z:0},0,0,0);gunMount.group.position.set(p.x,p.y,p.z);
  };
  for(const id of ['aircraft','loadout','mount'])listen(app.querySelector(`#${id}`)!,'change',()=>{
    pause();const value=app.querySelector<HTMLSelectElement>(`#${id}`)!.value;
    if(id==='aircraft'){setup.setAircraft(value);flight.setAircraft(value);resetFlight();aircraft.visible=value==='fixed-wing';rotorcraft.group.visible=value==='helicopter';previous=undefined;snap=true;}
    else if(id==='loadout')setup.setLoadout(value);else setup.setMount(value);
    configure();
  });
  configure();
  if(weaponSelect)listen(weaponSelect,'change',()=>{const candidate=weaponSelect.value as WeaponId;if(setup.allows(candidate))weapon=candidate;clear();});
  if(audio)listen(app.querySelector('#sound')!,'click',()=>{void audio.toggle().then(()=>{if(disposed)return;app.querySelector('#sound')!.textContent=audio.muted?'Enable sound':'Mute sound';wake();});});
  let snap=true;
  listen(app.querySelector('#reset')!,'click',()=>{clear();resetFlight();combat?.reset();heardShots=0;previous=undefined;snap=true;});
  listen(app.querySelector('#assist')!,'change',e=>{flight.assisted=(e.target as HTMLSelectElement).value==='assisted';clear();});
  const resize=()=>{renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(Math.max(1,host.clientWidth),Math.max(1,host.clientHeight));camera.aspect=host.clientWidth/Math.max(1,host.clientHeight);camera.updateProjectionMatrix();wake();};
  const observer=new ResizeObserver(resize);observer.observe(host);resize();
  let disposed=false,previous:number|undefined,lastReport=0,renderedFrames=0;
  const pose:FlightPose={position:{x:0,y:0,z:0},heading:0,pitch:0,bank:0};
  const held=(...codes:string[])=>Number(codes.some(c=>keys.has(c)));
  const animate=(now:number)=>{
    if(disposed)return false;
    const dt=previous===undefined?0:Math.max(0,(now-previous)/1000);previous=now;
    flight.advance(dt,{pitch:held('KeyS','ArrowDown')-held('KeyW','ArrowUp'),bank:held('KeyD','ArrowRight')-held('KeyA','ArrowLeft'),throttle:held('KeyE')-held('KeyQ')},()=>{
      if(!combat)return;
      const d={x:Math.sin(flight.heading)*Math.cos(flight.pitch),y:Math.sin(flight.pitch),z:-Math.cos(flight.heading)*Math.cos(flight.pitch)},p=flight.position;
      combat.step(keys.has('Space'),weapon,setup.muzzle(p,flight.heading,flight.pitch,flight.bank),d);
    });
    population?.update(flight.position);populationView?.update();
    combatView?.update();
    if(combat&&audio&&combat.shots!==heardShots){heardShots=combat.shots;audio.play(WEAPONS[combat.lastWeapon].sound);}
    if(flight.state!=='running')audio?.stop();
    const p=flight.position;stream?.update(chunkPlan.at(p.x+(regional?Math.sin(flight.heading)*64:0),p.z-(regional?Math.cos(flight.heading)*64:0)));fallback?.update(p.x,p.z);cityView?.update();flight.samplePose(pose);airframe.position.set(pose.position.x,pose.position.y,pose.position.z);airframe.rotation.set(pose.pitch,-pose.heading,-pose.bank,'YXZ');groundShadow.update(pose,ground,flight.aircraft==='helicopter');rotorcraft.update(flight.ticks);
    const tracking=chase.update(camera,pose,dt,snap);snap=false;
    camera.position.y=Math.max(camera.position.y,ground(camera.position.x,camera.position.z)+4);
    if(world)for(const b of world.buildings({minX:camera.position.x-.1,maxX:camera.position.x+.1,minZ:camera.position.z-.1,maxZ:camera.position.z+.1}))camera.position.y=Math.max(camera.position.y,b.y+b.height+4);
    camera.lookAt(tracking.target);renderer.render(scene,camera);renderedFrames++;
    const cameraSettling=regional&&tracking.moving;
    const keepAnimating=!regional||flight.state==='running'||cameraSettling||(stream?.completed??0)>0;
    if(now-lastReport>100||!keepAnimating){lastReport=now;const current=stream?.resident.has(chunkKey(Math.floor(p.x/32),Math.floor(p.z/32)))??false;
      const sample={assisted:flight.assisted,orbit:chase.held,camera:{x:camera.position.x,y:camera.position.y,z:camera.position.z},renderPose:pose,groundShadow:{x:groundShadow.mesh.position.x,y:groundShadow.mesh.position.y,z:groundShadow.mesh.position.z},...p,muzzle:setup.muzzle(p,flight.heading,flight.pitch,flight.bank),aircraft:flight.aircraft,loadout:setup.loadout,mount:setup.mount,streamTimings:stream?{...stream.timings}:null,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,renderedFrames,chunkPlanRebuilds:chunkPlan.rebuilds,populationRebuilds:populationView?.rebuilds??0,idle:!keepAnimating,settled:stream?.settled??false,state:flight.state,speed:flight.speed,altitude:p.y-ground(p.x,p.z),generator:regional?2:1,seed,structures:cityView?.count??0,pitch:flight.pitch,bank:flight.bank,heading:flight.heading,ticks:flight.ticks,dropped:flight.dropped,resident:stream?.resident.size??0,pending:stream?.pending??0,ready:stream?.completed??0,stale:stream?.stale??0,failures:stream?.failures??0,current,geometries:renderer.info.memory.geometries};stats.dataset.sample=JSON.stringify(sample);
      if(population){const c=population.counts,panel=app.querySelector<HTMLElement>('#population-stats')!;const local=population.resident.get(`rp1:${Math.floor(p.x/128)},${Math.floor(p.z/128)}`);const chosen=selectedEncounter?population.resident.get(selectedEncounter):local;const encounter=chosen?.encounter.id??null,remaining=chosen?.targets.filter(t=>t.health>0).length??0;panel.dataset.sample=JSON.stringify({...c,encounter,remaining,error:population.error});panel.textContent=`Regional population · ${c.alive} nearby · ${c.killed} killed · ${c.cleared} encounters cleared · local ${encounter??'outside coverage'}: ${remaining} remaining${population.error?' · '+population.error:''}`;}
      if(combat){const combatSample={shots:combat.shots,hits:combat.hits,damage:combat.damage,kills:combat.kills,blasts:combat.blasts,weapon,effects:combat.effects.filter(e=>e.active).length,capacity:combat.effects.length,droppedEffects:combat.droppedEffects,voices:audio?.activeVoices??0,targets:combat.targets.map(t=>({id:t.id,health:t.health}))};const panel=app.querySelector<HTMLElement>('#combat-stats')!;panel.dataset.sample=JSON.stringify(combatSample);panel.textContent=`${WEAPONS[weapon].name} · ${combat.shots} shots · ${combat.hits} damaging hits · ${combat.damage.toFixed(0)} damage · ${combat.kills}${population?' regional kills':'/'+combat.targets.length+' targets cleared'} · ${combat.blasts} blasts · effects ${combatSample.effects}/128 · dropped cosmetics ${combat.droppedEffects}`;app.querySelector('#audio-status')!.textContent=audio?.state??'Muted';}
      stats.textContent=`${flight.state} · ${flight.speed.toFixed(1)} m/s · altitude ${sample.altitude.toFixed(1)} m AGL · throttle ${(flight.throttle*100).toFixed(0)}% · chunk ${current?'visible':'loading gap'} · residents ${sample.resident}/49 · jobs ${sample.pending} · results ${sample.ready} · stale ${sample.stale} · failures ${sample.failures} · dropped ${flight.dropped.toFixed(2)} s`;
      if(stream)status.textContent=stream.lastError?`Terrain generation error: ${stream.lastError}`:flight.state==='crashed'?`${flight.reason} · Recover / Reset to try again.`:`${flight.state} · ${flight.assisted?'Assisted':'Direct'} controls · ${current?'terrain available':'terrain loading; collision active'}`;
    }
    return keepAnimating;
  };
  const frames=demandFrames(animate);wake=()=>{lastReport=-Infinity;frames.invalidate();};wake();
  return ()=>{if(disposed)return;disposed=true;frames.dispose();observer.disconnect();releases.forEach(r=>r());clear();population?.checkpoint();populationView?.dispose();audio?.dispose();combatView?.dispose();stream?.dispose();workers?.dispose();fallback?.dispose();cityView?.dispose();groundShadow.dispose();rotorcraft.dispose();gunMount.dispose();parts.forEach(g=>g.dispose());bodyMaterial.dispose();cockpitMaterial.dispose();terrainMaterial.dispose();markerGeometry.dispose();markerMaterial.dispose();scene.clear();renderer.dispose();renderer.domElement.remove();};
}
const release=mount();
const dispose=()=>{window.removeEventListener('pagehide',onHide);release();};
const onHide=(e:PageTransitionEvent)=>{if(!e.persisted)dispose();};window.addEventListener('pagehide',onHide);if(import.meta.hot)import.meta.hot.dispose(dispose);

}
