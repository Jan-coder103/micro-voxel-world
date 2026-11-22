import { BufferAttribute,BufferGeometry,Group,Mesh,MeshStandardMaterial,Sphere,Vector3 } from 'three';
import { createSceneryQueue,sceneryKey,type SceneryQueue } from '../streaming/scenery-queue';
import type { SettlementWorld } from '../world/settlements';
/** Worker-prepared roads publish one complete tile at a time without tessellating on the UI thread. */
export function createFrontierRoads(world:SettlementWorld,wake=()=>{},shared?:SceneryQueue){
  const group=new Group(),material=new MeshStandardMaterial({vertexColors:true,roughness:1,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
  const generation=shared??createSceneryQueue(world.seed,wake),tiles=new Map<string,Mesh<BufferGeometry,MeshStandardMaterial>>();let wanted=new Set<string>(),anchor='',disposed=false;
  group.name='regional-road-network';
  return {group,diagnostics:generation.diagnostics,get pending(){return !disposed&&tiles.size<wanted.size;},get count(){return tiles.size;},
    update(x:number,z:number){
      if(disposed)return;const cx=Math.floor(x/512),cz=Math.floor(z/512),key=`${cx},${cz}`;if(key===anchor)return;anchor=key;
      wanted=new Set<string>();const keys=new Set<string>();
      for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++){
        const tx=cx+dx,tz=cz+dz,key=`${tx},${tz}`,spec={kind:'roads' as const,x:tx,z:tz};wanted.add(key);keys.add(sceneryKey(spec));if(tiles.has(key))continue;
        generation.request(spec,Math.hypot(dx*512,dz*512),data=>{
          if(disposed||!wanted.has(key)||data.kind!=='roads')return;
          const geometry=new BufferGeometry();geometry.setAttribute('position',new BufferAttribute(data.positions,3));geometry.setAttribute('normal',new BufferAttribute(data.normals,3));geometry.setAttribute('color',new BufferAttribute(data.colors,3));geometry.boundingSphere=new Sphere(new Vector3(...data.bounds.center),data.bounds.radius);
          const mesh=new Mesh(geometry,material);mesh.receiveShadow=true;mesh.position.set(tx*512,0,tz*512);mesh.updateMatrix();mesh.matrixAutoUpdate=false;group.add(mesh);tiles.set(key,mesh);
        });
      }
      generation.retain('roads',keys);
      for(const [key,mesh] of tiles)if(!wanted.has(key)){mesh.removeFromParent();mesh.geometry.dispose();tiles.delete(key);}
    },dispose(){if(disposed)return;disposed=true;generation.retain('roads',new Set());if(!shared)generation.dispose();for(const mesh of tiles.values())mesh.geometry.dispose();tiles.clear();wanted.clear();material.dispose();group.removeFromParent();group.clear();}
  };
}
