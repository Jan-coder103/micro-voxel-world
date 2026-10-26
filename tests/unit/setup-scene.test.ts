import { describe, expect, it } from 'vitest';
import { Mesh, BoxGeometry } from 'three';
import { createSetupScene } from '../../src/rendering/setup-scene';
import { WORLD_SCALE } from '../../src/core/scale';

describe('setup fixture', () => {
  it('places a metre cube on the ground using the shared scale', () => {
    const fixture = createSetupScene();
    const cube = fixture.scene.getObjectByName('one-metre-scale-fixture') as Mesh<BoxGeometry>;
    expect(WORLD_SCALE.metresPerUnit).toBe(1);
    expect(WORLD_SCALE.assetVoxelMetres).toBe(0.1);
    expect(cube.geometry.parameters.height).toBe(1);
    expect(cube.position.y - cube.geometry.parameters.height / 2).toBe(0);
    fixture.dispose();
  });
  it('releases fixture geometry/materials and clears the scene', () => {
    const fixture = createSetupScene();
    const cube = fixture.scene.getObjectByName('one-metre-scale-fixture') as Mesh;
    let released = 0;
    cube.geometry.addEventListener('dispose', () => released++);
    fixture.dispose();
    expect(released).toBe(1);
    expect(fixture.scene.children).toHaveLength(0);
  });
});
