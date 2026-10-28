import { validateSource } from './voxel-source.ts';
import type { CollisionBox } from '../flight/collision.ts';

/** Exact disjoint solid boxes, merging occupancy regardless of palette. Offline derivation only. */
export function voxelCollisionBoxes(value:unknown,yOffset=0):CollisionBox[] {
  const source=validateSource(value),key=(x:number,y:number,z:number)=>x+256*y+65536*z;
  const occupied=new Set(source.cells.map(c=>key(...c.position))),boxes:CollisionBox[]=[];
  const ordered=source.cells.map(c=>c.position).sort((a,b)=>a[2]-b[2]||a[1]-b[1]||a[0]-b[0]);
  for(const [x,y,z] of ordered){
    if(!occupied.has(key(x,y,z)))continue;let w=1,h=1,d=1;
    while(x+w<source.size[0]&&occupied.has(key(x+w,y,z)))w++;
    const row=(yy:number,zz:number)=>{for(let xx=x;xx<x+w;xx++)if(!occupied.has(key(xx,yy,zz)))return false;return true;};
    while(y+h<source.size[1]&&row(y+h,z))h++;
    layer:while(z+d<source.size[2]){for(let yy=y;yy<y+h;yy++)if(!row(yy,z+d))break layer;d++;}
    for(let zz=z;zz<z+d;zz++)for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)occupied.delete(key(xx,yy,zz));
    const v=source.voxelSize;
    boxes.push([(x+w/2)*v-source.size[0]*v/2,(y+h/2)*v+yOffset,(z+d/2)*v-source.size[2]*v/2,w*v,h*v,d*v].map(n=>Math.round(n*100000)/100000) as unknown as CollisionBox);
  }
  return boxes;
}
