import { FrameProfile } from './frame-profile';
type Extension={TIME_ELAPSED_EXT:number;GPU_DISJOINT_EXT:number};
type Segment={name:string;query:WebGLQuery};
/** Sequential, never nested timer queries. Whole frames publish atomically. */
export class GpuFrameTimer {
  readonly samples=new FrameProfile();
  private ext:Extension|null;
  private pending:Segment[][]=[];
  private current:Segment[]|undefined;
  private active=false;
  error='';
  constructor(private gl:WebGL2RenderingContext){this.ext=gl.getExtension('EXT_disjoint_timer_query_webgl2') as Extension|null;}
  get supported(){return !!this.ext&&!this.error;}
  private clear(){
    if(this.active){this.gl.endQuery(this.ext!.TIME_ELAPSED_EXT);this.active=false;}
    for(const segments of [...this.pending,this.current??[]])for(const s of segments)this.gl.deleteQuery(s.query);
    this.pending=[];this.current=undefined;
  }
  reset(){this.clear();this.samples.reset();}
  restore(){this.reset();this.error='';this.ext=this.gl.getExtension('EXT_disjoint_timer_query_webgl2') as Extension|null;}
  begin(){
    if(!this.supported||this.current||this.pending.length>=8||this.gl.isContextLost())return;
    this.current=[];this.stage('Render setup');
  }
  stage(name:string){
    if(!this.current||!this.ext)return;
    if(this.active){this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);this.active=false;}
    // Frontier uses three segments; an unexpected nested render is discarded.
    if(this.current.length>=3){this.clear();return;}
    const query=this.gl.createQuery();if(!query){this.clear();return;}
    this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT,query);this.active=true;this.current.push({name,query});
  }
  end(){
    if(!this.current)return;
    if(this.active){this.gl.endQuery(this.ext!.TIME_ELAPSED_EXT);this.active=false;}
    this.pending.push(this.current);this.current=undefined;
  }
  poll(){
    if(!this.supported)return;
    if(this.gl.isContextLost()||this.gl.getParameter(this.ext!.GPU_DISJOINT_EXT)){this.reset();return;}
    while(this.pending.length){
      const frame=this.pending[0];if(!frame.every(s=>this.gl.getQueryParameter(s.query,this.gl.QUERY_RESULT_AVAILABLE)))break;
      this.pending.shift();let total=0;
      for(const s of frame){const ms=this.gl.getQueryParameter(s.query,this.gl.QUERY_RESULT)/1e6;this.gl.deleteQuery(s.query);this.samples.add(s.name,ms);total+=ms;}
      this.samples.add('Total',total);this.samples.finish();
    }
  }
  /** Driver exceptions disable timing, never gameplay. */
  run(work:()=>void){try{work();}catch(error){this.error=String(error);try{this.reset();}catch{/* Context may already be gone. */}}}
  dispose(){this.reset();}
}
