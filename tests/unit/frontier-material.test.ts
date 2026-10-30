import { cropFields } from '../../src/world/regional-terrain';
import { expect,it } from 'vitest';
import { DataTexture,MeshStandardMaterial,ShaderLib } from 'three';
import { configureFrontierMaterial } from '../../src/rendering/frontier-material';
it('shares filtered world-anchored detail across ground LODs and rebasing without modifying the water palette',()=>{
  const material=new MeshStandardMaterial({vertexColors:true}),surface=configureFrontierMaterial(material,103);
  const shader={vertexShader:ShaderLib.standard.vertexShader,fragmentShader:ShaderLib.standard.fragmentShader,uniforms:{}} as Parameters<typeof material.onBeforeCompile>[0];
  material.onBeforeCompile(shader,undefined as never);
  expect(shader.vertexShader).toContain('terrainOrigin');expect(shader.fragmentShader).toContain('fwidth');
  expect(shader.fragmentShader).toContain('land*vTerrainTop');expect(shader.fragmentShader).toContain('terrainGrain(vTerrainPosition,.65)');
  const origin=shader.uniforms.terrainOrigin.value;surface.updateOrigin(4096,-8192);expect(origin.toArray()).toEqual([4096,-8192]);expect(shader.uniforms.terrainOrigin.value).toBe(origin);
  const atlas=shader.uniforms.farmAtlas.value as DataTexture,version=atlas.version;
  surface.updateFields(20,30);expect(atlas.version).toBe(version);
  surface.updateFields(5000,-3000);expect(atlas.version).toBeGreaterThan(version);
  const [bx,bz]=shader.uniforms.farmOrigin.value.toArray();
  for(const f of cropFields(103,bx+6,bz+6))expect(atlas.image.data![(6*117+6*9)*4+8+f.slot*8]).toBe(f.crop+(f.rowsAlongX?.25:0));
  let disposed=0;atlas.addEventListener('dispose',()=>disposed++);surface.dispose();expect(disposed).toBe(1);
  material.dispose();
});
