/** Bounded frame samples; repeated fixed ticks accumulate into their render frame. */
export class FrameProfile {
  readonly frames:Record<string,number>[]=[];
  current:Record<string,number>={};
  constructor(readonly capacity=600){}
  add(name:string,ms:number){this.current[name]=(this.current[name]??0)+ms;}
  finish(){this.frames.push(this.current);this.current={};if(this.frames.length>this.capacity)this.frames.shift();}
  reset(){this.frames.length=0;this.current={};}
  report(observedOnly:readonly string[]=[]){
    const names=new Set(this.frames.flatMap(f=>Object.keys(f)));
    return Object.fromEntries([...names].map(name=>{const values=this.frames.filter(f=>!observedOnly.includes(name)||name in f).map(f=>f[name]??0).sort((a,b)=>a-b);return [name,{mean:values.reduce((a,b)=>a+b,0)/values.length,p95:values[Math.ceil(values.length*.95)-1],max:values.at(-1)!,samples:values.length}];}));
  }
}
