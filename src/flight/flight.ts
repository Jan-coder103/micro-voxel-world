export interface FlightInput { pitch: number; bank: number; throttle: number }
export interface Point { x:number; y:number; z:number }
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
export class Flight {
  position:Point={x:16,y:45,z:16};
  heading=0; pitch=0; bank=0; speed=60; throttle=.43; ticks=0;
  state:'ready'|'running'|'paused'|'crashed'='ready';
  reason=''; assisted=true; dropped=0;
  private accumulator=0;
  constructor(private readonly ground:(x:number,z:number)=>number) { this.reset(); }
  reset() { this.position={x:16,y:this.ground(16,16)+40,z:16}; this.heading=this.pitch=this.bank=this.ticks=this.accumulator=this.dropped=0; this.speed=60; this.throttle=3/7; this.state='ready'; this.reason=''; }
  start() { if(this.state==='ready'||this.state==='paused') this.state='running'; }
  pause() { if(this.state==='running') this.state='paused'; this.accumulator=0; }
  advance(dt:number,input:FlightInput,onStep?:()=>void) {
    if(!Number.isFinite(dt)||dt<0) throw new Error('Invalid flight elapsed time');
    if(this.state!=='running') return;
    if(![input.pitch,input.bank,input.throttle].every(Number.isFinite)) throw new Error('Invalid flight input');
    const accepted=Math.min(dt,8/60); this.dropped+=dt-accepted; this.accumulator+=accepted;
    while(this.accumulator+1e-10>=1/60 && this.state==='running') { this.accumulator-=1/60; this.step(input); if(this.state==='running')onStep?.(); }
  }
  private step(input:FlightInput) {
    const dt=1/60;
    this.throttle=clamp(this.throttle+clamp(input.throttle,-1,1)*dt*.35,0,1);
    this.speed+=(30+70*this.throttle-this.speed)*dt*1.5;
    this.pitch=clamp(this.pitch+clamp(input.pitch,-1,1)*dt*.55,-.65,.65);
    this.bank=clamp(this.bank+clamp(input.bank,-1,1)*dt*1.3,-1.05,1.05);
    if(this.assisted) { if(!input.pitch) this.pitch*=Math.exp(-dt*1.8); if(!input.bank) this.bank*=Math.exp(-dt*2.5); }
    this.heading+=Math.tan(this.bank)*.65*dt;
    const old=this.position;
    const next={x:old.x+Math.sin(this.heading)*Math.cos(this.pitch)*this.speed*dt,y:old.y+Math.sin(this.pitch)*this.speed*dt,z:old.z-Math.cos(this.heading)*Math.cos(this.pitch)*this.speed*dt};
    const count=Math.max(1,Math.ceil(this.speed*dt/.25));
    for(let i=1;i<=count;i++) {
      const t=i/count, x=old.x+(next.x-old.x)*t,y=old.y+(next.y-old.y)*t,z=old.z+(next.z-old.z)*t;
      if(Math.abs(x)>130850||Math.abs(z)>130850||y<=this.ground(x,z)+3) { this.position={x,y,z}; this.state='crashed'; this.reason=Math.abs(x)>130850||Math.abs(z)>130850?'World boundary':'Terrain collision'; this.accumulator=0; return; }
    }
    next.y=Math.min(250,next.y); this.position=next; this.ticks++;
  }
}
