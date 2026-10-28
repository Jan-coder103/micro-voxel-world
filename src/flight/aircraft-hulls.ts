import { prepareHull,type CollisionBox } from './collision.ts';
import { ATTACK_AIRCRAFT_BOXES } from './attack-aircraft-hull.ts';

export const PLAYER_FIXED_HULL=prepareHull(ATTACK_AIRCRAFT_BOXES);
export const LAB_FIXED_HULL=prepareHull([
  [0,0,0,1.3,1,8],[0,0,.7,10,.25,2.2],[0,.4,3,4,.2,1],[0,1,2.8,.3,1.7,1.8],[0,.7,-1.5,.9,.6,1.8],
]);
const helicopter:CollisionBox[]=[
  [0,0,0,2.4,2,5.8],[0,.35,-2.2,2.2,1.2,1.8],[0,.2,4.4,.6,.6,5],[0,1,6.4,.3,2,1.4],
  [0,-.2,.7,7,.2,1],[0,1.4,0,.25,1,.25],
];
for(const x of [-1.5,1.5])helicopter.push([x,-1.5,0,.2,.2,5],[x,-1,1,.15,1,.15],[x,-1,-1,.15,1,.15]);
// Swept rotor disk at its actual height, rather than inflating the entire aircraft.
// Quarter-metre strips overbound the circle by at most 0.25 m at strip corners.
for(let x=-6.5;x<6.5;x+=.25){const near=Math.max(0,Math.abs(x+.125)-.125),depth=2*Math.sqrt(6.5**2-near**2);helicopter.push([x+.125,1.9,0,.25,.12,depth]);}
export const HELICOPTER_HULL=prepareHull(helicopter);
