# 0003 — Editable voxel source v1

Selected in Phase 3 on 26 October 2026. This implements the source-format direction in plan.md §11; the concrete limits and representation are project decisions.

Use versioned UTF-8 JSON with authoritative sparse occupancy and palette references. Fix the Phase 1/2 physical convention at 0.1 m voxels, one metre per world unit, +Y up, −Z forward, and base-centred placement. Explicit occupancy has one editable authority and cannot execute imported geometry operations. Block-generation helpers emit the same source rather than a second serialized representation.

Require stable IDs, dimensions, metadata/provenance, and opaque matte palette materials. Reject unknown fields/versions, unsupported materials/scales/pivots, duplicate positions/IDs, missing palette references, and out-of-grid cells. Bounds are derived from the declared envelope; padding is permitted. Validate before viewer/catalog allocation. Import failure is atomic; duplicate source IDs do not overwrite existing work.

Budgets are 256 cells per axis, 32768 occupied cells, 64 palette entries, and 8 MiB per file; the simple block creator remains 16 per axis and sessions remain capped at 24 assets. This accommodates sparse person/tree/building/aircraft references without allocating a full micro-voxel volume. Larger structures need modular authoring. These are safety limits, not measured performance targets.

Source import/export belongs to this phase so the contract can be tested end to end. Browser downloads are the persistence boundary; reload still discards the session. The two original viewer fixtures are now checked-in editable sources. No new dependencies, renderer optimization, GLB export, or manual editing tools are introduced. Shared format/validator code is rendering-independent. See docs/asset-authoring/format.md and the project authoring SKILL.md for the complete contract and examples. schemaVersion 1 currently has no migrations; incompatible future versions must fail explicitly until a migration is implemented.
