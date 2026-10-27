import { BoxGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, SphereGeometry, Vector3 } from 'three';
import type { Combat } from '../combat/weapons';
/** Fixed presentation allocations, owned by this adapter. No per-shot geometry/materials. */
export function createCombatView(combat:Combat) {
  const group=new Group(),sphere=new SphereGeometry(1,8,6),box=new BoxGeometry(1,1,1);
  const targetMaterial=new MeshStandardMaterial({color:'#d2a34b',roughness:1,flatShading:true});
  const tracerMaterial=new MeshBasicMaterial({color:'#ffe3a0'}),impactMaterial=new MeshBasicMaterial({color:'#ffae48'}),blastMaterial=new MeshBasicMaterial({color:'#ea6b27',wireframe:true});
  const targetMeshes=combat.targets.map(t=>{const m=new Mesh(sphere,targetMaterial);m.position.set(t.position.x,t.position.y,t.position.z);m.scale.setScalar(t.radius);group.add(m);return m;});
  const effects=combat.effects.map(()=>{const mesh=new Mesh(box,tracerMaterial);mesh.visible=false;group.add(mesh);return mesh;});
  const direction=new Vector3(),mid=new Vector3(),axis=new Vector3(0,0,1);
  let disposed=false;
  return {group,update(){
    if(disposed)return;
    targetMeshes.forEach((mesh,i)=>{const t=combat.targets[i];mesh.visible=t.health>0;});
    effects.forEach((mesh,i)=>{const e=combat.effects[i];mesh.visible=e.active;if(!e.active)return;
      mesh.quaternion.identity();
      if(e.kind==='tracer') {direction.set(e.to.x-e.from.x,e.to.y-e.from.y,e.to.z-e.from.z);const length=direction.length();mid.set((e.from.x+e.to.x)/2,(e.from.y+e.to.y)/2,(e.from.z+e.to.z)/2);mesh.position.copy(mid);mesh.scale.set(.08,.08,Math.max(.01,length));if(length>0)mesh.quaternion.setFromUnitVectors(axis,direction.normalize());mesh.material=tracerMaterial;}
      else {mesh.position.set(e.to.x,e.to.y,e.to.z);mesh.scale.setScalar(e.kind==='blast'?e.radius*2*(.15+.85*e.age/e.lifetime):e.radius);mesh.material=e.kind==='blast'?blastMaterial:impactMaterial;}
    });
  },dispose(){if(disposed)return;disposed=true;group.removeFromParent();group.clear();sphere.dispose();box.dispose();targetMaterial.dispose();tracerMaterial.dispose();impactMaterial.dispose();blastMaterial.dispose();}};
}
