import { createFrontierSettlements } from '../../../src/rendering/frontier-settlements';
import { ACESFilmicToneMapping,BoxGeometry,Color,DirectionalLight,Fog,HemisphereLight,MeshStandardMaterial,PerspectiveCamera,Scene,WebGLRenderer } from 'three';
import { createTerrainFallback } from '../../../src/rendering/terrain-fallback';
import { configureFrontierMaterial } from '../../../src/rendering/frontier-material';
import { createFrontierRoads } from '../../../src/rendering/frontier-roads';
import { createFrontierScenery } from '../../../src/rendering/frontier-scenery';
import { createNavalView } from '../../../src/rendering/naval-view';
import { createMutantView } from '../../../src/rendering/mutant-view';
import { NavalWorld } from '../../../src/world/naval';
import { Mutants } from '../../../src/hordes/mutants';
import { SettlementWorld } from '../../../src/world/settlements';
import { airbaseSample } from '../../../src/world/airbase';
declare global {interface Window { expansionView:{ready:boolean;roadTiles:number;shipParts:number;mutants:number} }}
const kind=new URL(location.href).searchParams.get('view')??'fields',seed=103,navy=new NavalWorld(seed),mutants=new Mutants(seed),world=new SettlementWorld(seed);
const p=kind==='navy'?{x:navy.flagship.x,z:navy.flagship.z}:kind==='boss'?mutants.landmark.position:{x:160,z:-650};
const renderer=new WebGLRenderer({antialias:true});renderer.setPixelRatio(1);renderer.setSize(1000,650);renderer.toneMapping=ACESFilmicToneMapping;document.body.style.margin='0';document.body.append(renderer.domElement);
const scene=new Scene();scene.background=new Color('#b6cbd0');scene.fog=new Fog('#b6cbd0',900,2100);
const sun=new DirectionalLight('#ffe8cb',2.4);sun.position.set(-300,500,120);scene.add(sun,new HemisphereLight('#d7efff','#616845',1.4));
const material=new MeshStandardMaterial({vertexColors:true,roughness:1}),surface=configureFrontierMaterial(material,seed);surface.updateFields(p.x,p.z);
const terrain=createTerrainFallback(seed,(x,z)=>{const s=airbaseSample(seed,x,z);return {height:Math.max(s.height,s.water??-Infinity),color:[...s.color]};},128,{innerExtent:768,innerSpacing:16,drop:1,material});terrain.update(p.x,p.z);scene.add(terrain.mesh);
const cube=new BoxGeometry(1,1,1),ships=createNavalView(navy,cube),bosses=createMutantView(mutants,cube),roads=createFrontierRoads(world),cities=createFrontierSettlements(world),scenery=createFrontierScenery(seed,world);scene.add(ships.group,bosses.group,roads.group,cities.group,scenery.group);
cities.update(p.x,p.z);ships.update(p.x,p.z);bosses.update(p.x,p.z);roads.update(p.x,p.z);scenery.update(p.x,200,p.z);
while(roads.pending||scenery.pending)await new Promise(resolve=>setTimeout(resolve,16));
const camera=new PerspectiveCamera(58,1000/650,.2,3000);
if(kind==='navy'){camera.position.set(p.x+500,400,p.z+620);camera.lookAt(p.x,0,p.z-40);}
else if(kind==='boss'){camera.position.set(p.x+150,mutants.landmark.ground+140,p.z-260);camera.lookAt(p.x,mutants.landmark.ground+55,p.z);}
else {camera.position.set(p.x+440,360,p.z-430);camera.lookAt(p.x+150,40,p.z+600);}
renderer.render(scene,camera);window.expansionView={ready:true,roadTiles:roads.count,shipParts:ships.count,mutants:mutants.nearby({x:p.x,y:0,z:p.z}).length};
addEventListener('pagehide',()=>{roads.dispose();cities.dispose();scenery.dispose();ships.dispose();bosses.dispose();terrain.dispose();surface.dispose();material.dispose();cube.dispose();renderer.dispose();},{once:true});
