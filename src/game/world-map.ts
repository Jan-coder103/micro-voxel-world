import { airbaseSample } from '../world/airbase';
import type { Frontier } from './frontier';
/** Fixed 48² terrain samples, painted only after pan/zoom. Never loads world chunks. */
export class WorldMap {
  x=0;z=0;span=8192;private cache='';private terrain:HTMLCanvasElement;
  constructor(readonly canvas:HTMLCanvasElement,readonly model:Frontier){this.terrain=document.createElement('canvas');this.terrain.width=this.terrain.height=384;canvas.width=canvas.height=768;}
  center(){this.x=this.model.flight.position.x;this.z=this.model.flight.position.z;this.draw();}
  pan(dx:number,dz:number){this.x=Math.max(-900000000,Math.min(900000000,this.x+dx*this.span/8));this.z=Math.max(-900000000,Math.min(900000000,this.z+dz*this.span/8));this.draw();}
  zoom(factor:number){this.span=Math.max(1024,Math.min(1800000000,this.span*factor));this.draw();}
  draw(){
    const ctx=this.canvas.getContext('2d')!,tile=this.terrain.getContext('2d')!,key=`${this.x},${this.z},${this.span}`;
    if(key!==this.cache){this.cache=key;for(let z=0;z<48;z++)for(let x=0;x<48;x++){
      const s=airbaseSample(this.model.seed,this.x+((x+.5)/48-.5)*this.span,this.z+((z+.5)/48-.5)*this.span);
      const water=s.water!==null;const shade=Math.min(1.3,.78+s.height/260);
      tile.fillStyle=water?'#294858':`rgb(${s.color.map(c=>Math.round(Math.min(1,c*shade)*255)).join(',')})`;tile.fillRect(x*8,z*8,8,8);
    }}
    ctx.imageSmoothingEnabled=false;ctx.drawImage(this.terrain,0,0,768,768);
    ctx.strokeStyle='#e8ddb322';ctx.lineWidth=1;for(let i=0;i<=8;i++){ctx.beginPath();ctx.moveTo(i*96,0);ctx.lineTo(i*96,768);ctx.moveTo(0,i*96);ctx.lineTo(768,i*96);ctx.stroke();}
    const mark=(x:number,z:number,label:string,color:string)=>{const px=(.5+(x-this.x)/this.span)*768,py=(.5+(z-this.z)/this.span)*768;if(px<0||px>768||py<0||py>768)return;ctx.fillStyle=color;ctx.fillRect(px-4,py-4,8,8);ctx.font='bold 13px monospace';ctx.fillText(label,Math.min(650,px+9),label.startsWith('YOU')?Math.min(730,py+22):Math.max(16,py-7));};
    for(const b of this.model.bases)mark(b.x,b.z,b.name,'#f2d08b');
    for(const m of this.model.mutants.nearby(this.model.flight.position))mark(m.position.x,m.position.z,m.kind,'#ed7967');
    const clusters=new Map<string,{x:number;z:number;count:number}>();
    for(const r of this.model.population.resident.values()){const t=r.targets.find(t=>t.health>0);if(!t)continue;
      const key=`${Math.floor((t.position.x-this.x)/this.span*16)},${Math.floor((t.position.z-this.z)/this.span*16)}`,c=clusters.get(key);
      if(c){c.x+=t.position.x;c.z+=t.position.z;c.count++;}else clusters.set(key,{x:t.position.x,z:t.position.z,count:1});
    }
    for(const c of clusters.values())mark(c.x/c.count,c.z/c.count,this.span<=4096?`${c.count} horde${c.count>1?'s':''}`:'','#eeaa68');
    const p=this.model.flight.position;mark(p.x,p.z,'YOU ▲','#a9ff9a');
    ctx.fillStyle='#ffffff';ctx.fillText(`N ↑  ·  ${(this.span/1000).toLocaleString()} km across`,15,749);
  }
}
