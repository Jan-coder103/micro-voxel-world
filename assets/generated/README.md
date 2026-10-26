# Generated assets

`npm run assets:export` derives optimized `assets/generated/<source-id>.glb` files from all committed v1 source assets. Pass source paths after `--` to export selected files. Re-running replaces the matching derivative; invalid inputs return nonzero. GLBs are ignored by Git and regenerated on each machine. The authoritative JSON sources, pipeline, and tests are committed.

Each GLB records source identity, SHA-256 of normalized shared source serialization, mesh version, scale, pivot/orientation, and provenance. See `docs/asset-authoring/mesh-pipeline.md` for ownership, batching, regeneration, and future LOD cache-key rules. No lower-detail tiers are generated yet.
