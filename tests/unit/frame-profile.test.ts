import { describe,it,expect } from 'vitest';
import { FrameProfile } from '../../src/performance/frame-profile';

describe('bounded frame profiling',()=>{
  it('accumulates fixed ticks per frame and includes absent work as zero',()=>{
    const p=new FrameProfile();p.add('simulation',2);p.add('simulation',3);p.finish();p.finish();
    expect(p.report().simulation).toEqual({mean:2.5,p95:5,max:5,samples:2});
  });
  it('evicts old spikes, computes nearest-rank p95 and resets captures',()=>{
    const p=new FrameProfile(20);p.add('work',1000);p.finish();
    for(let i=1;i<=20;i++){p.add('work',i);p.finish();}
    expect(p.report().work).toEqual({mean:10.5,p95:19,max:20,samples:20});
    p.add('unfinished',4);p.reset();expect(p.report()).toEqual({});expect(p.current).toEqual({});
  });
});
