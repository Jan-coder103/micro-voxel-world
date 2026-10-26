# 0004 — Sparse greedy surfaces and GLB derivatives

Selected in Phase 4 on 26 October 2026. Keep the v1 source contract unchanged and derive render geometry from explicit occupancy.

Extract exposed faces through a sparse occupied-coordinate set, then greedily merge deterministic plane masks. Merge only equal palette entries with the same plane and outward direction. This conservatively preserves palette boundaries, including entries with matching colors. Internal faces between opaque occupied cells are removed even across palette boundaries. Emit flat normals and indexed rectangle triangles, using 32-bit indices for large sparse outputs.

All current palette entries share opaque matte shading, so a single MeshStandardMaterial batch with linear vertex colors is sufficient. No transparent-material policy, AO, physics proxy, or LOD reducer is introduced. Those additions must extend compatibility/batching explicitly.

Use the installed Three.js GLTFExporter for binary derivatives and verify exports with GLTFLoader plus independent face/geometry/render checks. Preserve source scale and pivot in actual positions and record source/hash/version metadata in GLB extras. Do not export workshop helpers or use GLB as editable authority. No project dependency is added; the exporter is lazy-loaded by the workshop. A small tooling-only Blob reader adapter enables the installed binary exporter under Node 24.

Generated GLBs are reproducible local outputs, ignored by Git, and rebuilt with npm run assets:export after switching computers. Do not cache derivatives before a measured need; any later cache must include source hash, mesh version, export options/version and LOD configuration. See docs/asset-authoring/mesh-pipeline.md and docs/benchmarks/phase-4-meshing.md.
