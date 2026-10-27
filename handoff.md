# Handoff — 27 October 2026

Current phase: Phase 5 voxel asset editor implemented; automated checks and agent visual inspection passed. Awaiting user verification.

Read agent.md, plan.md, tracker.md and README.md. Asset contract: docs/asset-authoring/format.md; authoring guide: docs/asset-authoring/mvw-voxel-assets/SKILL.md; mesh pipeline: docs/asset-authoring/mesh-pipeline.md; editor decision: docs/decisions/0005-voxel-editor.md.

Workshop (/tools/voxel-editor/) now supports coordinate-based add/remove/paint with a white selection box, palette add/update/rename/remove, name/grid editing, independent per-asset undo/redo and unsaved feedback. History retains at most 64 steps / 8 MiB per asset. Edits validate before mutation. V1 requires one occupied cell; grid shrinking never crops cells. Editing preserves camera position. Game (/) remains its setup scene.

JSON export marks the exact source exported; GLB export does not. Save source JSON before leaving; browser unload warnings are best effort and there is no automatic persistence. Default duplicate imports still fail. Enable explicit replacement to reopen the same ID, including edited fixtures; successful replacement discards only that document’s edits/history. Failed validation retains current data.

Key additions: src/assets/voxel-document.ts (pure command/history/dirty model), tools/voxel-editor/editor.ts (manual controls), tests/unit/voxel-document.test.ts and tests/browser/editor.spec.ts. workshop.ts integrates document ownership/import/export/unload handling; viewer.ts adds owned selection helper and preserves camera on edits. Existing source/mesh/GLB pipeline remains unchanged. No dependencies added.

Final npm run check passed on Linux / Node 24.22.1: lint, 74 unit tests, source validation, strict types/build and 20 Chromium tests including earlier regressions/27 rendered comparisons. Agent visually inspected the full-page edited block capture; browser interactions were automated. Initial Node subprocess checks required running outside the sandbox (EPERM). Existing ~536 kB shared bundle warning remains; workshop ~85 kB / 18 kB gzip.

Limitations: single-cell coordinate editing, no brush/raycast/multiselection, no automatic recovery, Chromium only, maximum-size editing latency unmeasured. User verification of Phases 1–5 remains outstanding. Phases 6–20 have not started.

This handoff is included in the Phase 5 commit; see git log for its ID. Prior Phase 4 commit: d2d4eca. Next: Phase 6 game engine architecture (fixed timestep, lifecycle/start/pause/resume/reset, input/state ownership, diagnostics, initial pooling). Keep editor/source/meshing/GLB/viewer regressions. Do not start later phases automatically.

Desktop continuation: main tracks origin/main at https://github.com/Jan-coder103/micro-voxel-world.git. Use Node 24, npm ci, npm run check, npm run dev. npm run assets:export regenerates ignored GLBs. Browser-created personal session assets must be exported/transferred separately. No deployment target is configured.
