import { BufferGeometry,DataTexture,DoubleSide,Float32BufferAttribute,LinearMipmapLinearFilter,MeshStandardMaterial,NearestFilter,RGBAFormat,type Sphere,type Vector3 } from 'three';
export const TREE_SPRITE_START=1000,TREE_SPRITE_END=1080;
/** Crossed upright cards retain a silhouette from oblique views; steep views use geometry. */
export function treeSpriteMode(camera:Vector3,bounds:Sphere,enabled:boolean,shadowed:boolean){
  const distance=camera.distanceTo(bounds.center),horizontal=Math.hypot(camera.x-bounds.center.x,camera.z-bounds.center.z);
  if(!enabled||shadowed||Math.abs(camera.y-bounds.center.y)>.65*Math.max(1,horizontal-bounds.radius)||distance-bounds.radius<700||distance<=TREE_SPRITE_START)return 'geometry';
  return distance>=TREE_SPRITE_END?'sprite':'transition';
}
export function createTreeSpriteGeometry(){
  const g=new BufferGeometry();
  g.setAttribute('position',new Float32BufferAttribute([-.5,-.5,0,.5,-.5,0,.5,.5,0,-.5,.5,0,0,-.5,-.5,0,-.5,.5,0,.5,.5,0,.5,-.5],3));
  g.setAttribute('normal',new Float32BufferAttribute([0,0,1,0,0,1,0,0,1,0,0,1,1,0,0,1,0,0,1,0,0,1,0,0],3));
  g.setAttribute('uv',new Float32BufferAttribute([0,0,1,0,1,1,0,1,0,0,1,0,1,1,0,1],2));
  g.setIndex([0,1,2,0,2,3,4,5,6,4,6,7]);g.computeBoundingSphere();return g;
}
/** Small shared code-authored voxel silhouettes. No image downloads or external assets. */
export function createTreeSpriteTexture(){
  const width=64,height=32,data=new Uint8Array(width*height*4);
  for(let variant=0;variant<4;variant++)for(let y=0;y<height;y++)for(let x=0;x<16;x++){
    const mid=7.5,half=y<5?1.5:y<9?5:y>28?4.5:y>25?6:7-(variant%2)*.5;
    const filled=Math.abs(x-mid)<=half&&y<31,at=(y*width+variant*16+x)*4;
    const value=y<5?180:225+((x+variant*3)%5)*6;
    data.set([value,value,value,filled?255:0],at);
  }
  const texture=new DataTexture(data,width,height,RGBAFormat);texture.magFilter=NearestFilter;texture.minFilter=LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;return texture;
}
const dither=`float treeNoise=fract(52.9829189*fract(dot(floor(gl_FragCoord.xy),vec2(.06711056,.00583715))));\nfloat treeFade=treeSpriteFade;`;
/** Complementary screen-door cutouts; opaque depth writes, no alpha blending/sorting. */
export function configureTreeSpriteFade(material:MeshStandardMaterial,sprite:boolean,blend={value:1}){
  const original=material.onBeforeCompile,cacheKey=material.customProgramCacheKey();
  material.onBeforeCompile=(shader,renderer)=>{
    original.call(material,shader,renderer);
    shader.uniforms.treeSpriteFade=blend;
    if(sprite)shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>',`#include <uv_vertex>\nvMapUv.x=(vMapUv.x+mod(floor(instanceMatrix[3].x)+floor(instanceMatrix[3].z),4.))/4.;`);
    shader.fragmentShader='uniform float treeSpriteFade;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <alphatest_fragment>',`#include <alphatest_fragment>\n${dither}\nif(${sprite?'treeFade<=treeNoise':'treeFade>treeNoise'})discard;`);
  };
  material.customProgramCacheKey=()=>cacheKey+'-tree-sprite-fade-'+sprite;
}
export function createTreeSpriteMaterial(texture:DataTexture,blend={value:1}){
  const material=new MeshStandardMaterial({color:0xffffff,map:texture,alphaTest:.5,side:DoubleSide,roughness:1});material.color.setRGB(.16,.29,.12);configureTreeSpriteFade(material,true,blend);return material;
}
