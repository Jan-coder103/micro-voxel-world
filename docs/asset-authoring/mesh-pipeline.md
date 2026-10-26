# Voxel mesh and GLB pipeline

Phase 4 uses the unchanged v1 editable source as the only geometry authority. `src/assets/voxel-mesh.ts` validates an owned copy, extracts exposed faces with sparse coordinate lookups, and greedily merges compatible rectangles. It never allocates a full 256³ voxel volume. Empty positions are air, including enclosed cavities; faces between occupied cells are omitted regardless of their colors.

Faces merge only within the same plane, outward direction, and palette entry. Distinct entries remain separate even if their colors currently match. V1 supports one opaque matte material, so all rectangles share one material/draw batch with per-vertex linear RGB colors. No transparency, baked AO, texture, or lighting values participate in merging. Adding those features requires revisiting the compatibility key and material batching policy.

Plane and face traversal are sorted for deterministic output independent of cell order. The `culled` mode emits individual exposed unit faces and is available for diagnostics/tests; the workshop and exports use `greedy`. Every rectangle has four vertices, flat outward normals and two indexed triangles. The renderer uses 16-bit indices where safe and 32-bit indices above 65536 vertices. Physical positions retain the source's metre scale and base-centred pivot. Mesh bounds describe occupied geometry; workshop framing/bounds still use the declared authoring envelope, including padding.

`src/rendering/voxel-mesh.ts` owns BufferGeometry, the shared opaque matte material, and idempotent disposal. The workshop replaces its former cube instances with this mesh and reports naive/optimized triangle counts. Camera, lighting, source import/export, and catalog behavior are retained.

## Export and regeneration

Use **Export runtime GLB** in the workshop, or run:

```sh
npm run assets:export
npm run assets:export -- assets/source/your-asset.voxel.json
npm run assets:benchmark
```

The CLI defaults to all committed `.voxel.json` files and writes `assets/generated/<asset-id>.glb`, replacing that asset's derivative. Explicit paths export only those sources. Duplicate IDs in one batch and invalid inputs fail with a nonzero exit status; valid earlier entries may already have been written. IDs are validated before use as filenames. Generated GLBs are ignored by Git and can be rebuilt after pulling on another computer. Source JSON, tests, and pipeline code are committed.

`src/assets/export-glb.ts` uses the installed Three.js GLTFExporter with binary output. It creates a temporary optimized mesh, exports only that mesh, and releases geometry/material resources even on failure. The browser loads the exporter on demand and suppresses downloads after workshop teardown. GLB/source export works without WebGL. Node tooling installs only the texture-free binary exporter's required Blob-to-ArrayBuffer FileReader subset; no DOM shim runs in the browser and no package was added.

GLBs contain one indexed mesh and one opaque matte material with vertex colors, normals, and identity transforms. Grid/helper geometry, lights, and cameras are excluded. Node extras retain the source ID/name, schema version, mesh version, units, voxel size, grid dimensions, pivot, facing, and provenance. `sourceHash` is SHA-256 of the shared formatted source serialization, not the original file's whitespace. Export does not mutate the editable source. GLB is a runtime derivative; importing it back into the editable catalog is unsupported.

`meshVersion: 1` plus `sourceHash` identifies the current derivation. Increment the mesh version when generated geometry policy changes. There is no persistent export cache yet: current fixtures are cheap to regenerate, and avoiding stale derivatives is preferable to speculative caching. A future cache key must include source hash, mesh version, export version/options, and LOD configuration.

## Verification and LOD direction

`npm run check` covers exact exposed-face coverage for every nonempty 2³ occupancy pattern, multicolor adjacency, cavities, disconnected/boundary cells, deterministic output, winding, normals, area, bounds, index overflow, resource disposal, CLI exports, GLB reloads, and source preservation. Chromium additionally compares original cube instances, culled faces, greedy meshes, and exported/reloaded GLBs from perspective/front/top views for the marker, metre cube, and two-color pair. Pixel comparisons allow small subpixel rasterization differences. This is structural/reload/render verification, not a claim of an external conformance certification or cross-device benchmark.

See [Phase 4 measurements](../benchmarks/phase-4-meshing.md) for reproducible reference counts and one local CPU sample.

Future LOD derivatives should reuse these source IDs and the metre/pivot conventions: LOD 0 uses the detailed greedy surface; LOD 1 may coarsen occupancy while protecting silhouette and material boundaries; LOD 2 can use simpler building/vegetation silhouettes; LOD 3 belongs to regional terrain/horizon batching. Keep the full source intact, derive each tier separately, and validate thin features, bounds, and visual transitions before choosing a reducer. This is planning for later streaming phases; no lower-detail tiers, collision proxies, or gameplay systems are implemented here.
