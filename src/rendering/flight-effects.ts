import { AdditiveBlending,Group,Mesh,PlaneGeometry,ShaderMaterial,Vector3 } from 'three';
export function flightStress(load:number,speed:number,stalled:boolean){return Math.max(0,Math.min(1,(Math.abs(load)-1.5)/4))*Math.min(1,speed/45)+(stalled?.12:0);}
export function sunGlare(alignment:number){return Math.pow(Math.max(0,alignment),36);}
/** Bounded additive wing sheets; no particles, textures or postprocessing buffers. */
export function createWingVapor(){
  const group=new Group(),geometry=new PlaneGeometry(1,1),material=new ShaderMaterial({transparent:true,depthWrite:false,blending:AdditiveBlending,uniforms:{strength:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv;uniform float strength;void main(){vec2 p=(vUv-.5)*2.;float a=exp(-dot(p,p)*3.)*(1.-smoothstep(.4,1.,abs(p.x)));gl_FragColor=vec4(.8,.9,1.,a*strength*.24);}'});
  for(const x of [-4.5,4.5]){const m=new Mesh(geometry,material);m.rotation.x=-Math.PI/2;m.position.set(x,.25,0);m.scale.set(5,3,1);group.add(m);}
  return {group,update(strength:number){group.visible=strength>.01;material.uniforms.strength.value=strength;},dispose(){group.removeFromParent();geometry.dispose();material.dispose();group.clear();}};
}
export const SUN_DIRECTION=new Vector3(-850,380,-350).normalize();
