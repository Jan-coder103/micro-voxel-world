import {expect,it} from 'vitest';
import {Mutants,mutantParts,mutantBounds} from '../../src/hordes/mutants';
import {Frontier} from '../../src/game/frontier';
const memory=()=>{const data=new Map<string,string>();return {getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);}};};
it('spawns a deterministic eight-legged giant with matching articulated bounds and hittable legs',()=>{
  const m=new Mutants(103,memory()),t=m.spider,parts=mutantParts(t),legs=parts.filter(p=>p.axis);
  expect(t.kind).toBe('spider');expect(t.height).toBe(64);expect(legs).toHaveLength(16);
  expect(new Mutants(103,memory()).spider.position).toEqual(t.position);
  const bounds=mutantBounds(t);expect(bounds.length).toBe(parts.length-4);
  for(const p of legs){expect(t.hitSpheres!.some(s=>Math.hypot(s.position.x-p.x,s.position.y-p.y,s.position.z-p.z)<p.w)).toBe(true);}
  expect(m.query({x:t.position.x-120,y:t.ground,z:t.position.z-120},{x:t.position.x+120,y:t.ground+100,z:t.position.z+120})).toContain(t);
  expect(m.nearby(t.position)).toContain(m.landmark);
});
it('persists spider damage/death and awards its larger combat reward only once',()=>{
  const storage=memory(),g=new Frontier(103,storage),t=g.mutants.spider,chest=t.hitSpheres![0];g.launch();g.combat.damageMultiplier=10000;
  // Combat uses the same damage callback and reward pipeline as other bosses.
  t.health=1111;g.mutants.damaged(t);expect(new Mutants(103,storage).spider.health).toBe(1111);
  const start={x:chest.position.x,y:chest.position.y,z:chest.position.z-100};
  g.combat.step(true,'autocannon',start,{x:0,y:0,z:1});
  expect(t.health).toBe(0);expect(g.pendingMoney).toBe(2200);expect(g.pendingXP).toBe(3200);
  expect(new Mutants(103,storage).spider.health).toBe(0);
  g.combat.step(true,'shell',start,{x:0,y:0,z:1});expect(g.pendingMoney).toBe(2200);
});
