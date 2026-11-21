import { createCachedSunShadows } from '../../src/rendering/cached-sun-shadows';
import { expect,it,vi } from 'vitest';
import { BoxGeometry,BufferAttribute,DirectionalLight,Group,Mesh,Scene,type WebGLRenderer,MeshStandardMaterial,PerspectiveCamera,Sphere,Vector3 } from 'three';
import { terrainBounds } from '../../src/streaming/terrain-bounds';
import { createFrontierClouds } from '../../src/rendering/frontier-clouds';
import { createWorkerTerrainFallback } from '../../src/rendering/worker-terrain-fallback';
import { createTerrainFallback } from '../../src/rendering/terrain-fallback';
import { FRONTIER_COVERAGE,type CoverageData } from '../../src/streaming/coverage-data';
import { airbaseSample } from '../../src/world/airbase';
import { ChunkStream } from '../../src/streaming/chunk-stream';

it('worker bounds match Three geometry bounds for nonindexed terrain',()=>{
  const g=new BoxGeometry(15,23,7).toNonIndexed();g.translate(-80,12,150);const values=g.getAttribute('position').array as Float32Array;g.computeBoundingSphere();const bounds=terrainBounds(values);expect(new Sphere(new Vector3(...bounds.center),bounds.radius)).toEqual(g.boundingSphere);g.dispose();expect(terrainBounds(new Float32Array())).toEqual({center:[0,0,0],radius:0});
});
it('cloud compaction preserves original instance order and restores all banks without regeneration',()=>{
  const view=createFrontierClouds(103);view.update(0,0);view.group.updateMatrixWorld();const count=view.mesh.count,original=Array.from(view.mesh.instanceMatrix.array.slice(0,count*16));
  const camera=new PerspectiveCamera(60,1,.1,5000);camera.position.set(0,80,0);camera.lookAt(0,400,-1500);camera.updateMatrixWorld();view.cull(camera);
  expect(view.mesh.count).toBeGreaterThan(0);expect(view.mesh.count).toBeLessThan(count);let previous=-1;
  for(let i=0;i<view.mesh.count;i++){const x=view.mesh.instanceMatrix.array[i*16+12],z=view.mesh.instanceMatrix.array[i*16+14];let found=-1;for(let j=previous+1;j<count;j++)if(original[j*16+12]===x&&original[j*16+14]===z){found=j;break;}expect(found).toBeGreaterThan(previous);previous=found;}
  const version=view.mesh.instanceMatrix.version;view.cull(camera);expect(view.mesh.instanceMatrix.version).toBe(version);
  view.cull(camera,false);expect(view.mesh.count).toBe(count);expect(Array.from(view.mesh.instanceMatrix.array.slice(0,count*16))).toEqual(original);expect(view.rebuilds).toBe(1);view.dispose();
});
it('time-budgeted streaming always integrates one payload and defers the next without losing it',async()=>{
  let now=0;const attached:number[]=[],wake=vi.fn();
  const stream=new ChunkStream(async s=>s.x,(_s,x)=>{attached.push(x);now+=3;return {dispose(){}};},undefined,wake,()=>now,2);
  const wanted=[0,1].map(x=>({x,z:0,lod:0 as const,seed:103}));stream.update(wanted);for(let i=0;i<5;i++)await Promise.resolve();
  wake.mockClear();stream.update(wanted);expect(wake).toHaveBeenCalled();expect(attached).toEqual([0]);expect(stream.completed).toBe(1);stream.update(wanted);expect(attached).toEqual([0,1]);expect(stream.settled).toBe(true);stream.dispose();
});
it('coverage replies stage atomically, coalesce travel, reject distant stale output and recover on worker failure',()=>{
  const fake={onmessage:null as unknown as Worker['onmessage'],onerror:null as unknown as Worker['onerror'],postMessage:vi.fn(),terminate:vi.fn()},wake=vi.fn(),material=new MeshStandardMaterial();
  const view=createWorkerTerrainFallback(103,material,wake,()=>fake as unknown as Worker),origin=view.mesh.position.clone(),position=view.mesh.geometry.getAttribute('position') as BufferAttribute,version=position.version;
  view.update(256,144);expect(fake.postMessage).toHaveBeenCalledTimes(1);expect(view.pending).toBe(true);expect(view.needsFrame).toBe(false);view.update(384,144);expect(fake.postMessage).toHaveBeenCalledTimes(1);
  const source=createTerrainFallback(103,(x,z)=>{const s=airbaseSample(103,x,z);return {height:Math.max(s.height,s.water??-Infinity),color:[...s.color],waterDepth:s.water!==null?Math.max(0,s.water-s.height):1000};},128,FRONTIER_COVERAGE);source.update(256,144);
  const data:CoverageData={id:1,x:256,z:128,positions:new Float32Array(source.mesh.geometry.getAttribute('position').array),normals:new Float32Array(source.mesh.geometry.getAttribute('normal').array),colors:new Float32Array(source.mesh.geometry.getAttribute('color').array),waterDepth:new Float32Array(source.mesh.geometry.getAttribute('waterDepth').array),bounds:terrainBounds(source.mesh.geometry.getAttribute('position').array as Float32Array)};
  fake.onmessage!.call(fake as unknown as Worker,{data} as MessageEvent);expect(wake).toHaveBeenCalledOnce();expect(view.mesh.position).toEqual(origin);expect(position.version).toBe(version);expect(view.needsFrame).toBe(true);
  view.update(384,144);expect(view.mesh.position.x).toBe(256);expect(position.version).toBe(version+1);expect(view.mesh.geometry.boundingSphere).toEqual(source.mesh.geometry.boundingSphere);expect(fake.postMessage).toHaveBeenCalledTimes(2);
  fake.onmessage!.call(fake as unknown as Worker,{data:{...data,id:2,x:384}} as MessageEvent);view.update(8192,144);expect(view.mesh.position.x).toBe(256);expect(fake.postMessage).toHaveBeenCalledTimes(3);
  fake.onerror!.call(fake as unknown as Worker,{} as ErrorEvent);expect(view.workerFailed).toBe(true);for(let i=0;i<100;i++){view.update(8192,144);if(!view.pending)break;}expect(view.mesh.position.x).toBe(8192);
  view.dispose();source.dispose();material.dispose();expect(view.pending).toBe(false);expect(fake.terminate).toHaveBeenCalled();
});

it('restores ordinary shadows and all cast flags when static depth preparation fails',()=>{
  const scene=new Scene(),sun=new DirectionalLight(),dynamic=new Group(),box=new BoxGeometry(),material=new MeshStandardMaterial(),moving=new Mesh(box,material),fixed=new Mesh(box,material);moving.castShadow=fixed.castShadow=true;dynamic.add(moving);scene.add(sun,sun.target,dynamic,fixed);scene.updateMatrixWorld();
  const camera=new PerspectiveCamera(),original=vi.fn((lights:DirectionalLight[])=>{if(lights[0]!==sun)throw new Error('Cache driver failure');expect(moving.castShadow).toBe(true);expect(fixed.castShadow).toBe(true);});
  const renderer={domElement:new EventTarget(),shadowMap:{autoUpdate:true,enabled:true,needsUpdate:false,render:original},clear:vi.fn()} as unknown as WebGLRenderer;
  const cache=createCachedSunShadows(renderer,scene,sun,[dynamic]);cache.update(0,0,0,0);renderer.shadowMap.render([sun],scene,camera);
  expect(cache.fallback).toBe(true);expect(cache.lastError).toContain('Cache driver failure');expect(renderer.shadowMap.autoUpdate).toBe(true);expect(original).toHaveBeenCalledTimes(2);
  cache.dispose();expect(renderer.shadowMap.render).toBe(original);expect(moving.castShadow).toBe(true);expect(fixed.castShadow).toBe(true);box.dispose();material.dispose();sun.dispose();
});
it('uses bounded CPU coverage if a worker cannot be created',()=>{
  const material=new MeshStandardMaterial(),view=createWorkerTerrainFallback(103,material,()=>{},()=>{throw new Error('Workers unavailable');});
  expect(view.workerFailed).toBe(true);view.update(128,144);expect(view.pending).toBe(true);expect(view.needsFrame).toBe(true);
  for(let i=0;i<100&&view.pending;i++)view.update(128,144);expect(view.pending).toBe(false);expect(view.mesh.position.x).toBe(128);view.dispose();material.dispose();
});
