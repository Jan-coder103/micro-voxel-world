export function distribution(values:readonly number[]){if(!values.length)return {median:0,p95:0,max:0};const a=[...values].sort((x,y)=>x-y);return {median:a[Math.floor((a.length-1)*.5)],p95:a[Math.floor((a.length-1)*.95)],max:a[a.length-1]};}
/** Bounded real-frame samples. Submission CPU and rAF interval are distinct measurements. */
export class FrameMetrics {
  readonly interval:number[]=[];readonly simulation:number[]=[];readonly presentation:number[]=[];readonly submission:number[]=[];
  frames=0;done=false;
  constructor(readonly warmup=60,readonly samples=180){}
  add(interval:number,simulation:number,presentation:number,submission:number){if(this.done)return;this.frames++;if(this.frames<=this.warmup)return;for(const [list,value] of [[this.interval,interval],[this.simulation,simulation],[this.presentation,presentation],[this.submission,submission]] as const)list.push(value);this.done=this.interval.length>=this.samples;}
  get summary(){return {frames:this.interval.length,warmup:this.warmup,frameIntervalMs:distribution(this.interval),simulationCpuMs:distribution(this.simulation),presentationCpuMs:distribution(this.presentation),submissionCpuMs:distribution(this.submission)};}
}
