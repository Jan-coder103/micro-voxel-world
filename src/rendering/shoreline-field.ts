/** Render-only mirror of naturalSample's unrounded basin height. The coastline
 * must be evaluated at world pixels, not inferred from a moving terrain triangle.
 * Keep salts/profiles in sync with regional-terrain; browser tests compare both.
 */
export const SHORELINE_FIELD_GLSL=`
  uniform uint shorelineSeed;
  uniform vec2 shorelineLayout;
  uniform float shorelinePhase;
  float shoreHash(ivec2 cell,uint salt){
    uint h=shorelineSeed^(uint(cell.x)*374761393u)^(uint(cell.y)*668265263u)^salt;
    h=(h^(h>>13u))*1274126177u;return float(h^(h>>16u))/4294967296.;
  }
  float shoreNoise(vec2 p,float scale,uint salt){
    vec2 cell=floor(p/scale),f=fract(p/scale);f=f*f*(3.-2.*f);ivec2 c=ivec2(cell);
    return mix(mix(shoreHash(c,salt),shoreHash(c+ivec2(1,0),salt),f.x),
      mix(shoreHash(c+ivec2(0,1),salt),shoreHash(c+ivec2(1,1),salt),f.x),f.y);
  }
  float shorelineHeight(vec2 p){
    float coast=shorelineLayout.x+shoreNoise(vec2(0.,p.y),700.,8u)*160.;
    float inland=p.x-coast;
    float mountain=smoothstep(300.,900.,p.y)*smoothstep(1000.,1650.,inland);
    float ridge=1.-abs(shoreNoise(p,320.,5u)*2.-1.);
    float land=clamp(inland*.018,-55.,60.)-7.+(shoreNoise(p,620.,1u)-.5)*18.
      +(shoreNoise(p,95.,2u)-.5)*5.+(shoreNoise(p,23.,3u)-.5)*.8+mountain*ridge*170.;
    float lakeX=shorelineLayout.y;
    float riverZ=shorelineLayout.x+1400.+100.*sin(p.x/570.+shorelinePhase);
    float rd=abs(p.y-riverZ),reach=p.x;
    if(p.x<lakeX-210.)reach=shorelineLayout.x+(p.x-shorelineLayout.x)*(lakeX-shorelineLayout.x)/(lakeX-210.-shorelineLayout.x);
    else if(p.x<=lakeX+210.)reach=lakeX;else reach=p.x-210.;
    float level=clamp((reach-shorelineLayout.x)*.012,0.,55.);
    float offset=-3.+max(0.,rd-12.)*.18;
    float river=level+min(0.,offset)+max(0.,offset)*smoothstep(0.,3.,level);
    float lakeZ=shorelineLayout.x+1400.+100.*sin(lakeX/570.+shorelinePhase)+65.;
    float ld=length((p-vec2(lakeX,lakeZ))/vec2(155.,110.));
    float lake=(lakeX-shorelineLayout.x)*.012-5.+max(0.,ld-.65)*19.;
    float rw=1.-smoothstep(50.,140.,rd),lw=1.-smoothstep(1.3,1.8,ld),weight=max(rw,lw);
    if(rw==0.)return mix(land,lake,lw);if(lw==0.)return mix(land,river,rw);
    float lowWeight=river<lake?rw:lw;
    return land*(1.-weight)+max(river,lake)*(weight-lowWeight)+min(river,lake)*lowWeight;
  }
`;
