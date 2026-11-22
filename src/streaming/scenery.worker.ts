import { generateScenery,type ScenerySpec } from './scenery-data';
import { SettlementWorld } from '../world/settlements';
let world:SettlementWorld|undefined;
self.onmessage=(event:MessageEvent<{id:number;seed:number;spec:ScenerySpec}>)=>{
  const {id,seed,spec}=event.data;
  try{
    if(!world||world.seed!==seed)world=new SettlementWorld(seed);
    const job=generateScenery(seed,world,spec);let step=job.next();while(!step.done)step=job.next();const data=step.value;
    self.postMessage({id,data},{transfer:data.kind==='roads'?[data.positions.buffer,data.normals.buffer,data.colors.buffer]:[]});
  }catch(error){self.postMessage({id,error:String(error)});}
};
