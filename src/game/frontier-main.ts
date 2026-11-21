import { createFrontierProfiler } from '../performance/frontier-profiler';
import { PLANES,planeDefinition,type PlaneId } from './aircraft-roster';
import { createPlayerAircraft } from '../rendering/player-aircraft';
import { WorldMap } from './world-map';
import { createBaseView,createEngineExhaust,createRescueView,speedWindOpacity } from '../rendering/sortie-presentation';
import { radarContact,headingTape } from './tactical-hud';
import { createWingVapor,flightStress,sunGlare,SUN_DIRECTION } from '../rendering/flight-effects';
import { createFrontierRoads } from '../rendering/frontier-roads';
import { createNavalView } from '../rendering/naval-view';
import { createMutantView } from '../rendering/mutant-view';
import { SHOP,SKILLS,type GearSlot } from './progression';
import { createFrontierScenery } from '../rendering/frontier-scenery';
import { configureFrontierMaterial } from '../rendering/frontier-material';
import { ACESFilmicToneMapping,BoxGeometry,Color,DirectionalLight,Fog,Group,HemisphereLight,Mesh,MeshBasicMaterial,MeshStandardMaterial,PCFSoftShadowMap,PerspectiveCamera,Scene,SphereGeometry,Vector3,WebGLRenderer } from 'three';
import { FlightCamera,bindFlightOrbit } from '../rendering/flight-camera';
import { createAircraftShadow } from '../rendering/aircraft-shadow';
import { createWorkerTerrainFallback } from '../rendering/worker-terrain-fallback';
import { createCachedSunShadows } from '../rendering/cached-sun-shadows';
import { createRegionalPopulationView } from '../rendering/regional-population-view';
import { createFrontierSettlements } from '../rendering/frontier-settlements';
import { createCombatView } from '../rendering/combat-view';
import { demandFrames } from '../rendering/demand-frames';
import { attachTerrain } from '../rendering/streamed-terrain';
import { createTerrainWorkers } from '../streaming/worker-pool';
import { ChunkStream } from '../streaming/chunk-stream';
import { AIRBASE } from '../world/airbase';
import { Frontier,type Upgrade } from './frontier';
import { WeaponAudio } from '../combat/audio';
import { WEAPONS,type WeaponId } from '../combat/weapons';
import type { FlightPose } from '../flight/flight';
import './frontier.css';

const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=`<main class="frontier"><section class="world-view" tabindex="0" aria-label="Aircraft flight scene"></section><header><a href="/" class="wordmark">MICRO VOXEL WORLD <span>FRONTIER</span></a><button id="menu-button">Esc · Hangar / Pause</button></header><div class="instruments"><div id="run-hud"></div><div id="heading"></div><div id="flight-hud"></div></div><div id="compass-tape" aria-hidden="true"></div><aside id="radar" aria-label="Tactical radar"><span>RADAR / 2.5 KM</span><div class="radar-scope"><i class="radar-own">▲</i><i id="radar-home" class="radar-contact home"></i><i id="radar-horde" class="radar-contact hostile"></i><i id="radar-boss" class="radar-contact boss"></i></div><small>▲ YOU · ◇ BASE · ◆ HOSTILE</small></aside><div id="reticle">+</div><div id="target" hidden></div><div id="home-marker"></div><div id="horde-marker"></div><div id="boss-marker" hidden></div><aside id="boss-hud" hidden></aside><div id="speed-wind" aria-hidden="true"></div><div id="crash-view" hidden><span id="crash-message"></span><button id="skip-rescue">Skip rescue · Return to base</button></div><dialog id="world-map" aria-label="World map"><h2>TACTICAL WORLD MAP · FLIGHT PAUSED</h2><canvas id="map-canvas" aria-label="Top-down terrain, bases and known hostiles"></canvas><p>North ↑ · WASD / arrows to pan · − / + to zoom · Procedural world: pan and zoom to any region</p><div><button id="map-out">− Zoom out</button><button id="map-in">+ Zoom in</button><button id="map-center">Center on aircraft</button><button id="map-close">M · Close map</button></div></dialog><footer><span id="weapon-hud"></span><span id="hint" role="status"></span></footer><dialog id="hangar" aria-label="Hangar and upgrades"><p class="eyebrow" id="base-name">HOME AIRFIELD / RUNWAY 18–36</p><h1 id="menu-title">Fly out. Fight. Make it home.</h1><p id="debrief">Take off from the strip, hunt hordes across the procedural world, and land here to bank your rewards.</p><div id="pilot"></div><section id="run-debrief" hidden aria-label="Last run debrief"></section><section id="plane-details" aria-label="Aircraft details"></section><p id="next-plane"></p><button id="launch">Start engine / Resume</button><div class="hangar-navigation"><label>Navigation destination <select id="base-destination" aria-label="Navigation destination"></select></label><span>Land and stop at any base to bank rewards.</span></div><nav class="hangar-tabs" aria-label="Hangar sections"><button data-panel="upgrades" aria-pressed="true">Aircraft service</button><button data-panel="skill-panel" aria-pressed="false">Pilot skill tree</button><button data-panel="shop-panel" aria-pressed="false">Equipment shop</button></nav><section id="upgrades"><h2>Aircraft upgrades</h2><p>Bank kills by landing and stopping on the strip. Safe landings double the run’s money and XP. Crashes retain the base earnings.</p><div class="upgrade-grid"><button data-upgrade="engine"></button><button data-upgrade="weapons"></button><button data-upgrade="bounty"></button></div></section><section id="skill-panel" hidden><h2>Pilot skill tree</h2><p>Earn one skill point per 300 banked XP. Each rank costs one point. Unlock the preceding skill before moving along a branch.</p><p id="skill-points"></p><div class="skill-tree">${['Flight','Gunnery','Operations'].map(branch=>`<section class="skill-branch"><h3>${branch}</h3>${SKILLS.filter(skill=>skill.branch===branch).map(skill=>`<article class="skill-card"><h4>${skill.name}</h4><p>${skill.description}</p><small>${skill.requires?`Requires ${SKILLS.find(s=>s.id===skill.requires)!.name}`:'Entry skill'}</small><button data-skill="${skill.id}"></button></article>`).join('')}</section>`).join('')}</div></section><section id="shop-panel" hidden><h2>Equipment shop</h2><p>Buy permanent unlocks with banked money. Equip one item in each slot. Choose a loadout for the next sortie; all purchases and skill training require a safe landing.</p><div class="loadout-grid">${(['engine','weapon','airframe','utility'] as const).map(slot=>`<label>${slot}<select data-gear="${slot}" aria-label="${slot} equipment"><option value="">Standard equipment</option></select></label>`).join('')}</div><label class="shop-filter">Browse <select id="shop-filter" aria-label="Shop category"><option value="all">All equipment</option>${['engine','weapon','airframe','utility'].map(slot=>`<option value="${slot}">${slot}</option>`).join('')}</select></label><div class="shop-grid">${SHOP.map(item=>`<article class="shop-card" data-slot="${item.slot}"><small>${item.slot.toUpperCase()}</small><h3>${item.name}</h3><p>${item.description}</p><small>${item.requires?`Requires ${SHOP.find(i=>i.id===item.requires)!.name}`:'Available for research'}</small><button data-shop="${item.id}"></button></article>`).join('')}</div></section><details open><summary>Flight manual</summary><p><b>E</b> increase throttle · <b>Q</b> reduce throttle / wheel brakes<br><b>S / ↓</b> nose up · <b>W / ↑</b> nose down · <b>A / D</b> bank / ground steering<br><b>Space</b> fire · <b>1 / 2 / 3 / 4</b> weapons · <b>M</b> paused world map · <b>V</b> cockpit / chase · <b>C</b> camera orbit toggle · <b>Esc</b> pause</p><p><b>Takeoff:</b> hold E to full power, accelerate to 32–35 m/s, then hold S to rotate. Ease off S about a second after liftoff; use short inputs to manage the climb.<br><b>Landing:</b> approach either end, wings level, aligned with the runway. Touch down below 48 m/s, descending below 4 m/s. Hold Q to idle and brake to a full stop. Stay inside the strip.</p><p>Explore freely; no clearance quota. The navigation marker includes bearing and distance. Select an airfield or ocean carrier in the hangar. Carriers have the same landing and banking rules. Brutes, colossal mutants and giant siege spiders award larger rewards; avoid flying into them. Ground enemies appear in green; amber markers show nearby hordes. Rescue helicopters arrive over ten seconds; skip rescue to return immediately.</p></details><details><summary>Settings and developer tools</summary><div class="settings"><label>Flying mode <select id="flight-mode" aria-label="Flying mode"><option value="direct">Direct · auto-level off</option><option value="assisted">Assisted · auto-level and trim</option></select></label><label><input id="aim" type="checkbox" checked> Aim assistance</label><label><input id="effects" type="checkbox" checked> Combat effects</label><label>Render scale <select id="scale" aria-label="Render scale"><option value="1">100%</option><option value="0.75">75%</option><option value="0.5">50%</option></select></label><button id="sound">Enable sound</button><label><input id="dev" type="checkbox"> Enable developer tools</label><nav id="dev-links" hidden><a href="/tools/voxel-editor/">Voxel workshop</a></nav><pre id="diagnostics" hidden></pre></div></details><p id="save-status"></p></dialog></main>`;
const leftPanel=document.createElement('div'),rightPanel=document.createElement('div'),slots=document.createElement('div');
leftPanel.className='hangar-left';rightPanel.className='hangar-right';slots.className='plane-slots';
const hangar=app.querySelector('#hangar')!;
for(const child of [...hangar.children]){(child.matches('.eyebrow,h1,#debrief,#pilot,#run-debrief,#plane-details,#next-plane,#launch,.hangar-navigation,#save-status')?leftPanel:rightPanel).append(child);}
slots.innerHTML=PLANES.map(p=>`<button data-plane="${p.id}" aria-label="Preview Tier ${p.tier} ${p.name}"><small>TIER ${p.tier}</small><strong>${p.name}</strong><span>${p.role}</span><small class="plane-status"></small></button>`).join('');
hangar.append(leftPanel,rightPanel,slots);leftPanel.insertBefore(app.querySelector('#launch')!,app.querySelector('#run-debrief')!);
const host=app.querySelector<HTMLElement>('.world-view')!,menu=app.querySelector<HTMLDialogElement>('#hangar')!,hint=app.querySelector<HTMLElement>('#hint')!;
function mount(){
  let renderer:WebGLRenderer;
  try{renderer=new WebGLRenderer({antialias:true});}catch{hint.textContent='WebGL 2 is unavailable. Enable hardware acceleration and reload.';app.querySelector('#map-canvas')?.remove();app.querySelectorAll('button').forEach(b=>b.disabled=true);return ()=>{};}
  host.append(renderer.domElement);renderer.toneMapping=ACESFilmicToneMapping;renderer.toneMappingExposure=1;
  let storage:Storage|undefined;try{storage=localStorage;}catch{/* The pilot panel reports session-only saves. */}
  const model=new Frontier(103,storage),scene=new Scene(),world=new Group();scene.add(world);scene.background=new Color('#bf8353');scene.fog=new Fog('#bf8353',650,1650);
  const sun=new DirectionalLight('#ffbc7e',3);scene.add(sun,sun.target,new HemisphereLight('#d9ae83','#433c2b',1.05));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=PCFSoftShadowMap;
  sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
  Object.assign(sun.shadow.camera,{left:-240,right:240,top:240,bottom:-240,near:1,far:1600});sun.shadow.normalBias=.45;sun.shadow.bias=-.00015;
  const camera=new PerspectiveCamera(62,1,.2,5000),chase=new FlightCamera(38,12,24),airframe=new Group();let aircraft=createPlayerAircraft(model.plane.id),previewPlane:PlaneId=model.plane.id;airframe.add(aircraft.group);world.add(airframe);
  const displayPlane=(id:PlaneId)=>{if(aircraft.id===id)return;aircraft.dispose();aircraft=createPlayerAircraft(id);airframe.add(aircraft.group);wake();};
  const vapor=createWingVapor(),exhaust=createEngineExhaust(),rescue=createRescueView(),fort=createBaseView(model.seed);airframe.add(vapor.group,exhaust.group);world.add(rescue.group,fort.group);
  let firstPerson=false,cockpit:ReturnType<typeof import('../rendering/cockpit').createCockpit>|undefined,cockpitRequest=0;
  scene.add(camera);
  const glare=document.createElement('div');glare.className='sun-glare';host.append(glare);
  const toggleView=async()=>{
    firstPerson=!firstPerson;const request=++cockpitRequest;cockpit?.dispose();cockpit=undefined;
    if(firstPerson){const {createCockpit}=await import('../rendering/cockpit');if(request!==cockpitRequest||disposed)return;cockpit=createCockpit();camera.add(cockpit.group);}
    wake();
  };
  const shadow=createAircraftShadow();world.add(shadow.mesh);
  const terrainMaterial=new MeshStandardMaterial({vertexColors:true,roughness:1}),terrainSurface=configureFrontierMaterial(terrainMaterial,model.seed),cube=new BoxGeometry(1,1,1),markerMaterial=new MeshStandardMaterial();
  // Reused coarse terrain covers the horizon while four worker LOD tiers arrive nearby.
  const fallback=createWorkerTerrainFallback(model.seed,terrainMaterial,()=>wake());world.add(fallback.mesh);
  const roads=createFrontierRoads(model.population.world,()=>wake()),naval=createNavalView(model.navy,cube),mutantView=createMutantView(model.mutants,cube);world.add(roads.group,naval.group,mutantView.group);
  const scenery=createFrontierScenery(model.seed,model.population.world,()=>wake());world.add(scenery.group);
  const populationView=createRegionalPopulationView(model.population),cities=createFrontierSettlements(model.population.world),combatView=createCombatView(model.combat);world.add(populationView.group,cities.group,combatView.group);
  const runwayMaterial=new MeshStandardMaterial({color:'#343e3d',roughness:1}),paint=new MeshStandardMaterial({color:'#eee7c3',roughness:1}),hangarMaterial=new MeshStandardMaterial({color:'#777e72',roughness:1}),roofMaterial=new MeshStandardMaterial({color:'#526361',roughness:1}),base=new Group();world.add(base);
  const box=(x:number,y:number,z:number,w:number,h:number,d:number,material:MeshStandardMaterial)=>{const mesh=new Mesh(cube,material);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.castShadow=true;mesh.receiveShadow=true;base.add(mesh);return mesh;};
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
  try{workers=createTerrainWorkers();stream=new ChunkStream(workers.load,(spec,data)=>{const r=attachTerrain(spec,data,terrainMaterial,cube,markerMaterial,true);world.add(r.group);return r;},undefined,()=>wake(),undefined,2);}catch{terrainError='Terrain detail unavailable; coarse terrain and collision remain active.';}
  let hudDirty=true,lastHud=-Infinity;
  const listen=(target:EventTarget,type:string,fn:EventListener)=>{const wrapped:EventListener=e=>{fn(e);hudDirty=true;wake();};target.addEventListener(type,wrapped);releases.push(()=>target.removeEventListener(type,wrapped));};
  const clear=()=>{keys.clear();audio.stop();};
  const pause=()=>{model.pause();clear();chase.reset();previous=undefined;wake();};
  const openMenu=()=>{pause();if(!menu.open)menu.showModal();};
  const closeMenu=()=>{if(model.state==='crashed'){menu.close();model.paused=false;previous=undefined;host.focus();return;}previewPlane=model.plane.id;displayPlane(previewPlane);menu.close();model.launch();previous=undefined;host.focus();wake();};
  listen(app.querySelector('#menu-button')!,'click',openMenu);listen(app.querySelector('#launch')!,'click',closeMenu);
  listen(menu,'close',()=>{});
  listen(menu,'cancel',e=>{e.preventDefault();closeMenu();});
  listen(window,'keydown',e=>{const k=e as KeyboardEvent;if(k.code==='Escape'&&!k.repeat&&!app.querySelector<HTMLDialogElement>('#world-map')!.open){k.preventDefault();if(menu.open)closeMenu();else openMenu();}});
  const mapDialog=app.querySelector<HTMLDialogElement>('#world-map')!,worldMap=new WorldMap(app.querySelector<HTMLCanvasElement>('#map-canvas')!,model);let mapWasPaused=true;
  const closeMap=()=>{mapDialog.close();keys.clear();if(!mapWasPaused){model.paused=false;model.flight.start();}previous=undefined;host.focus();wake();};
  const openMap=()=>{if(menu.open)return;mapWasPaused=model.paused;pause();worldMap.center();mapDialog.showModal();};
  listen(app.querySelector('#map-close')!,'click',closeMap);listen(mapDialog,'cancel',e=>{e.preventDefault();closeMap();});
  listen(app.querySelector('#map-out')!,'click',()=>worldMap.zoom(2));listen(app.querySelector('#map-in')!,'click',()=>worldMap.zoom(.5));listen(app.querySelector('#map-center')!,'click',()=>worldMap.center());
  listen(window,'keydown',e=>{const k=e as KeyboardEvent;if(k.code==='KeyM'&&!k.repeat){k.preventDefault();if(mapDialog.open)closeMap();else openMap();return;}if(!mapDialog.open)return;
    const moves:Record<string,[number,number]>={KeyW:[0,-1],ArrowUp:[0,-1],KeyS:[0,1],ArrowDown:[0,1],KeyA:[-1,0],ArrowLeft:[-1,0],KeyD:[1,0],ArrowRight:[1,0]};
    if(moves[k.code]){k.preventDefault();worldMap.pan(...moves[k.code]);}if(k.code==='Equal'||k.code==='Minus'){k.preventDefault();worldMap.zoom(k.code==='Minus'?2:.5);}
  });
  listen(app.querySelector('#skip-rescue')!,'click',()=>{model.skipRescue();clear();snap=true;});
  let weapon:WeaponId='minigun';
  const codes=['KeyW','KeyS','KeyA','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyQ','KeyE','Space','Digit1','Digit2','Digit3','Digit4'];
  listen(host,'keydown',e=>{const k=e as KeyboardEvent;if(k.code==='KeyV'&&!k.repeat){k.preventDefault();void toggleView();return;}if(model.paused)return;if(!codes.includes(k.code))return;k.preventDefault();keys.add(k.code);if(k.code.startsWith('Digit'))weapon=(['minigun','autocannon','shell','missile'] as WeaponId[])[Number(k.code.slice(-1))-1];});listen(host,'keyup',e=>keys.delete((e as KeyboardEvent).code));
  listen(host,'blur',()=>{if(!menu.open)pause();});listen(window,'blur',pause);listen(document,'visibilitychange',()=>{if(document.hidden)pause();});
  releases.push(bindFlightOrbit(host,chase,()=>wake()));
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');listen(reducedMotion,'change',()=>{});
  const mode=app.querySelector<HTMLSelectElement>('#flight-mode')!,aim=app.querySelector<HTMLInputElement>('#aim')!,effects=app.querySelector<HTMLInputElement>('#effects')!;effects.checked=!matchMedia('(prefers-reduced-motion: reduce)').matches;
  listen(mode,'change',()=>{model.flight.assisted=mode.value==='assisted';});
  listen(aim,'change',()=>{});listen(effects,'change',()=>{});
  listen(app.querySelector('#sound')!,'click',()=>{void audio.toggle().then(()=>{app.querySelector('#sound')!.textContent=audio.muted?'Enable sound':'Mute sound';wake();});});
  for(const button of app.querySelectorAll<HTMLButtonElement>('[data-plane]'))listen(button,'click',()=>{if(model.state!=='hangar')return;previewPlane=button.dataset.plane as PlaneId;if(model.progress.data.planes.includes(previewPlane))model.selectPlane(previewPlane);displayPlane(previewPlane);});
  listen(app.querySelector('#plane-details')!,'click',e=>{if(!(e.target as HTMLElement).closest('[data-unlock-plane]'))return;if(model.unlockPlane(previewPlane)){displayPlane(previewPlane);menuKey='';}});
  for(const button of app.querySelectorAll<HTMLButtonElement>('[data-upgrade]'))listen(button,'click',()=>{model.buy(button.dataset.upgrade as Upgrade);});
  for(const button of app.querySelectorAll<HTMLButtonElement>('[data-panel]'))listen(button,'click',()=>{
    for(const id of ['upgrades','skill-panel','shop-panel'])app.querySelector<HTMLElement>(`#${id}`)!.hidden=id!==button.dataset.panel;
    for(const tab of app.querySelectorAll('[data-panel]'))tab.setAttribute('aria-pressed',String(tab===button));
  });
  for(const button of app.querySelectorAll<HTMLButtonElement>('[data-skill]'))listen(button,'click',()=>{model.learn(button.dataset.skill!);});
  for(const button of app.querySelectorAll<HTMLButtonElement>('[data-shop]'))listen(button,'click',()=>{const item=SHOP.find(i=>i.id===button.dataset.shop)!;if(model.progress.data.owned.includes(item.id)||model.purchase(item.id))model.equip(item.slot,item.id);});
  for(const select of app.querySelectorAll<HTMLSelectElement>('[data-gear]'))listen(select,'change',()=>{model.equip(select.dataset.gear as GearSlot,select.value);});
  listen(app.querySelector('#shop-filter')!,'change',()=>{const slot=app.querySelector<HTMLSelectElement>('#shop-filter')!.value;for(const card of app.querySelectorAll<HTMLElement>('.shop-card'))card.hidden=slot!=='all'&&slot!==card.dataset.slot;});
  listen(app.querySelector('#base-destination')!,'change',()=>{model.selectBase(app.querySelector<HTMLSelectElement>('#base-destination')!.value);});
  let gearKey='',baseKey='',menuKey='';
  const dev=app.querySelector<HTMLInputElement>('#dev')!;listen(dev,'change',()=>{app.querySelector<HTMLElement>('#dev-links')!.hidden=!dev.checked;app.querySelector<HTMLElement>('#diagnostics')!.hidden=!dev.checked;});
  let viewWidth=1,viewHeight=1;
  const resize=()=>{viewWidth=Math.max(1,host.clientWidth);viewHeight=Math.max(1,host.clientHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.5)*scale);renderer.setSize(viewWidth,viewHeight);camera.aspect=viewWidth/viewHeight;camera.updateProjectionMatrix();wake();};
  listen(app.querySelector('#scale')!,'change',()=>{scale=Number(app.querySelector<HTMLSelectElement>('#scale')!.value);resize();});const observer=new ResizeObserver(resize);observer.observe(host);
  const pose:FlightPose={position:{x:0,y:0,z:0},heading:0,pitch:0,bank:0},projected=new Vector3(),held=(...c:string[])=>Number(c.some(k=>keys.has(k)));
  const project=(id:string,p:{x:number;y:number;z:number},label?:string)=>{const element=app.querySelector<HTMLElement>(id)!;projected.set(p.x+world.position.x,p.y,p.z+world.position.z).project(camera);element.hidden=projected.z< -1||projected.z>1||Math.abs(projected.x)>1||Math.abs(projected.y)>1;if(!element.hidden){element.style.left=`${(projected.x*.5+.5)*viewWidth}px`;element.style.top=`${(-projected.y*.5+.5)*viewHeight}px`;if(label!==undefined)element.textContent=label;}};
  let waterSeconds=0,displaySeconds=0;
  let hudLock:Frontier['lock'],hudHorde:ReturnType<Frontier['nearestHorde']>,hudMutant:ReturnType<Frontier['nearestMutant']>;
  const diagnostics=app.querySelector<HTMLElement>('#diagnostics')!;
  listen(diagnostics.closest('details')!,'toggle',()=>{});
  const instrumentText=(id:string,text:string)=>{const element=app.querySelector(id)!;if(element.textContent!==text)element.textContent=text;};
  let compassHeading=-Infinity,bossMarkup='';
  const sunShadows=createCachedSunShadows(renderer,scene,sun,[airframe,mutantView.group,rescue.group]);
  const profiler=createFrontierProfiler(renderer,app.querySelector('.settings')!,()=>wake());
  profiler.instrument(renderer.shadowMap,'render','Shadow depth passes (inclusive)');
  profiler.instrument(scenery.clouds,'cull','Cloud bank culling');
  profiler.instrument(model.flight,'advance','Plane + collision + tick glue',true);
  profiler.instrument(model.population,'update','Zombie simulation');
  profiler.instrument(model.mutants,'step','Mutant simulation');profiler.instrument(model.mutants,'attack','Mutant attacks');
  profiler.instrument(model.combat,'step','Combat + targeting callbacks');
  profiler.instrument(stream??{update:()=>{}},'update','Streaming integration');
  profiler.instrument(fallback,'update','Terrain fallback update');profiler.instrument(terrainSurface,'updateFields','Terrain fields');
  profiler.instrument(roads,'update','Road update');profiler.instrument(naval,'update','Naval update');
  profiler.instrument(mutantView,'update','Mutant presentation');profiler.instrument(populationView,'update','Zombie presentation');
  profiler.instrument(cities,'update','Settlement update');profiler.instrument(combatView,'update','Combat presentation');
  profiler.instrument(scenery,'update','Scenery update (inclusive)');profiler.instrument(scenery.forest,'update','Tree streaming + LOD');profiler.instrument(scenery.clouds,'update','Cloud update');profiler.instrument(shadow,'update','Aircraft ground shadow update');
  profiler.visual('Cache static shadows',()=>sunShadows.enabled,v=>{sunShadows.enabled=v;});
  profiler.visual('Shadow maps',()=>renderer.shadowMap.enabled,v=>{renderer.shadowMap.enabled=v;scene.traverse(o=>{const mesh=o as Mesh;if(mesh.material)for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material])m.needsUpdate=true;});});
  profiler.visualGroup('Trees',scenery.forest.group);profiler.visualGroup('Clouds',scenery.clouds.group);
  profiler.visualGroup('Zombies',populationView.group);profiler.visualGroup('Mutants',mutantView.group);
  const scheduler=demandFrames(now=>{
    if(disposed)return false;profiler.begin();const dt=previous===undefined?0:Math.max(0,(now-previous)/1000);previous=now;
    if(!document.hidden)displaySeconds+=Math.min(dt,.1);
    if(!model.paused&&effects.checked)waterSeconds+=Math.min(dt,.1);terrainSurface.updateTime(waterSeconds);
    model.advance(dt,{pitch:held('KeyS','ArrowDown')-held('KeyW','ArrowUp'),bank:held('KeyD','ArrowRight')-held('KeyA','ArrowLeft'),throttle:held('KeyE')-held('KeyQ'),fire:keys.has('Space'),weapon,aim:aim.checked});
    profiler.mark('Simulation (inclusive)');
    if(lastState!==model.state){hudDirty=true;
      if(model.state==='crashed'){clear();chase.reset();audio.play('explosion');}
      if(model.state==='hangar'){previewPlane=model.plane.id;displayPlane(previewPlane);clear();snap=true;heard=0;if(!menu.open)menu.showModal();}
      lastState=model.state;
    }
    const f=model.flight,p=f.position;
    if(model.combat.shots>heard)audio.play(WEAPONS[weapon].sound);heard=model.combat.shots;
    stream?.update(model.terrainPlan());fallback.update(p.x,p.z);terrainSurface.updateFields(p.x,p.z);roads.update(p.x,p.z);naval.update(p.x,p.z);mutantView.update(p.x,p.z);populationView.update();cities.update(p.x,p.z);combatView.update({effects:effects.checked&&model.state!=='crashed'?'full':'off'});
    profiler.mark('World updates (inclusive)');
    f.samplePose(pose);scenery.update(pose.position.x,pose.position.y,pose.position.z,stream?.resident.values());airframe.position.set(pose.position.x,pose.position.y,pose.position.z);airframe.rotation.set(pose.pitch,-pose.heading,-pose.bank,'YXZ');shadow.update(pose,model.ground,false);
    // Keep GPU world transforms near zero even after long flights.
    world.position.set(-Math.floor(p.x/4096)*4096,0,-Math.floor(p.z/4096)*4096);
    terrainSurface.updateOrigin(-world.position.x,-world.position.z);
    sunShadows.update(p.x,p.z,world.position.x,world.position.z);
    const tracking=chase.update(camera,pose,dt,snap);snap=false;
    camera.position.y=Math.max(camera.position.y,model.ground(camera.position.x,camera.position.z)+3);
    camera.position.x+=world.position.x;camera.position.z+=world.position.z;tracking.target.x+=world.position.x;tracking.target.z+=world.position.z;
    const crashed=model.state==='crashed',age=10-model.crashSeconds;fire.visible=crashed&&effects.checked&&age<1.4;smoke.visible=crashed&&effects.checked;
    fire.position.copy(airframe.position);fire.scale.setScalar(2+Math.min(age,1)*10);fireMaterial.opacity=Math.max(0,1-age/1.4);
    smoke.position.copy(airframe.position);smoke.position.y+=3+age*.7;smoke.scale.set(4+age*.7,5+age,4+age*.7);
    if(crashed){camera.position.set(p.x+world.position.x+Math.sin(age*.22)*80,p.y+38,p.z+world.position.z+Math.cos(age*.22)*80);camera.position.y=Math.max(camera.position.y,model.ground(p.x+Math.sin(age*.22)*80,p.z+Math.cos(age*.22)*80)+5);tracking.target.set(p.x+world.position.x,p.y,p.z+world.position.z);}
    const hangarOrbit=menu.open&&model.state==='hangar';
    if(hangarOrbit){const angle=reducedMotion.matches?0:displaySeconds*.12;camera.position.set(p.x+world.position.x+Math.sin(angle)*40,p.y+12,p.z+world.position.z+Math.cos(angle)*40);tracking.target.set(p.x+world.position.x,p.y+1,p.z+world.position.z);}
    // Keep the aircraft above the lower service panels on narrow displays.
    if(hangarOrbit&&host.clientWidth<=760)camera.setViewOffset(host.clientWidth,host.clientHeight,0,host.clientHeight*.22,host.clientWidth,host.clientHeight);else if(camera.view?.enabled)camera.clearViewOffset();
    camera.up.set(0,1,0);
    if(firstPerson&&!crashed&&!hangarOrbit){
      camera.rotation.set(pose.pitch,-pose.heading,-pose.bank,'YXZ');
      camera.position.set(0,1.4,-1.7).applyEuler(airframe.rotation).add(airframe.position).add(world.position);
      camera.up.set(0,1,0).applyEuler(airframe.rotation);
      tracking.target.set(0,0,-100).applyEuler(airframe.rotation).add(camera.position);
    }
    const stress=effects.checked&&!f.grounded&&!crashed?flightStress(f.loadFactor,f.speed,f.stalled):0;
    vapor.update(stress);exhaust.update(f.throttle,waterSeconds,effects.checked&&!crashed&&model.plane.propellers.length===0);exhaust.group.position.z=model.plane.length*.43;aircraft.update(f.throttle,model.paused?displaySeconds: f.ticks/60);rescue.update(p,age,model.ground,crashed);
    const wind=app.querySelector<HTMLElement>('#speed-wind')!;wind.style.opacity=String(speedWindOpacity(f.speed,f.grounded,model.paused,effects.checked,crashed));
    app.querySelector<HTMLElement>('.frontier')!.classList.toggle('in-hangar',menu.open);

    if(!model.paused){camera.position.x+=Math.sin(f.ticks*2.17)*stress*.045;camera.position.y+=Math.cos(f.ticks*1.73)*stress*.035;}
    cockpit?.update(f.speed,p.y,f.throttle,f.bank,f.pitch,f.verticalSpeed);
    aircraft.group.visible=!firstPerson||crashed||hangarOrbit;aircraft.group.position.y=hangarOrbit?aircraft.clearance-model.clearance:0;
    camera.lookAt(tracking.target);camera.updateMatrixWorld();
    const viewDirection=camera.getWorldDirection(new Vector3());
    const sunPoint=SUN_DIRECTION.clone().multiplyScalar(1500).add(camera.position).project(camera);
    const glareAmount=effects.checked&&!crashed&&p.y>model.ground(p.x+SUN_DIRECTION.x*200,p.z+SUN_DIRECTION.z*200)-SUN_DIRECTION.y*200?sunGlare(viewDirection.dot(SUN_DIRECTION)):0;
    glare.style.opacity=String(glareAmount*.85);glare.style.setProperty('--sun-x',`${(sunPoint.x*.5+.5)*100}%`);glare.style.setProperty('--sun-y',`${(-sunPoint.y*.5+.5)*100}%`);
profiler.mark('Aircraft + camera + effects (inclusive)');
    scene.updateMatrixWorld();scenery.clouds.cull(camera);profiler.mark('Scene matrices');profiler.gpuBegin();renderer.render(scene,camera);profiler.gpuEnd();profiler.mark('Render CPU submission (inclusive)');frameCount++;
    const continuing=!document.hidden&&(!model.paused||tracking.moving||fallback.needsFrame||hangarOrbit&&!reducedMotion.matches);
    if(hudDirty||now-lastHud>=100||!continuing){lastHud=now;hudDirty=false;
    const destination=model.navigationBase,homeDistance=Math.hypot(p.x-destination.x,p.z-destination.z),bearing=(Math.atan2(destination.x-p.x,-(destination.z-p.z))*180/Math.PI+360)%360,heading=(f.heading*180/Math.PI%360+360)%360;
    if(Math.round(heading)!==compassHeading){compassHeading=Math.round(heading);app.querySelector('#compass-tape')!.innerHTML=headingTape(heading);}
    instrumentText('#run-hud',`RUN ${model.progress.data.runs+(model.state==='crashed'?0:1)} · ${model.plane.name.toUpperCase()}\n$${model.pendingMoney} / ${model.pendingXP} XP\n${model.combat.kills} hostiles eliminated`);
    instrumentText('#heading',`${Math.round(heading).toString().padStart(3,'0')}°\n${destination.kind==='carrier'?'CARRIER':'HOME'} ${Math.round(bearing)}° · ${(homeDistance/1000).toFixed(2)} km`);
    instrumentText('#flight-hud',`${f.speed.toFixed(0)} m/s · ${(f.speed*3.6).toFixed(0)} km/h\n${(p.y-model.ground(p.x,p.z)).toFixed(0)} m AGL · THR ${(f.throttle*100).toFixed(0)}%\nV/S ${(f.grounded?0:f.verticalSpeed).toFixed(1)} m/s\n${f.grounded?'ON RUNWAY':f.stalled?'STALL · LOWER NOSE / ADD POWER':'AIRBORNE'}`);
    app.querySelector<HTMLElement>('#reticle')!.hidden=crashed;
    const lock=hudLock=(aim.checked||weapon==='missile')&&!crashed?model.lock:undefined;if(lock)project('#target',lock.position);else app.querySelector<HTMLElement>('#target')!.hidden=true;
    project('#home-marker',{x:destination.x,y:destination.height+8,z:destination.z},`${destination.name.toUpperCase()} · LAND & STOP`);const horde=hudHorde=model.nearestHorde();if(horde)project('#horde-marker',horde.position,`HORDE · ${Math.hypot(horde.position.x-p.x,horde.position.z-p.z).toFixed(0)} m`);else app.querySelector<HTMLElement>('#horde-marker')!.hidden=true;
    const mutant=hudMutant=model.nearestMutant(),bossPanel=app.querySelector<HTMLElement>('#boss-hud')!;
    bossPanel.hidden=!mutant||Math.hypot(mutant.position.x-p.x,mutant.position.z-p.z)>1500;
    if(mutant){const name=mutant.kind==='colossus'?'COLOSSAL MUTANT':mutant.kind==='spider'?'GIANT SIEGE SPIDER':'MUTANT BRUTE';project('#boss-marker',{...mutant.position,y:mutant.ground+mutant.height+6},`${name}${mutant.attackCharge?` · STRIKE IN ${(1-mutant.attackCharge).toFixed(1)}s`:""} · ${Math.ceil(mutant.health)} HP`);const markup=`<strong>${name}</strong><span>${Math.ceil(mutant.health).toLocaleString()} / ${mutant.maxHealth.toLocaleString()} HP</span><meter min="0" max="${mutant.maxHealth}" value="${mutant.health}"></meter><small>$${Math.round((mutant.cash+model.progress.data.levels.bounty*2)*model.progress.bonuses.cash)} · ${Math.round(mutant.xp*model.progress.bonuses.xp)} XP · close-range strikes</small>`;if(markup!==bossMarkup){bossMarkup=markup;bossPanel.innerHTML=markup;}}else app.querySelector<HTMLElement>('#boss-marker')!.hidden=true;
    for(const [id,position] of [['home',destination],['horde',horde?.position],['boss',mutant?.position]] as const){
      const contact=position?radarContact(position.x-p.x,position.z-p.z,f.heading):undefined;
      const dot=app.querySelector<HTMLElement>(`#radar-${id}`)!;dot.hidden=!contact;
      if(contact){dot.style.left=`${contact.x}%`;dot.style.top=`${contact.y}%`;}
    }
    instrumentText('#weapon-hud',`${WEAPONS[weapon].name} · ${weapon==='missile'?(model.combat.missileCooldown>0?`RELOAD ${model.combat.missileCooldown.toFixed(1)}s`:model.combat.lockReady?'LOCKED · FIRE':`LOCK ${Math.round(model.combat.lockTicks/60*100)}% · HOLD SIGHT 1s`):lock?'TARGET LOCK':aim.checked?'SEEKING TARGET':'NOSE AIM'} · 1 / 2 / 3 / 4 · M MAP`);
    const crashPanel=app.querySelector<HTMLElement>('#crash-view')!;crashPanel.hidden=!crashed;instrumentText('#crash-message',`AIRCRAFT LOST\n${f.reason}\nEarnings retained · rescue in ${Math.ceil(model.crashSeconds)} s${model.paused?' · PAUSED':''}`);
    if(terrainError||stream?.failures)hint.textContent=terrainError||'Terrain detail failed; coarse coverage and collision remain active.';else hint.textContent=model.notice|| (model.paused?'Paused · Esc to resume':crashed?'Recovery team inbound':f.grounded?'E · throttle up / S · rotate at 32–35 m/s / Q · idle & brakes':'Hunt freely · Return to the strip to bank rewards · Esc to pause');
    if(menu.open){
    const nextMenu=`${previewPlane}:${model.state}:${model.progress.revision}:${model.notice}:${model.navigationBase.id}:${model.currentBase.id}:${model.bases.map(b=>b.id).join(',')}:${model.progress.error}:${model.population.error}:${model.mutants.error}`;
    if(menu.open&&nextMenu!==menuKey){menuKey=nextMenu;
    const selected=model.plane,preview=planeDefinition(previewPlane),owned=model.progress.data.planes.includes(previewPlane),prerequisite=!preview.requires||model.progress.data.planes.includes(preview.requires),canUnlock=prerequisite&&model.progress.data.xp>=preview.xp&&model.progress.data.money>=preview.cost;
    app.querySelector('#plane-details')!.innerHTML=`<small>TIER ${preview.tier} / ${owned?'OWNED':'PREVIEW · LOCKED'}</small><h2>${preview.name}</h2><strong>${preview.role}</strong><p>${preview.description}</p><div class="plane-stats">POWER ${Math.round(preview.engine*100)} · SPEED ${Math.round(preview.speed*100)} · FIREPOWER ${Math.round(preview.damage*100)}</div>${!owned?`<p>${preview.requires?`Requires ${planeDefinition(preview.requires).name} ${prerequisite?'✓':'🔒'}<br>`:''}${model.progress.data.xp.toLocaleString()} / ${preview.xp.toLocaleString()} lifetime XP<br>${preview.cost.toLocaleString()} credits · ${model.progress.data.money>=preview.cost?'Funds ready':`${(preview.cost-model.progress.data.money).toLocaleString()} more needed`}</p><button data-unlock-plane ${canUnlock&&model.state==='hangar'?'':'disabled'}>Unlock & select ${preview.name}</button>`:`<p>${preview.id===selected.id?'SELECTED FOR NEXT RUN':'Owned aircraft'}</p>`}`;
    const next=PLANES.find(p=>!model.progress.data.planes.includes(p.id));
    app.querySelector('#next-plane')!.textContent=next?`NEXT UNLOCK · T${next.tier} ${next.name} · ${Math.min(model.progress.data.xp,next.xp).toLocaleString()}/${next.xp.toLocaleString()} XP · ${Math.min(model.progress.data.money,next.cost).toLocaleString()}/${next.cost.toLocaleString()} credits`:'AIRCRAFT COLLECTION COMPLETE · All five tiers unlocked';
    for(const card of app.querySelectorAll<HTMLButtonElement>('[data-plane]')){const id=card.dataset.plane!,has=model.progress.data.planes.includes(id as PlaneId);card.classList.toggle('selected-plane',id===previewPlane);card.setAttribute('aria-pressed',String(id===previewPlane));card.disabled=model.state!=='hangar';card.querySelector('.plane-status')!.textContent=id===selected.id?'ACTIVE':has?'OWNED · SELECT':'🔒 PREVIEW';}
    const debrief=model.progress.data.lastRun,panel=app.querySelector<HTMLElement>('#run-debrief')!;panel.hidden=!debrief;
    if(debrief)panel.innerHTML=`<small>RUN ${debrief.number} · ${debrief.outcome==='landed'?'SAFE RETURN':'RESCUED'}</small><h2>+${debrief.money.toLocaleString()} credits · +${debrief.xp.toLocaleString()} XP</h2><p>${planeDefinition(debrief.plane).name} · ${debrief.kills} kills · ${Math.floor(debrief.seconds/60)}m ${debrief.seconds%60}s<br>Earned ${debrief.baseMoney} credits / ${debrief.baseXP} XP<br>${debrief.bonus?'SAFE LANDING +100% BONUS':'Base earnings retained · land safely next run for +100%'}</p>`;
    app.querySelector('#pilot')!.textContent=`$${model.progress.data.money} BANKED · ${model.progress.data.xp} XP · PILOT LEVEL ${1+Math.floor(model.progress.data.xp/300)} · ${model.progress.skillPoints} SKILL POINTS`;
    app.querySelector('#menu-title')!.textContent=model.state==='hangar'?`Ready for run ${model.progress.data.runs+1}.`:crashed?'Recovery in progress.':'Flight paused.';
    app.querySelector('#debrief')!.textContent=model.notice||`Fly ${model.plane.name}, hunt hostiles, return and stop for +100% credits and XP. Upgrade, unlock the next aircraft, then fly again.`;
    app.querySelector('#launch')!.textContent=crashed?'Resume crash view':model.state==='hangar'?'Start engine / Take off':'Resume flight';
    const names:Record<Upgrade,string>={engine:'Engine · +12% acceleration',weapons:'Weapon research · +20% damage',bounty:'Bounty contract · +$2 per kill'};
    for(const button of app.querySelectorAll<HTMLButtonElement>('[data-upgrade]')){const id=button.dataset.upgrade as Upgrade,level=model.progress.data.levels[id],cost=model.progress.cost(id);button.textContent=`${names[id]}\nLevel ${level}/5 · ${level===5?'MAX':`$${cost}`}`;button.disabled=model.state!=='hangar'||level>=5||model.progress.data.money<cost;}
    app.querySelector('#base-name')!.textContent=`${model.currentBase.name.toUpperCase()} / ${model.currentBase.kind==='carrier'?'CARRIER FLIGHT DECK':'RUNWAY 18–36'}`;
    app.querySelector('#skill-points')!.textContent=`${model.progress.skillPoints} skill points available · 18 skills / 3 branches`;
    for(const button of app.querySelectorAll<HTMLButtonElement>('[data-skill]')){const skill=SKILLS.find(s=>s.id===button.dataset.skill)!,rank=model.progress.data.skills[skill.id]??0;button.textContent=`Rank ${rank}/${skill.max} · ${rank===skill.max?'Mastered':'Train · 1 point'}`;button.disabled=model.state!=='hangar'||rank>=skill.max||model.progress.skillPoints<1||!!skill.requires&&!(model.progress.data.skills[skill.requires]>0);}
    for(const button of app.querySelectorAll<HTMLButtonElement>('[data-shop]')){const item=SHOP.find(i=>i.id===button.dataset.shop)!,owned=model.progress.data.owned.includes(item.id),equipped=model.progress.data.equipped[item.slot]===item.id;button.textContent=equipped?'Equipped':owned?'Equip':`Buy & equip · $${item.cost.toLocaleString()}`;button.disabled=model.state!=='hangar'||equipped||!owned&&(model.progress.data.money<item.cost||!!item.requires&&!model.progress.data.owned.includes(item.requires));}
    const nextGear=model.progress.data.owned.join(',');if(nextGear!==gearKey){gearKey=nextGear;for(const select of app.querySelectorAll<HTMLSelectElement>('[data-gear]'))select.innerHTML='<option value="">Standard equipment</option>'+SHOP.filter(i=>i.slot===select.dataset.gear&&model.progress.data.owned.includes(i.id)).map(i=>`<option value="${i.id}">${i.name}</option>`).join('');}
    for(const select of app.querySelectorAll<HTMLSelectElement>('[data-gear]')){select.value=model.progress.data.equipped[select.dataset.gear as GearSlot]??'';select.disabled=model.state!=='hangar';}
    const bases=model.bases,nextBases=bases.map(b=>b.id).join(',');if(nextBases!==baseKey){baseKey=nextBases;app.querySelector<HTMLSelectElement>('#base-destination')!.innerHTML=bases.map(b=>`<option value="${b.id}">${b.name} · ${b.kind==='carrier'?'Ocean carrier':'Airfield'}</option>`).join('');}app.querySelector<HTMLSelectElement>('#base-destination')!.value=model.navigationBase.id;
    app.querySelector('#save-status')!.textContent=model.progress.error||model.population.error||model.mutants.error?'Session only · '+(model.progress.error||model.population.error||model.mutants.error):'Pilot skills, equipment, hordes and mutant damage save in this browser. Reload starts at home.';
    }
    }else menuKey='';
    const sample={flightTicks:f.ticks,runSeconds:model.runSeconds,plane:model.plane.id,displayPlane:aircraft.id,ownedPlanes:model.progress.data.planes,runs:model.progress.data.runs,lastRun:model.progress.data.lastRun,mapOpen:mapDialog.open,mapX:worldMap.x,mapZ:worldMap.z,mapSpan:worldMap.span,missileLock:model.combat.lockTicks,missiles:model.combat.missiles.length,firstPerson,cockpitLoaded:!!cockpit,loadFactor:f.loadFactor,stalled:f.stalled,assisted:f.assisted,orbit:chase.unlocked,renderPose:pose,groundShadow:{x:shadow.mesh.position.x,y:shadow.mesh.position.y,z:shadow.mesh.position.z},state:model.state,paused:model.paused,grounded:f.grounded,departed:model.departed,crashSeconds:model.crashSeconds,x:p.x,y:p.y,z:p.z,speed:f.speed,throttle:f.throttle,heading:f.heading,pitch:f.pitch,bank:f.bank,money:model.progress.data.money,xp:model.progress.data.xp,pendingMoney:model.pendingMoney,kills:model.combat.kills,residents:stream?.resident.size??0,jobs:stream?.pending??0,results:stream?.completed??0,hordes:model.population.resident.size,distantTrees:scenery.treeCount,visibleClouds:scenery.clouds.mesh.count,roadTiles:roads.count,roadsPending:roads.pending,navalParts:naval.count,mutants:model.mutants.nearby(p).length,currentBase:model.currentBase.id,skillPoints:model.progress.skillPoints,forestPending:scenery.pending,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,frameCount,lods:[0,1,2,3].map(l=>[...stream?.resident.values()??[]].filter(r=>r.spec.lod===l).length),fallbackPending:fallback.pending,coverageWorkerFailed:fallback.workerFailed,staticShadowBuilds:sunShadows.staticBuilds,shadowDepthCopies:sunShadows.depthCopies,shadowCacheFallback:sunShadows.fallback,shadowCacheError:sunShadows.lastError,settled:(stream?.settled??true)&&!fallback.pending};host.dataset.sample=JSON.stringify(sample);if(dev.checked&&menu.open&&diagnostics.closest('details')!.open)diagnostics.textContent=JSON.stringify(sample,null,2);
    }
    // Text/target discovery run at 10 Hz; projection still follows every displayed pose.
    const nav=model.navigationBase;
    project('#home-marker',{x:nav.x,y:nav.height+8,z:nav.z});
    if(hudLock&&hudLock.health>0&&!crashed)project('#target',hudLock.position);else app.querySelector<HTMLElement>('#target')!.hidden=true;
    if(hudHorde&&hudHorde.health>0)project('#horde-marker',hudHorde.position);else app.querySelector<HTMLElement>('#horde-marker')!.hidden=true;
    if(hudMutant&&hudMutant.health>0)project('#boss-marker',{x:hudMutant.position.x,y:hudMutant.ground+hudMutant.height+6,z:hudMutant.position.z});else app.querySelector<HTMLElement>('#boss-marker')!.hidden=true;
    if(!continuing)previous=undefined;profiler.mark('HUD + diagnostics');profiler.end();return continuing;
  });wake=scheduler.invalidate;resize();openMenu();wake();
  return ()=>{if(disposed)return;disposed=true;profiler.dispose();sunShadows.dispose();model.pause();scheduler.dispose();observer.disconnect();releases.forEach(r=>r());stream?.dispose();workers?.dispose();audio.dispose();cockpitRequest++;cockpit?.dispose();vapor.dispose();exhaust.dispose();rescue.dispose();fort.dispose();glare.remove();aircraft.dispose();shadow.dispose();fallback.dispose();cities.dispose();populationView.dispose();combatView.dispose();scenery.dispose();roads.dispose();naval.dispose();mutantView.dispose();terrainSurface.dispose();terrainMaterial.dispose();cube.dispose();markerMaterial.dispose();runwayMaterial.dispose();paint.dispose();hangarMaterial.dispose();roofMaterial.dispose();crashGeometry.dispose();fireMaterial.dispose();smokeMaterial.dispose();sun.dispose();scene.clear();renderer.dispose();renderer.domElement.remove();app.querySelector('#map-canvas')?.remove();};
}
const release=mount();const onHide=(e:PageTransitionEvent)=>{if(!e.persisted)release();};window.addEventListener('pagehide',onHide);if(import.meta.hot)import.meta.hot.dispose(()=>{window.removeEventListener('pagehide',onHide);release();});
