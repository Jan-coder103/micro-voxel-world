import { BoxGeometry, Group, InstancedMesh, Matrix4, MeshStandardMaterial, Vector3 } from 'three';
import house from '../../assets/source/ref-farmhouse.voxel.json';
import office from '../../assets/source/ref-utility-building.voxel.json';
import warehouse from '../../assets/source/ref-small-warehouse.voxel.json';
import tank from '../../assets/source/ref-fuel-tank.voxel.json';
import tower from '../../assets/source/ref-watchtower.voxel.json';
import container from '../../assets/source/ref-shipping-container.voxel.json';
import pier from '../../assets/source/ref-wooden-bridge.voxel.json';
import { createVoxelMesh } from './voxel-mesh';
import { assetMetres } from '../assets/voxel-source';
import type { Building, BuildingKit } from '../world/settlements';

/** Seven shared authored kits, one foundation batch; chunk eviction owns instance membership only. */
export function createSettlementView(){
  const group=new Group(),capacity=512,matrix=new Matrix4(),scale=new Vector3(),sources={house,office,warehouse,tank,tower,container,pier};
  const kits=(Object.keys(sources) as BuildingKit[]).map(kit=>{
    const source=createVoxelMesh(sources[kit]),mesh=new InstancedMesh(source.mesh.geometry,source.mesh.material,capacity);
    mesh.castShadow=true;mesh.receiveShadow=true;mesh.count=0;mesh.name=`settlement:${kit}`;group.add(mesh);return {kit,source,mesh,size:assetMetres(source.source)};
  });
  const geometry=new BoxGeometry(1,1,1),material=new MeshStandardMaterial({color:'#777868',roughness:1}),foundations=new InstancedMesh(geometry,material,capacity);
  foundations.count=0;group.add(foundations);
  const chunks=new Map<symbol,readonly Building[]>();let dirty=false,disposed=false,count=0;
  return {group,get count(){return count;},get batches(){return kits.length+1;},
    attach(key:string,buildings:readonly Building[]){
      if(disposed)throw new Error('Settlement renderer disposed');
      const token=Symbol(key);chunks.set(token,buildings);dirty=true;let released=false;
      return ()=>{if(released)return;released=true;chunks.delete(token);dirty=true;};
    },
    update(){
      if(disposed||!dirty)return;dirty=false;const buildings=[...chunks.values()].flat();
      if(buildings.length>capacity)throw new Error('Settlement instance capacity exceeded');count=buildings.length;
      for(const {kit,mesh,size} of kits){
        let i=0;for(const b of buildings)if(b.kit===kit){matrix.makeRotationY(b.yaw);scale.set((b.yaw?b.depth:b.width)/size[0],b.height/size[1],(b.yaw?b.width:b.depth)/size[2]);matrix.scale(scale);matrix.setPosition(b.x,b.y,b.z);mesh.setMatrixAt(i++,matrix);}
        mesh.count=i;mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();
      }
      let i=0;for(const b of buildings){if(b.kit==='pier')continue;const height=b.y-b.bottom;matrix.makeScale(b.width,height,b.depth);matrix.setPosition(b.x,b.bottom+height/2,b.z);foundations.setMatrixAt(i++,matrix);}
      foundations.count=i;foundations.instanceMatrix.needsUpdate=true;foundations.computeBoundingSphere();
    },
    dispose(){if(disposed)return;disposed=true;chunks.clear();count=0;for(const {mesh,source} of kits){mesh.dispose();source.dispose();}foundations.dispose();geometry.dispose();material.dispose();group.removeFromParent();group.clear();},
  };
}
