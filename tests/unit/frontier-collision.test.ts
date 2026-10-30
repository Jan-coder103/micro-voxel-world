import { describe,it,expect } from 'vitest';
import { FrontierTrees } from '../../src/world/frontier-collision';
import { SettlementWorld } from '../../src/world/settlements';
import { regionalLandmarks,regionTrees } from '../../src/world/regional-terrain';
import { Flight } from '../../src/flight/flight';
import { LAB_FIXED_HULL } from '../../src/flight/aircraft-hulls';
describe('frontier tree collision',()=>{
  it('matches worker trees without terrain residency, crashes an aircraft at a canopy, and bounds its cache',()=>{
    const world=new SettlementWorld(103),trees=new FrontierTrees(103,world),forest=regionalLandmarks(103).Forest;
    let tree:ReturnType<typeof regionTrees>[number]|undefined;
    outer:for(let z=Math.floor(forest.z/32)-3;z<Math.floor(forest.z/32)+4;z++)for(let x=Math.floor(forest.x/32)-3;x<Math.floor(forest.x/32)+4;x++)for(const candidate of regionTrees({seed:103,x,z,lod:0,generator:'regional-v2'})){const p=candidate,b={minX:p.x-2,maxX:p.x+2,minZ:p.z-2,maxZ:p.z+2,minY:p.y,maxY:p.y+12};if(trees.query(b).length){tree=p;break outer;}}
    expect(tree).toBeDefined();const p=tree!,f=new Flight(()=>-100,undefined,'fixed-wing',{fixedWing:LAB_FIXED_HULL,obstacles:b=>trees.query(b)});f.position={x:p.x,y:p.y+p.height*.8,z:p.z+8};f.speed=30;f.start();for(let i=0;i<60&&f.state==='running';i++)f.advance(1/60,{pitch:0,bank:0,throttle:0});expect(f.state).toBe('crashed');expect(f.reason).toBe('Obstacle collision');
    expect(trees.query({minX:-10,maxX:10,minZ:200,maxZ:220,minY:0,maxY:100})).toEqual([]);
    for(let x=1000;x<10000;x+=128)trees.query({minX:x,maxX:x+20,minZ:250,maxZ:270,minY:0,maxY:250});expect(trees.cachedChunks).toBeLessThanOrEqual(64);
  });
});
