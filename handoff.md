# Handoff — 28 October 2026

Phase 16 second optimization slice implements streaming plan reuse. This handoff
belongs to its local commit; consult git log for the hash. Automated checks passed; agent visual inspection completed. Phase 16 overall remains IN PROGRESS. Phase 17 aircraft variety has
not started. Phase 12 player feedback and physical-GPU acceptance remain deferred,
not passed; user verification remains outstanding.

Flight's `ChunkPlan` owns a frozen requested window, rebuilding only when the
existing look-ahead point crosses a 32 m boundary. Regional bias remains 64 m;
legacy flight/weapons remain unbiased. The shared stream compares ordered values
with owned snapshots before rebuilding desired maps and cancellation/eviction
state. Equal plans still pump replies and submit jobs. Seed/tier/content changes,
caller mutation and loading priority are handled. Existing 49-resident/two-payload/
two-integration limits, authoritative collision and saves are unchanged.

Fixed 60-second 100 m/s square-route planning benchmark: 3600 → 185 constructions;
median aggregate pure-planning CPU 20.10 → 2.49 ms across 15 warmed samples. This is
a small isolated saving, not FPS or integrated streaming latency. Evidence:
docs/performance/2026-10-28-chunk-plan.json; runner:
`node --experimental-transform-types tools/benchmarks/chunk-plan.ts`.
Decision: docs/decisions/0017-streaming-plan-reuse.md.

Passed: lint, 184 unit tests, 22 asset validations, strict types/build and all 67
browser checks across two single-worker runs against unchanged runtime/build. The
first process terminated with signal 143 after 46 passes; the remaining 21 passed
on resumption in 2.4 minutes. Its leftover preview server was identified and
stopped before resumption. Agent inspected the regional recovery screenshot:
readable controls, visible aircraft/terrain/groups, no overlap. This is automated
interaction plus visual inspection, not Jan playtesting. Initial sandbox CLI-output
failures disappeared on reviewed outside-sandbox rerun. Existing bundle-size
warnings remain. No visual design, source assets, dependencies or save formats
changed. Earlier demand rendering and dirty population buffers remain in place.

Key files: src/streaming/chunk-plan.ts, src/streaming/chunk-stream.ts,
tools/flight/lab.ts, tests/unit/chunk-plan.test.ts and chunk-stream.test.ts.
Flight diagnostics now include chunkPlanRebuilds.

Next: profile cold startup/source meshing and integrated regional maximum-speed
travel/dense combat, including queue latency, integration spikes and long-travel
memory. The measured plan saving is modest; larger performance claims need actual
integrated profiles. Agree reference hardware and targets with Jan before marking
Phase 16 accepted. Preserve deterministic generation, clearance durability,
collision readiness and bounded ownership.

Use Node24: /home/user/.nvm/versions/node/v24.22.1/bin. Default shell Node is 22.
CLI subprocess/local-server checks need reviewed outside-sandbox access. Prefer
one browser worker on this software-rendered host and tell Jan before sustained
CPU-heavy work. Tests and preview servers must stop afterward. No deployment.
