import { describe,it,expect,vi } from 'vitest';
import { Flight } from '../../src/flight/flight';
import { createCockpit } from '../../src/rendering/cockpit';
import { createWingVapor,flightStress,sunGlare } from '../../src/rendering/flight-effects';
import { createMorphTreeGeometry,configureTreeMorph,TREE_DETAIL_START,TREE_DETAIL_END } from '../../src/rendering/tree-morph';
import { MeshStandardMaterial } from 'three';
const input={pitch:0,bank:0,throttle:0};
function fly(speed=80){const f=new Flight(()=>-1000);f.position.y=900;f.speed=speed;f.throttle=.65;f.assisted=false;f.start();return f;}
function step(f:Flight,seconds:number,pitch=0){for(let i=0;i<seconds*60;i++)f.advance(1/60,{...input,pitch});}
describe('energy flight and presentation',()=>{
  it('trades airspeed for climb energy and gains speed in a dive',()=>{const level=fly(),climb=fly(),dive=fly();step(level,2);step(climb,2,.55);step(dive,2,-.55);expect(climb.position.y).toBeGreaterThan(level.position.y+15);expect(climb.speed).toBeLessThan(level.speed-3);expect(dive.speed).toBeGreaterThan(level.speed+3);});
  it('stalls under excessive pull and recovers by unloading with power',()=>{const f=fly(24);f.throttle=1;step(f,.1,1);expect(f.stalled).toBe(true);expect(f.speed).toBeGreaterThan(0);step(f,8,-.15);expect(f.stalled).toBe(false);expect(f.speed).toBeGreaterThan(30);});
  it('completes a full loop without a pitch clamp or artificial altitude shelf',()=>{const f=fly(90);f.throttle=1;step(f,15,.7);expect(f.state).toBe('running');expect(f.pitch).toBeGreaterThan(Math.PI*2);expect(f.position.y).toBeGreaterThan(250);});
  it('reports high load, with bounded visual stress and sharply directional sun glare',()=>{const f=fly(90);step(f,.3,.7);expect(f.loadFactor).toBeGreaterThan(3);expect(flightStress(1,80,false)).toBe(0);expect(flightStress(8,80,false)).toBe(1);expect(sunGlare(1)).toBe(1);expect(sunGlare(.8)).toBeLessThan(.001);expect(sunGlare(-1)).toBe(0);});
  it('owns and releases detailed cockpit and vapor resources exactly once',()=>{const c=createCockpit(),v=createWingVapor();expect(c.group.children.length).toBeGreaterThan(70);c.update(70,400,.8,.3,.2,10);const dispose=vi.spyOn((c.group.children[0] as import('three').Mesh).geometry,'dispose');c.dispose();c.dispose();expect(dispose).toHaveBeenCalledOnce();v.update(.7);expect(v.group.visible).toBe(true);v.update(0);expect(v.group.visible).toBe(false);v.dispose();});
  it('morphs detailed tree geometry into cuboids well beyond the old near terrain radius',()=>{const g=createMorphTreeGeometry(),m=new MeshStandardMaterial();configureTreeMorph(m);expect(TREE_DETAIL_START).toBeGreaterThan(300);expect(TREE_DETAIL_END).toBeGreaterThan(TREE_DETAIL_START+200);expect(g.getAttribute('farPosition').count).toBe(g.getAttribute('position').count);expect(g.getAttribute('position').array).not.toEqual(g.getAttribute('farPosition').array);const shader={vertexShader:'void main() {\n#include <color_vertex>\n#include <begin_vertex>\n}'};m.onBeforeCompile(shader as never,{} as never);expect(shader.vertexShader).toContain('mix(position,farPosition,treeBlend)');expect(shader.vertexShader).toContain('cameraPosition');g.dispose();m.dispose();});
});
