import { BoxGeometry,Group,InstancedMesh,MeshStandardMaterial,Object3D } from 'three';
import { createSettlementView } from './settlement-view';
import type { SettlementWorld } from '../world/settlements';
import { createSceneryQueue,sceneryKey,type SceneryQueue } from '../streaming/scenery-queue';
/** Detailed shared kits nearby, one proxy batch out to the terrain horizon. */
export function createFrontierSettlements(world:SettlementWorld,wake=()=>{},shared?:SceneryQueue){
  const group=new Group(),near=createSettlementView(),geometry=new BoxGeometry(1,1,1),material=new MeshStandardMaterial({color:'#888c81',roughness:1}),far=new InstancedMesh(geometry,material,2048),dummy=new Object3D();
  const generation=shared??createSceneryQueue(world.seed,wake);let disposed=false,pending=false;
  far.castShadow=true;far.receiveShadow=true;far.count=0;group.add(near.group,far);let key='',release:(()=>void)|undefined;
  return {group,get pending(){return pending;},update(x:number,z:number){
    if(disposed)return;const cx=Math.floor(x/128),cz=Math.floor(z/128),next=`${cx},${cz}`;if(key===next)return;key=next;pending=true;
    const spec={kind:'settlements' as const,x:cx,z:cz};generation.retain('settlements',new Set([sceneryKey(spec)]));
    generation.request(spec,-1,data=>{
      if(disposed||key!==next||data.kind!=='settlements')return;
      release?.();release=near.attach(next,data.detail);near.update();let i=0;
      for(const b of data.far){const h=b.y+b.height-b.bottom;dummy.position.set(b.x,b.bottom+h/2,b.z);dummy.scale.set(b.width,h,b.depth);dummy.updateMatrix();far.setMatrixAt(i++,dummy.matrix);}
      far.count=i;far.instanceMatrix.needsUpdate=true;far.computeBoundingSphere();pending=false;
    });
  },dispose(){if(disposed)return;disposed=true;pending=false;generation.retain('settlements',new Set());if(!shared)generation.dispose();release?.();near.dispose();far.dispose();geometry.dispose();material.dispose();group.removeFromParent();group.clear();}};
}
