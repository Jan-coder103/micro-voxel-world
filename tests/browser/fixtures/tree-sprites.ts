import { AmbientLight,BoxGeometry,Color,DirectionalLight,Group,Mesh,MeshStandardMaterial,OrthographicCamera,PCFShadowMap,PerspectiveCamera,PlaneGeometry,Scene,ShaderMaterial,WebGLRenderer } from 'three';
import { createFrontierForest } from '../../../src/rendering/frontier-forest';
import { SettlementWorld } from '../../../src/world/settlements';
import { regionalLandmarks } from '../../../src/world/regional-terrain';
import { airbaseSample } from '../../../src/world/airbase';
const width=400,height=240,renderer=new WebGLRenderer({antialias:false,preserveDrawingBuffer:true});renderer.setSize(width,height);renderer.shadowMap.enabled=true;renderer.shadowMap.type=PCFShadowMap;
const seed=103,p=regionalLandmarks(seed).Forest,ground=airbaseSample(seed,p.x,p.z).height,cube=new BoxGeometry(),forest=createFrontierForest(seed,new SettlementWorld(seed),cube);
forest.update(p.x,p.z);while(forest.pending)await new Promise(resolve=>setTimeout(resolve,10));
const scene=new Scene(),world=new Group(),sun=new DirectionalLight('#ffbc7e',3);scene.background=new Color('#b58a65');world.position.set(-p.x,0,-p.z);world.add(forest.group);scene.add(world,sun,sun.target,new AmbientLight('#d9ae83',1));sun.position.set(-200,ground+400,200);sun.target.position.set(0,ground,0);sun.castShadow=true;sun.shadow.mapSize.set(256,256);Object.assign(sun.shadow.camera,{left:-256,right:256,top:256,bottom:-256,far:1200});sun.shadow.camera.updateProjectionMatrix();
const plane=new PlaneGeometry(4000,4000),material=new MeshStandardMaterial({color:'#817852'}),floor=new Mesh(plane,material);floor.rotation.x=-Math.PI/2;floor.position.y=ground-1;floor.receiveShadow=true;scene.add(floor);
const camera=new PerspectiveCamera(60,width/height,.1,4000),read=()=>{const gl=renderer.getContext(),a=new Uint8Array(width*height*4);gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,a);return a;};
const depthMaterial=new ShaderMaterial({uniforms:{depthMap:{value:null}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:'uniform sampler2D depthMap;varying vec2 vUv;void main(){gl_FragColor=vec4(vec3(texture2D(depthMap,vUv).r),1.);}'}),depthGeometry=new PlaneGeometry(2,2),depthScene=new Scene(),depthCamera=new OrthographicCamera();depthScene.add(new Mesh(depthGeometry,depthMaterial));
const capture=(label:string)=>{const section=document.createElement('section'),c=document.createElement('canvas');section.style.display='inline-block';section.append(label);c.width=width;c.height=height;c.getContext('2d')!.drawImage(renderer.domElement,0,0);section.append(c);document.body.append(section);};
const views=[];
for(const [name,altitude,z] of [['low',80,-1100],['oblique',240,-1100],['overhead',1500,0]] as const){
  camera.position.set(0,ground+altitude,0);camera.lookAt(0,ground,z||-.1);camera.updateMatrixWorld();let original:Uint8Array|undefined,depth:Uint8Array|undefined;const variants=[];
  for(const enabled of [false,true]){
    forest.spritesEnabled=enabled;scene.updateMatrixWorld();sun.shadow.updateMatrices(sun);forest.selectGeometry(camera,sun.shadow.getFrustum());renderer.render(scene,camera);const pixels=read(),triangles=renderer.info.render.triangles,calls=renderer.info.render.calls;capture(`${name}: ${enabled?'sprites':'geometry'}`);
    depthMaterial.uniforms.depthMap.value=sun.shadow.map!.depthTexture as never;renderer.render(depthScene,depthCamera);const shadow=read();let mean=0,max=0,shadowMax=0;
    if(original)for(let i=0;i<pixels.length;i++){if(i%4!==3){const d=Math.abs(pixels[i]-original[i]);mean+=d;max=Math.max(max,d);}shadowMax=Math.max(shadowMax,Math.abs(shadow[i]-depth![i]));}
    variants.push({enabled,triangles,calls,stats:forest.stats,meanDifference:mean/(width*height*3),maxDifference:max,shadowMaxDifference:shadowMax});original=pixels;depth=shadow;
  }
  views.push({name,variants});
}
Object.assign(window,{treeSprites:{ready:true,views}});
addEventListener('pagehide',()=>{forest.dispose();cube.dispose();plane.dispose();material.dispose();depthGeometry.dispose();depthMaterial.dispose();sun.dispose();renderer.dispose();},{once:true});
