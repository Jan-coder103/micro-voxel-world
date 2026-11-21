/** In-place nearest-rank selection on a temporary report column; never mutates frames. */
export function percentile95(values:number[]){
  const rank=Math.ceil(values.length*.95)-1;let lo=0,hi=values.length-1;
  while(lo<hi){
    const pivot=values[(lo+hi)>>1];let i=lo,j=hi;
    while(i<=j){while(values[i]<pivot)i++;while(values[j]>pivot)j--;if(i<=j){[values[i],values[j]]=[values[j],values[i]];i++;j--;}}
    if(rank<=j)hi=j;else if(rank>=i)lo=i;else break;
  }
  return values[rank];
}
/** Bounded frame samples; repeated fixed ticks accumulate into their render frame. */
export class FrameProfile {
  readonly frames:Record<string,number>[]=[];
  current:Record<string,number>={};
  constructor(readonly capacity=600){}
  add(name:string,ms:number){this.current[name]=(this.current[name]??0)+ms;}
  finish(){this.frames.push(this.current);this.current={};if(this.frames.length>this.capacity)this.frames.shift();}
  reset(){this.frames.length=0;this.current={};}
  report(observedOnly:readonly string[]=[],requested?:readonly string[]){
    const wanted=requested?new Set(requested):undefined,columns=new Map<string,{values:number[];sum:number;max:number}>();
    // One pass over stored entries instead of filtering all frames once per metric.
    for(const frame of this.frames)for(const name in frame){
      if(wanted&&!wanted.has(name))continue;
      let column=columns.get(name);if(!column){column={values:[],sum:0,max:-Infinity};columns.set(name,column);}
      const value=frame[name];column.values.push(value);column.sum+=value;column.max=Math.max(column.max,value);
    }
    return Object.fromEntries([...columns].map(([name,c])=>{
      const samples=observedOnly.includes(name)?c.values.length:this.frames.length;
      if(samples>c.values.length)c.max=Math.max(c.max,0);
      while(c.values.length<samples)c.values.push(0);
      return [name,{mean:c.sum/samples,p95:percentile95(c.values),max:c.max,samples}];
    }));
  }
}
