import { configureTreeSpriteFade,createTreeSpriteGeometry,createTreeSpriteMaterial,createTreeSpriteTexture,treeSpriteMode,TREE_SPRITE_START,TREE_SPRITE_END } from './tree-sprites';
import { configureTreeMorph,createMorphTreeGeometry,createFarTreeGeometry,TREE_DETAIL_END } from './tree-morph';
import { Color,DynamicDrawUsage,Group,InstancedMesh,MeshStandardMaterial,Sphere,Vector3,type Camera,type Frustum,type BufferGeometry } from 'three';
import { regionTrees,type RegionalTree } from '../world/regional-terrain';
import { airbaseReserved } from '../world/airbase';
import type { SettlementWorld } from '../world/settlements';
import type { ChunkSpec } from '../streaming/terrain-data';

export const FOREST_TILE_SIZE=256,FOREST_RADIUS=1408,FOREST_MAX_TILES=97;
interface Range { trees:RegionalTree[] }
interface Tile { x:number;z:number;mesh:InstancedMesh;sprite:InstancedMesh;fade:{value:number};transition?:MeshStandardMaterial;spriteTransition?:MeshStandardMaterial;generated:number;cursor:number;ranges:Map<string,Range> }
/** Dense canonical trees, small async generation batches, shared cuboids and tile frustum culling. */
export function createFrontierForest(seed:number,world:SettlementWorld,_geometry:BufferGeometry,wake=()=>{},options:{compactInstances?:boolean;sprites?:boolean}={}){
  const group=new Group(),material=new MeshStandardMaterial({color:new Color().setRGB(.16,.29,.12),roughness:1});
  const treeGeometry=createMorphTreeGeometry(),farGeometry=createFarTreeGeometry(),cameraPosition=new Vector3(),bounds=new Sphere();configureTreeMorph(material);
  const texture=createTreeSpriteTexture(),spriteGeometry=createTreeSpriteGeometry(),spriteMaterial=createTreeSpriteMaterial(texture);
  let spritesEnabled=options.sprites!==false;
  group.name='dense-distant-forest';
  const tiles=new Map<string,Tile>();let detail=new Set<string>(),anchor='',queue:Tile[]=[],timer:ReturnType<typeof setTimeout>|undefined,disposed=false,lastWake=0,rebuilds=0;
  let compactions=0;
  const compact=(tile:Tile)=>{
    const a=tile.mesh.instanceMatrix.array;let count=0,changed=false;
    const set=(at:number,offset:number,value:number)=>{const v=Math.fround(value);if(a[at+offset]!==v){a[at+offset]=v;changed=true;}};
    for(const [key,range] of tile.ranges){
      const visible=!detail.has(key);if(!visible&&options.compactInstances!==false)continue;
      for(const tree of range.trees){
        const at=count++*16;
        set(at,0,visible?3.5:0);set(at,10,visible?3.5:0);set(at,5,visible?tree.height*1.15:0);
        set(at,12,tree.x-tile.x*256);set(at,13,tree.y+tree.height*.575);set(at,14,tree.z-tile.z*256);
      }
    }
    if(count!==tile.mesh.count)changed=true;
    tile.mesh.count=count;tile.sprite.count=count;
    // Do not dirty buffers on unrelated/empty membership changes or hidden growth.
    if(changed){compactions++;if(count)tile.mesh.instanceMatrix.needsUpdate=true;}
  };
  const pump=()=>{
    timer=undefined;if(disposed)return;
    const started=performance.now(),changed=new Set<Tile>();let jobs=0;
    while(queue.length&&jobs<16&&(jobs===0||performance.now()-started<3)){
      const tile=queue[0],index=tile.cursor++,x=tile.x*8+index%8,z=tile.z*8+Math.floor(index/8),key=`${x},${z}`;
      const trees=regionTrees({seed,x,z,lod:0,generator:'regional-v2'}).filter(t=>!airbaseReserved(t.x,t.z)&&!world.reserved(t.x,t.z));
      const range={trees};tile.ranges.set(key,range);tile.generated+=trees.length;
      if(trees.length&&(!detail.has(key)||options.compactInstances===false))changed.add(tile);jobs++;
      if(tile.cursor===64)queue.shift();
    }
    for(const tile of changed)compact(tile);
    const now=performance.now();if(!queue.length||now-lastWake>=200){lastWake=now;wake();}
    if(queue.length)timer=setTimeout(pump,8);
  };
  return {group,get spritesEnabled(){return spritesEnabled;},set spritesEnabled(value:boolean){spritesEnabled=value;},get treeCount(){let n=0;for(const t of tiles.values())n+=t.generated;return n;},get stats(){let generated=0,submitted=0,spriteInstances=0,transitionTiles=0;for(const t of tiles.values()){generated+=t.generated;submitted+=t.mesh.count;if(t.mesh.geometry===spriteGeometry||t.sprite.visible)spriteInstances+=t.mesh.count;if(t.sprite.visible)transitionTiles++;}return {generated,submitted,spriteInstances,transitionTiles,spritesEnabled,omitted:generated-submitted,tiles:tiles.size,compactions,pending:queue.length>0};},get pending(){return queue.length>0;},get rebuilds(){return rebuilds;},
    update(x:number,z:number,residents:Iterable<{spec:ChunkSpec}>=[]){
      if(disposed)return;
      const nextDetail=new Set<string>();for(const {spec} of residents)if(spec.lod<=1)nextDetail.add(`${spec.x},${spec.z}`);
      const changed=new Set([...detail,...nextDetail].filter(key=>detail.has(key)!==nextDetail.has(key)));
      const dirtyTiles=new Set<Tile>();
      for(const key of changed){const [cx,cz]=key.split(',').map(Number),tile=tiles.get(`${Math.floor(cx/8)},${Math.floor(cz/8)}`),range=tile?.ranges.get(key);if(tile&&range?.trees.length)dirtyTiles.add(tile);}
      detail=nextDetail;for(const tile of dirtyTiles)compact(tile);
      const cx=Math.floor(x/256),cz=Math.floor(z/256),key=`${cx},${cz}`;if(anchor===key)return;anchor=key;rebuilds++;
      const wanted=new Set<string>();
      for(let dz=-5;dz<=5;dz++)for(let dx=-5;dx<=5;dx++){
        if(Math.hypot(dx*256,dz*256)>FOREST_RADIUS)continue;
        const tx=cx+dx,tz=cz+dz,key=`${tx},${tz}`;wanted.add(key);if(tiles.has(key))continue;
        const mesh=new InstancedMesh(treeGeometry,material,1024);mesh.castShadow=true;mesh.receiveShadow=true;mesh.count=0;mesh.name=`forest:${key}`;mesh.position.set(tx*256,0,tz*256);mesh.updateMatrix();mesh.matrixAutoUpdate=false;mesh.instanceMatrix.setUsage(DynamicDrawUsage);
        // The generator's full tree envelope is 0..210 m; avoid rescanning every matrix on growth.
        mesh.boundingSphere=new Sphere(new Vector3(128,105,128),215);
        const sprite=new InstancedMesh(spriteGeometry,spriteMaterial,0);sprite.instanceMatrix=mesh.instanceMatrix;sprite.count=0;sprite.visible=false;sprite.name=`forest-sprite:${key}`;sprite.updateMatrix();sprite.matrixAutoUpdate=false;sprite.boundingSphere=mesh.boundingSphere.clone();mesh.add(sprite);
        const tile={x:tx,z:tz,mesh,sprite,fade:{value:0},generated:0,cursor:0,ranges:new Map<string,Range>()};tiles.set(key,tile);group.add(mesh);
      }
      for(const [key,tile] of tiles)if(!wanted.has(key)){tile.mesh.removeFromParent();tile.mesh.dispose();tile.sprite.removeFromParent();tile.sprite.dispose();tile.transition?.dispose();tile.spriteTransition?.dispose();tiles.delete(key);}
      queue=[...tiles.values()].filter(t=>t.cursor<64).sort((a,b)=>Math.hypot((a.x-cx)*256,(a.z-cz)*256)-Math.hypot((b.x-cx)*256,(b.z-cz)*256));
      if(queue.length&&timer===undefined)timer=setTimeout(pump,0);
    },
    selectGeometry(camera:Camera,shadowFrustum?:Frustum){
      camera.getWorldPosition(cameraPosition);
      for(const tile of tiles.values()){
        bounds.copy(tile.mesh.boundingSphere!).applyMatrix4(tile.mesh.matrixWorld);
        // Switch only when every tree centre in the tile has finished morphing.
        const shadowed=shadowFrustum?.intersectsSphere(bounds)??false;
        const mode=treeSpriteMode(cameraPosition,bounds,spritesEnabled,shadowed);
        tile.mesh.geometry=cameraPosition.distanceTo(bounds.center)-bounds.radius>=TREE_DETAIL_END&&!shadowed?farGeometry:treeGeometry;
        tile.mesh.material=material;tile.sprite.visible=mode==='transition';
        if(mode==='transition'){
          if(!tile.transition){tile.transition=material.clone();configureTreeMorph(tile.transition);configureTreeSpriteFade(tile.transition,false,tile.fade);tile.spriteTransition=createTreeSpriteMaterial(texture,tile.fade);}
          const t=Math.max(0,Math.min(1,(cameraPosition.distanceTo(bounds.center)-TREE_SPRITE_START)/(TREE_SPRITE_END-TREE_SPRITE_START)));tile.fade.value=t*t*(3-2*t);
          tile.mesh.material=tile.transition;tile.sprite.material=tile.spriteTransition!;
        }
        if(mode==='sprite'){tile.mesh.geometry=spriteGeometry;tile.mesh.material=spriteMaterial;}
        tile.sprite.count=tile.mesh.count;
      }
    },
    dispose(){if(disposed)return;disposed=true;if(timer!==undefined)clearTimeout(timer);queue=[];for(const t of tiles.values()){t.mesh.dispose();t.sprite.dispose();t.transition?.dispose();t.spriteTransition?.dispose();}tiles.clear();treeGeometry.dispose();farGeometry.dispose();spriteGeometry.dispose();texture.dispose();spriteMaterial.dispose();material.dispose();group.removeFromParent();group.clear();}
  };
}
