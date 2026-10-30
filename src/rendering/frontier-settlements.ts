import { BoxGeometry,Group,InstancedMesh,MeshStandardMaterial,Object3D } from 'three';
import { createSettlementView } from './settlement-view';
import type { SettlementWorld,Building } from '../world/settlements';
import { airbaseReserved } from '../world/airbase';
/** Detailed shared kits nearby, one proxy batch out to the terrain horizon. */
export function createFrontierSettlements(world:SettlementWorld){
  const group=new Group(),near=createSettlementView(),geometry=new BoxGeometry(1,1,1),material=new MeshStandardMaterial({color:'#888c81',roughness:1}),far=new InstancedMesh(geometry,material,2048),dummy=new Object3D();
  far.castShadow=true;far.receiveShadow=true;far.count=0;group.add(near.group,far);let key='',release:(()=>void)|undefined;
  return {group,update(x:number,z:number){
    const cx=Math.floor(x/128)*128,cz=Math.floor(z/128)*128,next=`${cx},${cz}`;if(key===next)return;key=next;
    const unique=new Map<string,Building>();
    for(const dx of [-1024,0])for(const dz of [-1024,0])for(const s of world.inBounds({minX:cx+dx,maxX:cx+dx+1024,minZ:cz+dz,maxZ:cz+dz+1024}))for(const b of s.buildings)if(!airbaseReserved(b.x,b.z,Math.max(b.width,b.depth)/2)&&Math.hypot(b.x-cx,b.z-cz)<1024)unique.set(b.id,b);
    const sorted=[...unique.values()].sort((a,b)=>Math.hypot(a.x-cx,a.z-cz)-Math.hypot(b.x-cx,b.z-cz)),detail=sorted.filter(b=>Math.hypot(b.x-cx,b.z-cz)<360).slice(0,512),ids=new Set(detail.map(b=>b.id));
    release?.();release=near.attach(next,detail);near.update();let i=0;
    for(const b of sorted){if(ids.has(b.id)||i>=2048)continue;const h=b.y+b.height-b.bottom;dummy.position.set(b.x,b.bottom+h/2,b.z);dummy.scale.set(b.width,h,b.depth);dummy.updateMatrix();far.setMatrixAt(i++,dummy.matrix);}
    far.count=i;far.instanceMatrix.needsUpdate=true;far.computeBoundingSphere();
  },dispose(){release?.();near.dispose();far.dispose();geometry.dispose();material.dispose();group.removeFromParent();group.clear();}};
}
