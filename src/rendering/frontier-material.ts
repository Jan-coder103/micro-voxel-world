import { cropFields,farmLayout,FARM_BLOCK_SIZE,CROP_COLORS } from '../world/regional-terrain';
import { DataTexture,FloatType,RGBAFormat,Vector2,type MeshStandardMaterial } from 'three';

/** World-anchored, filtered soil/grass grain, shared by streamed terrain and its underlay. */
export function configureFrontierMaterial(material:MeshStandardMaterial,seed:number){
  const origin={value:new Vector2()},farmOrigin={value:new Vector2()},size=13;
  const pixels=new Float32Array(size*size*36),farms=new DataTexture(pixels,size*9,size,RGBAFormat,FloatType);
  let anchor='';
  const updateFields=(x:number,z:number)=>{
    const bx=Math.floor(x/FARM_BLOCK_SIZE)-6,bz=Math.floor(z/FARM_BLOCK_SIZE)-6,key=`${bx},${bz}`;if(anchor===key)return;anchor=key;
    farmOrigin.value.set(bx,bz);pixels.fill(-1);
    for(let dz=0;dz<size;dz++)for(let dx=0;dx<size;dx++){
      const i=(dz*size*9+dx*9)*4;
      pixels.set([...farmLayout(seed,bx+dx,bz+dz),0],i);
      for(const f of cropFields(seed,bx+dx,bz+dz)){
        const at=i+4+f.slot*8;
        pixels.set([f.minX-(bx+dx)*384,f.maxX-(bx+dx)*384,f.minZ-(bz+dz)*384,f.maxZ-(bz+dz)*384],at);
        pixels.set([f.crop+(f.rowsAlongX?.25:0),f.crop2,f.diagonal,0],at+4);
      }
    }
    farms.needsUpdate=true;
  };updateFields(0,0);
  material.customProgramCacheKey=()=> 'frontier-ground-v5';
  material.onBeforeCompile=shader=>{
    shader.uniforms.terrainOrigin=origin;shader.uniforms.farmOrigin=farmOrigin;shader.uniforms.farmAtlas={value:farms};
    shader.uniforms.terrainSeed={value:seed%65536};
    shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
      uniform vec2 terrainOrigin; varying vec2 vTerrainPosition; varying float vTerrainTop; varying float vTerrainWater; varying float vTerrainCultivable;`)
      .replace('#include <begin_vertex>',`#include <begin_vertex>
      vTerrainPosition=(modelMatrix*vec4(position,1.0)).xz+terrainOrigin;
      vTerrainTop=smoothstep(.5,.9,normal.y);
      vTerrainWater=step(color.r*1.5,color.b);
      vTerrainCultivable=step(.17,color.r)*step(color.b*1.5,color.g)*step(color.r*.7,color.g);`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
      varying vec2 vTerrainPosition; varying float vTerrainTop; varying float vTerrainWater; varying float vTerrainCultivable; uniform float terrainSeed;
      uniform sampler2D farmAtlas; uniform vec2 farmOrigin;
      vec3 cropColor(float crop){${CROP_COLORS.map((c,i)=>`if(crop<${i+.5})return vec3(${c.join(',')});`).join('')}return vec3(.4,.4,.2);}
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
      diffuseColor.rgb+=vec3(.025,.012,-.018)*soil*land*vTerrainTop;
      // Analytic field edges and diagonals survive every terrain LOD.
      vec2 block=floor(vTerrainPosition/384.0),local=vTerrainPosition-block*384.0,index=block-farmOrigin;
      if(all(greaterThanEqual(index,vec2(0.0)))&&all(lessThan(index,vec2(13.0)))){
        vec4 parcelLayout=texture2D(farmAtlas,vec2((index.x*9.0+.5)/117.0,(index.y+.5)/13.0));
        bool right=local.x>=parcelLayout.x;float cut=right?parcelLayout.z:parcelLayout.y;bool upper=local.y>=cut;
        float slot=(right?2.0:0.0)+(upper?1.0:0.0);
        vec4 bounds=texture2D(farmAtlas,vec2((index.x*9.0+slot*2.0+1.5)/117.0,(index.y+.5)/13.0));
        vec4 codes=texture2D(farmAtlas,vec2((index.x*9.0+slot*2.0+2.5)/117.0,(index.y+.5)/13.0));
        vec2 lo=bounds.xz,hi=bounds.yw,uv=(local-lo)/max(hi-lo,vec2(1.0));
        float diagonal=codes.z>0.0?uv.x+uv.y-abs(codes.z):uv.x-uv.y+abs(codes.z)-1.0;
        float code=abs(codes.z)>.5&&diagonal>0.0?codes.y+fract(codes.x):codes.x;
        float edge=min(min(local.x-lo.x,hi.x-local.x),min(local.y-lo.y,hi.y-local.y));
        float aa=max(fwidth(edge),.01),coverage=smoothstep(-aa,aa,edge)*step(0.0,code)*land*vTerrainTop*vTerrainCultivable;
        float rowPosition=fract(code)>.1?vTerrainPosition.y:vTerrainPosition.x;
        float rowFade=1.0-smoothstep(.5,2.0,fwidth(rowPosition));
        float rows=cos(rowPosition*3.14159265)*.055*rowFade;
        if(abs(codes.z)>.5){float seam=abs(diagonal)*min(hi.x-lo.x,hi.y-lo.y)*.7;coverage*=smoothstep(.6,.6+max(fwidth(seam),.1),seam);}
        float headland=smoothstep(0.0,3.0,edge);
        float flowers=step(4.5,floor(code));
        float petals=terrainGrain(vTerrainPosition,.45)*.35;
        vec3 crop=cropColor(floor(code))*(.88+.12*headland+rows*headland+soil*.08+flowers*petals);
        diffuseColor.rgb=mix(diffuseColor.rgb,crop,coverage);
      }`)
      .replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
        roughnessFactor=mix(roughnessFactor,.30,waterCoverage);`)
      .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
        // Static multi-scale wave normals: no time uniform or moving geometry.
        vec2 wp=vTerrainPosition;wp+=vec2(sin(wp.y*.017),sin(wp.x*.011))*9.0;
        vec2 slope=vec2(cos(wp.x*.095+wp.y*.047)*.11+cos(wp.x*.33-wp.y*.19)*.045,
          cos(wp.x*.095+wp.y*.047)*.055-cos(wp.x*.33-wp.y*.19)*.03);
        vec3 waveNormal=normalize(vec3(-slope.x,1.0,-slope.y));
        normal=normalize(mix(normal,normalize(mat3(viewMatrix)*waveNormal),waterCoverage));`)
      .replace('#include <opaque_fragment>',`
        // Analytic sunset sky reflection avoids a reflection camera or render target.
        vec3 worldNormal=normalize(vec3(-slope.x,1.0,-slope.y));
        vec3 viewWorld=normalize(inverseTransformDirection(normalize(vViewPosition),viewMatrix));
        vec3 reflected=reflect(-viewWorld,worldNormal);
        float glint=pow(max(dot(reflected,normalize(vec3(-.85,.38,-.35))),0.0),65.0);
        float fresnel=.08+.65*pow(1.0-max(dot(viewWorld,worldNormal),0.0),4.0);
        outgoingLight+=waterCoverage*(vec3(.13,.20,.36)*fresnel+vec3(1.8,.85,.32)*glint);
        #include <opaque_fragment>`);
  };
  return {updateFields,dispose(){farms.dispose();},updateOrigin(x:number,z:number){origin.value.set(x,z);}};
}
