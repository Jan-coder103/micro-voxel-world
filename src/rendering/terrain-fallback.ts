import { BufferAttribute, BufferGeometry, Mesh, MeshStandardMaterial } from 'three';
import { heightAt } from '../streaming/terrain-data';
/** Reused coarse coverage beneath authoritative detail. Collision never samples this mesh. */
export function createTerrainFallback(seed:number, sample?: (x:number,z:number)=>{height:number;color:number[]}, spacing=32){
  const fieldSample=sample??((x:number,z:number)=>({height:heightAt(seed,x,z),color:[.41,.47,.29]}));
  const side=33,colors=new Float32Array(side*side*3),positions=new Float32Array(side*side*3),indices:number[]=[];
  for(let z=0;z<side-1;z++)for(let x=0;x<side-1;x++){const a=z*side+x,b=a+1,c=a+side,d=c+1;indices.push(a,c,b,b,c,d);}
  const geometry=new BufferGeometry();geometry.setAttribute('position',new BufferAttribute(positions,3));geometry.setIndex(indices);geometry.setAttribute('color',new BufferAttribute(colors,3));const material=new MeshStandardMaterial(sample?{vertexColors:true,roughness:1}:{color:'#68784b',roughness:1}),mesh=new Mesh(geometry,material);let anchorX=Infinity,anchorZ=Infinity,disposed=false;
  const update=(x:number,z:number)=>{if(disposed)return;const ax=Math.floor(x/64)*64,az=Math.floor(z/64)*64;if(ax===anchorX&&az===anchorZ)return;anchorX=ax;anchorZ=az;
    for(let iz=0;iz<side;iz++)for(let ix=0;ix<side;ix++){const px=(ix-16)*spacing,pz=(iz-16)*spacing,i=(iz*side+ix)*3;positions[i]=px;const field=fieldSample(ax+px,az+pz);positions[i+1]=field.height-2.5;colors.set(field.color,i);positions[i+2]=pz;}
    mesh.position.set(ax,0,az);geometry.getAttribute('position').needsUpdate=true;geometry.getAttribute('color').needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();
  };update(16,144);
  return {mesh,update,dispose(){if(disposed)return;disposed=true;mesh.removeFromParent();geometry.dispose();material.dispose();}};
}
