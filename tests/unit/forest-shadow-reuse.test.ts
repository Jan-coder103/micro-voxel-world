import { expect,it,vi } from 'vitest';
import { BoxGeometry,DirectionalLight,Group,InstancedMesh,MeshStandardMaterial,PerspectiveCamera,Scene,type WebGLRenderer } from 'three';
import { createCachedSunShadows } from '../../src/rendering/cached-sun-shadows';
import { createFrontierForest } from '../../src/rendering/frontier-forest';
import { SettlementWorld } from '../../src/world/settlements';
import { regionalLandmarks } from '../../src/world/regional-terrain';

it('compacts hidden cells even during generation and restores exact canonical matrices without redundant uploads',()=>{
  vi.useFakeTimers();const cube=new BoxGeometry(),world=new SettlementWorld(103),p=regionalLandmarks(103).Forest;
  const compact=createFrontierForest(103,world,cube),reference=createFrontierForest(103,world,cube,()=>{},{compactInstances:false});
  const x=Math.floor(p.x/32),z=Math.floor(p.z/32),residents=Array.from({length:49},(_,i)=>({spec:{seed:103,x:x+i%7-3,z:z+Math.floor(i/7)-3,lod:1 as const}}));
  const matrices=(forest:typeof compact)=>forest.group.children.flatMap(o=>{const m=o as InstancedMesh;return Array.from(m.instanceMatrix.array.slice(0,m.count*16));});
  try{
    compact.update(p.x,p.z,residents);reference.update(p.x,p.z,residents);vi.runAllTimers();
    expect(compact.treeCount).toBe(reference.treeCount);expect(compact.stats.omitted).toBeGreaterThan(0);expect(compact.stats.submitted).toBeLessThan(reference.stats.submitted);
    const versions=compact.group.children.map(o=>(o as InstancedMesh).instanceMatrix.version);
    compact.update(p.x,p.z,residents);expect(compact.group.children.map(o=>(o as InstancedMesh).instanceMatrix.version)).toEqual(versions);
    compact.update(p.x,p.z);reference.update(p.x,p.z);expect(matrices(compact)).toEqual(matrices(reference));expect(compact.stats.omitted).toBe(0);
    const proxyVersions=[...compact.shadowCasters].map(m=>[m.id,m.instanceMatrix.version,m.count]);
    const original=matrices(compact);compact.update(p.x,p.z,residents);compact.update(p.x,p.z);expect(matrices(compact)).toEqual(original);expect([...compact.shadowCasters].map(m=>[m.id,m.instanceMatrix.version,m.count])).toEqual(proxyVersions);
  }finally{compact.dispose();reference.dispose();cube.dispose();vi.useRealTimers();}
});
it('records each invalidation cause once per successful rebuild while stable frames and disabled cache add no events',()=>{
  const scene=new Scene(),world=new Group(),dynamic=new Group(),sun=new DirectionalLight(),box=new BoxGeometry(),material=new MeshStandardMaterial(),mesh=new InstancedMesh(box,material,1),camera=new PerspectiveCamera();
  sun.shadow.camera.far=1600;sun.shadow.camera.updateProjectionMatrix();mesh.name='forest:test';mesh.castShadow=true;world.add(mesh);scene.add(sun,sun.target,world,dynamic);
  const original=vi.fn((lights:DirectionalLight[])=>{if(lights[0]!==sun){lights[0].shadow.map={dispose(){}} as never;lights[0].shadow.needsUpdate=false;}});
  const renderer={domElement:new EventTarget(),shadowMap:{autoUpdate:true,enabled:true,needsUpdate:false,render:original},clear:vi.fn()} as unknown as WebGLRenderer;
  const cache=createCachedSunShadows(renderer,scene,sun,[dynamic]),sink=vi.fn();cache.diagnostics.counterSink=sink;
  const render=(x=0,offset=0)=>{cache.update(x,0,offset,0);scene.updateMatrixWorld();renderer.shadowMap.render([sun],scene,camera);};
  try{
    render();expect(cache.invalidationStats.lastReasons).toEqual(['Caster added','Initial depth']);expect(sink).toHaveBeenCalledWith('Shadow changed casters / Forest',1);
    const count=sink.mock.calls.length;render();expect(sink).toHaveBeenCalledTimes(count);
    mesh.instanceMatrix.needsUpdate=true;render();expect(cache.invalidationStats.lastReasons).toEqual(['Instance buffer']);
    mesh.count=0;render();expect(cache.invalidationStats.lastReasons).toEqual(['Instance count']);mesh.count=1;render();
    mesh.position.x=1;render();expect(cache.invalidationStats.lastReasons).toEqual(['Caster transform']);
    const replaced=new BoxGeometry();mesh.geometry=replaced;render();expect(cache.invalidationStats.lastReasons).toEqual(['Geometry replaced']);replaced.getAttribute('position').needsUpdate=true;render();expect(cache.invalidationStats.lastReasons).toEqual(['Position buffer']);
    render(40);expect(cache.invalidationStats.lastReasons).toEqual(['Anchor moved']);world.position.x=-4096;render(40,-4096);expect(cache.invalidationStats.lastReasons).toEqual(['World rebased','Caster transform']);
    sun.shadow.mapSize.set(512,512);render(40,-4096);expect(cache.invalidationStats.lastReasons).toEqual(['Map resized']);renderer.domElement.dispatchEvent(new Event('webglcontextrestored'));render(40,-4096);expect(cache.invalidationStats.lastReasons).toEqual(['Context restored']);
    mesh.visible=false;render(40,-4096);expect(cache.invalidationStats.lastReasons).toEqual(['Caster removed']);
    const builds=cache.staticBuilds;cache.enabled=false;render(40,-4096);expect(cache.staticBuilds).toBe(builds);expect(cache.invalidationStats.reasons['Instance buffer']).toBe(1);replaced.dispose();
  }finally{cache.dispose();box.dispose();material.dispose();sun.dispose();}
});
it('keeps shadow-only proxies out of the color pass and ignores color membership changes',()=>{
  vi.useFakeTimers();const cube=new BoxGeometry(),forest=createFrontierForest(103,new SettlementWorld(103),cube),scene=new Scene(),sun=new DirectionalLight(),camera=new PerspectiveCamera();
  const geometry=new BoxGeometry(),material=new MeshStandardMaterial(),color=new InstancedMesh(geometry,material,1),proxy=new InstancedMesh(geometry,material,1);proxy.castShadow=true;proxy.visible=false;scene.add(sun,sun.target,color,proxy);sun.shadow.camera.far=1600;sun.shadow.camera.updateProjectionMatrix();
  const render=vi.fn((lights:DirectionalLight[])=>{expect(proxy.visible).toBe(true);if(lights[0]!==sun){lights[0].shadow.map={dispose(){}} as never;lights[0].shadow.needsUpdate=false;}});
  const renderer={domElement:new EventTarget(),shadowMap:{autoUpdate:true,enabled:true,needsUpdate:false,render},clear:vi.fn()} as unknown as WebGLRenderer;
  const cache=createCachedSunShadows(renderer,scene,sun,[],new Set([proxy]));
  const frame=()=>{cache.update(0,0,0,0);scene.updateMatrixWorld();renderer.shadowMap.render([sun],scene,camera);expect(proxy.visible).toBe(false);};
  try{
    frame();expect(cache.staticBuilds).toBe(1);color.instanceMatrix.needsUpdate=true;color.count=0;frame();expect(cache.staticBuilds).toBe(1);
    proxy.instanceMatrix.needsUpdate=true;frame();expect(cache.staticBuilds).toBe(2);
    cache.enabled=false;frame();expect(proxy.visible).toBe(false);
    forest.update(0,0);vi.runAllTimers();expect(forest.shadowCasters.size).toBeGreaterThan(0);forest.dispose();expect(forest.shadowCasters.size).toBe(0);
  }finally{cache.dispose();forest.dispose();cube.dispose();geometry.dispose();material.dispose();sun.dispose();vi.useRealTimers();}
});
