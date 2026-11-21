import { describe,it,expect } from 'vitest';
import { FrameProfile } from '../../src/performance/frame-profile';

describe('bounded frame profiling',()=>{
  it('accumulates fixed ticks per frame and includes absent work as zero',()=>{
    const p=new FrameProfile();p.add('simulation',2);p.add('simulation',3);p.finish();p.finish();
    expect(p.report().simulation).toEqual({mean:2.5,p95:5,max:5,samples:2});
  });
  it('does not count missing pacing samples as zero milliseconds',()=>{
    const p=new FrameProfile();p.finish();p.add('Frame interval',20);p.finish();p.finish();
    expect(p.report(['Frame interval'])['Frame interval']).toEqual({mean:20,p95:20,max:20,samples:1});
  });
  it('evicts old spikes, computes nearest-rank p95 and resets captures',()=>{
    const p=new FrameProfile(20);p.add('work',1000);p.finish();
    for(let i=1;i<=20;i++){p.add('work',i);p.finish();}
    expect(p.report().work).toEqual({mean:10.5,p95:19,max:20,samples:20});
    p.add('unfinished',4);p.reset();expect(p.report()).toEqual({});expect(p.current).toEqual({});
  });
});

it('matches sorted nearest-rank statistics for sparse, repeated and fractional samples without mutating history',()=>{
  const p=new FrameProfile(600);let seed=7;
  for(let i=0;i<600;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;if(i%3)p.add('work',(seed%100)/8);if(i%17===0)p.add('interval',20);p.finish();}
  const original=JSON.stringify(p.frames),report=p.report(['interval']);
  for(const name of ['work','interval']){const a=p.frames.filter(f=>name!=='interval'||name in f).map(f=>f[name]??0).sort((a,b)=>a-b);expect(report[name].p95).toBe(a[Math.ceil(a.length*.95)-1]);expect(report[name].mean).toBeCloseTo(a.reduce((s,v)=>s+v,0)/a.length,12);}
  expect(Object.keys(p.report([],['work']))).toEqual(['work']);expect(JSON.stringify(p.frames)).toBe(original);
});
