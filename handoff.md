# Handoff — 26 October 2026

Current phase: Phase 4 optimized meshing and GLB export implemented; automated checks and agent visual inspection passed. Awaiting user verification.

Read agent.md, plan.md, tracker.md and README.md. Asset contract: docs/asset-authoring/format.md; authoring guide: docs/asset-authoring/mvw-voxel-assets/SKILL.md; pipeline: docs/asset-authoring/mesh-pipeline.md; decision/measurements: docs/decisions/0004-mesh-pipeline.md and docs/benchmarks/phase-4-meshing.md.

Game (/) remains its setup scene. Workshop (/tools/voxel-editor/) now renders a single optimized opaque matte surface mesh, shows triangle reduction, imports/exports unchanged v1 JSON and downloads GLB derivatives. Original source data remains editable authority: 0.1 m voxels, base-centred pivot, +Y up, −Z front. Session assets still need JSON export before reload.

Key files: src/assets/voxel-mesh.ts (pure sparse exposed-face/greedy mesher), src/rendering/voxel-mesh.ts (indexed BufferGeometry/material ownership), src/assets/export-glb.ts (Three.js binary export/source hash/disposal), tools/voxel-editor/preview-object.ts and workshop.ts (preview/UI), tools/assets/export.ts and benchmark.ts (Node commands). Node tooling alone installs the small FileReader subset required by the installed binary exporter. No project dependency was added.

Final npm run check passed: lint, 68 unit tests, source validation, strict types/build and 16 Chromium tests, including 27 rendered before/after/GLB comparisons. Inspected full-page marker/cube captures. Marker 1896→46 triangles; metre cube 12000→12. Full measurements and limits are documented. Existing shared bundle warning remains (~536 kB); broader browsers/GPU/gameplay performance and user verification remain outstanding.

Desktop continuation: origin is https://github.com/Jan-coder103/micro-voxel-world.git; main tracks origin/main. Pull main, then npm ci, npm run check and npm run dev (install Playwright Chromium once if needed, per README). npm run assets:export regenerates ignored assets/generated/<source-id>.glb files. The committed source/code/tests/docs are sufficient to reproduce the result; local generated files/captures are not required. Browser-created personal session assets must be exported/transferred separately.

This handoff is included in the Phase 4 commit (see git log). Phase 3 commit: 12f16ce. Next: Phase 5 complete voxel asset editor (add/remove/paint, palette, selection, undo/redo, dirty state and reliable file handling). Keep source/meshing/GLB/viewer regressions. Do not start later phases automatically.
