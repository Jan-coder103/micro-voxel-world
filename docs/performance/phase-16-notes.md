# Performance improvement notes — Phase 16

27 October 2026. Investigation notes after Phase 15 (`a0e3295`); no optimization
has been implemented by this document. Keep correctness, hardware performance,
and test-run cost separate. Phase 12 player feedback and physical-GPU acceptance
remain deferred, not passed.

## What we know

The completed correctness run passed 176 unit tests and 65 browser tests. Browser
checks took 8.2 minutes with one worker. The earlier two-worker run saturated CPU,
timed out in an engine test and was stopped. In the serial run the engine test
passed, and some individual rendering tests completed substantially faster.
Different concurrency and test order prevent treating this as a controlled speedup.

The browser reports **SwiftShader software rendering**, not the physical GPU.
High CPU during those tests does not establish how fast the game runs with hardware
acceleration. CPU time around `renderer.render()` measures command submission;
it is not the full rendering cost. Small submission numbers do not rule out a
rendering bottleneck.

Preserved evidence: [test baseline summary](2026-10-27-test-baseline.json).
The original files under `test-results/` are ignored and overwritten by later runs.

| Software-rendered scenario | Backbuffer | Median frame interval | p95 interval | Median simulation CPU |
| --- | --- | --- | --- | --- |
| Legacy crowd, 100% scale | 1216 × 475 | 116.6 ms | 133.3 ms | 3.0 ms |
| Legacy sustained fire, 100% scale | 1216 × 475 | 116.6 ms | 133.3 ms | 3.4 ms |
| Legacy sustained fire, 75% scale | 912 × 356 | 83.4 ms | 116.7 ms | 3.2 ms |

75% scale uses about 56% as many pixels. The smaller median interval supports
investigating rendering cost, but these runs follow frame-dependent trajectories,
have different resident sets, and include streaming. They are not an isolated
pixel-cost experiment. These are Phase 12 legacy scenarios, not Phase 15 regional
population benchmarks; do not extrapolate their supported loads to the new world.

The outdoor check reports 17 draw calls / 440,152 triangles on High and 11 calls /
248,050 triangles on Low. That identifies an existing quality tradeoff; it does not
measure physical-GPU frame time. The build also contains roughly 3.73 MB of
minified settlement-kit source code plus a shared 779 kB utility-building source
chunk, before gzip. Source download/parse/meshing cost and steady-state rendering
need separate measurements.

## Recommended order

### 1. Establish comparable baselines

Record browser, renderer/vendor, hardware, viewport, backbuffer, device pixel ratio,
quality, seed, route, population and save size. Use a fixed route/time sequence
rather than a fixed number of variable-duration frames when comparing optimizations.
Capture cold startup separately from warmed traversal.

Measure median/p95/p99 frame intervals, long main-thread tasks, simulation and
presentation CPU, generation duration, integration duration, queue age, stale work,
draw calls/triangles and retained resources. Existing `src/game/metrics.ts` is a
starting point; add equivalent regional-flight measurements. Worker CPU, browser
rendering and storage must not disappear into an unexplained frame-time gap.
Use a browser performance trace to distinguish them. GPU timings, where supported,
need their own measurement and validity checks.

Scenarios: settled idle/pause; initial regional load; city/airport/harbor traversal;
maximum-speed flight with abrupt turns; dense combat and explosions; repeated
out-and-back travel; a large damaged-population save and reload. Compare identical
world/save fixtures. Test both normal hardware rendering and the software fallback
explicitly, rather than silently mixing their results.

Choose a reference machine and supported target with Jan before declaring Phase 16
acceptance. A possible starting goal is 60 FPS under the chosen normal workload
(~16.7 ms/frame), with an explicit p95 budget, quality setting and supported crowd
load. This is a proposed target, not a result or an accepted hardware requirement.

### 2. Stop unnecessary work when nothing changes

**Observed code:** `src/rendering/mount-preview.ts`, `src/game/main.ts` and
`tools/flight/lab.ts` continue their animation/render loops while simulation is
paused. Regional flight still updates population presentation, streaming plans and
camera/render state every frame.

Introduce render invalidation for settled paused/ready scenes. Resize, input,
settings, recovery, incoming chunks and visible state changes must request a draw.
Allow worker results and pending integration to finish, then stop continuous
redraws once camera/effects settle. Resume must reset timing rather than catch up.
Throttle textual diagnostics independently of rendering.

**Validate:** idle CPU approaches the browser's settled-page baseline; no continuous
draws/uploads after settling; chunk arrivals remain visible; pause/resume, focus
loss, resize, recovery and teardown still pass. This should be an early candidate
because the repeated work is visible in code, although its share of total CPU has
not yet been measured.

### 3. Update population presentation only when dirty

**Observed code:** `src/rendering/regional-population-view.ts` filters live targets,
rebuilds matrices and marks all three instance buffers for upload on every update.
Regional members currently hold static positions. `RegionalPopulation.update()`
also creates a wanted-ID set and revisits the 49-cell window every rendered frame.

Rebuild residency only when its cell window changes. Recalculate tiers at an
appropriate cadence or threshold while retaining hysteresis. Track changes in
membership, health and tier; only rebuild affected presentation batches. Replace
per-frame `filter()` arrays with iteration/counts where traces show allocation
pressure. The settlement renderer's existing dirty flag is a useful local example.

**Validate:** stable frames do not rewrite instance buffers; kills and tier changes
appear promptly; membership stays bounded; IDs, damage queries and clearance are
unchanged. Preserve the existing shared geometry instead of creating a mesh per
zombie. Spatially partitioned instance batches/culling are a later experiment:
all population batches currently disable frustum culling, but splitting them can
increase draw calls and must earn its cost.

### 4. Remove generation and meshing spikes from the main thread

**Observed code:** terrain uses two workers, but regional encounter generation and
save-load encounter validation run synchronously in `regional-population.ts`.
Candidate placement calls settlement/terrain queries repeatedly. Settlement kits
are imported as voxel JSON and meshed synchronously in `createSettlementView()`.

Profile cold generation, candidate validation and source meshing separately. Then
consider prebuilt mesh derivatives, lazy loading by route/kit, shared bounded mesh
caches, and worker generation of encounter descriptors. Cheap loop-invariant work
(such as wilderness anchor hashes) can move outside candidate loops, but larger
changes should follow measurements.

Any deferred encounter generation must preserve deterministic member slots and
health authority. A missing render descriptor cannot make a shot miss or respawn
a cleared group. Keep readiness and query behavior explicit. Large-save loading
also needs a budget; do not weaken save validation merely to hide startup cost.

**Validate:** reduced startup/first-visit long tasks; equal descriptors across
seeds and load orders; correct unresident hits; bounded caches and disposal.

### 5. Tune streaming using latency and wasted-work measurements

**Observed code:** `wantedChunks()` creates/sorts a 49-chunk request window each
frame. `ChunkStream.update()` rebuilds maps/signatures and scans jobs, even when the
window is unchanged. Integration is capped at two chunks per update, rather than
an elapsed-time/byte budget. Regional flight uses a fixed 64 m forward look-ahead.
Cancelled synchronous worker jobs occupy their slots until they return.

Separate changes to the desired chunk plan from pumping completed results. Cache
unchanged plans while still integrating arrivals. Measure per-chunk attach/upload
spikes before introducing a time/byte integration budget. Base look-ahead on speed,
direction and observed generation latency; retain a surrounding safety ring and
hysteresis to limit abrupt-turn churn. Inspect LOD replacements and cancellation
latency before adding workers or raising residency limits.

Legacy baseline samples ended with 53–61 stale results and unsettled streaming.
That is a reason to inspect wasted work; it does not prove all stale results were
avoidable or describe regional behavior. Keep the current 49-resident/two-payload
limits unless measurements justify a bounded change.

**Validate:** lower queue age/stale generation and integration spikes at maximum
speed; stable out-and-back memory; no seams, missing collision, duplicate instances
or stale attachment after turns/seed changes. Collision must stay independent of
mesh readiness.

### 6. Reduce storage work without weakening clearance durability

**Observed code:** every regional damage callback calls `checkpoint()`, serializing
all modified encounters and synchronously writing storage. A blast can therefore
serialize the growing save repeatedly. Pause and teardown also write even when
nothing changed. Loading validates saved records by regenerating encounters.

First instrument writes per shot/blast, bytes, stringify/write time and reload
cost versus damaged-record count. Add a dirty flag to avoid unchanged checkpoints.
Coalescing damage from one combat action could reduce redundant writes; define the
transaction boundary and durability behavior before changing immediate writes.
Consider larger asynchronous persistence changes only if measurements require them.
Do not silently introduce a window in which cleared enemies can return after a
crash or reload. Preserve corrupt-save protection and generator/seed isolation.

**Validate:** identical final health after multihit/blast actions, immediate reload
semantics, quota/blocked-storage behavior, zero writes for unchanged checkpoints,
and bounded storage/CPU growth with larger saves.

### 7. Tune quality and collision only after identifying their cost

Expose consistent render-scale/quality controls in regional flight; the legacy
combat route already has render scale. Evaluate terrain/vegetation LOD distances,
shadow range/resolution and antialiasing against target readability. Avoid assuming
fewer triangles alone will fix a pixel-bound renderer. Dynamic resolution is an
option after a reproducible baseline, with hysteresis and a lower readability limit.

`terrainDistance()` samples rays every 0.25 m; a 240 m ray may perform roughly 960
intervals, and blast visibility repeats queries for candidates. If this appears in
CPU profiles, investigate broad-phase pruning or a conservative acceleration
structure. Preserve fast-shot, terrain and building occlusion behavior; increasing
sample spacing casually could let shots tunnel through obstacles.

## Keep the test workflow affordable

- Use one browser worker on this host. Run focused checks while iterating; complete
  the full regression suite before the finished phase commit. No new stress run is
  needed just to edit these notes.
- Keep software-rendered correctness coverage; add a separately identified hardware
  performance run when available. Do not bypass graphics fallback coverage or
  interpret GPU utilization as proof of a speedup.
- Tell Jan before sustained high-load work. Close test servers/browser processes
  afterward. Never make a benchmark pass solely by loosening timing assertions.
- Change one bottleneck at a time. Record before/after workload, timings, visual
  tradeoffs and resource bounds. Do not start with a renderer rewrite, new engine,
  unbounded worker count or larger resident world without evidence.

Suggested first implementation slice: regional profiling plus settled paused-scene
rendering and dirty population buffers. Persistence and generation/streaming changes
follow if their measurements justify them. All items above remain proposals.

## First implementation slice — 28 October 2026

Regional Flight now sleeps after paused/ready/crashed scenes settle, waking for
controls, resize, sound status and worker replies. Population residency changes
only on cell changes; static instance buffers rebuild only when membership, tier
or health changes. Unchanged save checkpoints skip writing, while actual damage
still saves immediately. See [decision 0016](../decisions/0016-regional-idle-rendering.md)
for the scope, correctness constraints and verification.

The short initial settled-scene comparison dropped from 26 scene renders / 78 buffer updates
to zero of each over 1.2 seconds. This measures eliminated work, not physical-GPU FPS
or total CPU usage. Broader profiling and the unimplemented proposals above remain
Phase 16 work. Legacy Clearpass/outdoor idle loops are not changed by this slice.

Verification for this slice: lint, 182 unit tests, 22 asset validations, types/build
and all 67 browser checks passed (46 before an interruption, 21 on resumption;
unchanged runtime code/build). The focused eight-browser-check run also passed.
The measured [idle comparison](2026-10-28-regional-idle.json) records the scope and
limitations; full Phase 16 hardware performance acceptance is still outstanding.

## Second implementation slice — streaming plans, 28 October 2026

Flight now reuses the frozen requested plan while the look-ahead point remains in
one 32 m cell. The shared stream skips map/signature/cancellation/eviction rebuilds
for equal ordered requests, while continuing to integrate replies and submit work.
Bias, tiers, resource caps and authoritative collision remain unchanged.

The fixed 60-second 100 m/s planning microbenchmark reduced construction count
from 3600 to 185; median aggregate CPU across 15 warmed samples was 20.10 → 2.49 ms.
This isolates plan construction and does not measure rendering, worker latency or
integrated gameplay. See [evidence](2026-10-28-chunk-plan.json) and
[decision](../decisions/0017-streaming-plan-reuse.md). Run with Node 24:
`node --experimental-transform-types tools/benchmarks/chunk-plan.ts`.

Second-slice verification passed lint, 184 unit tests, 22 asset validations, types/
build and all 67 browser checks across split single-worker runs (46 before signal
143 termination, 21 on resumption; unchanged runtime/build). Agent inspected the
regional recovery capture. User and hardware verification remain outstanding.

## Third slice — startup CPU profiling, 28 October 2026

Run `node --experimental-transform-types tools/benchmarks/regional-startup.ts`
with Node 24. The checked-in report is
[regional startup CPU evidence](2026-10-28-regional-startup.json).
Seven settlement source kits took 24–96 ms each on their first meshing call in
this process. Initial 49-encounter residency took 29–67 ms with structures and
2.7–2.9 ms without them across seeds 103/12012. One-record reload took 10–14 ms
with structures. These observations justify examining source mesh reuse and
settlement-backed encounter generation next; they do not establish browser long
tasks or predict the benefit of either change.

The runner separates construction, initial/unchanged population update, one
kill/checkpoint, one-record reload, and a 1024 m jump/return. Assertions verify
meshing statistics, deterministic returned descriptors, durable kill reload and
49/64 resident/cache bounds. Storage is an in-memory adapter, so checkpoint time
excludes browser localStorage latency. Meshing excludes source parsing and Three.js
buffer/material assembly; first calls share a process and are not cold page loads.
Five repeated kit timings are provided without a statistical acceptance claim.
No gameplay behavior changed. Integrated maximum-speed travel/dense combat,
large-save scaling, queue latency/upload spikes, long-travel memory and reference
hardware targets remain outstanding. Phase 16 remains in progress.

## Fourth slice — integrated streaming telemetry

Flight diagnostics now include cumulative `streamTimings`, draw calls and triangles.
The shared stream retains nine scalar timing/count fields, not sample histories:
`loads` counts resolved payloads (including stale replies, excluding rejected jobs),
`loadTotalMs`/`loadMaxMs` measure submission to promise reply, and
`integrations` counts attempted attachments including failures.
`readyTotalMs`/`readyMaxMs` measure reply to attachment start for integrated payloads;
`attachTotalMs`/`attachMaxMs` measure synchronous attachment and old-resource disposal,
excluding payload release and deferred GPU uploads. Totals/maxima include startup
and are lifetime values; subtract totals/counts between checkpoints for a segment.
Maxima cannot be subtracted. This does not measure time waiting for an unsubmitted
request, worker generation alone, GPU time or full frame CPU. Resource limits and
scheduling are unchanged. Unit coverage injects a clock to check exact intervals
and verifies stale results are counted as loads without attachment.

The regional performance browser workload uses ordinary controls: 12 wall-clock
seconds of throttle-up flight, recovery to home, then a two-second shell attack.
It records per-second diagnostics and checks terrain/payload caps, a >95 m/s
sample, restored geometry counts, valid timing counters and no browser errors.
Recovery is a teleport, so this is not a continuous out-and-back memory test.
The attack does not establish dense-combat performance. Reports are generated at
`test-results/regional-travel-measurement.json`. Reproduce after `npm run build`:
`npx playwright test tests/browser/regional-performance.spec.ts --workers=1`.

The [recorded SwiftShader run](2026-10-28-regional-travel.json) reached 100 m/s,
with 26–42 residents during travel, a visible current chunk at each one-second
sample, zero generation failures and zero discarded simulation time. Sampling
cannot exclude gaps between samples. Travel added 494 resolved payloads, 439
integrations and 55 stale replies after the settled starting checkpoint. The
lifetime maximum load round trip was 467.4 ms (including startup); attachment
maximum rose from 1.9 to 4.4 ms; integrated-ready wait maximum rose from 10.6 to
17.3 ms. These are CPU/round-trip measurements, not GPU upload duration or FPS.
Renderer geometry counts returned to 43 after recovery/settling. This single
short recovery does not prove stable long-travel heap/GPU memory.
The attack fired two shells/one blast with zero hits, damage or kills, so it only
exercises firing and effects, not dense combat or damage-save cost. No scheduling,
look-ahead or integration budget was tuned based on this small baseline.

## Fifth slice — continuous return route

Run after building with Node 24:
`MVW_ROUTE_PROFILE=1 npx playwright test tests/browser/regional-route.spec.ts --workers=1`.
The test is skipped by default to avoid sustained software rendering in routine
smoke checks. It uses normal direct-flight bank/throttle controls, with 150 ms
feedback polling toward an outbound waypoint 800 m north and back within 80 m of
home, twice. It never invokes recovery/teleports. Pause/settle checkpoints capture
renderer geometries and Chromium Runtime.getHeapUsage after explicit forced GC.
This CDP heap probe is Chromium-specific. Route timing/positions vary with load;
it is reproducible workload guidance, not deterministic frame replay.

The [SwiftShader report](2026-10-28-regional-route.json) covers 45.4 seconds including
settled checkpoints: 100 m/s maximum speed, zero generation failures and no missing
current chunk in 37 approximately one-second travel samples. Per-poll assertions
check running state and 49-resident/two-payload caps; sampled visibility cannot
exclude intermediate gaps. Population residency/cache remain bounded to 49/64.
Settled renderer geometry counts were 43 at start and 53 after each return.
Return positions/heading and the heading-biased terrain window differ from start,
so exact baseline equality is not expected. These counts are not GPU bytes.

Retained JS heap was 26,555,996 → 28,016,280 → 28,423,816 bytes after forced GC.
The second pass still added 407,536 bytes: this does NOT demonstrate a plateau or
prove a leak. Backing storage was 8,652,143 → 8,621,534 → 8,605,982 bytes. Longer runs,
heap snapshots/retainer analysis and worker/GPU accounting remain necessary.
Resolved payloads/stale replies per pass were 716/81 and 814/80 (11.3% and 9.8%).
Lifetime max synchronous attach was 4.7 ms and max reply round trip 509.5 ms,
including startup. Similar stale fractions on this route and the earlier straight
flight justify inspecting which tier transitions/turns cancel work before tuning
LOD hysteresis or worker caching. No scheduler/runtime change is made here.
No combat occurs on this route; damage-heavy combat and large-save costs remain
separate outstanding measurements. Hardware FPS acceptance remains outstanding.


## Selected reference target — 28 October 2026

Jan selected **Pixel 10a with a Google Tensor chip, 720p render resolution at
60 FPS**. Device/chip wording is user supplied; no exact Tensor generation or
hardware specification is assumed here. This target is not an achieved result.
The existing SwiftShader/Node measurements remain CPU/correctness evidence and
cannot establish performance on this phone.

On-device acceptance must cover maximum-speed regional travel, dense combat and
sustained return/resource behavior. Capture browser/version, actual WebGL drawing
buffer dimensions, quality settings and thermal/run conditions with the report.
720p refers to rendering, not a claim about the phone's display resolution.
The measurement protocol (including sustained duration and frame pacing criteria)
and mobile controls still need to be established. Current desktop keyboard/mouse
coverage does not verify phone usability. No device access or on-device testing
has occurred in this session.
