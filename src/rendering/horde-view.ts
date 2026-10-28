import { BoxGeometry, Color, Group, InstancedMesh, MeshStandardMaterial, Object3D } from 'three';
import zombieSource from '../../assets/source/ref-zombie.voxel.json';
import depotSource from '../../assets/source/clearpass-depot.voxel.json';
import { createVoxelMesh } from './voxel-mesh';
import { MEMBERS,patrol } from '../hordes/state';
import type { Hordes } from '../hordes/hordes';
/** Four shared batches. Detailed combat presentation retains the same simulation tiers. */
export function createHordeView(hordes:Hordes,detailed=false){
  const group=new Group(),source=createVoxelMesh(zombieSource),box=new BoxGeometry(1,1,1),material=new MeshStandardMaterial({color:'#83966d',roughness:1}),wallMaterial=new MeshStandardMaterial({color:'#736a5a',roughness:1}),farMaterial=new MeshStandardMaterial({color:'#c3a356',roughness:1});
  const depot=detailed?createVoxelMesh(depotSource):undefined;
  const near=new InstancedMesh(source.mesh.geometry,source.mesh.material,49*MEMBERS),medium=new InstancedMesh(detailed?source.mesh.geometry:box,detailed?source.mesh.material:material,49*MEMBERS),far=new InstancedMesh(detailed?source.mesh.geometry:box,detailed?source.mesh.material:farMaterial,detailed?49*MEMBERS:49),walls=new InstancedMesh(depot?.mesh.geometry??box,depot?.mesh.material??wallMaterial,49);
  near.castShadow=walls.castShadow=true;medium.castShadow=!detailed;near.receiveShadow=medium.receiveShadow=walls.receiveShadow=true;
  for(const batch of [near,medium,far,walls]){batch.frustumCulled=false;batch.count=0;group.add(batch);}
  const dummy=new Object3D(),normal=new Color('#ffffff'),hurt=new Color('#ff4f38'),muted=new Color('#8da771');let disposed=false;
  return {group,update(flashes=true){if(disposed)return;let n=0,m=0,f=0,w=0;
    for(const r of hordes.resident.values()){
      const s=r.state;dummy.position.set(s.x*32+16,hordes.ground(s.x*32+16,s.z*32+16)+(detailed?0:1.5),s.z*32+16);dummy.rotation.set(0,0,0);dummy.scale.set(detailed?1:4,detailed?1:3,detailed?1:12);dummy.updateMatrix();walls.setMatrixAt(w++,dummy.matrix);
      if(r.tier==='far'&&detailed){const [ax,az]=patrol(s.progress);for(let i=0;i<MEMBERS;i++){if(s.health[i]<=0)continue;const x=s.x*32+ax+s.offsets[i*2],z=s.z*32+az+s.offsets[i*2+1];dummy.position.set(x,hordes.ground(x,z),z);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();far.setMatrixAt(f++,dummy.matrix);}continue;}
      if(r.tier==='far') {const alive=s.health.filter(h=>h>0).length;if(alive){const [x,z]=patrol(s.progress);dummy.position.set(s.x*32+x,hordes.ground(s.x*32+x,s.z*32+z)+1.5,s.z*32+z);dummy.scale.set(2+alive/16,3,2+alive/16);dummy.updateMatrix();far.setMatrixAt(f++,dummy.matrix);}continue;}
      for(const t of r.targets??[]){if(t.health<=0)continue;const flash=flashes&&hordes.flash(t.id);dummy.rotation.set(0,-Math.floor(s.progress/20)*Math.PI/2-Math.PI/2,0);dummy.position.set(t.position.x,t.position.y-.9,t.position.z);dummy.scale.set(detailed||r.tier==='near'?1:.65,detailed||r.tier==='near'?(flash?.85:1):1.8,detailed||r.tier==='near'?1:.65);if(r.tier==='medium'&&!detailed)dummy.position.y+=.9;dummy.updateMatrix();const batch=r.tier==='near'?near:medium,index=r.tier==='near'?n++:m++;batch.setMatrixAt(index,dummy.matrix);batch.setColorAt(index,flash?hurt:r.tier==='near'?normal:muted);}
    }
    near.count=n;medium.count=m;far.count=f;walls.count=w;for(const batch of [near,medium,far,walls]){batch.instanceMatrix.needsUpdate=true;if(batch.instanceColor)batch.instanceColor.needsUpdate=true;}
  },get counts(){return {near:near.count,medium:medium.count,far:far.count,walls:walls.count};},dispose(){if(disposed)return;disposed=true;group.removeFromParent();for(const b of [near,medium,far,walls])b.dispose();group.clear();depot?.dispose();source.dispose();box.dispose();material.dispose();wallMaterial.dispose();farMaterial.dispose();}};
}
