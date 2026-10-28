# Handoff — 28 October 2026

Phase 16 third slice adds reproducible startup CPU profiling, not a runtime
optimization. Phase 16 remains IN PROGRESS. Phase 17 has not started. Phase 12
player feedback and physical-GPU acceptance remain deferred, not passed.

Run with Node 24:
`node --experimental-transform-types tools/benchmarks/regional-startup.ts`.
Raw evidence: docs/performance/2026-10-28-regional-startup.json.
Interpretation and exclusions: docs/performance/phase-16-notes.md, third slice.
Seven first-call kit meshes measured 24–96 ms each; initial population residency
with structures measured 29–67 ms versus 2.7–2.9 ms without. These process-local
CPU stages exclude browser imports/parsing, Three.js geometry assembly, GPU work,
integrated flight, localStorage latency and large-save loading. No FPS claim.

The runner asserts repeatable mesh statistics, descriptor equality after a 1024 m
jump/return, one-kill reload durability and 49/64 resident/cache bounds. Regional
population's three runtime imports now include .ts for direct Node execution;
no game behavior, visuals, save schema, assets or dependencies changed.

Passed: benchmark assertions, lint, all 184 unit tests, 22 asset validations and
strict types/production build. Four sandbox CLI-output tests initially failed;
all passed on reviewed outside-sandbox rerun. Existing bundle warnings remain.
Browser checks were not rerun for this profiling-only slice; the previous slice
passed all 67 checks. No server/browser processes were started by this slice.

Next: profile integrated regional maximum-speed travel/dense combat, worker queue
latency, integration spikes and long-travel memory; measure browser cold startup
and large saves. Source mesh reuse and settlement-backed encounter generation are
candidate bottlenecks, not yet optimized. Agree reference hardware and targets
with Jan before accepting Phase 16. Preserve deterministic generation, durable
clearance, collision readiness and bounded ownership.

Earlier Phase 16 slices implement settled regional demand rendering, dirty
population buffers/checkpoints and streaming-plan reuse. Details and prior
measurements remain in performance notes and decisions 0016/0017.

Use Node24: /home/user/.nvm/versions/node/v24.22.1/bin. Default shell Node is 22.
CLI subprocess/local-server checks may need reviewed outside-sandbox access. Use
one browser worker on this software-rendered host and tell Jan before sustained
CPU-heavy work. Stop test servers/processes afterward. No deployment.
