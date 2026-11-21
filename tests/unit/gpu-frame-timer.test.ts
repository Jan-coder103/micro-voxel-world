import { expect,it,vi } from 'vitest';
import { GpuFrameTimer } from '../../src/performance/gpu-frame-timer';
function context(supported=true){
  let active:object|null=null,id=0,ready=false,disjoint=false,lost=false;
  const results=new Map<object,number>();
  const gl={QUERY_RESULT_AVAILABLE:1,QUERY_RESULT:2,getExtension:()=>supported?{TIME_ELAPSED_EXT:3,GPU_DISJOINT_EXT:4}:null,
    createQuery:vi.fn(()=>({id:++id})),deleteQuery:vi.fn(),isContextLost:()=>lost,
    beginQuery:vi.fn((_target:number,q:object)=>{expect(active).toBeNull();active=q;results.set(q,id*1e6);}),
    endQuery:vi.fn(()=>{expect(active).not.toBeNull();active=null;}),getParameter:()=>disjoint,
    getQueryParameter:vi.fn((q:object,parameter:number)=>parameter===1?ready:results.get(q)),
  };
  return {gl:gl as unknown as WebGL2RenderingContext,mock:gl,ready:()=>{ready=true;},disjoint:()=>{disjoint=true;},lost:()=>{lost=true;}};
}
it('publishes complete nonnested GPU passes and their sum only after asynchronous availability',()=>{
  const c=context(),timer=new GpuFrameTimer(c.gl);timer.begin();timer.stage('Shadow depth');timer.stage('Main color');timer.end();timer.poll();expect(timer.samples.frames).toHaveLength(0);
  c.ready();timer.poll();expect(timer.samples.frames).toEqual([{'Render setup':1,'Shadow depth':2,'Main color':3,Total:6}]);expect(c.mock.deleteQuery).toHaveBeenCalledTimes(3);timer.dispose();
});
it('bounds pending queries, discards disjoint/reset/context-invalid frames and handles unsupported timers',()=>{
  const c=context(),timer=new GpuFrameTimer(c.gl);
  for(let i=0;i<20;i++){timer.begin();timer.stage('Shadow depth');timer.stage('Main color');timer.end();}
  expect(c.mock.createQuery).toHaveBeenCalledTimes(24);c.disjoint();timer.poll();expect(c.mock.deleteQuery).toHaveBeenCalledTimes(24);expect(timer.samples.frames).toHaveLength(0);
  timer.begin();timer.reset();expect(c.mock.deleteQuery).toHaveBeenCalledTimes(25);timer.dispose();
  const absent=context(false),unsupported=new GpuFrameTimer(absent.gl);unsupported.begin();unsupported.poll();expect(unsupported.supported).toBe(false);expect(absent.mock.createQuery).not.toHaveBeenCalled();
  const lost=context(),invalid=new GpuFrameTimer(lost.gl);invalid.begin();invalid.end();lost.lost();invalid.poll();expect(lost.mock.deleteQuery).toHaveBeenCalledOnce();expect(invalid.samples.frames).toHaveLength(0);
});
it('driver exceptions disable optional timing and clean active queries',()=>{
  const c=context(),timer=new GpuFrameTimer(c.gl);timer.begin();timer.run(()=>{throw new Error('driver failed');});expect(timer.supported).toBe(false);expect(timer.error).toContain('driver failed');expect(c.mock.deleteQuery).toHaveBeenCalledOnce();timer.restore();expect(timer.supported).toBe(true);timer.dispose();
});
