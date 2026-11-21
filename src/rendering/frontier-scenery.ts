import { BackSide,BoxGeometry,Group,Mesh,ShaderMaterial,SphereGeometry } from 'three';
import { SUN_DIRECTION } from './flight-effects';
import { createFrontierClouds } from './frontier-clouds';
import { createFrontierForest } from './frontier-forest';
import type { ChunkSpec } from '../streaming/terrain-data';
import type { SettlementWorld } from '../world/settlements';

/** Only the sky follows the view; clouds and trees stay anchored to the seeded world. */
export function createFrontierScenery(seed:number,settlements:SettlementWorld,wake=()=>{}){
  const group=new Group(),direction=SUN_DIRECTION;
  const skyMaterial=new ShaderMaterial({side:BackSide,depthWrite:false,uniforms:{sunDirection:{value:direction}},vertexShader:'varying vec3 vDirection; void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:`
    varying vec3 vDirection; uniform vec3 sunDirection;
    void main(){vec3 d=normalize(vDirection);float h=max(d.y,0.0);
      float facing=dot(normalize(d.xz),normalize(sunDirection.xz))*.5+.5;
      vec3 horizon=mix(vec3(.55,.25,.14),vec3(1.0,.56,.19),pow(facing,2.0));
      vec3 sky=mix(horizon,vec3(.24,.115,.075),pow(h,.72));
      float s=max(dot(d,sunDirection),0.0);
      sky+=vec3(.65,.32,.09)*pow(s,12.0)+vec3(1.1,.65,.22)*pow(s,140.0);
      sky+=vec3(6.,5.,2.9)*smoothstep(.9993,.9998,s);gl_FragColor=vec4(sky,1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    }`});
  const skyGeometry=new SphereGeometry(4400,24,12),sky=new Mesh(skyGeometry,skyMaterial);sky.renderOrder=-10;sky.frustumCulled=false;group.add(sky);
  const cube=new BoxGeometry(1,1,1),clouds=createFrontierClouds(seed);
  const forest=createFrontierForest(seed,settlements,cube,wake);group.add(clouds.group,forest.group);
  let disposed=false;
  return {group,forest,clouds,get treeCount(){return forest.treeCount;},get pending(){return forest.pending;},get rebuilds(){return forest.rebuilds;},update(x:number,y:number,z:number,residents:Iterable<{spec:ChunkSpec}>=[]){
    if(disposed)return;sky.position.set(x,y,z);clouds.update(x,z);forest.update(x,z,residents);
  },dispose(){if(disposed)return;disposed=true;forest.dispose();clouds.dispose();skyGeometry.dispose();skyMaterial.dispose();cube.dispose();group.removeFromParent();group.clear();}};
}
