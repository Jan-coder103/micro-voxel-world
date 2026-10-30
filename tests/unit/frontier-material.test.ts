import { expect,it } from 'vitest';
import { MeshStandardMaterial,ShaderLib } from 'three';
import { configureFrontierMaterial } from '../../src/rendering/frontier-material';
it('shares filtered world-anchored detail across ground LODs and rebasing without modifying the water palette',()=>{
  const material=new MeshStandardMaterial({vertexColors:true}),surface=configureFrontierMaterial(material,103);
  const shader={vertexShader:ShaderLib.standard.vertexShader,fragmentShader:ShaderLib.standard.fragmentShader,uniforms:{}} as Parameters<typeof material.onBeforeCompile>[0];
  material.onBeforeCompile(shader,undefined as never);
  expect(shader.vertexShader).toContain('terrainOrigin');expect(shader.fragmentShader).toContain('fwidth');
  expect(shader.fragmentShader).toContain('land*vTerrainTop');expect(shader.fragmentShader).toContain('terrainGrain(vTerrainPosition,.65)');
  const origin=shader.uniforms.terrainOrigin.value;surface.updateOrigin(4096,-8192);expect(origin.toArray()).toEqual([4096,-8192]);expect(shader.uniforms.terrainOrigin.value).toBe(origin);
  material.dispose();
});
