import { BoxGeometry, Color, DirectionalLight, HemisphereLight, MeshStandardMaterial, PerspectiveCamera, Raycaster, Scene, Vector2, Vector3, WebGLRenderer } from 'three';
import { bindInput } from '../../src/engine/input';
import { Combat, WEAPONS, type WeaponId } from '../../src/combat/weapons';
import { WeaponAudio } from '../../src/combat/audio';
import { HordeStore,TOTAL_POPULATION,groupId } from '../../src/hordes/state';
import { Hordes } from '../../src/hordes/hordes';
import { createHordeView } from '../../src/rendering/horde-view';
import { createCombatView } from '../../src/rendering/combat-view';
import { ChunkStream } from '../../src/streaming/chunk-stream';
import { createTerrainWorkers } from '../../src/streaming/worker-pool';
import { heightAt,wantedChunks,type TerrainData } from '../../src/streaming/terrain-data';
import { attachTerrain } from '../../src/rendering/streamed-terrain';
import type { StorageLike } from '../../src/persistence/chunk-deltas';
import '../../src/ui/style.css';
const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=`<header><a class="brand" href="/">MVW / DEVELOPMENT</a><nav aria-label="Workspace"><a href="/">Game</a><a href="/tools/hordes/" aria-current="page">Horde lab</a><a href="/tools/weapons/">Weapons lab</a><a href="/tools/flight/">Flight lab</a><a href="/tools/streaming/">Streaming lab</a></nav></header><main><section class="intro"><p class="eyebrow">PHASE 11 / HORDES</p><h1>Horde lab</h1><p>Seeded population · three simulation tiers · durable clearance</p></section><section class="controls" aria-label="Horde controls"><button id="start">Start / Resume</button><button id="pause">Pause</button><button id="near">Near view / Home</button><button id="medium">Medium view</button><button id="far">Far view</button><button id="east">Travel east 256 m</button><label>World seed <input id="seed" type="number" value="103" min="0" max="4294967295"></label><button id="load">Load seed</button><label>Weapon <select id="weapon" aria-label="Weapon"><option value="minigun">Minigun</option><option value="autocannon">Autocannon</option><option value="shell">Explosive shell</option></select></label><label><input id="track" type="checkbox" checked> Track first home survivor</label><button id="sound">Enable sound</button><p>Focus scene · WASD / arrows move observer · hold Space to fire. Tracking aims at the first living member of home encounter 0,0; uncheck to aim with the pointer. Near / Medium / Far move the observer to inspect home tiers. Travel unloads encounters; Home and reload preserve wounds and kills. No reset respawns the population; another seed creates a separate world.</p><p>Near: 60 Hz zombie meshes · Medium: 10 Hz boxes · Far: 1 Hz group proxies. Walls guide a coarse patrol route; individual near agents also separate locally. Population is a bounded 9 × 9 encounter test region, 32 members each.</p><p id="stats" role="group" aria-label="Horde diagnostics"></p><p id="combat" role="group" aria-label="Combat diagnostics"></p><p id="save" role="group" aria-label="Population save status"></p><p id="audio" role="group" aria-label="Audio status">Muted</p></section><section class="viewport" tabindex="0" aria-label="Horde scene"></section><footer><p role="status">Starting horde lab…</p><span>OBSERVER LAB · STATIC WORLD</span></footer></main>`;
const host=app.querySelector<HTMLElement>('.viewport')!,status=app.querySelector<HTMLElement>('[role=status]')!,stats=app.querySelector<HTMLElement>('#stats')!,combatStats=app.querySelector<HTMLElement>('#combat')!;
function mount(){
  let renderer:WebGLRenderer;try{renderer=new WebGLRenderer({antialias:true});}catch{status.textContent='WebGL 2 unavailable.';app.querySelectorAll('button,input,select').forEach(b=>(b as HTMLButtonElement).disabled=true);return ()=>{};}
  host.append(renderer.domElement);const scene=new Scene();scene.background=new Color('#aebec0');const sun=new DirectionalLight('#ffdfb2',2.6);sun.position.set(-30,60,20);scene.add(sun,new HemisphereLight('#d9ebf2','#687052',2));
  const camera=new PerspectiveCamera(50,1,.2,400),terrainMaterial=new MeshStandardMaterial({vertexColors:true,roughness:1}),markerGeometry=new BoxGeometry(1,1,1),markerMaterial=new MeshStandardMaterial();
  let workers:ReturnType<typeof createTerrainWorkers>;
  try{workers=createTerrainWorkers();}catch{renderer.dispose();renderer.domElement.remove();terrainMaterial.dispose();markerGeometry.dispose();markerMaterial.dispose();status.textContent='Terrain workers unavailable.';app.querySelectorAll('button,input,select').forEach(b=>(b as HTMLButtonElement).disabled=true);return ()=>{};}
  let storage:StorageLike|undefined;try{storage=localStorage;}catch{/* Store reports session-only. */}
  let seed=103,store=new HordeStore(seed,storage),hordes=new Hordes(store,(x,z)=>heightAt(seed,x,z));
  let view=createHordeView(hordes),combat=new Combat([],hordes.ground,128,{index:hordes,blocker:hordes.blocker,onDamage:t=>hordes.damaged(t)}),effects=createCombatView(combat);scene.add(view.group,effects.group);
  const createStream=()=>new ChunkStream<TerrainData,ReturnType<typeof attachTerrain>>(workers.load,(spec,data)=>{const r=attachTerrain(spec,data,terrainMaterial,markerGeometry,markerMaterial,true);scene.add(r.group);return r;});let stream=createStream();
  const observer={x:16,y:0,z:16},input=bindInput(host),audio=new WeaponAudio(),listeners:(()=>void)[]=[],pointer=new Vector2(0,0),ray=new Raycaster(),direction=new Vector3();let weapon:WeaponId='minigun',running=false,previous:number|undefined,accumulator=0,dropped=0,heard=0,disposed=false,frame=0,lastReport=0,notice='';
  const listen=(target:EventTarget,type:string,fn:EventListener)=>{target.addEventListener(type,fn);listeners.push(()=>target.removeEventListener(type,fn));};
  const pause=()=>{running=false;input.clear();audio.stop();accumulator=0;previous=undefined;hordes.checkpoint();};
  const bind=(id:string,action:()=>void)=>listen(app.querySelector(`#${id}`)!,'click',action);
  bind('start',()=>{running=true;previous=undefined;host.focus();});bind('pause',pause);
  const travel=(x:number,z:number)=>{pause();observer.x=x;observer.z=z;hordes.update(observer);hordes.checkpoint();};
  bind('near',()=>travel(16,16));bind('medium',()=>travel(80,16));bind('far',()=>travel(120,16));bind('east',()=>travel(Math.min(130900,observer.x+256),observer.z));
  bind('load',()=>{const field=app.querySelector<HTMLInputElement>('#seed')!,candidate=Number(field.value);if(field.value.trim()===''||!Number.isInteger(candidate)||candidate<0||candidate>4294967295){notice='Seed must be a whole uint32 number.';return;}
    let replacement:ReturnType<typeof createTerrainWorkers>;try{replacement=createTerrainWorkers();}catch{notice='Terrain workers unavailable; previous world retained.';return;}
    pause();stream.dispose();workers.dispose();view.dispose();effects.dispose();workers=replacement;seed=candidate;store=new HordeStore(seed,storage);hordes=new Hordes(store,(x,z)=>heightAt(seed,x,z));view=createHordeView(hordes);combat=new Combat([],hordes.ground,128,{index:hordes,blocker:hordes.blocker,onDamage:t=>hordes.damaged(t)});effects=createCombatView(combat);scene.add(view.group,effects.group);stream=createStream();observer.x=observer.z=16;heard=0;dropped=0;notice='';
  });
  bind('sound',()=>{void audio.toggle().then(()=>{if(!disposed)app.querySelector('#sound')!.textContent=audio.muted?'Enable sound':'Mute sound';});});
  listen(app.querySelector('#weapon')!,'change',()=>{weapon=app.querySelector<HTMLSelectElement>('#weapon')!.value as WeaponId;input.clear();});
  listen(host,'pointermove',e=>{const p=e as PointerEvent,b=host.getBoundingClientRect();pointer.set((p.clientX-b.left)/b.width*2-1,-(p.clientY-b.top)/b.height*2+1);});
  listen(host,'blur',pause);listen(window,'blur',pause);listen(document,'visibilitychange',pause);
  const resize=()=>{renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(Math.max(1,host.clientWidth),Math.max(1,host.clientHeight));camera.aspect=host.clientWidth/Math.max(1,host.clientHeight);camera.updateProjectionMatrix();};const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);resize();
  const animate=(now:number)=>{if(disposed)return;const dt=previous===undefined?0:Math.max(0,(now-previous)/1000);previous=now;
    hordes.update(observer);const held=input.sample();
    camera.position.set(observer.x+30,heightAt(seed,observer.x,observer.z)+48,observer.z+40);camera.lookAt(observer.x,heightAt(seed,observer.x,observer.z),observer.z);camera.updateMatrixWorld();
    if(running){const accepted=Math.min(dt,8/60);dropped+=dt-accepted;accumulator+=accepted;
      while(accumulator+1e-10>=1/60){accumulator-=1/60;const length=Math.max(1,Math.hypot(held.x,held.z));observer.x=Math.max(-130900,Math.min(130900,observer.x+held.x/length*80/60));observer.z=Math.max(-130900,Math.min(130900,observer.z+held.z/length*80/60));hordes.step(observer);
        const tracked=app.querySelector<HTMLInputElement>('#track')!.checked,first=tracked?hordes.firstSurvivor():undefined;
        if(first)direction.set(first.position.x-camera.position.x,first.position.y-camera.position.y,first.position.z-camera.position.z).normalize();else{ray.setFromCamera(pointer,camera);direction.copy(ray.ray.direction);}
        combat.step(held.pulse&&(!tracked||first!==undefined),weapon,camera.position,direction);
      }
    }
    store.flush();if(combat.shots!==heard){heard=combat.shots;audio.play(WEAPONS[combat.lastWeapon].sound);}if(!running)audio.stop();
    view.update();effects.update();stream.update(wantedChunks(seed,observer.x,observer.z));renderer.render(scene,camera);
    if(now-lastReport>100){lastReport=now;const home=store.get(0,0),counts=hordes.counts,tiers=view.counts;const sample={seed,running,x:observer.x,z:observer.z,ticks:hordes.ticks,dropped,total:TOTAL_POPULATION,killed:store.killed,alive:TOTAL_POPULATION-store.killed,cleared:store.cleared,resident:hordes.resident.size,counts,rendered:tiers,homeTier:hordes.resident.get(groupId(0,0))?.tier??'unloaded',homeAlive:home.health.filter(h=>h>0).length,homeHealth:home.health,homeProgress:home.progress,nearUpdates:hordes.nearUpdates,mediumUpdates:hordes.mediumUpdates,farUpdates:hordes.farUpdates,terrain:stream.resident.size,jobs:stream.pending,results:stream.completed,settled:stream.settled,geometries:renderer.info.memory.geometries,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,records:store.groups.size};stats.dataset.sample=JSON.stringify(sample);stats.textContent=`${running?'running':'paused'} · alive ${sample.alive}/${TOTAL_POPULATION} · killed ${sample.killed} · cleared groups ${sample.cleared}/81 · resident ${sample.resident}/49 · near/medium/far ${counts.near}/${counts.medium}/${counts.far} · individual live agents ${counts.individuals} · rendered ${tiers.near}/${tiers.medium}/${tiers.far} · home ${sample.homeTier}: ${sample.homeAlive}/32 · ${sample.geometries} geometries / ${sample.calls} calls / ${sample.triangles} triangles`;
      const cs={shots:combat.shots,hits:combat.hits,kills:combat.kills,damage:combat.damage,blasts:combat.blasts,effects:combat.effects.filter(e=>e.active).length,queryMembers:hordes.lastQueryMembers,voices:audio.activeVoices};combatStats.dataset.sample=JSON.stringify(cs);combatStats.textContent=`${WEAPONS[weapon].name} · ${cs.shots} shots · ${cs.hits} damaging hits · ${cs.damage.toFixed(0)} damage · ${cs.blasts} blasts · effects ${cs.effects}/128 · voices ${cs.voices}/8 · last query examined ${cs.queryMembers} slots`;
      app.querySelector('#save')!.textContent=store.error?`Session only: ${store.error}. Existing saved bytes are preserved.`:`Saved locally · seed ${seed} · wounds, clearance and formation progress retained`;
      app.querySelector('#audio')!.textContent=audio.state;status.textContent=notice||stream.lastError||`${running?'Running':'Paused'} · ${stream.settled?'Terrain ready':'Terrain loading; authoritative population and collision available'}`;
    }frame=requestAnimationFrame(animate);
  };frame=requestAnimationFrame(animate);
  return ()=>{if(disposed)return;disposed=true;pause();cancelAnimationFrame(frame);resizeObserver.disconnect();listeners.forEach(r=>r());input.dispose();audio.dispose();view.dispose();effects.dispose();stream.dispose();workers.dispose();terrainMaterial.dispose();markerGeometry.dispose();markerMaterial.dispose();scene.clear();renderer.dispose();renderer.domElement.remove();};
}
const release=mount();const dispose=()=>{window.removeEventListener('pagehide',onHide);release();};const onHide=(e:PageTransitionEvent)=>{if(!e.persisted)dispose();};window.addEventListener('pagehide',onHide);if(import.meta.hot)import.meta.hot.dispose(dispose);
