# Frontier makeshift profiler

Open Settings and developer tools → Open frame profiler, or press F8. It is off
by default. F8 / Stop restores original methods and all visual toggles. The panel
works in the hangar and during flight; it does not pause flight or force frames.
Reset before a capture. Export JSON saves the last 600 frames, drawing-buffer
size, browser, enabled visuals and asynchronous GPU samples. No automatic upload.

Fly to a reproducible laggy situation, allow loading/shader warm-up to settle,
reset, collect a short window, export. Repeat in the same view with just Shadows,
Trees, Clouds, Zombies or Mutants unchecked. Toggles affect visibility/rendering,
not collision, rewards or simulation; returning to normal restores prior state.
Switching any toggle resets samples. Avoid comparing the initial shader compile
spike against warmed rendering. Use render scale separately to test fill cost.

Numbers are milliseconds per rendered frame: mean / p95 / maximum. Multiple
simulation ticks accumulate; frames without a subsystem update contribute zero.
60 FPS allows 16.67 ms; frame interval is actual callback pacing, including browser
scheduling, and is meaningful during continuous rendering, not demand-rendered
idle interactions. CPU callback time excludes deferred browser layout/paint,
other tasks, worker execution and GPU execution. Streaming integration includes
worker-result uploads; worker generation runs independently and is not timed.

Stage totals and child subsystem rows overlap: “inclusive” means do not sum it
with its children. Plane + collision + tick glue excludes the instrumented zombie,
mutant and combat calls inside flight.advance; remaining landing/target selection
and tick bookkeeping are included. Tree streaming + LOD and Cloud update measure CPU preparation,
not drawing. Shadows are part of Render CPU submission and GPU render, not the
small aircraft ground-shadow placement update.

GPU render uses EXT_disjoint_timer_query_webgl2 when supported. It measures the
whole render including shadow maps, arrives asynchronously, uses at most eight
pending frames (24 sequential query segments), discards disjoint/context-invalid timing and never waits with
finish/readPixels. Unsupported means unknown, never zero. GPU and CPU overlap;
**do not add their times**. Visibility comparisons estimate marginal costs, not
an additive GPU breakdown: shadows, overdraw, batching and occlusion interact.
GPU samples and CPU frames are separate rolling populations, not paired frames.

Observer bookkeeping is a measured lower bound for clock/aggregation/query work.
Observer report/aggregation includes panel text generation, sampled twice a second.
CPU callback includes instrumentation work; end-of-frame reporting is separate.
These cannot measure every observer effect (driver overhead, JIT, cache changes,
deferred panel layout). Compare profiler on/off frame pacing with browser tooling
on the target device for a real overhead estimate. No extra render passes or
synchronous GPU reads are introduced. Storage is bounded; no persistent capture
log or per-frame console output. Numbers from software rendering do not establish
Pixel 10a hardware performance.

The first profiler-driven fixes are documented in
[decision 0042](../decisions/0042-frame-hotspots.md). Frontier now stages fallback
recentering with cached absolute terrain samples, refreshes HUD text/compact
telemetry at 10 Hz (with immediate input/state updates), builds verbose diagnostics
only while visible, and uses 25 ground queries for its small blurred shadow.
World marker projection and simulation still run each frame/tick respectively.
Compare fresh captures of the same situation; the CPU-only benchmark report is
not a substitute for measuring your device.

The follow-up rendering work in [decision 0043](../decisions/0043-rendering-work-reuse.md)
adds **Cache static shadows** for same-view comparison while leaving shadows on,
and rows for **Shadow depth passes (inclusive)** and **Cloud bank culling**.
Shadow depth timing is inside render submission, so do not add it again. Cached
shadows trade an extra GPU target/depth blit for fewer static caster draws.
Fallback recenter preparation now runs in a worker after initial coverage; its
CPU time is off-thread and is not included in the main-thread fallback row.
Worker publication still copies/uploads buffers. Snapshot diagnostics include
coverage-worker status and shadow-cache fallback/build/copy counters.

The next rendering follow-up is described in [decision 0044](../decisions/0044-rendering-followups.md):
shadow-region invalidation, real single-box far tree geometry, texture-backed
cloud noise, and one explicit scene matrix traversal. Noise changes fine cloud
detail slightly; the other changes preserve tested pixels. Re-capture a warmed,
identical view on the target device; work reductions do not establish 60 FPS.

## Detailed rendering breakdown (F8)

The overview now puts CPU callback, unattributed outside-callback time, drawing
buffer and GPU results first. GPU timing, when supported, separates **Render
setup**, **Shadow depth**, and **Main color**. These sequential GPU passes sum to
GPU render; CPU and GPU still overlap. Unsupported remains unknown. Pacing now
excludes idle wakeups/first frames rather than averaging them as zero intervals.

Open **Draw submission by category** for color/shadow CPU mean/p95/max and mean
calls/triangles per frame: terrain chunks/coverage, trees, clouds, settlements,
roads, naval, aircraft, enemies, base, effects, sky and other. It is sorted by CPU
cost; instanced triangle totals come from actual renderer counters. Trees baked
into terrain meshes count under Terrain chunks; the Trees row/toggle covers
the separate forest batches. These CPU
rows include nested GL calls, so do not sum the tables and parent totals.

CPU rows now separate cache scan, caster flags, static rebuild, dynamic depth,
depth-copy submission and uncached shadows. GL rows expose buffer allocations/
updates, 2D/3D texture uploads, shader compile/link submission and draw submission.
Scene transforms, shadow matrices, tree geometry selection, terrain-plan and
camera work also have child rows. Observed height queries cover direct calls
through model.ground, not every cached reference or independent sampler.

Interpret a high **Main color GPU** time with tree/cloud/terrain comparisons;
a high **Shadow depth GPU** time with shadows/cache toggles. High draw CPU plus
many calls suggests batching/state work. Upload or shader spikes point to
streaming or warm-up. **Render traversal + setup (exclusive)** is the remaining
CPU render work after measured child calls, not a pure traversal timer. Outside
callback time is not a GPU estimate. Deep hooks add overhead; compare F8 on/off.

JSON schema v2 adds gpuPasses, draws, per-frame cpuCalls, and sceneState cache/
streaming/resource context. Histories stay bounded; no automatic upload. See
[decision 0045](../decisions/0045-detailed-frame-profiler.md) for exact semantics.
