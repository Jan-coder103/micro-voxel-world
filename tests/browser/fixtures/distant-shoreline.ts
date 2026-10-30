import { AmbientLight,BufferAttribute,Mesh,MeshStandardMaterial,OrthographicCamera,PlaneGeometry,Scene,WebGLRenderer } from 'three';
import { configureFrontierMaterial } from '../../../src/rendering/frontier-material';

declare global { interface Window { shorelinePixels:Record<string,number[][]> } }
window.shorelinePixels={};
for(const sharp of [false,true]){
  const renderer=new WebGLRenderer({antialias:false,preserveDrawingBuffer:true});renderer.setSize(512,160);renderer.setPixelRatio(1);
  const name=sharp?'sharp':'reference';renderer.domElement.dataset.shoreline=name;document.body.append(renderer.domElement);
  const geometry=new PlaneGeometry(2048,512,1,1);geometry.rotateX(-Math.PI/2);
  const colors:number[]=[];
  for(let i=0;i<geometry.getAttribute('position').count;i++)colors.push(...(geometry.getAttribute('position').getX(i)<0?[.10,.36,.49]:[.62,.57,.37]));
  geometry.setAttribute('color',new BufferAttribute(new Float32Array(colors),3));
  const material=new MeshStandardMaterial({vertexColors:true,roughness:1});if(sharp)configureFrontierMaterial(material,103);
  const scene=new Scene();scene.add(new AmbientLight('#ffffff',Math.PI),new Mesh(geometry,material));
  const camera=new OrthographicCamera(-1024,1024,256,-256,1,4000);camera.position.set(0,2000,0);camera.up.set(0,0,-1);camera.lookAt(0,0,0);
  renderer.render(scene,camera);
  const gl=renderer.getContext(),pixels=new Uint8Array(512*4);gl.readPixels(0,80,512,1,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
  window.shorelinePixels[name]=Array.from({length:512},(_,i)=>Array.from(pixels.slice(i*4,i*4+3)));
  addEventListener('pagehide',()=>{geometry.dispose();material.dispose();renderer.dispose();},{once:true});
}
