import { Color, type MeshStandardMaterial } from 'three';

/** The overview retains roads/pads without subpixel grass hashing on distant ground. */
export function configureBattlefieldMaterial(material:MeshStandardMaterial,seed:{value:number},overview=false){
  material.customProgramCacheKey=()=>overview?'battlefield-overview-v1':'battlefield-detail-v1';
  material.onBeforeCompile=shader=>{
    shader.uniforms.surfaceSeed=seed;
    shader.uniforms.grassColor={value:new Color('#858958')};shader.uniforms.dryColor={value:new Color('#a39564')};
    shader.uniforms.roadColor={value:new Color('#535957')};shader.uniforms.padColor={value:new Color('#949789')};
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vGroundPosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nvGroundPosition=(modelMatrix*vec4(position,1.0)).xyz;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vGroundPosition; uniform float surfaceSeed; uniform vec3 grassColor; uniform vec3 dryColor; uniform vec3 roadColor; uniform vec3 padColor; float groundHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7))+surfaceSeed*.013)*43758.5453);}').replace('#include <color_fragment>',`#include <color_fragment>
      vec2 p=vGroundPosition.xz,lot=floor(p/32.0),local=mod(p,32.0);
      ${overview?'float grain=.5; vec3 groundColor=diffuseColor.rgb;':'float grain=groundHash(floor(p*3.0)); vec3 groundColor=mix(grassColor,dryColor,groundHash(floor(p/48.0))*.8);'}
      if(all(greaterThanEqual(lot,vec2(-4.0)))&&all(lessThanEqual(lot,vec2(4.0)))){
        float edge=min(min(local.x,32.0-local.x),min(local.y,32.0-local.y));
        if(edge<1.8){groundColor=roadColor;if(edge<.09&&mod(p.x+p.y,7.0)<3.0)groundColor=mix(dryColor,vec3(.65),.3);}
        else if(abs(local.x-16.0)<3.4&&abs(local.y-16.0)<7.2)groundColor=padColor;
        else if(min(min(abs(local.x-6.0),abs(local.x-26.0)),min(abs(local.y-6.0),abs(local.y-26.0)))<1.4)groundColor=mix(groundColor,dryColor,.55);
        float contact=length(max(vec2(0.0),abs(local-16.0)-vec2(2.0,6.0)));
        groundColor*=1.0-.25*exp(-contact*1.4);
      }
      diffuseColor.rgb=groundColor*(.94+grain*.12);`);
  };
}
