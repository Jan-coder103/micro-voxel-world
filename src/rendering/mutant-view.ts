import { Color,Group,InstancedMesh,MeshStandardMaterial,Object3D,Vector3,type BufferGeometry } from 'three';
import { mutantParts,type Mutants } from '../hordes/mutants';
const colors=['#566d48','#91a47a','#444f43','#e5bc53','#c2c29b','#332a23','#705039','#bc9461'];
export function createMutantView(mutants:Mutants,geometry:BufferGeometry){
  const group=new Group(),material=new MeshStandardMaterial({roughness:1}),mesh=new InstancedMesh(geometry,material,4096),dummy=new Object3D(),up=new Vector3(0,1,0),axis=new Vector3();mesh.castShadow=true;mesh.receiveShadow=true;mesh.count=0;group.name='mutant-bosses';group.add(mesh);let key='';
  return {group,update(x:number,z:number){const next=`${Math.floor(x/128)},${Math.floor(z/128)}:${mutants.revision}`;if(next===key)return;key=next;const ox=Math.floor(x/128)*128,oz=Math.floor(z/128)*128;group.position.set(ox,0,oz);let i=0;
    for(const t of mutants.nearby({x,y:0,z}))for(const p of mutantParts(t)){if(i>=4096)continue;dummy.position.set(p.x-ox,p.y,p.z-oz);dummy.quaternion.identity();if(p.axis)dummy.quaternion.setFromUnitVectors(up,axis.set(p.axis.x,p.axis.y,p.axis.z));dummy.scale.set(p.w,p.h,p.d);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i++,new Color(colors[p.color]));}
    mesh.count=i;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();
  },dispose(){mesh.dispose();material.dispose();group.removeFromParent();group.clear();}};
}
