import { AmbientLight,BoxGeometry,Color,DirectionalLight,Group,Mesh,MeshStandardMaterial,PCFShadowMap,PerspectiveCamera,PlaneGeometry,Scene,WebGLRenderer } from 'three';
import { createCachedSunShadows } from '../../../src/rendering/cached-sun-shadows';
import { createFrontierClouds } from '../../../src/rendering/frontier-clouds';
import { configureFrontierMaterial } from '../../../src/rendering/frontier-material';
import { createTerrainFallback } from '../../../src/rendering/terrain-fallback';
import { airbaseSample } from '../../../src/world/airbase';
import { cropFields,regionLayout } from '../../../src/world/regional-terrain';

const renderer=new WebGLRenderer({antialias:false,preserveDrawingBuffer:true});renderer.setSize(160,120);document.body.append(renderer.domElement);renderer.shadowMap.enabled=true;renderer.shadowMap.type=PCFShadowMap;
const read=()=>{const gl=renderer.getContext(),pixels=new Uint8Array(160*120*4);gl.readPixels(0,0,160,120,gl.RGBA,gl.UNSIGNED_BYTE,pixels);return pixels;};
const compare=(a:Uint8Array,b:Uint8Array)=>{let max=0,different=0;for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);max=Math.max(max,d);if(d>2)different++;}return {max,different};};
const camera=new PerspectiveCamera(60,160/120,.1,5000),scene=new Scene();scene.background=new Color('#8296ad');
const clouds=createFrontierClouds(103);scene.add(clouds.group);clouds.update(0,0);const cloudComparisons=[],cloudCounts=[];
for(const heading of [0,1.3,3.1]){camera.position.set(0,80,0);camera.lookAt(Math.sin(heading)*2000,450,-Math.cos(heading)*2000);camera.updateMatrixWorld();scene.updateMatrixWorld();clouds.cull(camera,false);renderer.render(scene,camera);const original=read();const all=clouds.mesh.count;clouds.cull(camera);renderer.render(scene,camera);cloudComparisons.push(compare(original,read()));cloudCounts.push([all,clouds.mesh.count]);}
clouds.dispose();scene.clear();scene.add(new AmbientLight('#ffffff',2));
const terrainComparisons=[];
const fields=[];for(let bx=0;bx<8;bx++)for(let bz=-2;bz<3;bz++)fields.push(...cropFields(103,bx,bz));
const crop=fields.find(f=>!f.flower),flowers=fields.find(f=>f.flower);if(!crop||!flowers)throw new Error('Missing crop/flower parity views');
for(const [x,z] of [[(crop.minX+crop.maxX)/2,(crop.minZ+crop.maxZ)/2],[(flowers.minX+flowers.maxX)/2,(flowers.minZ+flowers.maxZ)/2],[0,144],[regionLayout(103).coast,-700],[regionLayout(103).coast-1200,-700]]){
  const materials=[new MeshStandardMaterial({vertexColors:true}),new MeshStandardMaterial({vertexColors:true})],surfaces=materials.map((m,i)=>configureFrontierMaterial(m,103,{fastPaths:i===1}));surfaces.forEach(s=>{s.updateFields(x,z);s.updateTime(1.25);});
  const fallback=createTerrainFallback(103,(px,pz)=>{const s=airbaseSample(103,px,pz);return {height:Math.max(s.height,s.water??-Infinity),color:[...s.color],waterDepth:s.water!==null?Math.max(0,s.water-s.height):1000};},128,{innerExtent:512,innerSpacing:16,drop:1,material:materials[0]});fallback.update(x,z);scene.add(fallback.mesh);
  const ground=airbaseSample(103,x,z);camera.position.set(x+50,Math.max(ground.height,ground.water??-Infinity)+100,z+100);camera.lookAt(x,Math.max(ground.height,ground.water??-Infinity),z);camera.updateMatrixWorld();renderer.render(scene,camera);const original=read();fallback.mesh.material=materials[1];renderer.render(scene,camera);terrainComparisons.push(compare(original,read()));fallback.dispose();surfaces.forEach(s=>s.dispose());materials.forEach(m=>m.dispose());
}
scene.clear();scene.background=new Color('#8296ad');scene.add(new AmbientLight('#ffffff',.5));
const sun=new DirectionalLight('#ffffff',3);sun.castShadow=true;sun.shadow.mapSize.set(128,128);Object.assign(sun.shadow.camera,{left:-240,right:240,top:240,bottom:-240,near:1,far:1600});sun.shadow.normalBias=.05;scene.add(sun,sun.target);
const material=new MeshStandardMaterial({color:'#d4c7a2'}),box=new BoxGeometry(8,15,8),groundGeometry=new PlaneGeometry(100,100),floor=new Mesh(groundGeometry,material),staticCaster=new Mesh(box,material),moving=new Mesh(box,material),dynamic=new Group();floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;staticCaster.position.set(-12,7.5,0);staticCaster.castShadow=true;moving.position.set(12,7.5,0);moving.castShadow=true;dynamic.add(moving);const world=new Group();world.add(floor,staticCaster,dynamic);scene.add(world);
const cache=createCachedSunShadows(renderer,scene,sun,[dynamic]);sun.shadow.mapSize.set(128,128);camera.position.set(45,60,70);camera.lookAt(0,0,0);camera.updateMatrixWorld();
const shadowComparisons=[],buildCounts=[];
for(let i=0;i<7;i++){
  if(i===1)moving.position.x=20;if(i===2)staticCaster.position.z=12;if(i===3)staticCaster.visible=false;if(i===4){const added=new Mesh(box,material);added.castShadow=true;added.position.set(25,7.5,-15);world.add(added);}if(i===6){world.position.x=-4096;camera.position.x-=4096;camera.lookAt(-4096,0,0);camera.updateMatrixWorld();}
  cache.update(i>=5?40:0,0,i===6?-4096:0,0);scene.updateMatrixWorld();renderer.render(scene,camera);const cached=read();buildCounts.push(cache.staticBuilds);
  cache.enabled=false;renderer.render(scene,camera);const normal=read();cache.enabled=true;shadowComparisons.push(compare(cached,normal));
}
// Out-of-region streaming must not invalidate cached depth; entering must.
const outside=new Mesh(box,material);outside.castShadow=true;outside.position.set(10000,7.5,0);world.add(outside);
for(let i=0;i<3;i++){
  if(i===1)outside.position.x+=100;if(i===2)outside.position.set(0,7.5,20);
  cache.update(40,0,-4096,0);scene.updateMatrixWorld();renderer.render(scene,camera);const cached=read();buildCounts.push(cache.staticBuilds);
  cache.enabled=false;renderer.render(scene,camera);cache.enabled=true;shadowComparisons.push(compare(cached,read()));
}
const shadowCacheFallback=cache.fallback,depthCopies=cache.depthCopies;cache.dispose();sun.dispose();material.dispose();box.dispose();groundGeometry.dispose();
Object.assign(window,{renderOptimizations:{ready:true,cloudComparisons,cloudCounts,terrainComparisons,shadowComparisons,buildCounts,shadowCacheFallback,shadowCacheError:cache.lastError,depthCopies}});
addEventListener('pagehide',()=>renderer.dispose(),{once:true});
