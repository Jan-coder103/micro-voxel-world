import type { TimingSink } from '../performance/frontier-profiler';
import { DirectionalLight,Matrix4,Mesh,Sphere,Vector3,type Camera,type Group,type Scene,type WebGLRenderer,type InstancedMesh } from 'three';
import { SUN_DIRECTION } from './flight-effects';
export const SHADOW_INVALIDATIONS=['Initial depth','Anchor moved','World rebased','Map resized','Context restored','Caster added','Caster removed','Caster transform','Instance buffer','Instance count','Geometry replaced','Position buffer'] as const;
type Reason=typeof SHADOW_INVALIDATIONS[number];
interface Stamp { matrix:number[];version:number;count:number;geometry:number;positionVersion:number }
/** Reuse static depth, then draw moving casters into the same live depth map.
 * Both passes use the same camera; depth union preserves normal PCF filtering.
 * The depth blit is GPU-to-GPU: no readback, second light or extra lighting samples.
 */
export function createCachedSunShadows(renderer:WebGLRenderer,scene:Scene,sun:DirectionalLight,dynamicRoots:Group[]){
  const diagnostics:{timingSink?:TimingSink;counterSink?:(name:string,count:number)=>void}={};
  const reasons=new Set<Reason>(),changedCasters=new Set<string>(),changedGroups=new Set<string>();
  const totals=Object.fromEntries(SHADOW_INVALIDATIONS.map(r=>[r,0])) as Record<Reason,number>;
  let lastReasons:Reason[]=[],lastCasters:string[]=[];
  const invalidate=(reason:Reason,mesh?:Mesh)=>{
    reasons.add(reason);if(!mesh)return;
    if(changedCasters.size<8)changedCasters.add(mesh.name||`mesh:${mesh.id}`);
    let group='Other';for(let o:Mesh['parent']|Mesh=mesh;o;o=o.parent){if(o.name==='dense-distant-forest'||o.name.startsWith('forest:')){group='Forest';break;}if(o.name.startsWith('settlement:')){group='Settlements';break;}}
    changedGroups.add(group);
  };
  const recordBuild=()=>{
    lastReasons=[...reasons];lastCasters=[...changedCasters];diagnostics.counterSink?.('Shadow rebuild',1);
    for(const r of reasons){totals[r]++;diagnostics.counterSink?.(`Shadow invalidation / ${r}`,1);}
    for(const group of changedGroups)diagnostics.counterSink?.(`Shadow changed casters / ${group}`,1);
    reasons.clear();changedCasters.clear();changedGroups.clear();
  };
  const timed=<T>(name:string,work:()=>T):T=>{if(!diagnostics.timingSink)return work();const start=performance.now();try{return work();}finally{diagnostics.timingSink(name,performance.now()-start);}};
  const originalAuto=renderer.shadowMap.autoUpdate,originalRender=renderer.shadowMap.render;
  const cached=new DirectionalLight();cached.castShadow=true;cached.shadow=sun.shadow.clone();
  // 16 m of anchor slack preserves the original 240 m radius at every position.
  for(const light of [sun,cached]){light.shadow.mapSize.set(1096,1096);Object.assign(light.shadow.camera,{left:-256,right:256,top:256,bottom:-256});light.shadow.camera.updateProjectionMatrix();}
  const stamps=new Map<Mesh,Stamp>(),dynamic=new Set<Mesh>(),casters:Mesh[]=[];
  let lastError='',enabled=true;
  let anchor='',anchorX:number|undefined,anchorZ:number|undefined,rebaseX:number|undefined,rebaseZ:number|undefined,disposed=false,fallback=false,staticBuilds=0,depthCopies=0,lastSize=0;
  const basis=new Matrix4().lookAt(SUN_DIRECTION,new Vector3(),new Vector3(0,1,0)),right=new Vector3().setFromMatrixColumn(basis,0),up=new Vector3().setFromMatrixColumn(basis,1),target=new Vector3();
  const restored=()=>{invalidate('Context restored');cached.shadow.needsUpdate=true;};renderer.domElement.addEventListener('webglcontextrestored',restored);
  renderer.shadowMap.autoUpdate=false;
  const bounds=new Sphere();
  const scan=()=>{
    sun.shadow.updateMatrices(sun);const frustum=sun.shadow.getFrustum();
    dynamic.clear();for(const root of dynamicRoots)root.traverse(o=>{if(o instanceof Mesh)dynamic.add(o);});
    casters.length=0;let dirty=false;const seen=new Set<Mesh>();
    scene.traverseVisible(o=>{if(!(o instanceof Mesh)||!o.castShadow)return;if(dynamic.has(o)){casters.push(o);return;}
      // Instanced bounds include every instance; ordinary geometry bounds are local.
      const bounded=o as InstancedMesh;
      if(bounded.isInstancedMesh){if(!bounded.boundingSphere)bounded.computeBoundingSphere();bounds.copy(bounded.boundingSphere!);}
      else{if(!o.geometry.boundingSphere)o.geometry.computeBoundingSphere();bounds.copy(o.geometry.boundingSphere!);}
      bounds.applyMatrix4(o.matrixWorld);if(!frustum.intersectsSphere(bounds))return;
      casters.push(o);seen.add(o);
      const inst=o as InstancedMesh,version=inst.instanceMatrix?.version??-1,count=inst.count??-1,positionVersion=o.geometry.getAttribute('position')?.version??0,old=stamps.get(o);
      let changed=false;
      const check=(condition:boolean,reason:Reason)=>{if(condition){invalidate(reason,o);changed=true;}};
      if(!old)check(true,'Caster added');else{
        check(old.version!==version,'Instance buffer');check(old.count!==count,'Instance count');
        check(old.geometry!==o.geometry.id,'Geometry replaced');check(old.positionVersion!==positionVersion,'Position buffer');
        check(old.matrix.some((v,i)=>v!==o.matrixWorld.elements[i]),'Caster transform');
      }
      if(changed){stamps.set(o,{matrix:[...o.matrixWorld.elements],version,count,geometry:o.geometry.id,positionVersion});dirty=true;}

    });
    for(const o of stamps.keys())if(!seen.has(o)){stamps.delete(o);invalidate('Caster removed',o);dirty=true;}
    return dirty;
  };
  renderer.shadowMap.render=function(lights,renderScene,camera:Camera){
      if(renderScene!==scene||!lights.includes(sun)||fallback||!enabled||!renderer.shadowMap.enabled){timed('Shadow uncached pass (inclusive)',()=>originalRender.call(renderer.shadowMap,lights,renderScene,camera));return;}
      if(disposed)return;
      const dirty=timed('Shadow cache scan',scan);const size=sun.shadow.mapSize.x;if(size!==lastSize){if(lastSize)invalidate('Map resized');lastSize=size;cached.shadow.mapSize.copy(sun.shadow.mapSize);cached.shadow.needsUpdate=true;}
      const originalClear=renderer.clear;
      try{
        renderer.shadowMap.autoUpdate=true;
        if(dirty||cached.shadow.needsUpdate||!cached.shadow.map){
          if(!cached.shadow.map)invalidate('Initial depth');
          timed('Shadow caster flag changes',()=>{for(const o of casters)if(dynamic.has(o))o.castShadow=false;});
          try{timed('Shadow static rebuild (inclusive)',()=>originalRender.call(renderer.shadowMap,[cached],scene,camera));}finally{timed('Shadow caster flag changes',()=>{for(const o of casters)o.castShadow=true;});}
          staticBuilds++;recordBuild();
        }
        timed('Shadow caster flag changes',()=>{for(const o of casters)if(!dynamic.has(o))o.castShadow=false;});
        // ShadowMap clears its target before drawing; seed it with cached depth instead.
        renderer.clear=function(...args){const live=renderer.getRenderTarget();if(live===sun.shadow.map&&live?.depthTexture&&cached.shadow.map?.depthTexture){timed('Shadow depth copy CPU',()=>{renderer.copyTextureToTexture(cached.shadow.map!.depthTexture!,live.depthTexture!);renderer.setRenderTarget(null);renderer.setRenderTarget(live);});depthCopies++;}else originalClear.apply(renderer,args);};
        timed('Shadow dynamic pass (inclusive)',()=>originalRender.call(renderer.shadowMap,[sun],scene,camera));
      }catch(error){lastError=String(error);
        // Retain ordinary per-frame shadows if the driver rejects depth copying.
        fallback=true;
      }finally{
        renderer.clear=originalClear;timed('Shadow caster flag changes',()=>{for(const o of casters)o.castShadow=true;});
        renderer.shadowMap.autoUpdate=fallback?originalAuto:false;renderer.shadowMap.needsUpdate=false;
      }
      if(fallback)timed('Shadow uncached pass (inclusive)',()=>originalRender.call(renderer.shadowMap,lights,renderScene,camera));
  };
  return {diagnostics,get invalidationStats(){return {reasons:{...totals},lastReasons:[...lastReasons],lastCasters:[...lastCasters],pendingReasons:[...reasons]};},get staticBuilds(){return staticBuilds;},get depthCopies(){return depthCopies;},get fallback(){return fallback;},get lastError(){return lastError;},get enabled(){return enabled;},set enabled(value:boolean){enabled=value;renderer.shadowMap.autoUpdate=value&&!fallback?false:originalAuto;},
    update(x:number,z:number,offsetX:number,offsetZ:number){
      const ax=Math.round(x/32)*32,az=Math.round(z/32)*32,next=`${ax},${az}:${offsetX},${offsetZ}`;
      target.set(ax+offsetX,0,az+offsetZ);
      const texel=512/sun.shadow.mapSize.x;
      target.addScaledVector(right,Math.round(target.dot(right)/texel)*texel-target.dot(right));target.addScaledVector(up,Math.round(target.dot(up)/texel)*texel-target.dot(up));
      for(const light of [sun,cached]){light.target.position.copy(target);light.position.copy(target).addScaledVector(SUN_DIRECTION,1000);light.target.updateMatrixWorld();light.updateMatrixWorld();}
      if(next!==anchor){
        if(anchor){if(ax!==anchorX||az!==anchorZ)invalidate('Anchor moved');if(offsetX!==rebaseX||offsetZ!==rebaseZ)invalidate('World rebased');}
        anchor=next;anchorX=ax;anchorZ=az;rebaseX=offsetX;rebaseZ=offsetZ;cached.shadow.needsUpdate=true;
      }
    },

    dispose(){if(disposed)return;disposed=true;renderer.shadowMap.render=originalRender;renderer.domElement.removeEventListener('webglcontextrestored',restored);renderer.shadowMap.autoUpdate=originalAuto;cached.dispose();stamps.clear();casters.length=0;dynamic.clear();reasons.clear();changedCasters.clear();changedGroups.clear();}
  };
}
