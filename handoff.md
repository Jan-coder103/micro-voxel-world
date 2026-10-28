# Handoff — 28 October 2026

Phase 16 fifth slice adds continuous regional return profiling. Phase 16 remains
IN PROGRESS; Phase 17 has not started. Phase 12 player feedback and physical-GPU
acceptance remain deferred, not passed. Jan selected Pixel 10a with a Google
Tensor chip at 720p render resolution / 60 FPS as the Phase 16 reference target
on 28 October 2026. No on-device result exists. Record browser/version, actual
drawing-buffer dimensions, quality and thermal/run conditions when testing.
Mobile controls and the exact measurement protocol remain to be established.

New opt-in test: tests/browser/regional-route.spec.ts. With Node 24 and an existing
production build:
`MVW_ROUTE_PROFILE=1 npx playwright test tests/browser/regional-route.spec.ts --workers=1`.
It is skipped by default. Two ~800 m outbound/return passes use ordinary direct
bank/throttle controls with wall-clock feedback guidance, never recovery/teleport.
Return is within 80 m, not identical frame replay. Chromium CDP forces GC only at
paused/settled checkpoints before reading retained JS/backing storage heap.

Evidence: docs/performance/2026-10-28-regional-route.json. Interpretation and
exclusions: docs/performance/phase-16-notes.md, fifth slice. SwiftShader reached
100 m/s with no failures or sampled missing current chunks; per-poll resident/
payload caps and settled population/cache caps passed. Initial/return geometry
counts: 43/53/53; heading-biased windows differ. Post-GC JS heap:
26.56/28.02/28.42 MB. No memory plateau, GPU-byte result or leak diagnosis claimed.
Stale/loaded replies per pass: 81/716 and 80/814. No combat on this workload.

Passed: opt-in route profile (50 s), lint, strict types and all 185 unit tests.
No runtime, asset, dependency, save format or visual changes in this slice.
Prior slice's all-68-browser, asset-validation and build results apply to unchanged
runtime/build; those checks were not repeated for this benchmark-only change.
Agent inspected return screenshot: readable controls/diagnostics, aircraft/terrain
visible, no overlaps. This is not Jan playtesting. Test servers stopped afterward.
This handoff belongs to its local commit; consult git log for hash.

Next: attribute stale work to LOD/turn cancellations before changing scheduling;
profile damage-heavy regional combat and large saves. Longer continuous runs,
heap retainer snapshots and worker/GPU memory measurements remain outstanding.
Validate the selected Pixel target before accepting Phase 16. Existing
telemetry definitions, startup evidence and decisions 0016/0017 remain current.

Use Node24: /home/user/.nvm/versions/node/v24.22.1/bin. Default shell Node is 22.
CLI subprocess/local-server checks may need reviewed outside-sandbox access. Use
one browser worker on this software-rendered host; tell Jan before sustained load.
Stop test servers/processes afterward. No deployment.
