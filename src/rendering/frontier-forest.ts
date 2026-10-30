import { Color,DynamicDrawUsage,Group,InstancedMesh,MeshStandardMaterial,Sphere,Vector3,type BufferGeometry } from 'three';
import { regionTrees,type RegionalTree } from '../world/regional-terrain';
import { airbaseReserved } from '../world/airbase';
import type { SettlementWorld } from '../world/settlements';
import type { ChunkSpec } from '../streaming/terrain-data';

export const FOREST_TILE_SIZE=256,FOREST_RADIUS=1408,FOREST_MAX_TILES=97;
interface Range { start:number;trees:RegionalTree[] }
interface Tile { x:number;z:number;mesh:InstancedMesh;cursor:number;ranges:Map<string,Range> }
/** Dense canonical trees, small async generation batches, shared cuboids and tile frustum culling. */
export function createFrontierForest(seed:number,world:SettlementWorld,geometry:BufferGeometry,wake=()=>{}){
  const group=new Group(),material=new MeshStandardMaterial({color:new Color().setRGB(.16,.29,.12),roughness:1});
  group.name='dense-distant-forest';
  const tiles=new Map<string,Tile>();let detail=new Set<string>(),anchor='',queue:Tile[]=[],timer:ReturnType<typeof setTimeout>|undefined,disposed=false,lastWake=0,rebuilds=0;
  const write=(tile:Tile,range:Range,visible:boolean)=>{
    const a=tile.mesh.instanceMatrix.array;
    range.trees.forEach((tree,i)=>{const at=(range.start+i)*16;
      a[at]=a[at+10]=visible?3.5:0;a[at+5]=visible?tree.height*1.15:0;
      a[at+12]=tree.x-tile.x*256;a[at+13]=tree.y+tree.height*.575;a[at+14]=tree.z-tile.z*256;
    });
  };
  const pump=()=>{
    timer=undefined;if(disposed)return;
    const started=performance.now(),changed=new Set<Tile>();let jobs=0;
    while(queue.length&&jobs<16&&(jobs===0||performance.now()-started<3)){
      const tile=queue[0],index=tile.cursor++,x=tile.x*8+index%8,z=tile.z*8+Math.floor(index/8),key=`${x},${z}`;
      const trees=regionTrees({seed,x,z,lod:0,generator:'regional-v2'}).filter(t=>!airbaseReserved(t.x,t.z)&&!world.reserved(t.x,t.z));
      const range={start:tile.mesh.count,trees};tile.ranges.set(key,range);tile.mesh.count+=trees.length;
      write(tile,range,!detail.has(key));changed.add(tile);jobs++;
      if(tile.cursor===64)queue.shift();
    }
    for(const tile of changed)tile.mesh.instanceMatrix.needsUpdate=true;
    const now=performance.now();if(!queue.length||now-lastWake>=200){lastWake=now;wake();}
    if(queue.length)timer=setTimeout(pump,8);
  };
  return {group,get treeCount(){let n=0;for(const t of tiles.values())n+=t.mesh.count;return n;},get pending(){return queue.length>0;},get rebuilds(){return rebuilds;},
    update(x:number,z:number,residents:Iterable<{spec:ChunkSpec}>=[]){
      if(disposed)return;
      const nextDetail=new Set<string>();for(const {spec} of residents)if(spec.lod<=1)nextDetail.add(`${spec.x},${spec.z}`);
      const changed=new Set([...detail,...nextDetail].filter(key=>detail.has(key)!==nextDetail.has(key)));
      for(const key of changed){const [cx,cz]=key.split(',').map(Number),tile=tiles.get(`${Math.floor(cx/8)},${Math.floor(cz/8)}`),range=tile?.ranges.get(key);if(tile&&range){write(tile,range,!nextDetail.has(key));tile.mesh.instanceMatrix.needsUpdate=true;}}
      detail=nextDetail;
      const cx=Math.floor(x/256),cz=Math.floor(z/256),key=`${cx},${cz}`;if(anchor===key)return;anchor=key;rebuilds++;
      const wanted=new Set<string>();
      for(let dz=-5;dz<=5;dz++)for(let dx=-5;dx<=5;dx++){
        if(Math.hypot(dx*256,dz*256)>FOREST_RADIUS)continue;
        const tx=cx+dx,tz=cz+dz,key=`${tx},${tz}`;wanted.add(key);if(tiles.has(key))continue;
        const mesh=new InstancedMesh(geometry,material,1024);mesh.count=0;mesh.name=`forest:${key}`;mesh.position.set(tx*256,0,tz*256);mesh.instanceMatrix.setUsage(DynamicDrawUsage);
        // The generator's full tree envelope is 0..210 m; avoid rescanning every matrix on growth.
        mesh.boundingSphere=new Sphere(new Vector3(128,105,128),215);
        const tile={x:tx,z:tz,mesh,cursor:0,ranges:new Map<string,Range>()};tiles.set(key,tile);group.add(mesh);
      }
      for(const [key,tile] of tiles)if(!wanted.has(key)){tile.mesh.removeFromParent();tile.mesh.dispose();tiles.delete(key);}
      queue=[...tiles.values()].filter(t=>t.cursor<64).sort((a,b)=>Math.hypot((a.x-cx)*256,(a.z-cz)*256)-Math.hypot((b.x-cx)*256,(b.z-cz)*256));
      if(queue.length&&timer===undefined)timer=setTimeout(pump,0);
    },
    dispose(){if(disposed)return;disposed=true;if(timer!==undefined)clearTimeout(timer);queue=[];for(const t of tiles.values())t.mesh.dispose();tiles.clear();material.dispose();group.removeFromParent();group.clear();}
  };
}
