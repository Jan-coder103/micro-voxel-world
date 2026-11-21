import { SHORELINE_FIELD_GLSL } from './shoreline-field';
import { SUN_DIRECTION } from './flight-effects';
import { cropFields,farmLayout,FARM_BLOCK_SIZE,CROP_COLORS,regionLayout,regionalHash } from '../world/regional-terrain';
import { DataTexture,FloatType,RGBAFormat,Vector2,type MeshStandardMaterial } from 'three';

/** World-anchored, filtered soil/grass grain, shared by streamed terrain and its underlay. */
export function configureFrontierMaterial(material:MeshStandardMaterial,seed:number,options:{waterEffects?:boolean;stableShoreline?:boolean;fastPaths?:boolean}={}){
  const time={value:0},presentation={value:options.waterEffects===false?0:1};
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
  material.customProgramCacheKey=()=> 'frontier-ground-v8-fast-paths-'+(options.fastPaths!==false);
  material.onBeforeCompile=shader=>{
    const layout=regionLayout(seed);
    shader.uniforms.shorelineSeed={value:seed>>>0};shader.uniforms.shorelineLayout={value:new Vector2(layout.coast,layout.lakeX)};
    shader.uniforms.shorelinePhase={value:regionalHash(seed,0,0,99)*6.28};shader.uniforms.stableShoreline={value:options.stableShoreline===false?0:1};
    shader.uniforms.riverShape={value:new Vector2(regionLayout(seed).coast+1400,regionalHash(seed,0,0,99)*6.28)};shader.uniforms.waterTime=time;shader.uniforms.waterPresentation=presentation;shader.uniforms.waterSun={value:SUN_DIRECTION};shader.uniforms.terrainOrigin=origin;shader.uniforms.farmOrigin=farmOrigin;shader.uniforms.farmAtlas={value:farms};
    shader.uniforms.terrainSeed={value:seed%65536};
    shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
      uniform vec2 terrainOrigin; varying vec2 vTerrainPosition; varying float vTerrainTop; varying float vTerrainWater; varying float vTerrainCultivable; varying float vSurfaceHeight; attribute float waterDepth; varying float vWaterDepth;`)
      .replace('#include <begin_vertex>',`#include <begin_vertex>
      vTerrainPosition=(modelMatrix*vec4(position,1.0)).xz+terrainOrigin;
      vWaterDepth=waterDepth;
      vSurfaceHeight=(modelMatrix*vec4(position,1.)).y;
      vTerrainTop=smoothstep(.5,.9,normal.y);
      vTerrainWater=step(color.r*1.5,color.b);
      vTerrainCultivable=step(.17,color.r)*step(color.b*1.5,color.g)*step(color.r*.7,color.g);`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
      varying vec2 vTerrainPosition; varying float vTerrainTop; varying float vTerrainWater; varying float vTerrainCultivable; varying float vSurfaceHeight; varying float vWaterDepth; uniform float terrainSeed; uniform float waterTime; uniform float waterPresentation; uniform vec3 waterSun; uniform vec2 riverShape;
      uniform sampler2D farmAtlas; uniform vec2 farmOrigin;
      ${SHORELINE_FIELD_GLSL}
      uniform float stableShoreline;vec2 terrainPixelWidth;
      vec3 cropColor(float crop){${CROP_COLORS.map((c,i)=>`if(crop<${i+.5})return vec3(${c.join(',')});`).join('')}return vec3(.4,.4,.2);}
      float terrainHash(vec2 cell){vec3 p=fract(vec3(cell.xyx)*.1031+terrainSeed*.001);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
      float terrainGrain(vec2 p,float size){float fade=1.0-smoothstep(.35,1.2,max(terrainPixelWidth.x,terrainPixelWidth.y)/size);return (terrainHash(floor(p/size))-.5)*fade;}`)
      .replace('#include <color_fragment>',`#include <color_fragment>
      // Recover the dry palette before thresholding coverage, so coarse triangles
      // cannot smear blue water into the bank. Filter only across one screen pixel.
      terrainPixelWidth=fwidth(vTerrainPosition);
      float wet=clamp(vTerrainWater,0.0,1.0);
      vec3 waterColor=vec3(.10,.36,.49);
      vec3 dryColor=max(vec3(0.0),(vColor.rgb-waterColor*wet)/max(1.0-wet,.0001));
      float shorelineAA=max(fwidth(wet)*.5,.00001);
      float waterCoverage=smoothstep(.5-shorelineAA,.5+shorelineAA,wet);
      float shoreField=10000.;
      if(stableShoreline>.5&&vTerrainPosition.x<shorelineLayout.x+1400.)shoreField=vTerrainPosition.x<shorelineLayout.x-400.?-55.:shorelineHeight(vTerrainPosition);
      float coastField=stableShoreline*(1.-smoothstep(2.,4.,shoreField));
      float fieldAA=max(fwidth(shoreField)*.5,.00001);
      float oceanCoverage=1.-smoothstep(-fieldAA,fieldAA,shoreField);
      waterCoverage=mix(waterCoverage,oceanCoverage,coastField);
      dryColor=mix(dryColor,vec3(.62,.57,.37),coastField);
      vec3 sharpColor=mix(dryColor,waterColor,waterCoverage);
      diffuseColor.rgb*=sharpColor/max(vColor.rgb,vec3(.0001));
      float land=1.0-waterCoverage;
      // Convert interpolated wetness into a local distance in metres, independent of LOD.
      float worldPixel=max(length(dFdx(vTerrainPosition)),length(dFdy(vTerrainPosition)));
      float shoreDistance=clamp((wet-.5)*worldPixel/max(fwidth(wet),.000001),-1000.,1000.);
      // Shore foam and damp sand use the same world field, not screen derivatives.
      float fieldDistance=clamp(-shoreField*18.,-1000.,1000.);
      shoreDistance=mix(shoreDistance,fieldDistance,coastField);
      float sea=max(coastField,1.-smoothstep(.5,2.,vSurfaceHeight));
      float shoreMetres=min(max(0.,shoreDistance),max(0.,mix(vWaterDepth,-shoreField,coastField))*18.);
      if(${options.fastPaths===false?'true':'waterCoverage*waterPresentation>0.'}){
      float shallows=exp(-shoreMetres*.045);
      vec3 deep=mix(vec3(.035,.14,.16),vec3(.025,.12,.20),sea);
      vec3 shallow=mix(vec3(.16,.35,.29),vec3(.18,.48,.43),sea);
      vec3 waterTint=mix(deep,shallow,shallows);
      vec2 flow=vTerrainPosition;flow.y-=riverShape.x+sin(flow.x/570.+riverShape.y)*100.;
      float current=sin(flow.x*.24-waterTime*1.8+sin(flow.y*.15)*.8);
      float ripples=sin(flow.x*.31+flow.y*.16-waterTime*1.3)*sin(flow.y*.24-waterTime*.7);
      waterTint*=1.+current*.055+ripples*.045;
      diffuseColor.rgb=mix(diffuseColor.rgb,waterTint,waterCoverage*waterPresentation);
      }
      float sand=step(.4,dryColor.r)*step(dryColor.b*1.3,dryColor.r)*step(dryColor.g*1.03,dryColor.r);
      float damp=exp(-abs(shoreDistance)*.10)*land*sand*waterPresentation;
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.72,.63,.44),sand*land*vTerrainTop*.35*waterPresentation);
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.32,.27,.18),damp*.65);
      // Broken moving breakers advance toward the bank, then dissolve into foam lace.
      float foam=0.;
      if(${options.fastPaths===false?'true':'waterCoverage*sea*waterPresentation>0.'}){
      float breaker=sin(shoreMetres*.32+sin(vTerrainPosition.y*.026)*.9+waterTime*1.6);
      float lace=.5+.5*sin(vTerrainPosition.x*.57+sin(vTerrainPosition.y*.49)*2.+waterTime*.3);
      foam=(smoothstep(.65,.96,breaker)*(.65+.35*lace)*exp(-shoreMetres*.045)
        +exp(-abs(shoreDistance)*.8)*.6)*waterCoverage*sea*waterPresentation;
      foam=clamp(foam,0.,.92);
      }
      float groundPatch=0.,soil=0.,grain=0.;
      if(${options.fastPaths===false?'true':'land*vTerrainTop>0.'}){groundPatch=terrainGrain(vTerrainPosition,12.0);soil=terrainGrain(vTerrainPosition,3.0);grain=terrainGrain(vTerrainPosition,.65);}
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
        // Derivatives stay outside the coverage branch, including field seams.
        if(abs(codes.z)>.5){float seam=abs(diagonal)*min(hi.x-lo.x,hi.y-lo.y)*.7;coverage*=smoothstep(.6,.6+max(fwidth(seam),.1),seam);}
        float rowPosition=fract(code)>.1?vTerrainPosition.y:vTerrainPosition.x;
        float rowFade=1.0-smoothstep(.5,2.0,fwidth(rowPosition));
        if(${options.fastPaths===false?'true':'coverage>0.'}){
        float rows=cos(rowPosition*3.14159265)*.055*rowFade;
        float headland=smoothstep(0.0,3.0,edge);
        float flowers=step(4.5,floor(code));
        float petals=0.;if(${options.fastPaths===false?'true':'flowers>0.'})petals=terrainGrain(vTerrainPosition,.45)*.35;
        vec3 crop=cropColor(floor(code))*(.88+.12*headland+rows*headland+soil*.08+flowers*petals);
        diffuseColor.rgb=mix(diffuseColor.rgb,crop,coverage);
        }
      }`)
      .replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
        roughnessFactor=mix(roughnessFactor,.30,waterCoverage);`)
      .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
        // Advected normals animate flow without displacing the collision surface.
        vec2 slope=vec2(0.);
        if(${options.fastPaths===false?'true':'waterCoverage>0.'}){
        vec2 wp=vTerrainPosition+vec2(-waterTime*1.8,waterTime*.7);wp+=vec2(sin(wp.y*.017),sin(wp.x*.011))*9.0;
        slope=vec2(cos(wp.x*.095+wp.y*.047)*.11+cos(wp.x*.33-wp.y*.19)*.045,
          cos(wp.x*.095+wp.y*.047)*.055-cos(wp.x*.33-wp.y*.19)*.03);
        slope*=mix(.45,1.,sea);
        vec3 waveNormal=normalize(vec3(-slope.x,1.0,-slope.y));
        normal=normalize(mix(normal,normalize(mat3(viewMatrix)*waveNormal),waterCoverage));
        }`)
      .replace('#include <opaque_fragment>',`
        // Analytic sunset sky reflection avoids a reflection camera or render target.
        if(${options.fastPaths===false?'true':'waterCoverage>0.'}){
        vec3 worldNormal=normalize(vec3(-slope.x,1.0,-slope.y));
        vec3 viewWorld=normalize(inverseTransformDirection(normalize(vViewPosition),viewMatrix));
        vec3 reflected=reflect(-viewWorld,worldNormal);
        float glint=pow(max(dot(reflected,waterSun),0.0),65.0);
        float fresnel=.08+.65*pow(1.0-max(dot(viewWorld,worldNormal),0.0),4.0);
        outgoingLight+=waterCoverage*(vec3(.13,.20,.36)*fresnel+vec3(1.8,.85,.32)*glint);
        outgoingLight=mix(outgoingLight,vec3(.88,.94,.88),foam*.86);
        }
        #include <opaque_fragment>`);
  };
  return {updateFields,updateTime(seconds:number){time.value=seconds;},dispose(){farms.dispose();},updateOrigin(x:number,z:number){origin.value.set(x,z);}};
}
