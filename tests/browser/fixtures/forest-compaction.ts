import { createCachedSunShadows } from '../../../src/rendering/cached-sun-shadows';
import { AmbientLight,BoxGeometry,Color,DirectionalLight,Group,Mesh,MeshStandardMaterial,PCFShadowMap,PerspectiveCamera,PlaneGeometry,Scene,WebGLRenderer } from 'three';
import { createFrontierForest } from '../../../src/rendering/frontier-forest';
import { SettlementWorld } from '../../../src/world/settlements';
import { regionalLandmarks } from '../../../src/world/regional-terrain';
import { airbaseSample } from '../../../src/world/airbase';
const renderer=new WebGLRenderer({antialias:false,preserveDrawingBuffer:true});renderer.setSize(240,180);renderer.shadowMap.enabled=true;renderer.shadowMap.type=PCFShadowMap;document.body.append(renderer.domElement);
const seed=103,p=regionalLandmarks(seed).Forest,ground=airbaseSample(seed,p.x,p.z).height,settlements=new SettlementWorld(seed),cube=new BoxGeometry();
const compact=createFrontierForest(seed,settlements,cube),reference=createFrontierForest(seed,settlements,cube,()=>{},{compactInstances:false});
const scene=new Scene(),world=new Group(),sun=new DirectionalLight('#ffffff',3);scene.background=new Color('#8296ad');world.position.set(-p.x,0,-p.z);world.add(compact.group,reference.group);scene.add(world,sun,sun.target,new AmbientLight('#ffffff',.6));sun.position.set(150,ground+400,200);sun.target.position.set(0,ground,0);sun.castShadow=true;sun.shadow.mapSize.set(256,256);Object.assign(sun.shadow.camera,{left:-400,right:400,top:400,bottom:-400,far:1200});sun.shadow.camera.updateProjectionMatrix();
const plane=new PlaneGeometry(2000,2000),material=new MeshStandardMaterial({color:'#817852'}),floor=new Mesh(plane,material);floor.rotation.x=-Math.PI/2;floor.position.y=ground-1;floor.receiveShadow=true;scene.add(floor);
const camera=new PerspectiveCamera(60,4/3,.1,3000);camera.position.set(230,ground+140,260);camera.lookAt(0,ground,0);camera.updateMatrixWorld();
const x=Math.floor(p.x/32),z=Math.floor(p.z/32),residents=Array.from({length:225},(_,i)=>({spec:{seed,x:x+i%15-7,z:z+Math.floor(i/15)-7,lod:1 as const}}));
compact.update(p.x,p.z,residents);reference.update(p.x,p.z,residents);
while(compact.pending||reference.pending)await new Promise(resolve=>setTimeout(resolve,10));
const cache=createCachedSunShadows(renderer,scene,sun,[],new Set([...compact.shadowCasters,...reference.shadowCasters]));sun.shadow.mapSize.set(256,256);
const read=()=>{const gl=renderer.getContext(),pixels=new Uint8Array(240*180*4);gl.readPixels(0,0,240,180,gl.RGBA,gl.UNSIGNED_BYTE,pixels);return pixels;};
function render(useCompact:boolean){cache.update(p.x,p.z,world.position.x,world.position.z);compact.group.visible=useCompact;reference.group.visible=!useCompact;scene.updateMatrixWorld();sun.shadow.updateMatrices(sun);for(const f of [compact,reference])f.selectGeometry(camera,sun.shadow.getFrustum());renderer.render(scene,camera);return {pixels:read(),triangles:renderer.info.render.triangles,calls:renderer.info.render.calls};}
const comparisons=[];
for(const phase of ['hidden','restored','hidden again','rebased']){
  if(phase==='restored'){compact.update(p.x,p.z);reference.update(p.x,p.z);}
  if(phase==='hidden again'){compact.update(p.x,p.z,residents);reference.update(p.x,p.z,residents);}
  if(phase==='rebased'){world.position.x-=4096;camera.position.x-=4096;camera.lookAt(-4096,ground,0);camera.updateMatrixWorld();sun.position.x-=4096;sun.target.position.x-=4096;floor.position.x-=4096;}
  const a=render(false),b=render(true);let max=0;for(let i=0;i<a.pixels.length;i++)max=Math.max(max,Math.abs(a.pixels[i]-b.pixels[i]));comparisons.push({phase,max,referenceTriangles:a.triangles,compactTriangles:b.triangles,referenceCalls:a.calls,compactCalls:b.calls,stats:compact.stats,visibleProxies:[...compact.shadowCasters,...reference.shadowCasters].filter(m=>m.visible).length});
}
Object.assign(window,{forestCompaction:{ready:true,comparisons}});
addEventListener('pagehide',()=>{compact.dispose();reference.dispose();cube.dispose();plane.dispose();material.dispose();sun.dispose();cache.dispose();renderer.dispose();},{once:true});
