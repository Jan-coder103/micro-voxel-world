import type { Target,TargetQuery } from '../combat/weapons';
import type { Point } from '../flight/flight';
import type { Bounds } from '../flight/collision';
import type { StorageLike } from '../persistence/chunk-deltas';
import { airbaseReserved } from '../world/airbase';
import { regionalHash,regionalSample } from '../world/regional-terrain';
export interface Mutant extends Target { kind:'brute'|'colossus'|'spider';height:number;ground:number;cash:number;xp:number;attackCharge?:number;attackCooldown?:number }
export interface MutantPart { x:number;y:number;z:number;w:number;h:number;d:number;color:number;axis?:Point }
/** Original block-built zombie silhouette, with colossal dorsal spines and a heavy tail. */
export function mutantParts(t:Mutant,detailed=true):MutantPart[]{
  const h=t.height,x=t.position.x,z=t.position.z,y=t.ground;
  const parts:MutantPart[]=[],box=(px:number,py:number,pz:number,w:number,ph:number,d:number,color:number)=>parts.push({x:x+px*h,y:y+py*h,z:z+pz*h,w:w*h,h:ph*h,d:d*h,color});
  if(t.kind==='spider'){
    // Low armored abdomen, raised thorax, eight elbowed legs and paired fangs.
    for(let i=0;i<5;i++)box(0,.43+i*.055,.23,.72-Math.abs(i-2)*.10,.09,.72-Math.abs(i-2)*.09,5);
    box(0,.46,-.24,.45,.27,.40,6);box(0,.43,-.46,.36,.20,.20,5);
    for(const side of [-1,1]){
      for(let leg=0;leg<4;leg++){
        const z0=-.36+leg*.23,kx=side*(.88+Math.sin(leg/3*Math.PI)*.32),kz=z0+(leg-1.5)*.23;
        const tx=side*(1.15+Math.sin(leg/3*Math.PI)*.4),tz=kz+(leg-1.5)*.18;
        const segment=(ax:number,ay:number,az:number,bx:number,by:number,bz:number)=>{
          const dx=bx-ax,dy=by-ay,dz=bz-az,length=Math.hypot(dx,dy,dz);
          parts.push({x:x+(ax+bx)*h/2,y:y+(ay+by)*h/2,z:z+(az+bz)*h/2,
            w:.065*h,h:length*h,d:.065*h,color:6,axis:{x:dx/length,y:dy/length,z:dz/length}});
        };
        segment(side*.22,.47,z0,kx,.89,kz);segment(kx,.89,kz,tx,.055,tz);
        box(kx,.89,kz,.12,.13,.12,7);
      }
      box(side*.10,.46,-.572,.065,.055,.025,3);box(side*.035,.51,-.572,.038,.04,.025,3);
      box(side*.13,.30,-.58,.07,.23,.08,7);
    }
    for(let i=0;i<4;i++)box(0,.71,.04+i*.13,.09,.15,.09,7);
    return parts;
  }
  box(0,.57,0,.34,.38,.23,0);box(0,.86,-.025,.23,.24,.25,1);
  for(const side of [-1,1]){box(side*.11,.21,0,.15,.42,.17,2);box(side*.245,.53,-.03,.14,.38,.15,1);box(side*.11,.04,-.06,.17,.08,.28,2);box(side*.068,.89,-.154,.045,.025,.015,3);}
  box(0,.82,-.155,.11,.04,.015,4);
  if(detailed){
    // Layered anatomy: clavicles, ribs, torn muscle, necrotic wounds and exposed jaw.
    for(const side of [-1,1]){
      box(side*.105,.67,-.129,.16,.10,.05,1);
      box(side*.19,.70,0,.13,.14,.24,0);
      box(side*.25,.57,-.115,.13,.21,.045,8);
      box(side*.25,.39,-.06,.12,.13,.14,0);
      for(let finger=0;finger<4;finger++)box(side*(.20+finger*.033),.30,-.12,.025,.11+finger*.008,.04,4);
      for(let rib=0;rib<6;rib++)box(side*.11,.64-rib*.035,-.13,.12,.014,.035,rib%3===0?4:1);
      box(side*.12,.23,-.095,.13,.12,.05,1);box(side*.11,.09,-.09,.12,.19,.04,8);
      box(side*.075,.925,-.16,.075,.025,.032,0);
      box(side*.105,.87,-.16,.045,.065,.032,8);
      box(side*.125,.88,.015,.04,.065,.08,1);
      for(let tooth=0;tooth<4;tooth++)box(side*(.012+tooth*.018),.816,-.169,.012,.028,.016,4);
      for(let i=0;i<9;i++)box(side*(.15+i%3*.019),.52+Math.floor(i/3)*.043,.13,.024,.022,.034,8);
      if((t.attackCharge??0)>0)box(side*.24,.62,-.25,.13,.12,.45,1);
    }
    for(const face of [-1,1])for(let row=0;row<10;row++)for(let col=0;col<6;col++){
      const n=Math.sin(row*17.1+col*9.7+face*3),px=(col-2.5)*.048,py=.41+row*.029;
      box(px,py,face*(.119+Math.abs(n)*.012),.035+Math.abs(n)*.012,.020,.023,n>.66?8:n<-.7?4:row%3===0?1:0);
    }
    for(const side of [-1,1])for(let toe=0;toe<4;toe++)box(side*.11+(toe-1.5)*.035,.043,-.205,.027,.04,.035,4);
    box(0,.87,-.17,.035,.065,.05,1);box(0,.79,-.14,.16,.045,.09,1);
    for(let i=0;i<8;i++)box(0,.40+i*.044,.135,.045,.028,.055,4);
    for(let i=0;i<16;i++)box((i%4-1.5)*.06,.45+Math.floor(i/4)*.05,-.135,.037,.027,.025,i%3===0?8:0);
    if(t.kind==='colossus')for(const side of [-1,1])for(let i=0;i<8;i++)box(side*(.16+i*.012),.77-i*.019,.04,.045,.12-i*.008,.06,4);
  }
  if(t.kind==='colossus'){box(0,.27,.25,.16,.17,.5,0);box(0,.18,.53,.10,.13,.24,0);for(let i=0;i<5;i++)box(0,.42+i*.085,.15,.07,.1,.12,4);}
  return parts;
}
export function mutantBounds(t:Mutant):Bounds[]{return mutantParts(t,false).filter(p=>p.color!==3).map(p=>{
  const ex=p.axis?Math.abs(p.axis.x)*p.h/2+p.w*.71:p.w/2;
  const ey=p.axis?Math.abs(p.axis.y)*p.h/2+p.w*.71:p.h/2;
  const ez=p.axis?Math.abs(p.axis.z)*p.h/2+p.w*.71:p.d/2;
  return {minX:p.x-ex,maxX:p.x+ex,minY:p.y-ey,maxY:p.y+ey,minZ:p.z-ez,maxZ:p.z+ez};
});}
export function mutantHitSpheres(t:Mutant){return mutantParts(t,false).filter(p=>p.color!==3).flatMap(p=>{
  if(!p.axis)return [{position:{x:p.x,y:p.y,z:p.z},radius:Math.min(p.w,p.h,p.d)*.55}];
  const axis=p.axis,n=Math.ceil(p.h/p.w);
  return Array.from({length:n},(_,i)=>{const offset=((i+.5)/n-.5)*p.h;
    return {position:{x:p.x+axis.x*offset,y:p.y+axis.y*offset,z:p.z+axis.z*offset},radius:p.w*.72};});
});}

export class Mutants implements TargetQuery {
  readonly key:string;readonly landmark:Mutant;readonly spider:Mutant;error='';revision=0;
  private movementTime=0;
  private roaming=new Map<string,{x:number;z:number;time:number}>();
  private cache=new Map<string,Mutant|null>();private wounds=new Map<string,number>();private writable=true;
  constructor(readonly seed:number,private storage?:StorageLike){
    this.key=`mvw:frontier:mutants:v1:${seed}`;
    try{if(!storage)throw new Error('Mutant saves unavailable');const text=storage.getItem(this.key);if(text!==null){if(text.length>196608)throw new Error('Mutant save too large');const v=JSON.parse(text);if(v.schema!==1||v.seed!==seed||!Array.isArray(v.wounds)||v.wounds.length>2048)throw new Error('Invalid mutant save');const loaded=new Map<string,number>();for(const pair of v.wounds){if(!Array.isArray(pair)||pair.length!==2||typeof pair[0]!=='string'||pair[0].length>64||!/^mutant:(landmark|spider|-?\d+,-?\d+)$/.test(pair[0])||!Number.isFinite(pair[1])||pair[1]<0||pair[1]>24000||loaded.has(pair[0]))throw new Error('Invalid mutant wound');loaded.set(pair[0],pair[1]);}this.wounds=loaded;}}catch(e){this.error=String(e);this.writable=false;}
    let landmark:Mutant|undefined;
    for(let z=-600;z>=-1800&&!landmark;z-=200)for(let x=400;x<=1400&&!landmark;x+=200)landmark=this.spawn('mutant:landmark',x,z,'colossus')??undefined;
    // The broad inland southern plains always provide dry land after this fallback search.
    this.landmark=landmark??this.build('mutant:landmark',2600,-2600,'colossus');
    let spider:Mutant|undefined;
    for(let z=-300;z>=-1500&&!spider;z-=200)for(let x=700;x<=1900&&!spider;x+=200){
      if(Math.hypot(x-this.landmark.position.x,z-this.landmark.position.z)>350)spider=this.spawn('mutant:spider',x,z,'spider')??undefined;
    }
    this.spider=spider??this.build('mutant:spider',2200,-2200,'spider');
  }
  private build(id:string,x:number,z:number,kind:'brute'|'colossus'|'spider'):Mutant{
    const ground=regionalSample(this.seed,x,z).height,height=kind==='colossus'?125:kind==='spider'?64:24,maxHealth=kind==='colossus'?24000:kind==='spider'?12000:3500;
    const t:Mutant={id,kind,height,ground,position:{x,y:ground+height*.5,z},radius:height*(kind==='spider'?1.8:.8),maxHealth,health:Math.min(maxHealth,this.wounds.get(id)??maxHealth),cash:kind==='colossus'?4000:kind==='spider'?2200:600,xp:kind==='colossus'?6000:kind==='spider'?3200:900};
    t.hitSpheres=mutantHitSpheres(t);return t;
  }
  private spawn(id:string,x:number,z:number,kind:'brute'|'colossus'|'spider'):Mutant|null{
    const s=regionalSample(this.seed,x,z),r=kind==='colossus'?65:kind==='spider'?110:16;
    if(s.water!==null||s.height>80||airbaseReserved(x,z,r)||[[-r,-r],[r,-r],[-r,r],[r,r]].some(([dx,dz])=>{const p=regionalSample(this.seed,x+dx,z+dz);return p.water!==null||Math.abs(p.height-s.height)>10;}))return null;
    return this.build(id,x,z,kind);
  }
  at(cx:number,cz:number):Mutant|null{
    const id=`mutant:${cx},${cz}`;if(this.cache.has(id))return this.cache.get(id)!;
    let t:Mutant|null=null;
    if(regionalHash(this.seed,cx,cz,1800)<.55){const x=(cx+.2+regionalHash(this.seed,cx,cz,1801)*.6)*1536,z=(cz+.2+regionalHash(this.seed,cx,cz,1802)*.6)*1536;if(Math.hypot(x-this.landmark.position.x,z-this.landmark.position.z)>400)t=this.spawn(id,x,z,regionalHash(this.seed,cx,cz,1803)<.22?'colossus':regionalHash(this.seed,cx,cz,1804)<.42?'spider':'brute');}
    this.cache.set(id,t);if(this.cache.size>128)this.cache.delete(this.cache.keys().next().value!);return t;
  }
  nearby(p:Point,radius=2200):Mutant[]{
    const result:Mutant[]=[];if(this.landmark.health>0&&Math.hypot(p.x-this.landmark.position.x,p.z-this.landmark.position.z)<radius+200)result.push(this.landmark);
    if(this.spider.health>0&&Math.hypot(p.x-this.spider.position.x,p.z-this.spider.position.z)<radius+200)result.push(this.spider);
    for(let z=Math.floor((p.z-radius-200)/1536);z<=Math.floor((p.z+radius+200)/1536);z++)for(let x=Math.floor((p.x-radius-200)/1536);x<=Math.floor((p.x+radius+200)/1536);x++){const t=this.at(x,z);if(t&&t.health>0&&Math.hypot(p.x-t.position.x,p.z-t.position.z)<radius+200)result.push(t);}return result;
  }
  /** Only nearby living giants consume movement work; roam within their spawn cell. */
  step(player:Point,dt:number){
    this.movementTime+=dt;if(this.movementTime<.2)return;dt=this.movementTime;this.movementTime=0;
    for(const t of this.nearby(player,850)){
      if(Math.hypot(player.x-t.position.x,player.y-t.position.y,player.z-t.position.z)>850)continue;
      let roam=this.roaming.get(t.id);if(!roam){roam={x:t.position.x,z:t.position.z,time:0};this.roaming.set(t.id,roam);if(this.roaming.size>128)this.roaming.delete(this.roaming.keys().next().value!);}
      roam.time+=dt;
      const phase=regionalHash(this.seed,Math.floor(roam.x),Math.floor(roam.z),1810)*Math.PI*2;
      const speed=t.kind==='colossus'?.9:t.kind==='spider'?1.4:.6,angle=Math.hypot(player.x-t.position.x,player.z-t.position.z)<t.height*2+100?Math.atan2(player.z-t.position.z,player.x-t.position.x):phase+roam.time*.018;
      const x=t.position.x+Math.cos(angle)*speed*dt,z=t.position.z+Math.sin(angle)*speed*dt;
      if(Math.hypot(x-roam.x,z-roam.z)>90)continue;
      const candidate=this.spawn(t.id,x,z,t.kind);if(!candidate)continue;
      Object.assign(t,{position:candidate.position,ground:candidate.ground,hitSpheres:candidate.hitSpheres});this.revision++;
    }
  }
  /** Telegraph a close-range strike for one second; leaving reach evades it. */
  attack(player:Point,dt:number){
    let struck=false;
    for(const t of this.nearby(player,320)){
      t.attackCooldown=Math.max(0,(t.attackCooldown??0)-dt);
      const close=Math.hypot(player.x-t.position.x,player.z-t.position.z)<t.height*.65+24&&player.y>t.ground&&player.y<t.ground+t.height*1.15;
      if(!close||t.attackCooldown>0){if(t.attackCharge){t.attackCharge=0;this.revision++;}continue;}
      if(!t.attackCharge)this.revision++;
      t.attackCharge=(t.attackCharge??0)+dt;
      if(t.attackCharge>=1){struck=true;t.attackCharge=0;t.attackCooldown=4;this.revision++;}
    }
    return struck;
  }
  query(min:Point,max:Point){return this.nearby({x:(min.x+max.x)/2,y:0,z:(min.z+max.z)/2},Math.max(max.x-min.x,max.z-min.z)/2+200).filter(t=>t.position.x+t.radius>=min.x&&t.position.x-t.radius<=max.x&&t.position.y+t.radius>=min.y&&t.position.y-t.radius<=max.y&&t.position.z+t.radius>=min.z&&t.position.z-t.radius<=max.z);}
  obstacles(b:Bounds){return this.query({x:b.minX,y:b.minY,z:b.minZ},{x:b.maxX,y:b.maxY,z:b.maxZ}).flatMap(t=>mutantBounds(t));}
  damaged(t:Target){if(t.id.length>64||!/^mutant:(landmark|spider|-?\d+,-?\d+)$/.test(t.id)||!Number.isFinite(t.health)||t.health<0||t.health>t.maxHealth)throw new Error('Invalid mutant damage');this.wounds.set(t.id,t.health);this.revision++;
    if(this.writable)try{if(this.wounds.size>2048)throw new Error('Mutant save limit reached');const text=JSON.stringify({schema:1,seed:this.seed,wounds:[...this.wounds]});if(text.length>196608)throw new Error('Mutant save too large');this.storage!.setItem(this.key,text);}catch(e){this.error=String(e);this.writable=false;}
  }
}
