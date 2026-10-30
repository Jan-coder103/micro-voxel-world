import { airbaseHeight,AIRBASE } from './airbase';
import { regionalHash,regionalSample,regionLayout } from './regional-terrain';
import type { Bounds } from '../flight/collision';
import type { Point } from '../flight/flight';

export interface LandingBase { id:string;name:string;kind:'airfield'|'carrier';x:number;z:number;height:number;length:number;halfWidth:number }
export interface Ship { id:string;kind:'carrier'|'battleship';x:number;z:number;length:number;width:number;deck:number }
export interface Fleet { id:string;x:number;z:number;ships:Ship[] }
export interface ShipPart { x:number;y:number;z:number;w:number;h:number;d:number;color:number }
export const baseContains=(b:LandingBase,x:number,z:number,margin=0)=>Math.abs(x-b.x)<=b.halfWidth-margin&&Math.abs(z-b.z)<=b.length/2-margin;
export const baseSpawn=(b:LandingBase)=>({x:b.x,z:b.z+b.length/2-52});
/** Static original block silhouettes. Render and collision consume these same parts. */
export function shipParts(s:Ship):ShipPart[]{
  const parts:ShipPart[]=[],box=(x:number,y:number,z:number,w:number,h:number,d:number,color:number)=>parts.push({x:s.x+x,y,z:s.z+z,w,h,d,color});
  box(0,s.deck*.45,0,s.width*.83,s.deck*.9,s.length*.82,0);box(0,s.deck*.45,-s.length*.44,s.width*.52,s.deck*.9,s.length*.12,0);
  box(0,s.deck-.6,0,s.width,1.2,s.length,1);box(0,.6,0,s.width*.86,1.2,s.length*.84,2);
  if(s.kind==='carrier'){
    box(s.width*.43,s.deck+7,20,12,14,45,0);box(s.width*.43,s.deck+16,15,16,4,22,3);box(s.width*.43,s.deck+27,15,1.5,18,1.5,3);
    for(let z=-s.length/2+22;z<s.length/2-12;z+=22)box(0,s.deck+.04,z,1.2,.08,10,4);
    for(const x of [-21,21])box(x,s.deck+.04,0,.5,.08,s.length-12,4);
    for(const z of [-s.length/2+12,s.length/2-12])for(const x of [-14,-10,-6,6,10,14])box(x,s.deck+.04,z,2,.08,10,4);
    for(const z of [-40,-15,10]){box(-s.width*.39,s.deck+1.4,z,3,2.8,10,5);box(-s.width*.39,s.deck+1.5,z,8,.7,3,5);}
  }else{
    box(0,s.deck+7,0,s.width*.44,14,s.length*.3,0);box(0,s.deck+16,0,s.width*.26,4,13,3);box(0,s.deck+25,0,1.5,18,1.5,3);
    for(const z of [-s.length*.3,s.length*.3]){box(0,s.deck+3,z,s.width*.6,6,12,3);for(const x of [-3,0,3])box(x,s.deck+4,z+(z<0?-12:12),1.2,1.2,22,0);}
  }
  return parts;
}
export const partBounds=(p:ShipPart):Bounds=>({minX:p.x-p.w/2,maxX:p.x+p.w/2,minY:p.y-p.h/2,maxY:p.y+p.h/2,minZ:p.z-p.d/2,maxZ:p.z+p.d/2});
export class NavalWorld {
  readonly home:LandingBase;readonly flagship:Fleet;readonly oceanEdge:number;
  private cache=new Map<string,Fleet|null>();
  constructor(readonly seed:number){
    this.oceanEdge=regionLayout(seed).coast-300;
    this.home={id:'home',name:'Home airfield',kind:'airfield',x:0,z:AIRBASE.z,height:airbaseHeight(seed)+.16,length:480,halfWidth:22};
    this.flagship=this.makeFleet('flagship',regionLayout(seed).coast-1200,-1200);
  }
  private makeFleet(id:string,x:number,z:number):Fleet{
    const ships:Ship[]=[],count=6+Math.floor(regionalHash(this.seed,Math.floor(x),Math.floor(z),1701)*4);
    for(let i=0;i<count;i++){const carrier=i===0;ships.push({id:`${id}:${i}`,kind:carrier?'carrier':'battleship',x:x+(i===0?0:((i-1)%2?1:-1)*(260+Math.floor((i-1)/2)*120)),z:z+(i===0?0:(Math.floor((i-1)/2)-1)*330),length:carrier?440:130+regionalHash(this.seed,i,Math.floor(x),1702)*45,width:carrier?68:25,deck:carrier?18:10});}
    return {id,x,z,ships};
  }
  fleet(cx:number,cz:number):Fleet|null{
    const key=`${cx},${cz}`;if(this.cache.has(key))return this.cache.get(key)!;
    const x=(cx+.3+regionalHash(this.seed,cx,cz,1703)*.4)*8192,z=(cz+.3+regionalHash(this.seed,cx,cz,1704)*.4)*8192;
    let fleet:Fleet|null=null;
    if(regionalHash(this.seed,cx,cz,1705)<.38&&Math.hypot(x-this.flagship.x,z-this.flagship.z)>5000&&[-700,0,700].every(dx=>[-700,0,700].every(dz=>regionalSample(this.seed,x+dx,z+dz).biome==='ocean'))){const candidate=this.makeFleet(`fleet:${cx},${cz}`,x,z);if(candidate.ships.every(s=>[-s.width/2,0,s.width/2].every(dx=>Array.from({length:10},(_,i)=>-s.length/2+s.length*i/9).every(dz=>regionalSample(this.seed,s.x+dx,s.z+dz).biome==='ocean'))))fleet=candidate;}
    this.cache.set(key,fleet);if(this.cache.size>64)this.cache.delete(this.cache.keys().next().value!);return fleet;
  }
  nearby(x:number,z:number,radius=2600):Fleet[]{
    const fleets:Fleet[]=Math.hypot(x-this.flagship.x,z-this.flagship.z)<radius+800?[this.flagship]:[];
    for(let cz=Math.floor((z-radius-800)/8192);cz<=Math.floor((z+radius+800)/8192);cz++)for(let cx=Math.floor((x-radius-800)/8192);cx<=Math.floor((x+radius+800)/8192);cx++){const f=this.fleet(cx,cz);if(f&&Math.hypot(f.x-x,f.z-z)<radius+800)fleets.push(f);}return fleets;
  }
  carrierBase(ship:Ship):LandingBase{return {id:ship.id,name:`Carrier ${ship.id==='flagship:0'?'Resolute':ship.id.slice(6,-2)}`,kind:'carrier',x:ship.x,z:ship.z,height:ship.deck+.08,length:ship.length-8,halfWidth:22};}
  bases(p:Point):LandingBase[]{return [this.home,this.carrierBase(this.flagship.ships[0]),...this.nearby(p.x,p.z).filter(f=>f.id!=='flagship').map(f=>this.carrierBase(f.ships[0]))];}
  landingAt(x:number,z:number):LandingBase|undefined{if(baseContains(this.home,x,z))return this.home;if(x>this.oceanEdge)return undefined;return this.bases({x,y:0,z}).find(b=>baseContains(b,x,z));}
  deckAt(x:number,z:number):number|undefined{
    if(x>this.oceanEdge)return undefined;
    for(const f of this.nearby(x,z,600))for(const s of f.ships)if(Math.abs(x-s.x)<=s.width/2&&Math.abs(z-s.z)<=s.length/2)return s.deck+(s.kind==='carrier'?.08:0);return undefined;
  }
  obstacles(b:Bounds):Bounds[]{
    const result:Bounds[]=[];if(b.minX>this.oceanEdge)return result;for(const f of this.nearby((b.minX+b.maxX)/2,(b.minZ+b.maxZ)/2,800))for(const s of f.ships)for(const p of shipParts(s)){
      // Deck paint and parked aircraft are decorative; hull and superstructure are solid.
      if(p.color===1||p.color===4||p.color===5)continue;const box=partBounds(p);if(box.minX<=b.maxX&&box.maxX>=b.minX&&box.minZ<=b.maxZ&&box.maxZ>=b.minZ&&box.minY<=b.maxY&&box.maxY>=b.minY)result.push(box);
    }return result;
  }
}
