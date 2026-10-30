import type { Bounds } from '../flight/collision';
import { regionTrees } from './regional-terrain';
import type { SettlementWorld } from './settlements';
import { airbaseReserved } from './airbase';
const overlaps=(a:Bounds,b:Bounds)=>a.minX<=b.maxX&&a.maxX>=b.minX&&a.minY<=b.maxY&&a.maxY>=b.minY&&a.minZ<=b.maxZ&&a.maxZ>=b.minZ;
/** Same three cuboids as worker vegetation, available before meshes arrive. */
export class FrontierTrees {
  private chunks=new Map<string,Bounds[]>();
  constructor(private seed:number,private world:SettlementWorld){}
  get cachedChunks(){return this.chunks.size;}
  query(bounds:Bounds):Bounds[]{
    if(airbaseReserved(bounds.minX,bounds.minZ)&&airbaseReserved(bounds.maxX,bounds.maxZ))return [];
    const result:Bounds[]=[];
    for(let z=Math.floor((bounds.minZ-2)/32);z<=Math.floor((bounds.maxZ+2)/32);z++)for(let x=Math.floor((bounds.minX-2)/32);x<=Math.floor((bounds.maxX+2)/32);x++){
      const key=`${x},${z}`;let boxes=this.chunks.get(key);
      if(!boxes){boxes=[];for(const tree of regionTrees({seed:this.seed,x,z,lod:0,generator:'regional-v2'})){
        if(airbaseReserved(tree.x,tree.z)||this.world.reserved(tree.x,tree.z))continue;
        const box=(width:number,bottom:number,height:number)=>boxes!.push({minX:tree.x-width/2,maxX:tree.x+width/2,minZ:tree.z-width/2,maxZ:tree.z+width/2,minY:bottom,maxY:bottom+height});
        box(.65,tree.y-.2,tree.height);box(3.5,tree.y+tree.height*.45,tree.height*.6);box(2.2,tree.y+tree.height*.85,tree.height*.35);
      }this.chunks.set(key,boxes);if(this.chunks.size>64)this.chunks.delete(this.chunks.keys().next().value!);}
      result.push(...boxes.filter(b=>overlaps(b,bounds)));
    }
    return result;
  }
}
