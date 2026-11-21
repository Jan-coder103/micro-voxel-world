import { BoxGeometry,BufferGeometry,Float32BufferAttribute,type MeshStandardMaterial } from 'three';
export const TREE_DETAIL_START=420,TREE_DETAIL_END=700;
/** A single instanced draw: three detailed cuboids converge to the same far silhouette. */
export function createMorphTreeGeometry(){
  const positions:number[]=[],far:number[]=[],normals:number[]=[],colors:number[]=[];
  for(const [width,bottom,height] of [[.65,0,1],[3.5,.45,.6],[2.2,.85,.35]]){
    const source=new BoxGeometry(1,1,1),box=source.toNonIndexed(),p=box.getAttribute('position'),n=box.getAttribute('normal');
    for(let i=0;i<p.count;i++){
      positions.push(p.getX(i)*width/3.5,(bottom+(p.getY(i)+.5)*height)/1.15-.5,p.getZ(i)*width/3.5);
      far.push(p.getX(i),p.getY(i),p.getZ(i));normals.push(n.getX(i),n.getY(i),n.getZ(i));const color=width===.65?[.26,.19,.12]:width===2.2?[.22,.37,.15]:[.16,.29,.12];colors.push(color[0]/.16,color[1]/.29,color[2]/.12);
    }box.dispose();source.dispose();
  }
  const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(positions,3));g.setAttribute('farPosition',new Float32BufferAttribute(far,3));g.setAttribute('color',new Float32BufferAttribute(colors,3));g.setAttribute('normal',new Float32BufferAttribute(normals,3));g.computeBoundingSphere();return g;
}
export function configureTreeMorph(material:MeshStandardMaterial){
  material.vertexColors=true;
  material.onBeforeCompile=shader=>{
    shader.vertexShader='attribute vec3 farPosition;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('void main() {',`void main() { vec3 treeCenter=(modelMatrix*instanceMatrix*vec4(0.,0.,0.,1.)).xyz;
      float treeBlend=smoothstep(${TREE_DETAIL_START.toFixed(1)},${TREE_DETAIL_END.toFixed(1)},distance(cameraPosition,treeCenter));
      `);
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','vec3 transformed=mix(position,farPosition,treeBlend);').replace('#include <color_vertex>','#include <color_vertex>\nvColor.xyz=mix(vColor.xyz,vec3(1.),treeBlend);');
  };material.customProgramCacheKey=()=> 'frontier-tree-morph-v1';
}

/** One box exactly matches the three coincident boxes at the end of the morph. */
export function createFarTreeGeometry(){
  const source=new BoxGeometry(1,1,1),g=source.toNonIndexed();source.dispose();
  g.setAttribute('farPosition',g.getAttribute('position').clone());
  g.setAttribute('color',new Float32BufferAttribute(new Float32Array(g.getAttribute('position').count*3).fill(1),3));
  g.computeBoundingSphere();return g;
}
