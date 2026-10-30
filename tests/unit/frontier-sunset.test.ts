import {expect,it} from 'vitest';
import {Mutants} from '../../src/hordes/mutants';
import {SettlementWorld,intersects} from '../../src/world/settlements';
import {cropFields} from '../../src/world/regional-terrain';
import {MeshStandardMaterial,ShaderLib} from 'three';
import {configureFrontierMaterial} from '../../src/rendering/frontier-material';
it('moves nearby giants slowly with matching hit spheres and freezes distant and dead giants',()=>{
  const m=new Mutants(103),t=m.landmark,start={...t.position};
  m.step({x:start.x+3000,y:start.y,z:start.z},1);expect(t.position).toEqual(start);
  const sphere={...t.hitSpheres![0].position};m.step(start,1);
  const distance=Math.hypot(t.position.x-start.x,t.position.z-start.z);expect(distance).toBeGreaterThan(0);expect(distance).toBeLessThanOrEqual(.91);
  expect(t.hitSpheres![0].position.x-sphere.x).toBeCloseTo(t.position.x-start.x);
  const stopped={...t.position};t.health=0;m.step(start,1);expect(t.position).toEqual(stopped);
});
it('varies town spacing and adds bounded deterministic farm clusters beside fields',()=>{
  const w=new SettlementWorld(103),city=w.landmarks().city!;
  const xs=[...new Set(city.nodes.filter(n=>n.id.includes(':n')).map(n=>n.x))].sort((a,b)=>a-b);
  expect(new Set(xs.slice(1).map((x,i)=>Math.round((x-xs[i])*100))).size).toBeGreaterThan(3);
  expect(city.buildings.filter(b=>Math.hypot(b.x-city.x,b.z-city.z)>48).every(b=>b.kit==='house')).toBe(true);
  let count=0;
  for(let z=-2;z<=1;z++)for(let x=0;x<=2;x++){
    const bounds={minX:x*384,maxX:(x+1)*384,minZ:z*384,maxZ:(z+1)*384};
    const farms=w.inBounds(bounds).filter(s=>s.id.startsWith('farm:'));
    expect(farms).toEqual(new SettlementWorld(103).inBounds(bounds).filter(s=>s.id.startsWith('farm:')));
    for(const farm of farms){const [bx,bz]=farm.id.split(':')[2].split(',').map(Number),fields=cropFields(103,bx,bz);expect(farm.buildings.length).toBeLessThanOrEqual(2);for(const b of farm.buildings){count++;expect(b.kit).toBe('house');expect(fields.some(f=>intersects(f,b))).toBe(false);expect(fields.some(f=>Math.abs(b.z-f.minZ)<6||Math.abs(b.z-f.maxZ)<6)).toBe(true);}}
  }
  expect(count).toBeGreaterThan(0);
});
it('uses static water waves and sun glints with low water roughness across LODs',()=>{
  const material=new MeshStandardMaterial({vertexColors:true}),surface=configureFrontierMaterial(material,103);
  const shader={vertexShader:ShaderLib.standard.vertexShader,fragmentShader:ShaderLib.standard.fragmentShader,uniforms:{}} as Parameters<typeof material.onBeforeCompile>[0];material.onBeforeCompile(shader,undefined as never);
  expect(shader.fragmentShader).toContain('waveNormal');expect(shader.fragmentShader).toContain('glint');expect(shader.fragmentShader).toContain('roughnessFactor,.30,waterCoverage');expect(shader.fragmentShader).not.toContain('uniform float time');surface.dispose();material.dispose();
});
