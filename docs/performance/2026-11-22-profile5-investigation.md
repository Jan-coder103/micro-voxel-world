# Capture 5 — Main-thread generation and shadow churn

Capture supplied by Jan: frontier-profile(5).json. Read as measurement data.
No runtime changes in this investigation. Full resolution/MSAA remain enabled,
896² shadows retained. The capture says detailed, not lightweight. It therefore
cannot isolate detailed-profiler overhead. Exposed Intel HD Graphics 400 label
may be browser-sanitized; do not infer exact hardware or software rendering.

## New evidence

600 continuous frame samples; interval mean 32.06 ms (~31.2 FPS), p95 51 ms.
CPU callback mean 12.915 ms / p95 22 ms; render submission (a child) 8.07 ms.
Outside-callback mean 18.56 ms. Separate background population (600 intervals):
forest timers mean 3.975 / p95 10 / max 26 ms; roads mean .312 / max 69 ms.
These timer rows are part of outside time, not additional to it. They directly
establish main-thread generation as a contributor, not the sole cause of 31 FPS.
No GPU timing is available. Profiler reporting also reaches 31 ms and remains
in the outside measurement rather than the main callback row.

Shadow cache rebuilt 233 times; 216 builds involved forest changes, 180 involved
instance-buffer/count changes. Reasons overlap; 76 builds involved anchor moves.
Forest count/buffer changes trigger static depth rebuilds in cached-sun-shadows.
The forest pump publishes/compacts changed tiles after every partial generation
batch. The nominal 3 ms budget checks between cells only; a cell or reservation
query can exceed it, and subsequent compaction lies outside that loop budget.
It reschedules after 8 ms, so multiple jobs can run between displayed frames.
Road generation builds a complete 512 m tile in one timer callback, with no
intra-tile yielding. Its 69 ms maximum is a confirmed hitch contributor.

## Source trace and experiment

regionTrees -> regionalSample -> naturalSample and nearbySites -> settlementSite.
Before rejecting any candidate, regionTrees computes two additional height
samples for slope, even for water, cropped fields and hash-rejected candidates.
regionLayout recreates seed-only values/closures for terrain samples; nearbySites
recalculates the same settlement candidates for many 32 m cells.

CPU-only prototype benchmark: native Node TypeScript, seed 103, 97 forest tiles
(6,208 cells). Temporary module variants add bounded layout/site caches and move
slope testing after other rejection conditions. Current game code is untouched.
Three ordered runs per variant; includes JSON hashing, excludes reservation
filtering, matrix compaction, uploads, rendering, browser and scheduling. This is
an exploratory experiment, not a stable benchmark or device FPS measurement.

Warm runs averaged ~449 ms baseline vs ~193 ms combined prototype (~57% less
CPU). All 12 runs produced the same hash over 19,706 canonical tree records.
That validates output only for this scenario; seed/eviction/boundary checks and
browser comparisons are required before shipping. Layout caching alone has a
small/inconsistent benefit across preliminary runs; avoid claiming it alone
accounts for the combined gain.

Reproduce: `node tools/benchmarks/scenery-generation.mjs`.
Raw evidence: `2026-11-22-forest-generation-prototypes.json` in this directory.

## Recommended next work

1. Apply candidate rejection ordering and bounded settlement-site reuse with
   multi-seed canonical-output comparisons. Consider worker generation after
   measuring the remaining reservation/compaction costs.
2. Make road generation incremental or worker-based; a setTimeout around a whole
   tile does not remove its main-thread blocking.
3. Decouple forest publication from shadow-caster updates: stable spatial caster
   groups and invalidation only for changes affecting the light region. Preserve
   immediate correctness; do not reinstate the stale-shadow throttle.

For residual steady-view slowness compare detailed vs lightweight captures in the
same stationary warmed view, then a Firefox Performance trace for compositor,
GPU/driver, layout and GC attribution. The supplied moving capture does not
prove which of those causes the remaining time between frames.
