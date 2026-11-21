import { describe,it,expect } from 'vitest';
import { rotateBody } from '../../src/flight/attitude';
import { bodyAxes,AIRFRAME,aerodynamicForces } from '../../src/flight/aerodynamics';
import { Flight } from '../../src/flight/flight';
const dot=(a:{x:number;y:number;z:number},b:{x:number;y:number;z:number})=>a.x*b.x+a.y*b.y+a.z*b.z;
const neutral={pitch:0,bank:0,throttle:0};
describe('aircraft local rotation and thrust',()=>{
  it.each([0,.7,-.7,Math.PI/2,-Math.PI/2,Math.PI])('pitches toward the canopy around the banked wing axis at bank %f',bank=>{
    const attitude={heading:.4,pitch:.15,bank},before=bodyAxes(attitude.heading,attitude.pitch,attitude.bank),result=rotateBody(attitude,.12),after=bodyAxes(result.heading,result.pitch,result.bank);
    expect(dot(before.right,after.right)).toBeCloseTo(1,12);
    expect(dot(before.up,after.forward)).toBeCloseTo(Math.sin(.12),12);
    expect(dot(before.forward,after.forward)).toBeCloseTo(Math.cos(.12),12);
  });
  it('pulls sideways in a knife-edge bank and downward when inverted',()=>{
    const knife=rotateBody({heading:0,pitch:0,bank:Math.PI/2},.1),inverted=rotateBody({heading:0,pitch:0,bank:Math.PI},.1);
    const sideways=bodyAxes(knife.heading,knife.pitch,knife.bank).forward,down=bodyAxes(inverted.heading,inverted.pitch,inverted.bank).forward;
    expect(sideways.x).toBeCloseTo(Math.sin(.1),12);expect(sideways.y).toBeCloseTo(0,12);expect(down.y).toBeCloseTo(-Math.sin(.1),12);
  });
  it('preserves continuous loops, local roll and orthonormal axes through vertical attitudes',()=>{
    let a={heading:0,pitch:0,bank:0};
    for(let i=0;i<480;i++)a=rotateBody(a,Math.PI/120);
    expect(a.pitch).toBeCloseTo(4*Math.PI,10);expect(a.heading).toBeCloseTo(0,10);expect(a.bank).toBeCloseTo(0,10);
    for(let i=0;i<500;i++){
      a=rotateBody(a,.017,.023,-.009);const axes=bodyAxes(a.heading,a.pitch,a.bank);
      for(const v of Object.values(axes))expect(dot(v,v)).toBeCloseTo(1,12);
      expect(dot(axes.forward,axes.up)).toBeCloseTo(0,12);expect(dot(axes.forward,axes.right)).toBeCloseTo(0,12);
    }
  });
  it('rotates roll and yaw about the current fuselage and fin axes',()=>{
    const a={heading:.8,pitch:.7,bank:1.2},before=bodyAxes(a.heading,a.pitch,a.bank),roll=rotateBody(a,0,.2),yaw=rotateBody(a,0,0,.2);
    const r=bodyAxes(roll.heading,roll.pitch,roll.bank),y=bodyAxes(yaw.heading,yaw.pitch,yaw.bank);
    expect(dot(before.forward,r.forward)).toBeCloseTo(1,12);expect(dot(before.up,r.right)).toBeCloseTo(-Math.sin(.2),12);
    expect(dot(before.up,y.up)).toBeCloseTo(1,12);expect(dot(before.right,y.forward)).toBeCloseTo(Math.sin(.2),12);
  });
  it('integrates elevator pull into a horizontal turn at a 90 degree bank, instead of pitching toward the sky',()=>{
    const run=(pull:number)=>{const f=new Flight(()=>-1000);f.position.y=800;f.speed=80;f.throttle=.4;f.bank=Math.PI/2;f.assisted=false;f.start();for(let i=0;i<30;i++)f.advance(1/60,{...neutral,pitch:pull});return f;};
    const pulled=run(.8),neutralFlight=run(0);
    const forward=bodyAxes(pulled.heading,pulled.pitch,pulled.bank).forward;
    expect(forward.x).toBeGreaterThan(.04);expect(Math.abs(forward.y)).toBeLessThan(.04);
    expect(pulled.velocity.x).toBeGreaterThan(neutralFlight.velocity.x+1);expect(pulled.velocity.y-neutralFlight.velocity.y).toBeLessThan(1);
  });
  it('provides 2.5 times the previous thrust while retaining throttle and engine upgrade scaling',()=>{
    expect(AIRFRAME.thrust).toBe(12000*2.5);
    const v={x:0,y:0,z:-60},full=aerodynamicForces(v,0,0,0,0,1),idle=aerodynamicForces(v,0,0,0,0,0),half=aerodynamicForces(v,0,0,0,0,.5,1.2);
    expect(full.thrust).toBe(30000);expect(half.thrust).toBe(18000);expect(idle.thrust).toBe(0);
    expect(idle.drag).toBe(full.drag);expect(idle.lift).toBe(full.lift);
    expect(idle.acceleration.z-full.acceleration.z).toBeCloseTo(15,12);
  });
});

it.each([30,60,144])('produces mirrored tighter banked turns with elevator at %i Hz',hz=>{
  const run=(bank:number,pull:number)=>{
    const f=new Flight(()=>-1000);f.position.y=800;f.speed=90;f.throttle=.6;f.bank=bank;f.assisted=false;f.start();
    for(let i=0;i<2*hz;i++)f.advance(1/hz,{...neutral,pitch:pull});return f;
  };
  const right=run(1.05,.7),left=run(-1.05,.7),noPull=run(1.05,0),levelPull=run(0,.7);
  expect(right.heading).toBeGreaterThan(noPull.heading+.5);
  expect(right.velocity.x).toBeGreaterThan(noPull.velocity.x+20);
  expect(right.heading).toBeCloseTo(-left.heading,10);expect(right.velocity.x).toBeCloseTo(-left.velocity.x,10);
  expect(right.velocity.y).toBeCloseTo(left.velocity.y,10);
  expect(right.velocity.y).toBeLessThan(levelPull.velocity.y*.6);
});
