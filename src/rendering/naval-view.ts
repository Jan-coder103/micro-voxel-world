import { Color,Group,InstancedMesh,MeshStandardMaterial,Object3D,type BufferGeometry } from 'three';
import { shipParts,type NavalWorld } from '../world/naval';
const palette=['#606f71','#414d50','#9d5140','#8c9795','#d8d3af','#94a09a'];
export function createNavalView(navy:NavalWorld,geometry:BufferGeometry){
  const group=new Group(),material=new MeshStandardMaterial({roughness:.85}),mesh=new InstancedMesh(geometry,material,4096),dummy=new Object3D();mesh.count=0;group.name='ocean-fleets';group.add(mesh);let anchor='';
  return {group,get count(){return mesh.count;},update(x:number,z:number){const key=`${Math.floor(x/256)},${Math.floor(z/256)}`;if(key===anchor)return;anchor=key;const ox=Math.floor(x/256)*256,oz=Math.floor(z/256)*256;group.position.set(ox,0,oz);let i=0;
    for(const f of navy.nearby(x,z))for(const s of f.ships)for(const p of shipParts(s)){if(i>=4096)continue;dummy.position.set(p.x-ox,p.y,p.z-oz);dummy.scale.set(p.w,p.h,p.d);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i++,new Color(palette[p.color]));}
    mesh.count=i;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();
  },dispose(){mesh.dispose();material.dispose();group.removeFromParent();group.clear();}};
}
