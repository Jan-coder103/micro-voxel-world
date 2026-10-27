import { describe,it,expect } from 'vitest';
import { Flight } from '../../src/flight/flight';
const neutral={pitch:0,bank:0,throttle:0};
describe('fixed-wing flight',()=>{
  it('matches 30 and 144 Hz travel with bounded catchup',()=>{
    const run=(hz:number)=>{const f=new Flight(()=>0);f.start();for(let i=0;i<hz*5;i++)f.advance(1/hz,{pitch:.1,bank:.3,throttle:.2});return f;};
    const a=run(30),b=run(144);expect(a.ticks).toBe(300);expect(b.ticks).toBe(300);expect(a.position.x).toBeCloseTo(b.position.x,8);expect(a.position.y).toBeCloseTo(b.position.y,8);
    a.advance(10,neutral);expect(a.dropped).toBeGreaterThan(9);expect(a.ticks).toBe(308);
  });
  it('pauses, resets and validates time/input',()=>{const f=new Flight(()=>7);f.advance(1,neutral);expect(f.ticks).toBe(0);f.start();f.advance(1/60,neutral);f.pause();const z=f.position.z;f.advance(1,neutral);expect(f.position.z).toBe(z);f.reset();expect(f.state).toBe('ready');expect(f.position.y).toBe(47);expect(f.ticks).toBe(0);expect(()=>f.advance(NaN,neutral)).toThrow();f.start();expect(()=>f.advance(.1,{...neutral,pitch:NaN})).toThrow();});
  it('controls speed, altitude and bank turns; assistance levels while direct holds',()=>{const f=new Flight(()=>0);f.start();for(let i=0;i<90;i++)f.advance(1/60,{pitch:.4,bank:.4,throttle:1});expect(f.position.y).toBeGreaterThan(45);expect(f.speed).toBeGreaterThan(60);expect(f.heading).toBeGreaterThan(0);const bank=f.bank;f.advance(.1,neutral);expect(f.bank).toBeLessThan(bank);f.assisted=false;const held=f.bank;f.advance(.1,neutral);expect(f.bank).toBe(held);for(let i=0;i<600;i++)f.advance(1/60,{pitch:0,bank:0,throttle:-1});expect(f.speed).toBeGreaterThanOrEqual(30);});
  it('sweeps terrain independent of geometry readiness and recovers',()=>{const f=new Flight((_,z)=>z<15.6&&z>15.2?100:0);f.start();f.advance(1/60,neutral);expect(f.state).toBe('crashed');const p={...f.position};f.advance(1,neutral);expect(f.position).toEqual(p);f.reset();expect(f.state).toBe('ready');expect(f.reason).toBe('');});
  it('stops at world bounds',()=>{const f=new Flight(()=>0);f.position.x=130849.9;f.heading=Math.PI/2;f.start();f.advance(1/60,neutral);expect(f.reason).toBe('World boundary');});
});
