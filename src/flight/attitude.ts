import { bodyAxes } from './aerodynamics.ts';
import type { Point } from './flight.ts';
export interface Attitude { heading:number;pitch:number;bank:number }
const dot=(a:Point,b:Point)=>a.x*b.x+a.y*b.y+a.z*b.z;
const nearest=(angle:number,reference:number)=>reference+Math.atan2(Math.sin(angle-reference),Math.cos(angle-reference));
function rotate(v:Point,axis:Point,angle:number):Point{
  const c=Math.cos(angle),s=Math.sin(angle),d=dot(axis,v)*(1-c);
  return {x:v.x*c+(axis.y*v.z-axis.z*v.y)*s+axis.x*d,y:v.y*c+(axis.z*v.x-axis.x*v.z)*s+axis.y*d,z:v.z*c+(axis.x*v.y-axis.y*v.x)*s+axis.z*d};
}
/** Exact finite rotations about aircraft axes, then continuous Euler coordinates for existing consumers. */
export function rotateBody(attitude:Attitude,pitchAngle:number,rollAngle=0,yawAngle=0):Attitude{
  let {forward,right,up}=bodyAxes(attitude.heading,attitude.pitch,attitude.bank);
  forward=rotate(forward,right,pitchAngle);up=rotate(up,right,pitchAngle);
  right=rotate(right,forward,rollAngle);up=rotate(up,forward,rollAngle);
  forward=rotate(forward,up,-yawAngle);right=rotate(right,up,-yawAngle);
  const horizontal=Math.hypot(forward.x,forward.z);
  let heading:number,pitch:number,bank:number;
  if(horizontal<1e-8){
    heading=attitude.heading;pitch=nearest(Math.atan2(forward.y,horizontal),attitude.pitch);
    const level=bodyAxes(heading,pitch,0);
    bank=nearest(Math.atan2(-dot(right,level.up),dot(right,level.right)),attitude.bank);
  }else{
    heading=Math.atan2(forward.x,-forward.z);pitch=Math.atan2(forward.y,horizontal);bank=Math.atan2(-right.y,up.y);
  }
  const candidates=[{heading:nearest(heading,attitude.heading),pitch:nearest(pitch,attitude.pitch),bank:nearest(bank,attitude.bank)},
    {heading:nearest(heading+Math.PI,attitude.heading),pitch:nearest(Math.PI-pitch,attitude.pitch),bank:nearest(bank+Math.PI,attitude.bank)}];
  const distance=(a:Attitude)=>(a.heading-attitude.heading)**2+(a.pitch-attitude.pitch)**2+(a.bank-attitude.bank)**2;
  return distance(candidates[0])<=distance(candidates[1])?candidates[0]:candidates[1];
}
