import { ACESFilmicToneMapping,Color,DirectionalLight,Fog,HemisphereLight,PerspectiveCamera,Scene,WebGLRenderer,type InstancedMesh } from 'three';
import { createFrontierScenery } from '../../../src/rendering/frontier-scenery';
import { createTerrainFallback } from '../../../src/rendering/terrain-fallback';
import { configureFrontierMaterial } from '../../../src/rendering/frontier-material';
import { MeshStandardMaterial } from 'three';
import { SettlementWorld } from '../../../src/world/settlements';
import { regionalSample } from '../../../src/world/regional-terrain';
import { airbaseSample } from '../../../src/world/airbase';

declare global { interface Window { cropStats:{trees:number;farTrees:number;tiles:number;calls:number;triangles:number;pending:boolean;cropPixels:number} } }
const seed=103,p={x:160,z:-650},ground=regionalSample(seed,p.x,p.z).height;
const renderer=new WebGLRenderer({antialias:true});renderer.setPixelRatio(1);renderer.setSize(800,500);renderer.toneMapping=ACESFilmicToneMapping;document.body.append(renderer.domElement);
const scene=new Scene();scene.background=new Color('#b6cbd0');scene.fog=new Fog('#b6cbd0',650,1650);
const sun=new DirectionalLight('#ffe8cb',2.4);sun.position.set(-300,500,120);scene.add(sun,new HemisphereLight('#d7efff','#616845',1.4));
const material=new MeshStandardMaterial({vertexColors:true,roughness:1});const surface=configureFrontierMaterial(material,seed);surface.updateFields(p.x,p.z);
const terrain=createTerrainFallback(seed,(x,z)=>{const s=airbaseSample(seed,x,z);return {height:Math.max(s.height,s.water??-Infinity),color:[...s.color]};},128,{innerExtent:512,innerSpacing:16,drop:1,material});terrain.update(p.x,p.z);scene.add(terrain.mesh);
const scenery=createFrontierScenery(seed,new SettlementWorld(seed));scene.add(scenery.group);scenery.update(p.x,ground+45,p.z);
while(scenery.pending)await new Promise(resolve=>setTimeout(resolve,16));
const camera=new PerspectiveCamera(62,1.6,.2,2500);camera.position.set(p.x+440,ground+310,p.z-430);camera.lookAt(p.x+150,40,p.z+600);renderer.render(scene,camera);
const gl=renderer.getContext(),cultivated=new Uint8Array(800*500*4),plain=new Uint8Array(cultivated.length);
gl.readPixels(0,0,800,500,gl.RGBA,gl.UNSIGNED_BYTE,cultivated);
surface.updateFields(100000,100000);renderer.render(scene,camera);gl.readPixels(0,0,800,500,gl.RGBA,gl.UNSIGNED_BYTE,plain);
let cropPixels=0;for(let i=0;i<plain.length;i+=4)if(Math.abs(plain[i]-cultivated[i])+Math.abs(plain[i+1]-cultivated[i+1])+Math.abs(plain[i+2]-cultivated[i+2])>12)cropPixels++;
surface.updateFields(p.x,p.z);renderer.render(scene,camera);
const tiles=scenery.group.children[2].children as InstancedMesh[];let farTrees=0;
for(const tile of tiles)for(let i=0;i<tile.count;i++){const a=tile.instanceMatrix.array,d=Math.hypot(a[i*16+12]+tile.position.x-p.x,a[i*16+14]+tile.position.z-p.z);if(d>=500&&d<=1200)farTrees++;}
window.cropStats={cropPixels,trees:scenery.treeCount,farTrees,tiles:tiles.length,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,pending:scenery.pending};
addEventListener('pagehide',()=>{scenery.dispose();terrain.dispose();surface.dispose();material.dispose();renderer.dispose();},{once:true});
