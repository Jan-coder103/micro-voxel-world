import { sweepAircraft,type FlightGeometry } from './collision.ts';
import { HELICOPTER_HULL,LAB_FIXED_HULL } from './aircraft-hulls.ts';
import { aircraftId, type AircraftId } from './aircraft.ts';
export interface FlightInput { pitch: number; bank: number; throttle: number }
export interface Point { x:number; y:number; z:number }
export interface FlightPose { position:Point; heading:number; pitch:number; bank:number }
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
export class Flight {
  position:Point={x:16,y:45,z:16};
  heading=0; pitch=0; bank=0; speed=60; throttle=.43; ticks=0;
  state:'ready'|'running'|'paused'|'crashed'='ready';
  reason=''; assisted=true; dropped=0;
  grounded=false; enginePower=1;handling=1;brakePower=1;maxSpeed=100;
  private accumulator=0;
  private previousPose:FlightPose|undefined;
  constructor(private readonly ground:(x:number,z:number)=>number,private readonly obstacle?:(origin:Point,direction:Point,range:number)=>number|undefined, private kind:AircraftId='fixed-wing',private readonly geometry:FlightGeometry={}) { this.kind=aircraftId(kind);this.reset(); }
  get aircraft(){return this.kind;}
  setAircraft(value:string){this.kind=aircraftId(value);this.reset();}
  reset() { this.position={x:16,y:this.ground(16,16)+40,z:16}; this.heading=this.pitch=this.bank=this.ticks=this.accumulator=this.dropped=0; this.speed=60; this.throttle=3/7; this.state='ready'; this.reason='';this.grounded=false;if(this.kind==='helicopter'){this.speed=0;this.throttle=.5;} }
  start() { if(this.state==='ready'||this.state==='paused') { this.previousPose=undefined; this.state='running'; } }
  pause() { if(this.state==='running') this.state='paused'; this.accumulator=0; }
  advance(dt:number,input:FlightInput,onStep?:()=>void) {
    if(!Number.isFinite(dt)||dt<0) throw new Error('Invalid flight elapsed time');
    if(this.state!=='running') return;
    if(![input.pitch,input.bank,input.throttle].every(Number.isFinite)) throw new Error('Invalid flight input');
    const accepted=Math.min(dt,8/60); this.dropped+=dt-accepted; this.accumulator+=accepted;
    while(this.accumulator+1e-10>=1/60 && this.state==='running') { this.accumulator-=1/60; this.step(input); if(this.state==='running')onStep?.(); }
  }
  private step(input:FlightInput) {
    this.previousPose ??= {position:{x:0,y:0,z:0},heading:0,pitch:0,bank:0};
    Object.assign(this.previousPose.position,this.position);
    this.previousPose.heading=this.heading;this.previousPose.pitch=this.pitch;this.previousPose.bank=this.bank;
    const dt=1/60;
    if(this.kind==='helicopter'){this.rotorStep(input);return;}
    this.throttle=clamp(this.throttle+clamp(input.throttle,-1,1)*dt*.35,0,1);
    const runway=this.geometry.runwayAt?.(this.position.x,this.position.z)??this.geometry.runway;
    if(runway&&this.grounded){
      this.speed=clamp(this.speed+(this.throttle*12*this.enginePower-2-(input.throttle<0?8*this.brakePower:0))*dt,0,this.maxSpeed);
      this.heading+=clamp(input.bank,-1,1)*dt*.25*this.handling*Math.min(1,this.speed/10);
      const next={x:this.position.x+Math.sin(this.heading)*this.speed*dt,y:runway.height+runway.clearance,z:this.position.z-Math.cos(this.heading)*this.speed*dt};
      if(!runway.contains(next.x,next.z,10)){this.state='crashed';this.reason='Left the runway';return;}
      this.pitch=this.bank=0;
      if(input.pitch>0&&this.speed>=28){this.grounded=false;this.pitch=.06;next.y+=.8;this.move(next);}
      else {this.position=next;this.ticks++;}
      return;
    }
    this.speed+=((runway?0:30)+(runway?this.maxSpeed:70)*this.throttle-this.speed)*dt*(runway ? .35 : 1.5)*this.enginePower;
    this.pitch=clamp(this.pitch+clamp(input.pitch,-1,1)*dt*.55*this.handling,-.65,.65);
    this.bank=clamp(this.bank+clamp(input.bank,-1,1)*dt*1.3*this.handling,-1.05,1.05);
    if(this.assisted) { if(!input.pitch) this.pitch*=Math.exp(-dt*1.8); if(!input.bank) this.bank*=Math.exp(-dt*2.5); }
    this.heading+=Math.tan(this.bank)*.65*dt;
    const old=this.position;
    const next={x:old.x+Math.sin(this.heading)*Math.cos(this.pitch)*this.speed*dt,y:old.y+Math.sin(this.pitch)*this.speed*dt,z:old.z-Math.cos(this.heading)*Math.cos(this.pitch)*this.speed*dt};
    if(runway&&this.speed<28)next.y-=(28-this.speed)*.25*dt;
    this.move(next);
  }
  /** One tick of presentation latency keeps render rates independent of the 60 Hz simulation. */
  samplePose(out:FlightPose):FlightPose {
    const previous=this.state==='running'?this.previousPose:undefined;
    const alpha=previous?clamp(this.accumulator*60,0,1):1;
    for(const axis of ['x','y','z'] as const)out.position[axis]=previous?previous.position[axis]+(this.position[axis]-previous.position[axis])*alpha:this.position[axis];
    for(const axis of ['heading','pitch','bank'] as const)out[axis]=previous?previous[axis]+(this[axis]-previous[axis])*alpha:this[axis];
    return out;
  }
  private rotorStep(input:FlightInput){
    const dt=1/60;
    this.throttle=.5+clamp(input.throttle,-1,1)*.5;
    this.pitch=clamp(this.pitch+clamp(input.pitch,-1,1)*dt*.65,-.55,.55);
    if(this.assisted&&!input.pitch)this.pitch*=Math.exp(-dt*2.8);
    this.bank+=(clamp(input.bank,-1,1)*.22-this.bank)*dt*8;
    this.heading+=clamp(input.bank,-1,1)*dt*1.05;
    // Nose-down gives forward thrust; drag produces a deliberate hover/attack role.
    this.speed+=(-this.pitch/.55*55-this.speed)*dt*2.5;
    const p=this.position;
    this.move({x:p.x+Math.sin(this.heading)*this.speed*dt,y:Math.min(250,p.y+clamp(input.throttle,-1,1)*12*dt),z:p.z-Math.cos(this.heading)*this.speed*dt});
  }
  private move(next:Point){
    const old=this.position;
    const length=Math.hypot(next.x-old.x,next.y-old.y,next.z-old.z);
    const direction=length>0?{x:(next.x-old.x)/length,y:(next.y-old.y)/length,z:(next.z-old.z)/length}:{x:0,y:1,z:0};
    const obstacle=this.obstacle?.(old,direction,length);
    if(obstacle!==undefined){this.position={x:old.x+direction.x*obstacle,y:old.y+direction.y*obstacle,z:old.z+direction.z*obstacle};this.state='crashed';this.reason='Obstacle collision';this.accumulator=0;return;}
    next.y=Math.min(250,next.y);
    const to:FlightPose={position:next,heading:this.heading,pitch:this.pitch,bank:this.bank};
    const hit=sweepAircraft(this.previousPose!,to,this.kind==='helicopter'?HELICOPTER_HULL:this.geometry.fixedWing??LAB_FIXED_HULL,this.ground,this.geometry);
    if(hit&&this.geometry.runway){
      const p=hit.pose.position,r=this.geometry.runwayAt?.(p.x,p.z)??this.geometry.runway,alignment=Math.abs(Math.sin(this.heading));
      const descent=(next.y-old.y)*60;
      if(hit.reason==='Terrain collision'&&r.contains(p.x,p.z,10)&&alignment<.16&&Math.abs(this.bank)<.10&&this.pitch>=-.12&&this.pitch<=.18&&descent>=-4&&this.speed<=48){
        this.position={x:p.x,y:r.height+r.clearance,z:p.z};this.pitch=this.bank=0;this.grounded=true;this.ticks++;return;
      }
    }
    if(hit){this.position=hit.pose.position;this.heading=hit.pose.heading;this.pitch=hit.pose.pitch;this.bank=hit.pose.bank;this.state='crashed';this.reason=hit.reason;this.accumulator=0;return;}
    this.position=next;this.ticks++;
  }
}
