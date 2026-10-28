import { describe,expect,it,vi } from 'vitest';
import { PerspectiveCamera } from 'three';
import { Flight,type FlightPose } from '../../src/flight/flight';
import { FlightCamera,bindFlightOrbit } from '../../src/rendering/flight-camera';
import { createAircraftShadow } from '../../src/rendering/aircraft-shadow';
const neutral={pitch:0,bank:0,throttle:0};
const pose=():FlightPose=>({position:{x:16,y:40,z:16},heading:0,pitch:0,bank:0});

describe('flight presentation',()=>{
  it('toggles once per C press, stays unlocked on keyup and locks on blur or disposal',()=>{
    vi.stubGlobal('window',new EventTarget());
    try {
      const host=Object.assign(new EventTarget(),{style:{cursor:''}}) as unknown as HTMLElement;
      const chase=new FlightCamera(),dispose=bindFlightOrbit(host,chase,()=>{});
      const key=(type:string,repeat=false)=>host.dispatchEvent(Object.assign(new Event(type,{cancelable:true}),{code:'KeyC',repeat}));
      key('keydown');key('keyup');expect(chase.unlocked).toBe(true);expect(host.style.cursor).toBe('move');
      key('keydown',true);expect(chase.unlocked).toBe(true);
      key('keydown');expect(chase.unlocked).toBe(false);expect(host.style.cursor).toBe('');
      key('keyup');key('keydown');host.dispatchEvent(new Event('blur'));expect(chase.unlocked).toBe(false);
      key('keydown');dispose();expect(chase.unlocked).toBe(false);key('keydown');expect(chase.unlocked).toBe(false);
    } finally { vi.unstubAllGlobals(); }
  });
  it('moves continuously at 144 Hz even on frames without a simulation tick',()=>{
    const flight=new Flight(()=>0),out=pose();flight.start();
    const positions:number[]=[];const tickCounts:number[]=[];
    for(let i=0;i<144;i++){flight.advance(1/144,neutral);flight.samplePose(out);positions.push(out.position.z);tickCounts.push(flight.ticks);}
    expect(flight.ticks).toBe(60);
    for(let i=4;i<positions.length;i++)expect(positions[i-1]-positions[i]).toBeCloseTo(60/144,8);
    expect(tickCounts.some((v,i)=>i>4&&v===tickCounts[i-1])).toBe(true);
    expect(out.position.z-flight.position.z).toBeCloseTo(1);
  });
  it('interpolates turns and altitude, then snaps to authoritative pose on pause/recovery',()=>{
    const flight=new Flight(()=>0),out=pose();flight.assisted=false;flight.start();
    flight.advance(1/60,{pitch:1,bank:1,throttle:0});flight.advance(1/120,neutral);flight.samplePose(out);
    expect(out.pitch).toBeCloseTo(flight.pitch/2);expect(out.bank).toBeCloseTo(flight.bank/2);expect(out.heading).toBeCloseTo(flight.heading/2);
    expect(out.position.y).toBeGreaterThan(40);expect(out.position.y).toBeLessThan(flight.position.y);
    flight.pause();flight.samplePose(out);expect(out.position).toEqual(flight.position);
    flight.reset();flight.position={x:500,y:80,z:1000};flight.samplePose(out);expect(out.position).toEqual(flight.position);
    flight.start();flight.samplePose(out);expect(out.position).toEqual(flight.position);
  });
  it('has no relative chase movement during straight flight at mixed frame rates',()=>{
    const camera=new PerspectiveCamera(),chase=new FlightCamera(),p=pose();chase.update(camera,p,0,true);
    for(const dt of [1/144,1/60,1/30,1/144,.08]){p.position.z-=60*dt;chase.update(camera,p,dt);expect(camera.position.z-p.position.z).toBeCloseTo(32,10);expect(camera.position.y-p.position.y).toBeCloseTo(9,10);}
  });
  it('toggles orbit, clamps elevation, then locks and resets chase immediately',()=>{
    const camera=new PerspectiveCamera(),chase=new FlightCamera(),p=pose();chase.update(camera,p,0,true);
    chase.move(200,100);expect(chase.yaw).toBe(0);chase.toggle();
    chase.move(Math.PI*2/.006,0);expect(chase.yaw).toBeCloseTo(0,10); // A full revolution normalizes back to zero.
    chase.move(200,-10000);expect(chase.elevation).toBe(1.35);
    for(let i=0;i<60;i++)chase.update(camera,p,1/60);
    expect(Math.abs(camera.position.x-p.position.x)).toBeGreaterThan(1);expect(camera.position.y-p.position.y).toBeGreaterThan(30);
    chase.toggle();expect(chase.unlocked).toBe(false);chase.update(camera,p,0);
    expect(camera.position.x).toBeCloseTo(p.position.x,3);expect(camera.position.z-p.position.z).toBeCloseTo(32,3);expect(chase.update(camera,p,1/60).moving).toBe(false);
  });
  it('moves the orbit with the corrected mouse direction on both axes',()=>{
    const camera=new PerspectiveCamera(),chase=new FlightCamera(),p=pose();chase.update(camera,p,0,true);chase.toggle();const base=chase.elevation;
    chase.move(100,50);expect(chase.yaw).toBeGreaterThan(0);expect(chase.elevation).toBeLessThan(base);
    chase.move(-200,-100);expect(chase.yaw).toBeLessThan(0);expect(chase.elevation).toBeGreaterThan(base);
  });
  it('keeps orbit distance constant when the mouse quickly crosses to the opposite side',()=>{
    const camera=new PerspectiveCamera(),chase=new FlightCamera(),p=pose();chase.update(camera,p,0,true);
    chase.toggle();chase.move(Math.PI/.006,0);
    for(let i=0;i<20;i++){
      chase.update(camera,p,.0693);
      expect(Math.hypot(camera.position.x-p.position.x,camera.position.y-p.position.y,camera.position.z-p.position.z)).toBeCloseTo(Math.hypot(32,9),10);
    }
  });
  it('keeps the shadow directly below each displayed aircraft over terrain at any altitude',()=>{
    const shadow=createAircraftShadow(),p=pose(),ground=(x:number,z:number)=>x*.2+z*.1;
    for(const helicopter of [false,true])for(const y of [15,250]){
      p.position={x:100,y,z:-85};p.heading=1.2;shadow.update(p,ground,helicopter);
      expect(shadow.mesh.position.x).toBe(p.position.x);expect(shadow.mesh.position.z).toBe(p.position.z);expect(shadow.mesh.position.y).toBeCloseTo(ground(100,-85)+.18);
      const vertices=shadow.mesh.geometry.attributes.position;
      for(let i=0;i<vertices.count;i++)expect(vertices.getY(i)+shadow.mesh.position.y).toBeCloseTo(ground(vertices.getX(i)+100,vertices.getZ(i)-85)+.18,5);
      expect(shadow.mesh.visible).toBe(true);expect(shadow.mesh.material.depthWrite).toBe(false);
    }
    let geometries=0,materials=0,textures=0;shadow.mesh.geometry.addEventListener('dispose',()=>geometries++);shadow.mesh.material.addEventListener('dispose',()=>materials++);shadow.mesh.material.map!.addEventListener('dispose',()=>textures++);
    shadow.dispose();shadow.dispose();expect([geometries,materials,textures]).toEqual([1,1,1]);
  });
});
