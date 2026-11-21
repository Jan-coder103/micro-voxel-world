import { AmbientLight,Color,Group,InstancedMesh,MeshStandardMaterial,PerspectiveCamera,Scene,WebGLRenderer } from 'three';
import { configureTreeMorph,createFarTreeGeometry,createMorphTreeGeometry } from '../../../src/rendering/tree-morph';
import { createFrontierClouds } from '../../../src/rendering/frontier-clouds';
const width=320,height=240,renderer=new WebGLRenderer({antialias:false,preserveDrawingBuffer:true});renderer.setSize(width,height);
const scene=new Scene(),camera=new PerspectiveCamera(60,width/height,.1,5000);scene.background=new Color('#8296ad');
const read=()=>{const gl=renderer.getContext(),a=new Uint8Array(width*height*4);gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,a);return a;};
const diff=(a:Uint8Array,b:Uint8Array)=>{let sum=0,max=0;for(let i=0;i<a.length;i++){if(i%4===3)continue;const d=Math.abs(a[i]-b[i]);sum+=d;max=Math.max(max,d);}return {mean:sum/(width*height*3),max};};
const capture=(label:string)=>{const c=document.createElement('canvas');c.width=width;c.height=height;c.getContext('2d')!.drawImage(renderer.domElement,0,0);const div=document.createElement('div');div.style.display='inline-block';div.append(label,c);document.body.append(div);};
const cloudDiffs=[];
for(const heading of [0,1.3,3.1]){
  camera.position.set(0,80,0);camera.lookAt(Math.sin(heading)*2000,450,-Math.cos(heading)*2000);camera.updateMatrixWorld();let original:Uint8Array|undefined;
  for(const textureNoise of [false,true]){const clouds=createFrontierClouds(103,{textureNoise});scene.add(clouds.group);clouds.update(0,0);scene.updateMatrixWorld();clouds.cull(camera);renderer.render(scene,camera);const pixels=read();capture(`${heading}: ${textureNoise?'texture':'procedural'}`);if(original)cloudDiffs.push(diff(original,pixels));else original=pixels;clouds.dispose();}
}
scene.add(new AmbientLight('#ffffff',2));
const detail=createMorphTreeGeometry(),far=createFarTreeGeometry(),material=new MeshStandardMaterial({color:'#294a1f'});configureTreeMorph(material);
const mesh=new InstancedMesh(detail,material,1),pose=new Group();pose.scale.set(90,180,90);pose.updateMatrix();mesh.setMatrixAt(0,pose.matrix);scene.add(mesh);camera.position.set(0,0,850);camera.lookAt(0,0,0);camera.updateMatrixWorld();renderer.render(scene,camera);const original=read();capture('morphed tree');const detailTriangles=renderer.info.render.triangles;mesh.geometry=far;renderer.render(scene,camera);const treeDiff=diff(original,read()),farTriangles=renderer.info.render.triangles;capture('single box');
scene.matrixWorldAutoUpdate=false;scene.updateMatrixWorld();renderer.render(scene,camera);const matrixDiff=diff(read(),(()=>{scene.matrixWorldAutoUpdate=true;renderer.render(scene,camera);return read();})());
Object.assign(window,{followups:{cloudDiffs,treeDiff,detailTriangles,farTriangles,matrixDiff}});
mesh.dispose();detail.dispose();far.dispose();material.dispose();renderer.dispose();
