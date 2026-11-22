import { expect,it,vi } from 'vitest';
import { BoxGeometry,Frustum,InstancedMesh,PerspectiveCamera,Sphere,Vector3 } from 'three';
import { createTreeSpriteGeometry,createTreeSpriteTexture,createTreeSpriteMaterial,treeSpriteMode,TREE_SPRITE_START,TREE_SPRITE_END } from '../../src/rendering/tree-sprites';
import { createFrontierForest } from '../../src/rendering/frontier-forest';
import { SettlementWorld } from '../../src/world/settlements';
it('uses four opaque cutout triangles and a shared bounded deterministic atlas',()=>{
  const g=createTreeSpriteGeometry(),t=createTreeSpriteTexture(),m=createTreeSpriteMaterial(t);
  expect(g.index!.count/3).toBe(4);expect(t.image.data!.length).toBe(8192);expect(m.transparent).toBe(false);expect(m.depthWrite).toBe(true);expect(m.alphaTest).toBe(.5);
  const alpha=Array.from(t.image.data!).filter((_,i)=>i%4===3);expect(alpha).toContain(0);expect(alpha).toContain(255);const repeated=createTreeSpriteTexture();expect(t.image.data).toEqual(repeated.image.data);repeated.dispose();
  g.dispose();t.dispose();m.dispose();
});
it('selects transitions only at distance and restores geometry for steep views, shadows or comparison toggle',()=>{
  const b=new Sphere(new Vector3(),100);
  expect(treeSpriteMode(new Vector3(0,0,700),b,true,false)).toBe('geometry');expect(treeSpriteMode(new Vector3(0,0,(TREE_SPRITE_START+TREE_SPRITE_END)/2),b,true,false)).toBe('transition');expect(treeSpriteMode(new Vector3(0,0,1300),b,true,false)).toBe('sprite');
  expect(treeSpriteMode(new Vector3(0,0,1300),b,true,true)).toBe('geometry');expect(treeSpriteMode(new Vector3(0,0,1300),b,false,false)).toBe('geometry');expect(treeSpriteMode(new Vector3(0,1300,500),b,true,false)).toBe('geometry');
});
it('shares color instance buffers, keeps independent shadow casters, toggles and disposes resources',()=>{
  vi.useFakeTimers();const cube=new BoxGeometry(),f=createFrontierForest(103,new SettlementWorld(103),cube);
  try{
    f.update(0,0);vi.runAllTimers();f.group.updateMatrixWorld();const tile=f.group.children[0] as InstancedMesh,sprite=tile.children[0] as InstancedMesh;
    expect(sprite.instanceMatrix).toBe(tile.instanceMatrix);const camera=new PerspectiveCamera();camera.position.copy(tile.position).add(new Vector3(128,105,2200));camera.updateMatrixWorld();f.selectGeometry(camera);expect(tile.geometry.index!.count).toBe(12);
    f.spritesEnabled=false;f.selectGeometry(camera);expect(tile.geometry.getAttribute('position').count).toBe(36);f.spritesEnabled=true;
    const frustum=new Frustum();for(const p of frustum.planes)p.setComponents(0,0,0,1);f.selectGeometry(camera,frustum);expect(tile.geometry.index!.count).toBe(12);expect(sprite.visible).toBe(false);expect(f.shadowCasters.size).toBeGreaterThan(0);expect([...f.shadowCasters].every(m=>!m.visible&&m.castShadow&&m.geometry.getAttribute('position').count===36)).toBe(true);
    f.selectGeometry(camera);const material=tile.material as ReturnType<typeof createTreeSpriteMaterial>,texture=material.map!,dispose=vi.spyOn(texture,'dispose');f.dispose();f.dispose();expect(dispose).toHaveBeenCalledOnce();
  }finally{f.dispose();cube.dispose();vi.useRealTimers();}
});
