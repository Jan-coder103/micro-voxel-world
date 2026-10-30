import { createFrontierScenery } from '../rendering/frontier-scenery';
import { ACESFilmicToneMapping,BoxGeometry,Color,DirectionalLight,Fog,Group,HemisphereLight,Mesh,MeshBasicMaterial,MeshStandardMaterial,PerspectiveCamera,Scene,SphereGeometry,Vector3,WebGLRenderer } from 'three';
import aircraftSource from '../../assets/source/ref-attack-aircraft.voxel.json';
import { createVoxelMesh } from '../rendering/voxel-mesh';
import { FlightCamera,bindFlightOrbit } from '../rendering/flight-camera';
import { createAircraftShadow } from '../rendering/aircraft-shadow';
import { createTerrainFallback } from '../rendering/terrain-fallback';
import { createRegionalPopulationView } from '../rendering/regional-population-view';
import { createFrontierSettlements } from '../rendering/frontier-settlements';
import { createCombatView } from '../rendering/combat-view';
import { demandFrames } from '../rendering/demand-frames';
import { attachTerrain } from '../rendering/streamed-terrain';
import { createTerrainWorkers } from '../streaming/worker-pool';
import { ChunkStream } from '../streaming/chunk-stream';
import { AIRBASE,airbaseSample } from '../world/airbase';
import { Frontier,type Upgrade } from './frontier';
import { WeaponAudio } from '../combat/audio';
import { WEAPONS,type WeaponId } from '../combat/weapons';
import type { FlightPose } from '../flight/flight';
import './frontier.css';

const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=`<main class="frontier"><section class="world-view" tabindex="0" aria-label="Aircraft flight scene"></section><header><a href="/" class="wordmark">MICRO VOXEL WORLD <span>FRONTIER</span></a><button id="menu-button">Esc · Hangar / Pause</button></header><div class="instruments"><div id="run-hud"></div><div id="heading"></div><div id="flight-hud"></div></div><div id="reticle">+</div><div id="target" hidden></div><div id="home-marker"></div><div id="horde-marker"></div><div id="crash-view" hidden></div><footer><span id="weapon-hud"></span><span id="hint" role="status"></span></footer><dialog id="hangar" aria-label="Hangar and upgrades"><p class="eyebrow">HOME AIRFIELD / RUNWAY 18–36</p><h1 id="menu-title">Fly out. Fight. Make it home.</h1><p id="debrief">Take off from the strip, hunt hordes across the procedural world, and land here to bank your rewards.</p><div id="pilot"></div><button id="launch">Start engine / Resume</button><section id="upgrades"><h2>Aircraft upgrades</h2><p>Bank kills by landing and stopping on the strip. Crashes lose the run’s money and XP.</p><div class="upgrade-grid"><button data-upgrade="engine"></button><button data-upgrade="weapons"></button><button data-upgrade="bounty"></button></div></section><details open><summary>Flight manual</summary><p><b>E</b> increase throttle · <b>Q</b> reduce throttle / wheel brakes<br><b>S / ↓</b> nose up · <b>W / ↑</b> nose down · <b>A / D</b> bank / ground steering<br><b>Space</b> fire · <b>1 / 2 / 3</b> weapons · <b>C</b> camera orbit toggle · <b>Esc</b> pause</p><p><b>Takeoff:</b> hold E, accelerate above 28 m/s, then hold S to lift off.<br><b>Landing:</b> approach either end, wings level, aligned with the runway. Touch down below 48 m/s, descending below 4 m/s. Hold Q to idle and brake to a full stop. Stay inside the strip.</p><p>Explore freely; no clearance quota. The home marker includes bearing and distance. Ground enemies appear in green; amber markers show nearby hordes. Crash recovery takes ten seconds of active game time.</p></details><details><summary>Settings and developer tools</summary><div class="settings"><label>Flying mode <select id="flight-mode" aria-label="Flying mode"><option value="assisted">Assisted auto-level</option><option value="direct">Direct hold attitude</option></select></label><label><input id="aim" type="checkbox" checked> Aim assistance</label><label><input id="effects" type="checkbox" checked> Combat effects</label><label>Render scale <select id="scale" aria-label="Render scale"><option value="1">100%</option><option value="0.75">75%</option><option value="0.5">50%</option></select></label><button id="sound">Enable sound</button><label><input id="dev" type="checkbox"> Enable developer tools</label><nav id="dev-links" hidden><a href="/tools/streaming/?terrain=regional">Terrain explorer</a><a href="/tools/flight/?terrain=regional">Regional flight lab</a><a href="/play/">Legacy combat lab</a><a href="/tools/voxel-editor/">Voxel workshop</a><a href="/tools/hordes/">Horde lab</a><a href="/tools/weapons/">Weapons lab</a></nav><pre id="diagnostics" hidden></pre></div></details><p id="save-status"></p></dialog></main>`;
const host=app.querySelector<HTMLElement>('.world-view')!,menu=app.querySelector<HTMLDialogElement>('#hangar')!,hint=app.querySelector<HTMLElement>('#hint')!;
function mount(){
  let renderer:WebGLRenderer;
  try{renderer=new WebGLRenderer({antialias:true});}catch{hint.textContent='WebGL 2 is unavailable. Enable hardware acceleration and reload.';app.querySelectorAll('button').forEach(b=>b.disabled=true);return ()=>{};}
  host.append(renderer.domElement);renderer.toneMapping=ACESFilmicToneMapping;renderer.toneMappingExposure=1;
  let storage:Storage|undefined;try{storage=localStorage;}catch{/* The pilot panel reports session-only saves. */}
  const model=new Frontier(103,storage),scene=new Scene(),world=new Group();scene.add(world);scene.background=new Color('#b6cbd0');scene.fog=new Fog('#b6cbd0',650,1650);
  const sun=new DirectionalLight('#ffe8cb',2.4);sun.position.set(-300,500,120);scene.add(sun,new HemisphereLight('#d7efff','#616845',1.4));
  const camera=new PerspectiveCamera(62,1,.2,2500),chase=new FlightCamera(38,12,24),aircraft=createVoxelMesh(aircraftSource),airframe=new Group();aircraft.mesh.position.y=-2.4;airframe.add(aircraft.mesh);world.add(airframe);
  const shadow=createAircraftShadow();world.add(shadow.mesh);
  const terrainMaterial=new MeshStandardMaterial({vertexColors:true,color:'#aab7a2',roughness:1}),cube=new BoxGeometry(1,1,1),markerMaterial=new MeshStandardMaterial();
  // Reused coarse terrain covers the horizon while four worker LOD tiers arrive nearby.
  const fallback=createTerrainFallback(model.seed,(x,z)=>{const s=airbaseSample(model.seed,x,z);return {height:Math.max(s.height,s.water??-Infinity),color:[...s.color]};},128,{innerExtent:256,innerSpacing:16,drop:1,material:terrainMaterial});world.add(fallback.mesh);
  const scenery=createFrontierScenery(model.seed,model.population.world);world.add(scenery.group);
  const populationView=createRegionalPopulationView(model.population),cities=createFrontierSettlements(model.population.world),combatView=createCombatView(model.combat);world.add(populationView.group,cities.group,combatView.group);
  const runwayMaterial=new MeshStandardMaterial({color:'#343e3d',roughness:1}),paint=new MeshStandardMaterial({color:'#eee7c3',roughness:1}),hangarMaterial=new MeshStandardMaterial({color:'#777e72',roughness:1}),roofMaterial=new MeshStandardMaterial({color:'#526361',roughness:1}),base=new Group();world.add(base);
  const box=(x:number,y:number,z:number,w:number,h:number,d:number,material:MeshStandardMaterial)=>{const mesh=new Mesh(cube,material);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);base.add(mesh);return mesh;};
  const y=model.baseHeight;
  box(0,y+.08,AIRBASE.z,44,.16,480,runwayMaterial);
  for(let z=AIRBASE.minZ+24;z<AIRBASE.maxZ-12;z+=24)box(0,y+.17,z,1.2,.02,11,paint);
  for(const x of [-20,20])box(x,y+.17,AIRBASE.z,.5,.02,476,paint);
  for(const z of [AIRBASE.minZ+12,AIRBASE.maxZ-12])for(const x of [-14,-10,-6,6,10,14])box(x,y+.17,z,2,.02,12,paint);
  box(58,y+6,480,28,12,36,hangarMaterial);box(58,y+12.3,480,30,.6,38,roofMaterial);box(58,y+4.5,461.9,20,9,.2,runwayMaterial);box(52,y+9,400,8,18,8,hangarMaterial);box(52,y+18,400,12,4,12,roofMaterial);
  const crashGeometry=new SphereGeometry(1,12,8),fireMaterial=new MeshBasicMaterial({color:'#ffb14d',transparent:true,opacity:.9}),smokeMaterial=new MeshBasicMaterial({color:'#343938',transparent:true,opacity:.65}),fire=new Mesh(crashGeometry,fireMaterial),smoke=new Mesh(crashGeometry,smokeMaterial);world.add(fire,smoke);fire.visible=smoke.visible=false;
  const audio=new WeaponAudio(),keys=new Set<string>(),releases:(()=>void)[]=[];let previous:number|undefined,snap=true,lastState=model.state,heard=0,scale=1,frameCount=0,disposed=false;
  let wake=()=>{};
  let terrainError='';
  let workers:ReturnType<typeof createTerrainWorkers>|undefined,stream:ChunkStream<Awaited<ReturnType<ReturnType<typeof createTerrainWorkers>['load']>>,ReturnType<typeof attachTerrain>>|undefined;
  try{workers=createTerrainWorkers();stream=new ChunkStream(workers.load,(spec,data)=>{const r=attachTerrain(spec,data,terrainMaterial,cube,markerMaterial,true);world.add(r.group);return r;},undefined,()=>wake());}catch{terrainError='Terrain detail unavailable; coarse terrain and collision remain active.';}
  const listen=(target:EventTarget,type:string,fn:EventListener)=>{const wrapped:EventListener=e=>{fn(e);wake();};target.addEventListener(type,wrapped);releases.push(()=>target.removeEventListener(type,wrapped));};
  const clear=()=>{keys.clear();audio.stop();};
  const pause=()=>{model.pause();clear();chase.reset();previous=undefined;wake();};
  const openMenu=()=>{pause();if(!menu.open)menu.showModal();};
  const closeMenu=()=>{if(model.state==='crashed'){menu.close();model.paused=false;previous=undefined;host.focus();return;}menu.close();model.launch();previous=undefined;host.focus();wake();};
  listen(app.querySelector('#menu-button')!,'click',openMenu);listen(app.querySelector('#launch')!,'click',closeMenu);
  listen(menu,'cancel',e=>{e.preventDefault();closeMenu();});
  listen(window,'keydown',e=>{const k=e as KeyboardEvent;if(k.code==='Escape'&&!k.repeat){k.preventDefault();if(menu.open)closeMenu();else openMenu();}});
  let weapon:WeaponId='minigun';
  const codes=['KeyW','KeyS','KeyA','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyQ','KeyE','Space','Digit1','Digit2','Digit3'];
  listen(host,'keydown',e=>{const k=e as KeyboardEvent;if(!codes.includes(k.code))return;k.preventDefault();keys.add(k.code);if(k.code.startsWith('Digit'))weapon=(['minigun','autocannon','shell'] as WeaponId[])[Number(k.code.slice(-1))-1];});listen(host,'keyup',e=>keys.delete((e as KeyboardEvent).code));
  listen(host,'blur',()=>{if(!menu.open)pause();});listen(window,'blur',pause);listen(document,'visibilitychange',()=>{if(document.hidden)pause();});
  releases.push(bindFlightOrbit(host,chase,()=>wake()));
  const mode=app.querySelector<HTMLSelectElement>('#flight-mode')!,aim=app.querySelector<HTMLInputElement>('#aim')!,effects=app.querySelector<HTMLInputElement>('#effects')!;effects.checked=!matchMedia('(prefers-reduced-motion: reduce)').matches;
  listen(mode,'change',()=>{model.flight.assisted=mode.value==='assisted';});
  listen(aim,'change',()=>{});listen(effects,'change',()=>{});
  listen(app.querySelector('#sound')!,'click',()=>{void audio.toggle().then(()=>{app.querySelector('#sound')!.textContent=audio.muted?'Enable sound':'Mute sound';wake();});});
  for(const button of app.querySelectorAll<HTMLButtonElement>('[data-upgrade]'))listen(button,'click',()=>{model.buy(button.dataset.upgrade as Upgrade);});
  const dev=app.querySelector<HTMLInputElement>('#dev')!;listen(dev,'change',()=>{app.querySelector<HTMLElement>('#dev-links')!.hidden=!dev.checked;app.querySelector<HTMLElement>('#diagnostics')!.hidden=!dev.checked;});
  const resize=()=>{renderer.setPixelRatio(Math.min(devicePixelRatio,1.5)*scale);renderer.setSize(Math.max(1,host.clientWidth),Math.max(1,host.clientHeight));camera.aspect=host.clientWidth/Math.max(1,host.clientHeight);camera.updateProjectionMatrix();wake();};
  listen(app.querySelector('#scale')!,'change',()=>{scale=Number(app.querySelector<HTMLSelectElement>('#scale')!.value);resize();});const observer=new ResizeObserver(resize);observer.observe(host);
  const pose:FlightPose={position:{x:0,y:0,z:0},heading:0,pitch:0,bank:0},projected=new Vector3(),held=(...c:string[])=>Number(c.some(k=>keys.has(k)));
  const project=(id:string,p:{x:number;y:number;z:number},label?:string)=>{const element=app.querySelector<HTMLElement>(id)!;projected.set(p.x+world.position.x,p.y,p.z+world.position.z).project(camera);element.hidden=projected.z< -1||projected.z>1||Math.abs(projected.x)>1||Math.abs(projected.y)>1;if(!element.hidden){element.style.left=`${(projected.x*.5+.5)*host.clientWidth}px`;element.style.top=`${(-projected.y*.5+.5)*host.clientHeight}px`;if(label!==undefined)element.textContent=label;}};
  const scheduler=demandFrames(now=>{
    if(disposed)return false;const dt=previous===undefined?0:Math.max(0,(now-previous)/1000);previous=now;
    model.advance(dt,{pitch:held('KeyS','ArrowDown')-held('KeyW','ArrowUp'),bank:held('KeyD','ArrowRight')-held('KeyA','ArrowLeft'),throttle:held('KeyE')-held('KeyQ'),fire:keys.has('Space'),weapon,aim:aim.checked});
    if(lastState!==model.state){
      if(model.state==='crashed'){clear();chase.reset();audio.play('explosion');}
      if(model.state==='hangar'){clear();snap=true;heard=0;if(!menu.open)menu.showModal();}
      lastState=model.state;
    }
    const f=model.flight,p=f.position;
    if(model.combat.shots>heard)audio.play(WEAPONS[weapon].sound);heard=model.combat.shots;
    stream?.update(model.terrainPlan());fallback.update(p.x,p.z);populationView.update();cities.update(p.x,p.z);combatView.update({effects:effects.checked&&model.state!=='crashed'?'full':'off'});
    f.samplePose(pose);scenery.update(pose.position.x,pose.position.y,pose.position.z);airframe.position.set(pose.position.x,pose.position.y,pose.position.z);airframe.rotation.set(pose.pitch,-pose.heading,-pose.bank,'YXZ');shadow.update(pose,model.ground,false);
    // Keep GPU world transforms near zero even after long flights.
    world.position.set(-Math.floor(p.x/4096)*4096,0,-Math.floor(p.z/4096)*4096);
    const tracking=chase.update(camera,pose,dt,snap);snap=false;
    camera.position.y=Math.max(camera.position.y,model.ground(camera.position.x,camera.position.z)+3);
    camera.position.x+=world.position.x;camera.position.z+=world.position.z;tracking.target.x+=world.position.x;tracking.target.z+=world.position.z;
    const crashed=model.state==='crashed',age=10-model.crashSeconds;fire.visible=crashed&&effects.checked&&age<1.4;smoke.visible=crashed&&effects.checked;
    fire.position.copy(airframe.position);fire.scale.setScalar(2+Math.min(age,1)*10);fireMaterial.opacity=Math.max(0,1-age/1.4);
    smoke.position.copy(airframe.position);smoke.position.y+=3+age*.7;smoke.scale.set(4+age*.7,5+age,4+age*.7);
    if(crashed){camera.position.set(p.x+world.position.x+Math.sin(age*.16)*42,p.y+18,p.z+world.position.z+Math.cos(age*.16)*42);camera.position.y=Math.max(camera.position.y,model.ground(p.x+Math.sin(age*.16)*42,p.z+Math.cos(age*.16)*42)+5);tracking.target.set(p.x+world.position.x,p.y,p.z+world.position.z);}
    camera.lookAt(tracking.target);camera.updateMatrixWorld();scene.updateMatrixWorld();renderer.render(scene,camera);frameCount++;
    const homeDistance=Math.hypot(p.x,p.z-AIRBASE.z),bearing=(Math.atan2(-p.x,-(AIRBASE.z-p.z))*180/Math.PI+360)%360,heading=(f.heading*180/Math.PI%360+360)%360;
    app.querySelector('#run-hud')!.textContent=`RUN REWARDS · UNBANKED\n$${model.pendingMoney} / ${model.pendingXP} XP\n${model.combat.kills} hostiles eliminated`;
    app.querySelector('#heading')!.textContent=`${Math.round(heading).toString().padStart(3,'0')}°\nHOME ${Math.round(bearing)}° · ${(homeDistance/1000).toFixed(2)} km`;
    app.querySelector('#flight-hud')!.textContent=`${f.speed.toFixed(0)} m/s · ${(f.speed*3.6).toFixed(0)} km/h\n${(p.y-model.ground(p.x,p.z)).toFixed(0)} m AGL · THR ${(f.throttle*100).toFixed(0)}%\nV/S ${(f.grounded?0:Math.sin(f.pitch)*f.speed-Math.max(0,28-f.speed)*.25).toFixed(1)} m/s\n${f.grounded?'ON RUNWAY':f.speed<28?'STALL · INCREASE THROTTLE':'AIRBORNE'}`;
    app.querySelector<HTMLElement>('#reticle')!.hidden=crashed;
    const lock=aim.checked&&!crashed?model.lock:undefined;if(lock)project('#target',lock.position);else app.querySelector<HTMLElement>('#target')!.hidden=true;
    project('#home-marker',{x:0,y:y+8,z:AIRBASE.z},'HOME · LAND & STOP');const horde=model.nearestHorde();if(horde)project('#horde-marker',horde.position,`HORDE · ${Math.hypot(horde.position.x-p.x,horde.position.z-p.z).toFixed(0)} m`);else app.querySelector<HTMLElement>('#horde-marker')!.hidden=true;
    app.querySelector('#weapon-hud')!.textContent=`${WEAPONS[weapon].name} · ${lock?'TARGET LOCK':aim.checked?'SEEKING TARGET':'NOSE AIM'} · 1 / 2 / 3`;
    const crashPanel=app.querySelector<HTMLElement>('#crash-view')!;crashPanel.hidden=!crashed;crashPanel.textContent=`AIRCRAFT LOST\n${f.reason}\nUnbanked rewards lost · recovery in ${Math.ceil(model.crashSeconds)} s${model.paused?' · PAUSED':''}`;
    if(terrainError||stream?.failures)hint.textContent=terrainError||'Terrain detail failed; coarse coverage and collision remain active.';else hint.textContent=model.notice|| (model.paused?'Paused · Esc to resume':crashed?'Recovery team inbound':f.grounded?'E · throttle up / S · rotate above 28 m/s / Q · idle & brakes':'Hunt freely · Return to the strip to bank rewards · Esc to pause');
    app.querySelector('#pilot')!.textContent=`$${model.progress.data.money} BANKED · ${model.progress.data.xp} XP · PILOT LEVEL ${1+Math.floor(model.progress.data.xp/300)}`;
    app.querySelector('#menu-title')!.textContent=model.state==='hangar'?'Welcome home, pilot.':crashed?'Recovery in progress.':'Flight paused.';
    app.querySelector('#debrief')!.textContent=model.notice||'Take off, explore, shoot down hordes, then manually land and stop to bank the run.';
    app.querySelector('#launch')!.textContent=crashed?'Resume crash view':model.state==='hangar'?'Start engine / Take off':'Resume flight';
    const names:Record<Upgrade,string>={engine:'Engine · +12% acceleration',weapons:'Weapon research · +20% damage',bounty:'Bounty contract · +$2 per kill'};
    for(const button of app.querySelectorAll<HTMLButtonElement>('[data-upgrade]')){const id=button.dataset.upgrade as Upgrade,level=model.progress.data.levels[id],cost=model.progress.cost(id);button.textContent=`${names[id]}\nLevel ${level}/5 · ${level===5?'MAX':`$${cost}`}`;button.disabled=model.state!=='hangar'||level>=5||model.progress.data.money<cost;}
    app.querySelector('#save-status')!.textContent=model.progress.error||model.population.error?'Session only · '+(model.progress.error||model.population.error):'Pilot upgrades and cleared hordes save in this browser. Reload starts at home.';
    const sample={assisted:f.assisted,orbit:chase.unlocked,renderPose:pose,groundShadow:{x:shadow.mesh.position.x,y:shadow.mesh.position.y,z:shadow.mesh.position.z},state:model.state,paused:model.paused,grounded:f.grounded,departed:model.departed,crashSeconds:model.crashSeconds,x:p.x,y:p.y,z:p.z,speed:f.speed,throttle:f.throttle,heading:f.heading,pitch:f.pitch,bank:f.bank,money:model.progress.data.money,xp:model.progress.data.xp,pendingMoney:model.pendingMoney,kills:model.combat.kills,residents:stream?.resident.size??0,jobs:stream?.pending??0,results:stream?.completed??0,hordes:model.population.resident.size,distantTrees:scenery.treeCount,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,frameCount,lods:[0,1,2,3].map(l=>[...stream?.resident.values()??[]].filter(r=>r.spec.lod===l).length),settled:stream?.settled??true};host.dataset.sample=JSON.stringify(sample);app.querySelector('#diagnostics')!.textContent=JSON.stringify(sample,null,2);
    const continuing=!model.paused||tracking.moving; if(!continuing)previous=undefined;return continuing;
  });wake=scheduler.invalidate;resize();openMenu();wake();
  return ()=>{if(disposed)return;disposed=true;model.pause();scheduler.dispose();observer.disconnect();releases.forEach(r=>r());stream?.dispose();workers?.dispose();audio.dispose();aircraft.dispose();shadow.dispose();fallback.dispose();cities.dispose();populationView.dispose();combatView.dispose();scenery.dispose();terrainMaterial.dispose();cube.dispose();markerMaterial.dispose();runwayMaterial.dispose();paint.dispose();hangarMaterial.dispose();roofMaterial.dispose();crashGeometry.dispose();fireMaterial.dispose();smokeMaterial.dispose();scene.clear();renderer.dispose();renderer.domElement.remove();};
}
const release=mount();const onHide=(e:PageTransitionEvent)=>{if(!e.persisted)release();};window.addEventListener('pagehide',onHide);if(import.meta.hot)import.meta.hot.dispose(()=>{window.removeEventListener('pagehide',onHide);release();});
