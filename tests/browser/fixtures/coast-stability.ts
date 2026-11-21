import {AmbientLight,Color,DataTexture,FloatType,Mesh,MeshStandardMaterial,OrthographicCamera,PlaneGeometry,RGBAFormat,Scene,ShaderMaterial,Vector2,WebGLRenderer} from 'three';
import {SHORELINE_FIELD_GLSL} from '../../../src/rendering/shoreline-field';
import {configureFrontierMaterial} from '../../../src/rendering/frontier-material';
import {createTerrainFallback} from '../../../src/rendering/terrain-fallback';
import {attachTerrain} from '../../../src/rendering/streamed-terrain';
import {generateTerrain,type Lod} from '../../../src/streaming/terrain-data';
import {airbaseSample} from '../../../src/world/airbase';
import {regionalHash,regionalSample,regionLayout} from '../../../src/world/regional-terrain';
declare global {interface Window {coastStability:{ready:boolean;maxHeightError:number;wetMismatches:number;heightErrors:unknown[];waterPixels:number;movingMaskDifferences:number[];lodMaskDifferences:number[]}}}
const renderer=new WebGLRenderer({antialias:false,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(256,128);document.body.style.margin='0';document.body.append(renderer.domElement);
let maxHeightError=0,wetMismatches=0;const heightErrors:unknown[]=[];
for(const seed of [0,103,12012,4294967295]){
  const layout=regionLayout(seed),points:{x:number;z:number}[]=[];
  for(const z of [-1100,-700,0,700]){
    let x=layout.coast-100;while(x<layout.coast+1400&&regionalSample(seed,x,z).water===0)x+=2;
    for(const dx of [-30,-10,-1,-.1,.1,1,10,30])points.push({x:x+dx,z});
  }
  const pixels=new Float32Array(points.length*4);points.forEach((p,i)=>pixels.set([p.x,p.z,0,0],i*4));
  const texture=new DataTexture(pixels,points.length,1,RGBAFormat,FloatType),scene=new Scene(),geometry=new PlaneGeometry(2,2);
  texture.needsUpdate=true;
  const material=new ShaderMaterial({uniforms:{testPoints:{value:texture},pointCount:{value:points.length},shorelineSeed:{value:seed>>>0},shorelineLayout:{value:new Vector2(layout.coast,layout.lakeX)},shorelinePhase:{value:regionalHash(seed,0,0,99)*6.28}},vertexShader:'void main(){gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`uniform sampler2D testPoints;uniform float pointCount;${SHORELINE_FIELD_GLSL}
    void main(){vec2 p=texture2D(testPoints,vec2(gl_FragCoord.x/pointCount,.5)).xy;float h=shorelineHeight(p),v=(h+128.)/512.;vec3 enc=fract(v*vec3(1.,255.,65025.));enc.xy-=enc.yz/255.;gl_FragColor=vec4(enc,1.);}`});
  scene.add(new Mesh(geometry,material));renderer.setSize(points.length,1);renderer.render(scene,new OrthographicCamera());
  const gl=renderer.getContext(),out=new Uint8Array(points.length*4);gl.readPixels(0,0,points.length,1,gl.RGBA,gl.UNSIGNED_BYTE,out);
  points.forEach((p,i)=>{const h=(out[i*4]/255+out[i*4+1]/65025+out[i*4+2]/16581375)*512-128,s=regionalSample(seed,p.x,p.z);maxHeightError=Math.max(maxHeightError,Math.abs(h-s.height));if(Math.abs(h-s.height)>.1&&heightErrors.length<8)heightErrors.push({seed,p,h,cpu:s.height,bytes:[...out.slice(i*4,i*4+3)]});if((h<0)!==(s.water===0))wetMismatches++;});
  geometry.dispose();material.dispose();texture.dispose();
}
renderer.setSize(256,128);
const seed=103,z=-700,layout=regionLayout(seed);let shore=layout.coast;while(regionalSample(seed,shore,z).water===0)shore+=1;
const material=new MeshStandardMaterial({vertexColors:true,roughness:1}),surface=configureFrontierMaterial(material,seed,{waterEffects:false});surface.updateFields(shore,z);
const fallback=createTerrainFallback(seed,(x,z)=>{const s=airbaseSample(seed,x,z);return {height:Math.max(s.height,s.water??-Infinity),color:[...s.color],waterDepth:s.water!==null?Math.max(0,s.water-s.height):1000};},128,{innerExtent:512,innerSpacing:16,drop:1,material});
const scene=new Scene();scene.background=new Color('#000000');scene.add(new AmbientLight('#ffffff',Math.PI),fallback.mesh);
const camera=new OrthographicCamera(-128,128,64,-64,1,4000);camera.position.set(shore,2000,z);camera.up.set(0,0,-1);camera.lookAt(shore,0,z);
function mask(){renderer.render(scene,camera);const gl=renderer.getContext(),pixels=new Uint8Array(256*128*4);gl.readPixels(0,0,256,128,gl.RGBA,gl.UNSIGNED_BYTE,pixels);return Array.from({length:256*128},(_,i)=>Number(pixels[i*4+2]>pixels[i*4]*1.2));}
fallback.update(shore-1400,z);const reference=mask(),difference=()=>mask().reduce((n,v,i)=>n+Number(v!==reference[i]),0),movingMaskDifferences:number[]=[],lodMaskDifferences:number[]=[];
for(let i=0;i<=24;i++){fallback.update(shore-1400+i*64,z+(i%3)*64);movingMaskDifferences.push(difference());}
fallback.update(shore,z);
const markerGeometry=new PlaneGeometry(1,1),markerMaterial=new MeshStandardMaterial();
// Compare actual incoming worker meshes at all four LODs over the same world pixels.
for(const lod of [3,2,1,0] as Lod[]){
  const chunks=[];
  for(let cz=Math.floor((z-64)/32);cz<=Math.floor((z+64)/32);cz++)for(let cx=Math.floor((shore-128)/32);cx<=Math.floor((shore+128)/32);cx++){
    const spec={seed,x:cx,z:cz,lod,generator:'regional-v2' as const,airbase:true as const},chunk=attachTerrain(spec,generateTerrain(spec),material,markerGeometry,markerMaterial,true);scene.add(chunk.group);chunks.push(chunk);
  }
  lodMaskDifferences.push(difference());chunks.forEach(c=>c.dispose());
}
// Retain the final detail-free frame for a short visual check.
renderer.render(scene,camera);
window.coastStability={ready:true,maxHeightError,wetMismatches,heightErrors,waterPixels:reference.reduce((a,b)=>a+b,0),movingMaskDifferences,lodMaskDifferences};
addEventListener('pagehide',()=>{fallback.dispose();surface.dispose();material.dispose();markerGeometry.dispose();markerMaterial.dispose();renderer.dispose();},{once:true});
