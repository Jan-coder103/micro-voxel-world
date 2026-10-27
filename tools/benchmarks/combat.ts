import { cpus } from 'node:os';
import { Sortie } from '../../src/game/sortie.ts';
import { distribution } from '../../src/game/metrics.ts';
const scenarios=[];
for(const scenario of ['crowd','fire'] as const){
  const model=new Sortie(12012,undefined,true);model.flight.position={x:-40,y:model.ground(-40,16)+36,z:16};model.flight.bank=.85;model.flight.assisted=false;model.start();
  const samples:number[]=[],peaks={residents:0,individuals:0,effects:0,querySlots:0};
  for(let i=0;i<3660;i++){const begin=performance.now();model.advance(1/60,{pitch:0,bank:0,throttle:0,fire:scenario==='fire',weapon:'minigun'});const elapsed=performance.now()-begin;if(i>=60)samples.push(elapsed);peaks.residents=Math.max(peaks.residents,model.hordes.resident.size);peaks.individuals=Math.max(peaks.individuals,model.hordes.counts.individuals);peaks.effects=Math.max(peaks.effects,model.combat.effects.filter(e=>e.active).length);peaks.querySlots=Math.max(peaks.querySlots,model.hordes.lastQueryMembers);}
  scenarios.push({scenario,seed:12012,warmupTicks:60,measuredTicks:samples.length,simulatedSeconds:samples.length/60,stepCpuMs:distribution(samples),peaks,shots:model.combat.shots,damage:model.combat.damage,killed:model.store.killed,remainingPopulation:2592-model.store.killed,droppedSimulationSeconds:model.flight.dropped,flightState:model.flight.state});
}
process.stdout.write(JSON.stringify({node:process.version,platform:process.platform,arch:process.arch,cpu:cpus()[0]?.model,logicalCpus:cpus().length,note:'Fixed-tick CPU model timings, no renderer/GPU; isolated in-memory populations.',scenarios},null,2)+'\n');
