# Streaming plan reuse within Phase 16

28 October 2026. Second optimization slice; aircraft variety (roadmap Phase 17)
has not started.

Flight's requested chunk window depends on the integer chunk coordinates of its
look-ahead point, seed and content options. Previously every rendered frame
allocated/sorted 49 specs, mapped regional options, then rebuilt the stream's
request map and signature set and scanned cancellation/eviction lists.

`ChunkPlan` owns one frozen plan per flight session and rebuilds when its point
crosses a 32 m boundary. Regional flight retains its existing 64 m heading bias;
legacy flight/weapons keep their existing unbiased point. No preload distances,
LODs, resource limits or collision rules change. Diagnostics expose plan rebuilds.

`ChunkStream` compares incoming values and order with its owned snapshots before
rebuilding desired state. Equivalent newly allocated inputs are also supported;
mutating a caller's previous specs cannot hide a seed/tier/content change. Order
still controls loading priority. Results are pumped on every update even when the
plan is unchanged, and asynchronous replies still wake demand-rendered owners.
Cancellation, failure suppression and two-payload/two-integration bounds remain.

Evidence: `tools/benchmarks/chunk-plan.ts` measures a fixed 60-second 100 m/s square
route at 60 Hz with abrupt turns, seed 103 and regional structures. Fifteen warmed
samples reduced median total planning CPU from 20.10 to 2.49 ms and construction
count from 3600 to 185. These are aggregate pure-planning microbenchmark costs,
not per-frame times, streaming latency or FPS. Both paths produced equal checksums;
unit tests independently compare full spec values, options, negative boundaries,
world limits and return travel. Result: ../performance/2026-10-28-chunk-plan.json.

Full hardware acceptance, integrated maximum-speed/dense-combat profiling, queue
latency, source meshing, and long-travel memory measurements remain outstanding.
