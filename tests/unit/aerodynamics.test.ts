import { describe,it,expect } from 'vitest';
import { AIRFRAME,aerodynamicForces,wingPolar } from '../../src/flight/aerodynamics';
import { Flight } from '../../src/flight/flight';
import { Frontier } from '../../src/game/frontier';
const neutral={pitch:0,bank:0,throttle:0};
const controls={...neutral,fire:false,weapon:'minigun' as const,aim:false};
describe('force-based fixed-wing aerodynamics',()=>{
  it('scales lift and drag with dynamic pressure, with thrust independent of pitch commands',()=>{
    const slow=aerodynamicForces({x:0,y:0,z:-30},0,.1,0,0,.5),fast=aerodynamicForces({x:0,y:0,z:-60},0,.1,0,0,.5);
    expect(fast.lift/slow.lift).toBeCloseTo(4,10);expect(fast.drag/slow.drag).toBeCloseTo(4,10);expect(fast.thrust).toBe(slow.thrust);
    expect(aerodynamicForces({x:0,y:0,z:-60},0,.1,0,3000,.5).lift).toBeLessThan(fast.lift);
  });
  it('rolls the lift force, including inverted flight, without changing its magnitude',()=>{
    const v={x:0,y:0,z:-60},level=aerodynamicForces(v,0,0,0,0,0),bank=aerodynamicForces(v,0,0,Math.PI/3,0,0),inverted=aerodynamicForces(v,0,0,Math.PI,0,0);
    expect(bank.lift).toBeCloseTo(level.lift);expect(bank.acceleration.x).toBeGreaterThan(0);
    expect(bank.acceleration.y+AIRFRAME.gravity).toBeCloseTo((level.acceleration.y+AIRFRAME.gravity)*.5);
    expect(inverted.acceleration.y).toBeLessThan(-AIRFRAME.gravity);
  });
  it('loses lift and gains drag beyond critical AoA at any airspeed',()=>{
    const peak=wingPolar(AIRFRAME.stallAngle),separated=wingPolar(.5);
    expect(peak.stalled).toBe(false);expect(separated.stalled).toBe(true);expect(separated.cl).toBeLessThan(peak.cl);expect(separated.cd).toBeGreaterThan(peak.cd);
    expect(aerodynamicForces({x:0,y:0,z:-120},0,.5,0,0,0).stalled).toBe(true);
    expect(aerodynamicForces({x:0,y:0,z:-20},0,0,0,0,0).stalled).toBe(false);
  });
  it('does not create kinetic energy through lift: unpowered force work equals drag work plus gravity',()=>{
    const v={x:15,y:8,z:-70},f=aerodynamicForces(v,.2,.18,.4,800,0);
    const power=AIRFRAME.mass*(v.x*f.acceleration.x+v.y*f.acceleration.y+v.z*f.acceleration.z);
    // Side force also dissipates energy; lift itself is perpendicular to the velocity.
    expect(power).toBeLessThanOrEqual(-f.drag*f.speed-AIRFRAME.mass*AIRFRAME.gravity*v.y+1e-6);
  });
  it('falls under gravity at zero airspeed with no artificial speed floor',()=>{
    const f=new Flight(()=>-1000);f.position.y=500;f.speed=f.throttle=0;f.assisted=false;f.start();f.advance(1/60,neutral);
    expect(f.velocity.y).toBeCloseTo(-AIRFRAME.gravity/60,8);expect(f.velocity.x).toBe(0);expect(f.velocity.z).toBe(0);expect(f.speed).toBeLessThan(1);
  });
  it.each([30,60,144])('departs the actual airfield and sustains a 20-second climb-out at %i Hz',hz=>{
    const game=new Frontier();game.launch();let airborneTime=0,liftoffZ=NaN,maxJump=0;
    for(let i=0;i<hz*20;i++){
      const f=game.flight,wasGrounded=f.grounded,oldY=f.position.y;
      // Ordinary keyboard input: rotate, then release the elevator after the first second airborne.
      game.advance(1/hz,{...controls,throttle:1,pitch:airborneTime<1?1:0});
      if(!f.grounded){airborneTime+=1/hz;if(wasGrounded)liftoffZ=f.position.z;}
      maxJump=Math.max(maxJump,f.position.y-oldY);
      expect(game.state).toBe('flying');
    }
    expect(liftoffZ).toBeGreaterThan(130);expect(liftoffZ).toBeLessThan(548);expect(game.flight.grounded).toBe(false);
    expect(game.flight.position.y-game.ground(game.flight.position.x,game.flight.position.z)).toBeGreaterThan(30);
    expect(game.flight.speed).toBeGreaterThan(45);expect(maxJump).toBeLessThan(1);expect(game.progress.data.money).toBe(0);
  });
  it('can rotate later at 35 m/s without a tail collision',()=>{
    const game=new Frontier();game.launch();let airborne=0;
    for(let i=0;i<1200;i++){
      const f=game.flight;if(!f.grounded)airborne++;
      game.advance(1/60,{...controls,throttle:1,pitch:f.speed>35&&airborne<60?1:0});
      expect(game.state).toBe('flying');
    }
    expect(game.flight.position.y-game.baseHeight).toBeGreaterThan(30);
  });
});

it('flies the velocity vector through a complete vertical loop rather than rotating the nose alone',()=>{
  const f=new Flight(()=>-1000);f.position.y=800;f.speed=90;f.throttle=1;f.assisted=false;f.start();
  let previous=0,swept=0,maxVs=0,minVs=0,backwards=false;
  for(let i=0;i<1500&&swept<Math.PI*2;i++){
    f.advance(1/60,{...neutral,pitch:.6});
    const angle=Math.atan2(f.velocity.y,-f.velocity.z);
    swept+=Math.atan2(Math.sin(angle-previous),Math.cos(angle-previous));previous=angle;
    maxVs=Math.max(maxVs,f.velocity.y);minVs=Math.min(minVs,f.velocity.y);backwards ||= f.velocity.z>20;
  }
  expect(f.state).toBe('running');expect(swept).toBeGreaterThanOrEqual(Math.PI*2);expect(maxVs).toBeGreaterThan(30);expect(minVs).toBeLessThan(-30);expect(backwards).toBe(true);expect(f.velocity.z).toBeLessThan(-30);
});
