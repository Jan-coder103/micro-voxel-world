import { Vector2,type MeshStandardMaterial } from 'three';

/** World-anchored, filtered soil/grass grain, shared by streamed terrain and its underlay. */
export function configureFrontierMaterial(material:MeshStandardMaterial,seed:number){
  const origin={value:new Vector2()};
  material.customProgramCacheKey=()=> 'frontier-ground-v2';
  material.onBeforeCompile=shader=>{
    shader.uniforms.terrainOrigin=origin;
    shader.uniforms.terrainSeed={value:seed%65536};
    shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
      uniform vec2 terrainOrigin; varying vec2 vTerrainPosition; varying float vTerrainTop; varying float vTerrainWater;`)
      .replace('#include <begin_vertex>',`#include <begin_vertex>
      vTerrainPosition=(modelMatrix*vec4(position,1.0)).xz+terrainOrigin;
      vTerrainTop=smoothstep(.5,.9,normal.y);
      vTerrainWater=step(color.r*1.5,color.b);`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
      varying vec2 vTerrainPosition; varying float vTerrainTop; varying float vTerrainWater; uniform float terrainSeed;
      float terrainHash(vec2 cell){vec3 p=fract(vec3(cell.xyx)*.1031+terrainSeed*.001);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
      float terrainGrain(vec2 p,float size){float fade=1.0-smoothstep(.35,1.2,max(fwidth(p.x),fwidth(p.y))/size);return (terrainHash(floor(p/size))-.5)*fade;}`)
      .replace('#include <color_fragment>',`#include <color_fragment>
      // Recover the dry palette before thresholding coverage, so coarse triangles
      // cannot smear blue water into the bank. Filter only across one screen pixel.
      float wet=clamp(vTerrainWater,0.0,1.0);
      vec3 waterColor=vec3(.10,.36,.49);
      vec3 dryColor=max(vec3(0.0),(vColor.rgb-waterColor*wet)/max(1.0-wet,.0001));
      float shorelineAA=max(fwidth(wet)*.5,.00001);
      float waterCoverage=smoothstep(.5-shorelineAA,.5+shorelineAA,wet);
      vec3 sharpColor=mix(dryColor,waterColor,waterCoverage);
      diffuseColor.rgb*=sharpColor/max(vColor.rgb,vec3(.0001));
      float land=1.0-waterCoverage;
      float groundPatch=terrainGrain(vTerrainPosition,12.0),soil=terrainGrain(vTerrainPosition,3.0),grain=terrainGrain(vTerrainPosition,.65);
      float variation=groundPatch*.24+soil*.16+grain*.16;
      diffuseColor.rgb*=1.0+variation*land*vTerrainTop;
      diffuseColor.rgb+=vec3(.025,.012,-.018)*soil*land*vTerrainTop;`);
  };
  return {updateOrigin(x:number,z:number){origin.value.set(x,z);}};
}
