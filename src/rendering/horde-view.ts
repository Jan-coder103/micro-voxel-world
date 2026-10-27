import { BoxGeometry, Color, Group, InstancedMesh, MeshStandardMaterial, Object3D } from 'three';
import zombieSource from '../../assets/source/ref-zombie.voxel.json';
import { createVoxelMesh } from './voxel-mesh';
import { MEMBERS,patrol } from '../hordes/state';
import type { Hordes } from '../hordes/hordes';
/** Four instance batches. One owned source mesh, shared box geometry and materials. */
export function createHordeView(hordes:Hordes){
  const group=new Group(),source=createVoxelMesh(zombieSource),box=new BoxGeometry(1,1,1),material=new MeshStandardMaterial({color:'#83966d',roughness:1}),wallMaterial=new MeshStandardMaterial({color:'#736a5a',roughness:1}),farMaterial=new MeshStandardMaterial({color:'#c3a356',roughness:1});
  const near=new InstancedMesh(source.mesh.geometry,source.mesh.material,49*MEMBERS),medium=new InstancedMesh(box,material,49*MEMBERS),far=new InstancedMesh(box,farMaterial,49),walls=new InstancedMesh(box,wallMaterial,49);
  for(const batch of [near,medium,far,walls]){batch.frustumCulled=false;batch.count=0;group.add(batch);}
  const dummy=new Object3D(),normal=new Color('#ffffff'),hurt=new Color('#ff4f38'),muted=new Color('#8da771');let disposed=false;
  return {group,update(){if(disposed)return;let n=0,m=0,f=0,w=0;
    for(const r of hordes.resident.values()){
      const s=r.state;dummy.position.set(s.x*32+16,hordes.ground(s.x*32+16,s.z*32+16)+1.5,s.z*32+16);dummy.rotation.set(0,0,0);dummy.scale.set(4,3,12);dummy.updateMatrix();walls.setMatrixAt(w++,dummy.matrix);
      if(r.tier==='far') {const alive=s.health.filter(h=>h>0).length;if(alive){const [x,z]=patrol(s.progress);dummy.position.set(s.x*32+x,hordes.ground(s.x*32+x,s.z*32+z)+1.5,s.z*32+z);dummy.scale.set(2+alive/16,3,2+alive/16);dummy.updateMatrix();far.setMatrixAt(f++,dummy.matrix);}continue;}
      for(const t of r.targets??[]){if(t.health<=0)continue;const flash=hordes.flash(t.id);dummy.rotation.set(0,-Math.floor(s.progress/20)*Math.PI/2-Math.PI/2,0);dummy.position.set(t.position.x,t.position.y-.9,t.position.z);dummy.scale.set(r.tier==='near'?1:.65,r.tier==='near'?(flash?.85:1):1.8,r.tier==='near'?1:.65);if(r.tier==='medium')dummy.position.y+=.9;dummy.updateMatrix();const batch=r.tier==='near'?near:medium,index=r.tier==='near'?n++:m++;batch.setMatrixAt(index,dummy.matrix);batch.setColorAt(index,flash?hurt:r.tier==='near'?normal:muted);}
    }
    near.count=n;medium.count=m;far.count=f;walls.count=w;for(const batch of [near,medium,far,walls]){batch.instanceMatrix.needsUpdate=true;if(batch.instanceColor)batch.instanceColor.needsUpdate=true;}
  },get counts(){return {near:near.count,medium:medium.count,far:far.count,walls:walls.count};},dispose(){if(disposed)return;disposed=true;group.removeFromParent();for(const b of [near,medium,far,walls])b.dispose();group.clear();source.dispose();box.dispose();material.dispose();wallMaterial.dispose();farMaterial.dispose();}};
}
