# Handoff — 26 October 2026

Current phase: Phase 2 viewer implemented; automated checks and agent visual inspection passed. Awaiting user verification.

Read agent.md, plan.md, and tracker.md. README.md contains install/run/check commands. Foundation decisions are in docs/decisions/0001-foundation.md.

The game (/) retains its setup scene. The workshop (/tools/voxel-editor/) now has a catalog, two voxel fixtures, solid-block creator, orbit/zoom/pan, camera presets, grid/axes, bounds, and measurements. Source entry points: src/main.ts and tools/voxel-editor/main.ts. Viewer UI/rendering/temporary data live under tools/voxel-editor/. There is no gameplay or voxel editing yet.

`npm run check` passes: lint, 13 unit tests, strict types, production build, and 9 Chromium browser tests, including earlier regressions. Inspected full-page marker/block/top captures and the compact workshop layout. Test captures are ignored under test-results/. Known warning: ~539 kB shared Three.js bundle. Reference GPU/performance and broader browser coverage remain unverified. This handoff is included in the Phase 2 commit (see git log); Phase 1 commit is 711fdc6.

Assets are session-only; reload discards creations. Limits: 16 cells per axis and 24 session assets. The temporary adapter is not a stable source format; instanced cubes retain internal faces/seams until meshing. See docs/decisions/0002-viewer.md and README.md for controls and scope.

Next task: Phase 3 standardized voxel format, validator, import/export round trips, reference assets, and asset-authoring skill.md. Migrate the provisional adapter without losing viewer behavior. Do not start later gameplay phases automatically.
