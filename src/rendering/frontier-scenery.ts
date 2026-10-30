import { BackSide,BoxGeometry,Group,InstancedMesh,Mesh,MeshBasicMaterial,Object3D,ShaderMaterial,SphereGeometry,Vector3 } from 'three';
import { regionalHash } from '../world/regional-terrain';
import { createFrontierForest } from './frontier-forest';
import type { ChunkSpec } from '../streaming/terrain-data';
import type { SettlementWorld } from '../world/settlements';

/** Sky/clouds follow the view; every distant tree stays anchored to the seeded world. */
export function createFrontierScenery(seed:number,settlements:SettlementWorld,wake=()=>{}){
  const group=new Group(),direction=new Vector3(-.85,.38,-.35).normalize();
  const skyMaterial=new ShaderMaterial({side:BackSide,depthWrite:false,uniforms:{sunDirection:{value:direction}},vertexShader:'varying vec3 vDirection; void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:`
    varying vec3 vDirection; uniform vec3 sunDirection;
    void main(){vec3 d=normalize(vDirection);float h=max(d.y,0.0);float facing=dot(normalize(d.xz),normalize(sunDirection.xz))*.5+.5;vec3 horizon=mix(vec3(.12,.18,.34),vec3(.92,.30,.12),pow(facing,2.0));horizon=mix(horizon,vec3(.40,.20,.43),smoothstep(.08,.32,h)*.65);vec3 sky=mix(horizon,vec3(.075,.14,.30),pow(h,.65));float s=max(dot(d,sunDirection),0.0);sky+=vec3(.43,.25,.1)*pow(s,10.0)+vec3(.85,.5,.21)*pow(s,160.0);sky+=vec3(5.0,4.2,2.8)*smoothstep(.9994,.9998,s);gl_FragColor=vec4(sky,1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    }`});
  const skyGeometry=new SphereGeometry(2200,24,12),sky=new Mesh(skyGeometry,skyMaterial);sky.renderOrder=-10;sky.frustumCulled=false;group.add(sky);
  const cube=new BoxGeometry(1,1,1),cloudMaterial=new MeshBasicMaterial({color:'#e8b3a0',fog:false}),clouds=new InstancedMesh(cube,cloudMaterial,72),dummy=new Object3D();
  const forest=createFrontierForest(seed,settlements,cube,wake);clouds.frustumCulled=false;group.add(clouds,forest.group);
  for(let i=0;i<72;i++){const cluster=Math.floor(i/4),angle=regionalHash(seed,cluster,1,122)*Math.PI*2,radius=550+regionalHash(seed,cluster,2,122)*1000;dummy.position.set(Math.sin(angle)*radius+(i%4-1.5)*30,280+regionalHash(seed,cluster,3,122)*60+Math.sin(i*1.7)*8,Math.cos(angle)*radius);dummy.scale.set(35+regionalHash(seed,i,4,122)*55,9+regionalHash(seed,i,5,122)*15,28+regionalHash(seed,i,6,122)*35);dummy.updateMatrix();clouds.setMatrixAt(i,dummy.matrix);}
  let disposed=false;
  return {group,get treeCount(){return forest.treeCount;},get pending(){return forest.pending;},get rebuilds(){return forest.rebuilds;},update(x:number,y:number,z:number,residents:Iterable<{spec:ChunkSpec}>=[]){
    if(disposed)return;sky.position.set(x,y,z);clouds.position.set(x,0,z);forest.update(x,z,residents);
  },dispose(){if(disposed)return;disposed=true;forest.dispose();clouds.dispose();skyGeometry.dispose();skyMaterial.dispose();cube.dispose();cloudMaterial.dispose();group.removeFromParent();group.clear();}};
}
