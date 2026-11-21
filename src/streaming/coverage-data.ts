import type { TerrainBounds } from './terrain-bounds';
export const FRONTIER_COVERAGE={spacing:128,innerExtent:512,innerSpacing:16,drop:1};
export interface CoverageData {
  id:number;x:number;z:number;positions:Float32Array;normals:Float32Array;colors:Float32Array;waterDepth:Float32Array;bounds:TerrainBounds;
}
