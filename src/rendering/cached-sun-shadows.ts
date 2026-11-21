import { DirectionalLight,Matrix4,Mesh,Vector3,type Camera,type Group,type Scene,type WebGLRenderer,type InstancedMesh } from 'three';
import { SUN_DIRECTION } from './flight-effects';
interface Stamp { matrix:number[];version:number;count:number;geometry:number;positionVersion:number }
/** Reuse static depth, then draw moving casters into the same live depth map.
 * Both passes use the same camera; depth union preserves normal PCF filtering.
 * The depth blit is GPU-to-GPU: no readback, second light or extra lighting samples.
 */
export function createCachedSunShadows(renderer:WebGLRenderer,scene:Scene,sun:DirectionalLight,dynamicRoots:Group[]){
  const originalAuto=renderer.shadowMap.autoUpdate,originalRender=renderer.shadowMap.render;
  const cached=new DirectionalLight();cached.castShadow=true;cached.shadow=sun.shadow.clone();
  // 16 m of anchor slack preserves the original 240 m radius at every position.
  for(const light of [sun,cached]){light.shadow.mapSize.set(1096,1096);Object.assign(light.shadow.camera,{left:-256,right:256,top:256,bottom:-256});light.shadow.camera.updateProjectionMatrix();}
  const stamps=new Map<Mesh,Stamp>(),dynamic=new Set<Mesh>(),casters:Mesh[]=[];
  let lastError='',enabled=true;
  let anchor='',disposed=false,fallback=false,staticBuilds=0,depthCopies=0,lastSize=0;
  const basis=new Matrix4().lookAt(SUN_DIRECTION,new Vector3(),new Vector3(0,1,0)),right=new Vector3().setFromMatrixColumn(basis,0),up=new Vector3().setFromMatrixColumn(basis,1),target=new Vector3();
  const restored=()=>{cached.shadow.needsUpdate=true;};renderer.domElement.addEventListener('webglcontextrestored',restored);
  renderer.shadowMap.autoUpdate=false;
  const scan=()=>{
    dynamic.clear();for(const root of dynamicRoots)root.traverse(o=>{if(o instanceof Mesh)dynamic.add(o);});
    casters.length=0;let dirty=false;const seen=new Set<Mesh>();
    scene.traverseVisible(o=>{if(!(o instanceof Mesh)||!o.castShadow)return;casters.push(o);if(dynamic.has(o))return;seen.add(o);
      const inst=o as InstancedMesh,version=inst.instanceMatrix?.version??-1,count=inst.count??-1,positionVersion=o.geometry.getAttribute('position')?.version??0,old=stamps.get(o);
      if(!old||old.version!==version||old.count!==count||old.geometry!==o.geometry.id||old.positionVersion!==positionVersion||old.matrix.some((v,i)=>v!==o.matrixWorld.elements[i])){
        stamps.set(o,{matrix:[...o.matrixWorld.elements],version,count,geometry:o.geometry.id,positionVersion});dirty=true;
      }
    });
    for(const o of stamps.keys())if(!seen.has(o)){stamps.delete(o);dirty=true;}
    return dirty;
  };
  renderer.shadowMap.render=function(lights,renderScene,camera:Camera){
      if(renderScene!==scene||!lights.includes(sun)||fallback||!enabled||!renderer.shadowMap.enabled){originalRender.call(renderer.shadowMap,lights,renderScene,camera);return;}
      if(disposed)return;
      const dirty=scan();const size=sun.shadow.mapSize.x;if(size!==lastSize){lastSize=size;cached.shadow.mapSize.copy(sun.shadow.mapSize);cached.shadow.needsUpdate=true;}
      const originalClear=renderer.clear;
      try{
        renderer.shadowMap.autoUpdate=true;
        if(dirty||cached.shadow.needsUpdate||!cached.shadow.map){
          for(const o of casters)if(dynamic.has(o))o.castShadow=false;
          try{originalRender.call(renderer.shadowMap,[cached],scene,camera);}finally{for(const o of casters)o.castShadow=true;}
          staticBuilds++;
        }
        for(const o of casters)if(!dynamic.has(o))o.castShadow=false;
        // ShadowMap clears its target before drawing; seed it with cached depth instead.
        renderer.clear=function(...args){const live=renderer.getRenderTarget();if(live===sun.shadow.map&&live?.depthTexture&&cached.shadow.map?.depthTexture){renderer.copyTextureToTexture(cached.shadow.map.depthTexture,live.depthTexture);renderer.setRenderTarget(null);renderer.setRenderTarget(live);depthCopies++;}else originalClear.apply(renderer,args);};
        originalRender.call(renderer.shadowMap,[sun],scene,camera);
      }catch(error){lastError=String(error);
        // Retain ordinary per-frame shadows if the driver rejects depth copying.
        fallback=true;
      }finally{
        renderer.clear=originalClear;for(const o of casters)o.castShadow=true;
        renderer.shadowMap.autoUpdate=fallback?originalAuto:false;renderer.shadowMap.needsUpdate=false;
      }
      if(fallback)originalRender.call(renderer.shadowMap,lights,renderScene,camera);
  };
  return {get staticBuilds(){return staticBuilds;},get depthCopies(){return depthCopies;},get fallback(){return fallback;},get lastError(){return lastError;},get enabled(){return enabled;},set enabled(value:boolean){enabled=value;renderer.shadowMap.autoUpdate=value&&!fallback?false:originalAuto;},
    update(x:number,z:number,offsetX:number,offsetZ:number){
      const ax=Math.round(x/32)*32,az=Math.round(z/32)*32,next=`${ax},${az}:${offsetX},${offsetZ}`;
      target.set(ax+offsetX,0,az+offsetZ);
      const texel=512/sun.shadow.mapSize.x;
      target.addScaledVector(right,Math.round(target.dot(right)/texel)*texel-target.dot(right));target.addScaledVector(up,Math.round(target.dot(up)/texel)*texel-target.dot(up));
      for(const light of [sun,cached]){light.target.position.copy(target);light.position.copy(target).addScaledVector(SUN_DIRECTION,1000);light.target.updateMatrixWorld();light.updateMatrixWorld();}
      if(next!==anchor){anchor=next;cached.shadow.needsUpdate=true;}
    },

    dispose(){if(disposed)return;disposed=true;renderer.shadowMap.render=originalRender;renderer.domElement.removeEventListener('webglcontextrestored',restored);renderer.shadowMap.autoUpdate=originalAuto;cached.dispose();stamps.clear();casters.length=0;dynamic.clear();}
  };
}
