import { expect,it,vi } from 'vitest';
import { BoxGeometry,DirectionalLight,Group,InstancedMesh,Mesh,MeshStandardMaterial,PerspectiveCamera,Scene,type WebGLRenderer } from 'three';
import { createCachedSunShadows } from '../../src/rendering/cached-sun-shadows';
import { createFarTreeGeometry,createMorphTreeGeometry } from '../../src/rendering/tree-morph';
import { createFrontierForest } from '../../src/rendering/frontier-forest';
import { SettlementWorld } from '../../src/world/settlements';
import { createFrontierClouds } from '../../src/rendering/frontier-clouds';

it('far geometry removes two coincident boxes and tiles restore detail conservatively after rebasing',()=>{
  const far=createFarTreeGeometry(),detail=createMorphTreeGeometry();
  expect(far.getAttribute('position').count).toBe(detail.getAttribute('position').count/3);
  expect(Array.from(far.getAttribute('position').array)).toEqual(Array.from(detail.getAttribute('farPosition').array).slice(0,108));
  vi.useFakeTimers();
  const cube=new BoxGeometry(),forest=createFrontierForest(103,new SettlementWorld(103),cube,()=>{},{sprites:false});
  try{
    forest.update(0,0);vi.runAllTimers();forest.group.updateMatrixWorld();const tile=forest.group.children[0] as InstancedMesh;
    const camera=new PerspectiveCamera();camera.position.set(tile.position.x+128,105,tile.position.z+128);camera.updateMatrixWorld();forest.selectGeometry(camera);expect(tile.geometry.getAttribute('position').count).toBe(108);
    camera.position.x+=2000;camera.updateMatrixWorld();forest.selectGeometry(camera);expect(tile.geometry.getAttribute('position').count).toBe(36);
    forest.group.position.x=-4096;camera.position.x=tile.position.x+128-4096;forest.group.updateMatrixWorld();camera.updateMatrixWorld();forest.selectGeometry(camera);expect(tile.geometry.getAttribute('position').count).toBe(108);
  }finally{forest.dispose();cube.dispose();far.dispose();detail.dispose();vi.useRealTimers();}
});
it('clouds share a bounded noise volume and dispose it exactly once',()=>{
  const view=createFrontierClouds(103),material=view.mesh.material;
  const texture=material.uniforms.cloudNoise.value as {image:{data:Uint8Array};dispose:()=>void};expect(texture.image.data.length).toBe(64**3);expect(new Set(texture.image.data).size).toBe(256);
  const dispose=vi.spyOn(texture,'dispose');view.dispose();view.dispose();expect(dispose).toHaveBeenCalledOnce();
});
it('off-region static changes do not rebuild depth, entering and leaving casters do',()=>{
  const scene=new Scene(),sun=new DirectionalLight(),dynamic=new Group(),box=new BoxGeometry(),material=new MeshStandardMaterial(),fixed=new Mesh(box,material);sun.shadow.camera.far=1600;sun.shadow.camera.updateProjectionMatrix();fixed.castShadow=true;fixed.position.set(10000,0,0);scene.add(sun,sun.target,dynamic,fixed);
  const original=vi.fn((lights:DirectionalLight[])=>{if(lights[0]!==sun){lights[0].shadow.map={dispose(){}} as never;lights[0].shadow.needsUpdate=false;}});
  const renderer={domElement:new EventTarget(),shadowMap:{autoUpdate:true,enabled:true,needsUpdate:false,render:original},clear:vi.fn()} as unknown as WebGLRenderer;
  const cache=createCachedSunShadows(renderer,scene,sun,[dynamic]),camera=new PerspectiveCamera();
  const render=()=>{cache.update(0,0,0,0);scene.updateMatrixWorld();renderer.shadowMap.render([sun],scene,camera);};
  render();expect(cache.staticBuilds).toBe(1);expect(cache.invalidationStats.lastReasons).toEqual(['Initial depth']);fixed.position.x+=1;render();expect(cache.staticBuilds).toBe(1);
  fixed.position.set(0,0,0);render();expect(cache.staticBuilds).toBe(2);expect(cache.invalidationStats.lastReasons).toEqual(['Caster added']);fixed.position.x=10000;render();expect(cache.staticBuilds).toBe(3);expect(cache.invalidationStats.lastReasons).toEqual(['Caster removed']);
  cache.dispose();box.dispose();material.dispose();sun.dispose();
});
