import { describe, expect, it } from 'vitest';
import { InstancedMesh } from 'three';
import { createOutdoorScene } from '../../src/rendering/outdoor-scene';
import { createTerrain } from '../../src/rendering/terrain';
import { intersectsBox, proxyFor, terrainHeight } from '../../src/world/outdoor';

describe('static outdoor fixture', () => {
  it('keeps terrain on a decimetre lattice with upward tops and outward walls', () => {
    const terrain = createTerrain();
    const positions = terrain.mesh.geometry.getAttribute('position');
    const normals = terrain.mesh.geometry.getAttribute('normal');
    let latticeError = 0, minNormalY = 1;
    for (let i = 0; i < positions.count; i++) {
      for (const value of [positions.getX(i), positions.getY(i), positions.getZ(i)]) latticeError = Math.max(latticeError, Math.abs(value * 10 - Math.round(value * 10)));
      minNormalY = Math.min(minNormalY, normals.getY(i));
    }
    expect(latticeError).toBeLessThan(.001); expect(minNormalY).toBeCloseTo(0);
    terrain.mesh.geometry.computeBoundingBox();
    expect(terrain.mesh.geometry.boundingBox!.min.x).toBe(-32);
    expect(terrain.mesh.geometry.boundingBox!.max.x).toBe(32);
    expect(terrainHeight(0,0)).toBe(0);
    expect(terrainHeight(30,30)).toBeGreaterThan(0);
    terrain.dispose();
  });
  it('transforms base-centred source envelopes into collision bounds', () => {
    const p = proxyFor('rotated', [8,4,6], { x: 10, z: 12, yaw: Math.PI / 2 });
    expect(p.min).toEqual([7,0,8]); expect(p.max).toEqual([13,4,16]);
    expect(intersectsBox(p, { id:'hit', min:[8,1,9], max:[9,2,10] })).toBe(true);
    expect(intersectsBox(p, { id:'miss', min:[13,0,8], max:[14,1,9] })).toBe(false);
  });
  it('batches repeated sources, grounds proxies, blocks test movement and releases shared resources once', () => {
    const fixture = createOutdoorScene();
    const trees = fixture.scene.getObjectByName('ref-field-tree') as InstancedMesh;
    expect(trees.isInstancedMesh).toBe(true); expect(trees.count).toBe(36);
    expect(fixture.batches).toHaveLength(6); expect(fixture.proxies).toHaveLength(51);
    for (const proxy of fixture.proxies) {
      const x = (proxy.min[0]+proxy.max[0])/2, z = (proxy.min[2]+proxy.max[2])/2;
      expect(proxy.min[1]).toBe(terrainHeight(x,z));
    }
    expect(fixture.canOccupy(0,0)).toBe(true); expect(fixture.canOccupy(5,2)).toBe(false);
    expect(fixture.groundHeight(0,0)).toBe(.1); expect(fixture.groundHeight(8,0)).toBe(0);
    let released = 0; trees.geometry.addEventListener('dispose', () => released++);
    fixture.showProxies(true); fixture.setFog(false); expect(fixture.scene.fog).toBeNull();
    fixture.dispose(); fixture.dispose(); expect(released).toBe(1); expect(fixture.scene.children).toHaveLength(0);
  });
});
