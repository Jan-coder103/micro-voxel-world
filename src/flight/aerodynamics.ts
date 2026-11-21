import type { Point } from './flight.ts';
export const AIRFRAME={mass:2000,area:28,chord:2.2,pitchInertia:12000,gravity:9.81,thrust:12000,stallAngle:.28,trimAngle:.035};
const dot=(a:Point,b:Point)=>a.x*b.x+a.y*b.y+a.z*b.z;
export function bodyAxes(heading:number,pitch:number,bank:number){
  const sh=Math.sin(heading),ch=Math.cos(heading),sp=Math.sin(pitch),cp=Math.cos(pitch),sb=Math.sin(bank),cb=Math.cos(bank);
  return {forward:{x:sh*cp,y:sp,z:-ch*cp},right:{x:ch*cb+sh*sp*sb,y:-cp*sb,z:sh*cb-ch*sp*sb},up:{x:ch*sb-sh*sp*cb,y:cp*cb,z:sh*sb+ch*sp*cb}};
}
/** Continuous approximate finite-wing polar, including separated-flow lift and drag. */
export function wingPolar(alpha:number){
  const a=Math.atan2(Math.sin(alpha),Math.cos(alpha)),abs=Math.abs(a),sign=Math.sign(a)||1;
  const attached=.25+4.8*a;
  const blend=Math.max(0,Math.min(1,(abs-AIRFRAME.stallAngle)/.16));
  const peak=.25+4.8*sign*AIRFRAME.stallAngle;
  const separated=1.1*Math.sin(2*a);
  const cl=abs<=AIRFRAME.stallAngle?attached:peak*(1-blend)+separated*blend;
  return {cl,cd:.045+.075*cl*cl+1.1*Math.sin(a)**2*blend,stalled:abs>AIRFRAME.stallAngle};
}
/** Newtonian acceleration; velocity remains independent of where the nose points. */
export function aerodynamicForces(velocity:Point,heading:number,pitch:number,bank:number,altitude:number,throttle:number,enginePower=1,speedScale=1){
  const {forward,right,up}=bodyAxes(heading,pitch,bank),speed=Math.hypot(velocity.x,velocity.y,velocity.z);
  const direction=speed>1e-6?{x:velocity.x/speed,y:velocity.y/speed,z:velocity.z/speed}:forward;
  const alpha=Math.atan2(-dot(velocity,up),dot(velocity,forward));
  const polar=wingPolar(alpha),density=1.225*Math.exp(-Math.max(0,altitude)/8500),q=.5*density*speed*speed;
  const lift=q*AIRFRAME.area*polar.cl,drag=q*AIRFRAME.area*polar.cd;
  const normal={x:right.y*direction.z-right.z*direction.y,y:right.z*direction.x-right.x*direction.z,z:right.x*direction.y-right.y*direction.x};
  const n=Math.hypot(normal.x,normal.y,normal.z)||1;
  const thrust=AIRFRAME.thrust*throttle*enginePower*speedScale*speedScale;
  const side=dot(velocity,right),sideForce=-side*Math.abs(side)*density*4;
  const acceleration={x:0,y:-AIRFRAME.gravity,z:0};
  for(const axis of ['x','y','z'] as const)acceleration[axis]+=(normal[axis]/n*lift-direction[axis]*drag+forward[axis]*thrust+right[axis]*sideForce)/AIRFRAME.mass;
  return {acceleration,alpha,q,lift,drag,thrust,speed,stalled:polar.stalled,loadFactor:lift/(AIRFRAME.mass*AIRFRAME.gravity)};
}
export function elevatorAcceleration(alpha:number,pitchRate:number,elevator:number,q:number,speed:number,trimAngle=AIRFRAME.trimAngle){
  // Static stability restores trimmed AoA; elevator and pitch-rate damping produce moments.
  const cm=.24*elevator-.9*(alpha-trimAngle)-8*pitchRate*AIRFRAME.chord/(2*Math.max(10,speed));
  return q*AIRFRAME.area*AIRFRAME.chord*cm/AIRFRAME.pitchInertia;
}
