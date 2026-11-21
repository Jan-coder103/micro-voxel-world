# 0045 — Attribute expensive rendering work without extra renders

Jan requested a more granular profiler after the 29.2 FPS capture. Keep F8 opt-in,
restore hooks when stopped/disposed, and preserve rendering/simulation behavior.

## CPU detail and draw counts

Wrap renderBufferDirect only during capture. Classify each submitted object by
registered ancestor roots (bounded categories), separately for shadow and color
passes. Report mean/p95/max submission milliseconds, calls and actual submitted
triangles, lines and points using renderer.info deltas. Instancing is reflected
in triangle totals; no estimates based on object counts. Sort the table by CPU
mean. Shader time is not measured by a small tree/cloud update row or this table.
Categories describe draw batches: near trees baked into terrain geometry remain
in Terrain chunks; the Trees row/toggle concerns the separate forest batches.

The renderer.render exclusive row removes measured nested shadow, draw and GL
calls. It retains render-list traversal/sorting, unwrapped state work and other
setup; it is not a dedicated timer for only sorting. Draw rows include their GL
children. Instrument bufferData/SubData, 2D/3D texture image/subimage uploads,
compileShader/linkProgram and four standard draw APIs. Their CPU submission
latency can include driver blocking; compile submission is not asynchronous
shader compilation duration. Other GL entry points are not individually timed.
Export cpuCalls with per-frame operation counts alongside CPU times.

Additional CPU rows cover scene transforms, shadow camera matrices, tree geometry
selection, terrain streaming plans, camera update and observed terrain queries.
The latter times direct accesses through model.ground; previously retained
function references and other independent terrain samplers are not intercepted.
A reversible optional sink in the shadow cache records scan, flag changes,
static rebuild, dynamic pass, depth-copy CPU submission and ordinary fallback.
Dynamic pass includes its depth copy and draws. Static/dynamic rows are children
of shadow total. Scan/flags/copy are CPU measurements, not GPU attribution.

## GPU passes

Replace a single elapsed query with three sequential, never nested queries:
render setup, shadow depth (including static rebuild/copy/dynamic draws), and main
color (opaque/transparent/background work). Publish only complete frames after
all results are available. Whole-render GPU time is the sum of those segments;
pass populations match each other but arrive separately from CPU frames.
There are at most eight pending frames / 24 query objects, plus only the current
frame within that bound as work progresses. Skip timing when backlog is full.
Reset/stop/disjoint/context loss delete pending/active queries and discard samples;
context restoration reacquires the extension. Driver exceptions disable optional
GPU timing and expose an error, leaving gameplay running. No finish/readPixels,
extra renders or per-object GPU queries are introduced in production.

## Pacing, exports and observer costs

The scheduler supplies whether the previous frame requested continuous rendering.
Only those intervals contribute pacing and outside-previous-callback samples.
No fabricated zero interval for first/idle frames; long continuous stalls remain
visible. Outside time subtracts the entire previous callback including profiler
reporting, and remains unattributed: browser tasks, scheduling, compositor waits,
workers and GPU backpressure cannot be separated from it.

Schema v2 retains existing cpu/gpuRender fields, adds gpuPasses, cpuCalls, draws,
and sceneState (cache counters/error, streaming queues and renderer resources).
All histories remain bounded at 600 frames. GPU/buffer/CPU overview comes first;
the category table has a separate disclosure. Stop restores methods in reverse
installation order so nested wrappers are fully removed. Queries and listeners
are disposed. Native method identity restoration is tested.

Deep per-draw/GL hooks deliberately add observer overhead. Bookkeeping remains a
lower bound and cannot remove all perturbation, JIT/driver effects or deferred
panel layout. Compare F8 on/off with external browser tooling; do not promise
these timings reflect an uninstrumented frame. GPU category costs still require
same-view visibility comparisons or browser GPU tools; per-category CPU does not
attribute fragment shading/overdraw time.

## Verification

Mock WebGL tests exercise asynchronous atomic publication, segment totals,
non-nesting, backlog cap, reset/disjoint/context loss, unsupported timing and
driver-error recovery. Draw aggregation checks instanced counts and missing work
as zero; pacing aggregation excludes missing observations. Browser checks export
v2 detail, toggle/reset/stop/dispose, compare rendered pixels and verify known
instanced/color/shadow draw counts and GL method restoration. These are short
correctness checks, not target-device FPS or sustained physical-GPU acceptance.

Final verification: production build/typecheck, lint and whitespace pass; 357
unit cases pass in the full serial run, and the final focused 16-case rerun also
passes. Four unique focused browser checks pass across runs; final two profiler
checks pass together in 9.9 s, including known per-frame draw counts, idle-aware
pacing, identical pixels and exact method/sink restoration. Software GPU timing
was unsupported in the compact game capture; timer-query behavior is exercised
by mocked WebGL tests, not asserted as hardware timing evidence. Full browser
suite and sustained physical-GPU/target-device acceptance remain open.
