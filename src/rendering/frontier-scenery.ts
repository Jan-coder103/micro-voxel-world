import { BackSide,BoxGeometry,BufferAttribute,Color,Group,InstancedMesh,Mesh,MeshBasicMaterial,Object3D,ShaderMaterial,SphereGeometry } from 'three';
import { SUN_DIRECTION } from './flight-effects';
import { regionalHash } from '../world/regional-terrain';
import { createFrontierForest } from './frontier-forest';
import type { ChunkSpec } from '../streaming/terrain-data';
import type { SettlementWorld } from '../world/settlements';

/** Sky/clouds follow the view; every distant tree stays anchored to the seeded world. */
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
  const skyGeometry=new SphereGeometry(2200,24,12),sky=new Mesh(skyGeometry,skyMaterial);sky.renderOrder=-10;sky.frustumCulled=false;group.add(sky);
  const cube=new BoxGeometry(1,1,1),cloudGeometry=new SphereGeometry(1,10,6);
  const cloudMaterial=new MeshBasicMaterial({vertexColors:true,fog:false});
  const colors=new Float32Array(cloudGeometry.getAttribute('position').count*3),normal=cloudGeometry.getAttribute('normal');
  const dark=new Color('#69432e'),lit=new Color('#efb371'),tint=new Color();
  for(let i=0;i<normal.count;i++){
    const facing=Math.max(0,normal.getX(i)*direction.x+normal.getY(i)*direction.y+normal.getZ(i)*direction.z);
    tint.copy(dark).lerp(lit,Math.min(1,facing*.85+Math.max(0,normal.getY(i))*.25));colors.set(tint.toArray(),i*3);
  }
  cloudGeometry.setAttribute('color',new BufferAttribute(colors,3));
  const clouds=new InstancedMesh(cloudGeometry,cloudMaterial,72),dummy=new Object3D();clouds.name='sunset-cloud-banks';
  const forest=createFrontierForest(seed,settlements,cube,wake);clouds.frustumCulled=false;group.add(clouds,forest.group);
  for(let i=0;i<72;i++){const cluster=Math.floor(i/4),angle=regionalHash(seed,cluster,1,122)*Math.PI*2,radius=550+regionalHash(seed,cluster,2,122)*1000;dummy.position.set(Math.sin(angle)*radius+(i%4-1.5)*55,280+regionalHash(seed,cluster,3,122)*90+Math.sin(i*1.7)*18,Math.cos(angle)*radius);dummy.scale.set(48+regionalHash(seed,i,4,122)*55,20+regionalHash(seed,i,5,122)*24,35+regionalHash(seed,i,6,122)*35);dummy.updateMatrix();clouds.setMatrixAt(i,dummy.matrix);}
  let disposed=false;
  return {group,get treeCount(){return forest.treeCount;},get pending(){return forest.pending;},get rebuilds(){return forest.rebuilds;},update(x:number,y:number,z:number,residents:Iterable<{spec:ChunkSpec}>=[]){
    if(disposed)return;sky.position.set(x,y,z);clouds.position.set(x,0,z);forest.update(x,z,residents);
  },dispose(){if(disposed)return;disposed=true;forest.dispose();clouds.dispose();skyGeometry.dispose();skyMaterial.dispose();cube.dispose();cloudGeometry.dispose();cloudMaterial.dispose();group.removeFromParent();group.clear();}};
}
