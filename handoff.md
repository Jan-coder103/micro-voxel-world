# Handoff — 26 October 2026

Current phase: Phase 3 source format and authoring guidance implemented; automated checks and agent visual inspection passed. Awaiting user verification.

Read agent.md, plan.md, tracker.md, and README.md. Asset contract: docs/asset-authoring/format.md; agent guide: docs/asset-authoring/mvw-voxel-assets/SKILL.md; decision: docs/decisions/0003-voxel-source.md.

The game (/) remains the setup scene. The workshop (/tools/voxel-editor/) loads two original checked-in JSON reference assets, creates session blocks, imports validated v1 sources, and downloads editable source JSON. Source authority is sparse occupancy with palette references. Fixed scale: 0.1 m voxels, base-centred pivot, +Y up, −Z front. There is no manual voxel editing or gameplay yet.

Shared code lives in src/assets/voxel-source.ts and create-block.ts. CLI: tools/assets/validate.ts. Catalog: tools/voxel-editor/catalog.ts; provisional-assets.ts was removed. Browser file controls live in workshop.ts; rendering consumes palette references. Limits: 256 per axis, 32768 occupied cells, 64 colors, 8 MiB per source; simple block creator 16 per axis; 24 assets per session. Duplicate IDs fail without overwrite. Export before reload; no automatic persistence.

npm run check passed: lint, 53 unit tests, source validation, strict types/build, and 13 Chromium tests including previous regressions. Inspected marker and saved/reopened coral-block full-page captures. Captures are ignored under test-results/. Known shared Three.js warning remains ~539 kB; workshop is ~73 kB including source fixtures. Broader browsers/GPU/performance and user verification remain outstanding.

This handoff is included in the Phase 3 commit (see git log). Phase 2 commit: 3a878bd. Next: Phase 4 optimized surface meshing and GLB export. Preserve editable v1 sources, palette/scale/pivot fidelity, resource disposal, and earlier regression coverage. Do not start later phases automatically.
