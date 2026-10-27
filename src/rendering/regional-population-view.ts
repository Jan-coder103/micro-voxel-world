import { BoxGeometry, Group, InstancedMesh, MeshStandardMaterial, Object3D } from 'three';
import zombieSource from '../../assets/source/ref-zombie.voxel.json';
import { createVoxelMesh } from './voxel-mesh';
import type { RegionalPopulation } from '../hordes/regional-population';
/** Bounded shared geometry for 49 encounters; no terrain-resource ownership. */
export function createRegionalPopulationView(population:RegionalPopulation){
  const group=new Group(),source=createVoxelMesh(zombieSource),box=new BoxGeometry(1,1,1),material=new MeshStandardMaterial({color:'#9daf79',roughness:1}),farMaterial=new MeshStandardMaterial({color:'#c3a356',roughness:1});
  const near=new InstancedMesh(source.mesh.geometry,source.mesh.material,49*32),medium=new InstancedMesh(box,material,49*32),far=new InstancedMesh(box,farMaterial,49);
  const batches=[near,medium,far];for(const b of batches){b.frustumCulled=false;b.count=0;group.add(b);}
  const dummy=new Object3D();let disposed=false;
  return {group,update(){if(disposed)return;let n=0,m=0,f=0;
    for(const r of population.resident.values()){
      const live=r.targets.filter(t=>t.health>0);if(!live.length)continue;
      if(r.tier==='far'){const p=live[0].position;dummy.position.set(p.x,p.y+.6,p.z);dummy.scale.set(3+live.length/8,3,3+live.length/8);dummy.updateMatrix();far.setMatrixAt(f++,dummy.matrix);continue;}
      for(const t of live){const p=t.position;dummy.position.set(p.x,p.y-(r.tier==='near'?.9:0),p.z);dummy.scale.set(r.tier==='near'?1:.65,r.tier==='near'?1:1.8,r.tier==='near'?1:.65);dummy.updateMatrix();(r.tier==='near'?near:medium).setMatrixAt(r.tier==='near'?n++:m++,dummy.matrix);}
    }
    near.count=n;medium.count=m;far.count=f;for(const b of batches)b.instanceMatrix.needsUpdate=true;
  },dispose(){if(disposed)return;disposed=true;group.removeFromParent();for(const b of batches)b.dispose();group.clear();source.dispose();box.dispose();material.dispose();farMaterial.dispose();}};
}
