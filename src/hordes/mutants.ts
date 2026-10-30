import type { Target,TargetQuery } from '../combat/weapons';
import type { Point } from '../flight/flight';
import type { Bounds } from '../flight/collision';
import type { StorageLike } from '../persistence/chunk-deltas';
import { airbaseReserved } from '../world/airbase';
import { regionalHash,regionalSample } from '../world/regional-terrain';
export interface Mutant extends Target { kind:'brute'|'colossus';height:number;ground:number;cash:number;xp:number }
export interface MutantPart { x:number;y:number;z:number;w:number;h:number;d:number;color:number }
/** Original block-built zombie silhouette, with colossal dorsal spines and a heavy tail. */
export function mutantParts(t:Mutant):MutantPart[]{
  const h=t.height,x=t.position.x,z=t.position.z,y=t.ground;
  const parts:MutantPart[]=[],box=(px:number,py:number,pz:number,w:number,ph:number,d:number,color:number)=>parts.push({x:x+px*h,y:y+py*h,z:z+pz*h,w:w*h,h:ph*h,d:d*h,color});
  box(0,.57,0,.34,.38,.23,0);box(0,.86,-.025,.23,.24,.25,1);
  for(const side of [-1,1]){box(side*.11,.21,0,.15,.42,.17,2);box(side*.245,.53,-.03,.14,.38,.15,1);box(side*.11,.04,-.06,.17,.08,.28,2);box(side*.068,.89,-.154,.045,.025,.015,3);}
  box(0,.82,-.155,.11,.04,.015,4);
  if(t.kind==='colossus'){box(0,.27,.25,.16,.17,.5,0);box(0,.18,.53,.10,.13,.24,0);for(let i=0;i<5;i++)box(0,.42+i*.085,.15,.07,.1,.12,4);}
  return parts;
}
export function mutantBounds(t:Mutant):Bounds[]{return mutantParts(t).filter(p=>p.color!==3).map(p=>({minX:p.x-p.w/2,maxX:p.x+p.w/2,minY:p.y-p.h/2,maxY:p.y+p.h/2,minZ:p.z-p.d/2,maxZ:p.z+p.d/2}));}
export class Mutants implements TargetQuery {
  readonly key:string;readonly landmark:Mutant;error='';revision=0;
  private cache=new Map<string,Mutant|null>();private wounds=new Map<string,number>();private writable=true;
  constructor(readonly seed:number,private storage?:StorageLike){
    this.key=`mvw:frontier:mutants:v1:${seed}`;
    try{if(!storage)throw new Error('Mutant saves unavailable');const text=storage.getItem(this.key);if(text!==null){if(text.length>196608)throw new Error('Mutant save too large');const v=JSON.parse(text);if(v.schema!==1||v.seed!==seed||!Array.isArray(v.wounds)||v.wounds.length>2048)throw new Error('Invalid mutant save');const loaded=new Map<string,number>();for(const pair of v.wounds){if(!Array.isArray(pair)||pair.length!==2||typeof pair[0]!=='string'||pair[0].length>64||!/^mutant:(landmark|-?\d+,-?\d+)$/.test(pair[0])||!Number.isFinite(pair[1])||pair[1]<0||pair[1]>24000||loaded.has(pair[0]))throw new Error('Invalid mutant wound');loaded.set(pair[0],pair[1]);}this.wounds=loaded;}}catch(e){this.error=String(e);this.writable=false;}
    let landmark:Mutant|undefined;
    for(let z=-600;z>=-1800&&!landmark;z-=200)for(let x=400;x<=1400&&!landmark;x+=200)landmark=this.spawn('mutant:landmark',x,z,'colossus')??undefined;
    // The broad inland southern plains always provide dry land after this fallback search.
    this.landmark=landmark??this.build('mutant:landmark',2600,-2600,'colossus');
  }
  private build(id:string,x:number,z:number,kind:'brute'|'colossus'):Mutant{
    const ground=regionalSample(this.seed,x,z).height,height=kind==='colossus'?125:24,maxHealth=kind==='colossus'?24000:3500;
    const t:Mutant={id,kind,height,ground,position:{x,y:ground+height*.5,z},radius:height*.8,maxHealth,health:Math.min(maxHealth,this.wounds.get(id)??maxHealth),cash:kind==='colossus'?4000:600,xp:kind==='colossus'?6000:900};
    t.hitSpheres=mutantParts(t).filter(p=>p.color!==3).map(p=>({position:{x:p.x,y:p.y,z:p.z},radius:Math.min(p.w,p.h,p.d)*.55}));return t;
  }
  private spawn(id:string,x:number,z:number,kind:'brute'|'colossus'):Mutant|null{
    const s=regionalSample(this.seed,x,z),r=kind==='colossus'?65:16;
    if(s.water!==null||s.height>80||airbaseReserved(x,z,r)||[[-r,-r],[r,-r],[-r,r],[r,r]].some(([dx,dz])=>{const p=regionalSample(this.seed,x+dx,z+dz);return p.water!==null||Math.abs(p.height-s.height)>10;}))return null;
    return this.build(id,x,z,kind);
  }
  at(cx:number,cz:number):Mutant|null{
    const id=`mutant:${cx},${cz}`;if(this.cache.has(id))return this.cache.get(id)!;
    let t:Mutant|null=null;
    if(regionalHash(this.seed,cx,cz,1800)<.55){const x=(cx+.2+regionalHash(this.seed,cx,cz,1801)*.6)*1536,z=(cz+.2+regionalHash(this.seed,cx,cz,1802)*.6)*1536;if(Math.hypot(x-this.landmark.position.x,z-this.landmark.position.z)>400)t=this.spawn(id,x,z,regionalHash(this.seed,cx,cz,1803)<.22?'colossus':'brute');}
    this.cache.set(id,t);if(this.cache.size>128)this.cache.delete(this.cache.keys().next().value!);return t;
  }
  nearby(p:Point,radius=2200):Mutant[]{
    const result:Mutant[]=[];if(this.landmark.health>0&&Math.hypot(p.x-this.landmark.position.x,p.z-this.landmark.position.z)<radius+200)result.push(this.landmark);
    for(let z=Math.floor((p.z-radius-200)/1536);z<=Math.floor((p.z+radius+200)/1536);z++)for(let x=Math.floor((p.x-radius-200)/1536);x<=Math.floor((p.x+radius+200)/1536);x++){const t=this.at(x,z);if(t&&t.health>0&&Math.hypot(p.x-t.position.x,p.z-t.position.z)<radius+200)result.push(t);}return result;
  }
  query(min:Point,max:Point){return this.nearby({x:(min.x+max.x)/2,y:0,z:(min.z+max.z)/2},Math.max(max.x-min.x,max.z-min.z)/2+200).filter(t=>t.position.x+t.radius>=min.x&&t.position.x-t.radius<=max.x&&t.position.y+t.radius>=min.y&&t.position.y-t.radius<=max.y&&t.position.z+t.radius>=min.z&&t.position.z-t.radius<=max.z);}
  obstacles(b:Bounds){return this.query({x:b.minX,y:b.minY,z:b.minZ},{x:b.maxX,y:b.maxY,z:b.maxZ}).flatMap(t=>mutantBounds(t));}
  damaged(t:Target){if(t.id.length>64||!/^mutant:(landmark|-?\d+,-?\d+)$/.test(t.id)||!Number.isFinite(t.health)||t.health<0||t.health>t.maxHealth)throw new Error('Invalid mutant damage');this.wounds.set(t.id,t.health);this.revision++;
    if(this.writable)try{if(this.wounds.size>2048)throw new Error('Mutant save limit reached');const text=JSON.stringify({schema:1,seed:this.seed,wounds:[...this.wounds]});if(text.length>196608)throw new Error('Mutant save too large');this.storage!.setItem(this.key,text);}catch(e){this.error=String(e);this.writable=false;}
  }
}
