import { PerspectiveCamera, Vector3 } from 'three';
import type { FlightPose } from '../flight/flight';

/** Smooth relative offsets, never lag the aircraft's world translation. */
export class FlightCamera {
  unlocked=false;
  yaw=0;
  elevation=0;
  private readonly offset=new Vector3();
  private readonly lookOffset=new Vector3();
  private readonly desired=new Vector3();
  private readonly target=new Vector3();
  private azimuth=0;
  private tilt=0;
  private resetPending=false;
  constructor(private readonly distance=32,private readonly height=9,private readonly ahead=30) {
    this.elevation=Math.atan2(height,distance);
  }
  toggle() { if(this.unlocked)this.reset();else this.unlocked=true; }
  reset() { this.unlocked=false;this.yaw=0;this.elevation=Math.atan2(this.height,this.distance);this.resetPending=true; }
  move(dx:number,dy:number) {
    if(!this.unlocked)return;
    const yaw=this.yaw+dx*.006;
    this.yaw=Math.atan2(Math.sin(yaw),Math.cos(yaw));
    this.elevation=Math.max(-.25,Math.min(1.35,this.elevation-dy*.006));
  }
  update(camera:PerspectiveCamera,pose:FlightPose,dt:number,snap=false) {
    snap ||= this.resetPending;this.resetPending=false;
    const blend=snap?1:1-Math.exp(-Math.min(dt,.1)*10),base=Math.atan2(this.height,this.distance);
    if(snap){this.yaw=0;this.elevation=base;}
    if(!this.unlocked){this.yaw*=1-blend;this.elevation+=(base-this.elevation)*blend;}
    const radius=Math.hypot(this.distance,this.height),horizontal=Math.cos(this.elevation)*radius,h=pose.heading+this.yaw;
    this.desired.set(-Math.sin(h)*horizontal,Math.sin(this.elevation)*radius,Math.cos(h)*horizontal);
    // Orbit looks at the aircraft; chase looks into the flight path. Reset both when locked.
    this.target.set(this.unlocked?0:Math.sin(pose.heading)*this.ahead,this.unlocked?0:-1,this.unlocked?0:-Math.cos(pose.heading)*this.ahead);
    // Interpolate angles so a fast half-orbit cannot cut through the aircraft.
    if(snap){this.azimuth=h;this.tilt=this.elevation;}
    this.azimuth+=Math.atan2(Math.sin(h-this.azimuth),Math.cos(h-this.azimuth))*blend;
    this.tilt+=(this.elevation-this.tilt)*blend;
    const reach=Math.cos(this.tilt)*radius;
    this.offset.set(-Math.sin(this.azimuth)*reach,Math.sin(this.tilt)*radius,Math.cos(this.azimuth)*reach);
    this.lookOffset.lerp(this.target,blend);
    const moving=this.offset.distanceToSquared(this.desired)>1e-6||this.lookOffset.distanceToSquared(this.target)>1e-6||!this.unlocked&&Math.abs(this.yaw)>1e-5;
    const p=pose.position;
    camera.position.set(p.x+this.offset.x,p.y+this.offset.y,p.z+this.offset.z);
    this.target.set(p.x+this.lookOffset.x,p.y+this.lookOffset.y,p.z+this.lookOffset.z);
    return {moving,target:this.target};
  }
}

/** C toggles once per press; focus loss resets and locks the camera. */
export function bindFlightOrbit(host:HTMLElement,orbit:FlightCamera,wake:()=>void,enabled=true) {
  const previousCursor=host.style.cursor;
  const release=()=>{orbit.reset();host.style.cursor=previousCursor;wake();};
  const down=(event:KeyboardEvent)=>{if(!enabled||event.code!=='KeyC')return;event.preventDefault();if(event.repeat)return;orbit.toggle();host.style.cursor=orbit.unlocked?'move':previousCursor;wake();};
  const move=(event:MouseEvent)=>{if(!orbit.unlocked)return;orbit.move(event.movementX,event.movementY);wake();};
  host.addEventListener('keydown',down);host.addEventListener('mousemove',move);
  host.addEventListener('blur',release);window.addEventListener('blur',release);
  return ()=>{host.removeEventListener('keydown',down);host.removeEventListener('mousemove',move);host.removeEventListener('blur',release);window.removeEventListener('blur',release);release();};
}
