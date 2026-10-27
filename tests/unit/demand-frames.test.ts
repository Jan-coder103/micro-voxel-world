import { describe,it,expect,vi } from 'vitest';
import { demandFrames } from '../../src/rendering/demand-frames';
function scheduler(){let next=0;const pending=new Map<number,FrameRequestCallback>();return {pending,request:(fn:FrameRequestCallback)=>{pending.set(++next,fn);return next;},cancel:(id:number)=>{pending.delete(id);},tick:(time:number)=>{const entries=[...pending];pending.clear();for(const [,fn] of entries)fn(time);}};}
describe('demand-driven frames',()=>{
  it('coalesces invalidations, sleeps when idle and resumes without a polling callback',()=>{
    const s=scheduler(),draw=vi.fn(()=>false),loop=demandFrames(draw,s.request,s.cancel);
    expect(s.pending.size).toBe(0);loop.invalidate();loop.invalidate();expect(s.pending.size).toBe(1);s.tick(100);expect(draw).toHaveBeenCalledWith(100);expect(s.pending.size).toBe(0);
    loop.invalidate();s.tick(9000);expect(draw).toHaveBeenCalledTimes(2);expect(s.pending.size).toBe(0);loop.dispose();
  });
  it('keeps active frames running and retains invalidation during a draw',()=>{
    const s=scheduler();let active=true;const loop=demandFrames(()=>active,s.request,s.cancel);loop.invalidate();s.tick(1);expect(s.pending.size).toBe(1);active=false;s.tick(2);expect(s.pending.size).toBe(0);loop.dispose();
    const once=demandFrames(()=>{once.invalidate();return false;},s.request,s.cancel);once.invalidate();s.tick(3);expect(s.pending.size).toBe(1);once.dispose();expect(s.pending.size).toBe(0);
  });
  it('cancels teardown and cannot be restarted after disposal, including from inside draw',()=>{
    const s=scheduler(),draw=vi.fn(()=>true),loop=demandFrames(draw,s.request,s.cancel);loop.invalidate();loop.dispose();loop.dispose();loop.invalidate();s.tick(10);expect(draw).not.toHaveBeenCalled();expect(s.pending.size).toBe(0);
    const during=demandFrames(()=>{during.dispose();return true;},s.request,s.cancel);during.invalidate();s.tick(20);expect(s.pending.size).toBe(0);
  });
});
