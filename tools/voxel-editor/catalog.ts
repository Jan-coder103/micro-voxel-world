import marker from '../../assets/source/direction-marker.voxel.json';
import cube from '../../assets/source/metre-cube.voxel.json';
import { validateSource } from '../../src/assets/voxel-source';

export const MAX_ASSETS = 24;
export function createFixtures() { return [validateSource(marker), validateSource(cube)]; }
