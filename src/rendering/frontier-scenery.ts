import { BackSide,BoxGeometry,Group,InstancedMesh,Mesh,MeshBasicMaterial,MeshStandardMaterial,Object3D,ShaderMaterial,SphereGeometry,Vector3 } from 'three';
import { regionalHash,regionalSample } from '../world/regional-terrain';
import { airbaseReserved } from '../world/airbase';
import type { SettlementWorld } from '../world/settlements';

/** Sky/clouds follow the view; every distant tree stays anchored to the seeded world. */
export function createFrontierScenery(seed:number,settlements:SettlementWorld){
  const group=new Group(),direction=new Vector3(-.35,.35,-.9).normalize();
  const skyMaterial=new ShaderMaterial({side:BackSide,depthWrite:false,uniforms:{sunDirection:{value:direction}},vertexShader:'varying vec3 vDirection; void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:`
    varying vec3 vDirection; uniform vec3 sunDirection;
    void main(){vec3 d=normalize(vDirection);float h=max(d.y,0.0);vec3 sky=mix(vec3(.66,.65,.60),vec3(.14,.29,.51),pow(h,.48));float s=max(dot(d,sunDirection),0.0);sky+=vec3(.43,.25,.1)*pow(s,10.0)+vec3(.85,.5,.21)*pow(s,160.0);sky+=vec3(5.0,4.2,2.8)*smoothstep(.9994,.9998,s);gl_FragColor=vec4(sky,1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    }`});
  const skyGeometry=new SphereGeometry(2200,24,12),sky=new Mesh(skyGeometry,skyMaterial);sky.renderOrder=-10;sky.frustumCulled=false;group.add(sky);
  const cube=new BoxGeometry(1,1,1),cloudMaterial=new MeshBasicMaterial({color:'#e4e3d6',fog:false}),clouds=new InstancedMesh(cube,cloudMaterial,72),treeMaterial=new MeshStandardMaterial({color:'#364f29',roughness:1}),trees=new InstancedMesh(cube,treeMaterial,4096),dummy=new Object3D();
  clouds.frustumCulled=false;trees.count=0;group.add(clouds,trees);
  for(let i=0;i<72;i++){const cluster=Math.floor(i/4),angle=regionalHash(seed,cluster,1,122)*Math.PI*2,radius=550+regionalHash(seed,cluster,2,122)*1000;dummy.position.set(Math.sin(angle)*radius+(i%4-1.5)*30,280+regionalHash(seed,cluster,3,122)*60+Math.sin(i*1.7)*8,Math.cos(angle)*radius);dummy.scale.set(35+regionalHash(seed,i,4,122)*55,9+regionalHash(seed,i,5,122)*15,28+regionalHash(seed,i,6,122)*35);dummy.updateMatrix();clouds.setMatrixAt(i,dummy.matrix);}
  let anchor='',rebuilds=0,disposed=false;
  return {group,get treeCount(){return trees.count;},get rebuilds(){return rebuilds;},update(x:number,y:number,z:number){
    if(disposed)return;sky.position.set(x,y,z);clouds.position.set(x,0,z);const cx=Math.floor(x/128)*128,cz=Math.floor(z/128)*128,key=`${cx},${cz}`;if(key===anchor)return;anchor=key;rebuilds++;let count=0;
    for(let pz=cz-864;pz<=cz+864;pz+=32)for(let px=cx-864;px<=cx+864;px+=32){
      const tx=px+1+regionalHash(seed,px,pz,21)*6,tz=pz+1+regionalHash(seed,px,pz,22)*6,d=Math.hypot(tx-x,tz-z);if(d<90||d>864||airbaseReserved(tx,tz))continue;
      const s=regionalSample(seed,tx,tz);if(s.water!==null||!['forest','plains'].includes(s.biome)||regionalHash(seed,px,pz,23)>(s.biome==='forest'?.8:.08)||settlements.reserved(tx,tz))continue;
      const height=4+regionalHash(seed,px,pz,24)*5;
      dummy.position.set(tx,s.height+height*.65,tz);dummy.scale.set(3.5,height*.8,3.5);dummy.updateMatrix();trees.setMatrixAt(count++,dummy.matrix);
    }
    trees.count=count;trees.instanceMatrix.needsUpdate=true;trees.computeBoundingSphere();
  },dispose(){if(disposed)return;disposed=true;clouds.dispose();trees.dispose();skyGeometry.dispose();skyMaterial.dispose();cube.dispose();cloudMaterial.dispose();treeMaterial.dispose();group.removeFromParent();group.clear();}};
}
