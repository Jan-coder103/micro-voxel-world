# Handoff — 28 October 2026

Phase 16 fourth slice adds bounded streaming telemetry and a short integrated
regional browser workload. Phase 16 remains IN PROGRESS; Phase 17 has not started.
Phase 12 player feedback and physical-GPU acceptance remain deferred, not passed.

Flight diagnostics expose cumulative streamTimings plus draw calls/triangles.
The shared stream measures resolved load round trips (including stale replies),
integrated-ready wait and synchronous attach/replacement CPU. Nine scalar counters
retain no history. Scheduling, caps, collision, saves and visual behavior are
unchanged. Tests inject a clock for exact timing and stale-result accounting.
Definitions/exclusions: docs/performance/phase-16-notes.md, fourth slice.

New workload: 12 wall-clock seconds of throttle-up flight, home recovery, two
seconds of shell fire. Evidence: docs/performance/2026-10-28-regional-travel.json.
SwiftShader reached 100 m/s, 55 stale travel replies, zero generation failures,
4.4 ms lifetime max attachment interval; home geometry count returned to 43.
All sampled current chunks were visible; between-sample gaps are not excluded.
Shell fire caused no hits/damage, so dense combat/save costs remain unmeasured.
Recovery teleports; this is not long-travel memory or physical-GPU acceptance.

Passed: lint, 185 unit tests, 22 asset validations, strict types/build and all
68 browser checks (3 focused plus 65 remaining with one worker, same runtime/build).
The remaining run took 8.4 minutes. An initial remaining-suite launch was
intentionally stopped after noticing an unnecessary ignore-snapshots flag; the
normal run restarted from its beginning and passed with normal assertions.
Agent inspected the regional population screenshot: controls/diagnostics readable,
aircraft/groups visible, no layout overlap. This is not Jan playtesting.
Preview servers stopped after tests; no listeners remain on port 4173.
Existing bundle-size warnings remain. This handoff belongs to the local commit;
consult git log for its hash.

Next: investigate stale work using a repeatable continuous out-and-back/turn route,
profile damage-heavy regional combat and long-travel heap/GPU memory; measure
browser cold startup and large saves. Agree reference hardware and targets with
Jan before accepting Phase 16. No optimization benefit is claimed for telemetry.

Earlier startup CPU evidence and demand rendering/streaming-plan reuse remain in
performance notes and decisions 0016/0017. Source mesh reuse and settlement-backed
encounter generation remain candidates, not implemented changes.

Use Node24: /home/user/.nvm/versions/node/v24.22.1/bin. Default shell Node is 22.
CLI subprocess/local-server checks may need reviewed outside-sandbox access. Use
one browser worker on this software-rendered host and tell Jan before sustained
CPU-heavy work. Stop test servers/processes afterward. No deployment.
