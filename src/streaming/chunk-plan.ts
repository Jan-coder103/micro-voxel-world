import { CHUNK_SIZE, wantedChunks, type ChunkSpec } from './terrain-data.ts';

/** One owned plan; sub-chunk movement cannot change its tiers or priority. */
export class ChunkPlan {
  private x = NaN;
  private z = NaN;
  private specs: readonly ChunkSpec[] = [];
  rebuilds = 0;
  constructor(private seed: number, private regional = false, private structures = false) {}
  at(worldX: number, worldZ: number): readonly ChunkSpec[] {
    const x = Math.floor(worldX / CHUNK_SIZE), z = Math.floor(worldZ / CHUNK_SIZE);
    if (x !== this.x || z !== this.z) {
      this.x = x; this.z = z;
      this.specs = wantedChunks(this.seed, worldX, worldZ).map(s => Object.freeze({ ...s,
        ...(this.regional ? { generator: 'regional-v2' as const } : {}),
        ...(this.regional && this.structures ? { structures: true as const } : {}),
      }));
      Object.freeze(this.specs);
      this.rebuilds++;
    }
    return this.specs;
  }
}
