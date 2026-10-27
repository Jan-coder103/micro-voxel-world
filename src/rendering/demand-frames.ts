/** Coalesced animation requests. An idle scene has no pending animation callback. */
export function demandFrames(
  draw:(now:number)=>boolean,
  request:(callback:FrameRequestCallback)=>number=requestAnimationFrame,
  cancel:(id:number)=>void=cancelAnimationFrame,
){
  let pending:number|undefined,disposed=false;
  const invalidate=()=>{if(!disposed&&pending===undefined)pending=request(frame);};
  const frame=(now:number)=>{pending=undefined;if(disposed)return;if(draw(now))invalidate();};
  return {invalidate,dispose(){if(disposed)return;disposed=true;if(pending!==undefined)cancel(pending);pending=undefined;}};
}
