# 0043 — Preserve presentation while reducing repeated rendering work

Jan requested all four follow-up optimizations after a 600-frame capture showed
10.34 ms CPU callbacks, 5.63 ms CPU render submission and 32.48 ms frame intervals.
GPU timer queries were unsupported; the interval gap is not attributed to GPU
execution alone. No hardware FPS gain is claimed without an on-device comparison.

## Terrain shader fast paths

Skip water color/foam work where its contribution is exactly zero, skip animated
water normals/reflections on dry fragments, skip land grain on fragments with no
land/top contribution, and defer crop shading until coverage is nonzero. Flower
noise only runs for flower crops. Keep shoreline coverage, field edges, seam and
row derivatives outside coverage branches. Grain derivatives are calculated once
before branching, preserving anti-aliasing. `fastPaths:false` retains the full
calculations as a comparison reference; its program-cache key is distinct.

The shoreline field, palettes, water motion, crop geometry and quality distances
are unchanged. No draw-resolution reduction or approximate replacement texture.
Rendered parity checks cover dry ground, crops, flowers, shoreline and ocean.

## Static shadow-depth reuse

Within the renderer's active shadow callback, build a static depth map only when
its contents or light region change. Copy that depth to the live shadow map with
Three's GPU-to-GPU depth blit, then draw dynamic casters into it. This produces
the same depth union and ordinary PCF filtering as drawing all casters each frame;
there is no extra illumination or second shadow lookup in surface shaders.
Aircraft/props, mutants and rescue helicopters remain dynamic every frame.

Use 32 m region anchors and light-space texel snapping. Expand the original
±240 m window to ±256 m with 1096² maps, preserving approximately the original
texel density and a 16 m travel margin. Invalidate static depth for visible caster
add/remove/hide, transforms, position-buffer changes, instance count/matrix
changes, anchor/rebase and context restoration. Scan static caster stamps each
frame; retain no unbounded history. Ordinary shadows remain available through
F8 → Cache static shadows, and a caught cache failure restores ordinary shadow
rendering. Diagnostics expose fallback/error and static-build/depth-copy counters.
Hooks and temporary cast flags restore in finally; cached GPU targets and the
context listener are disposed.

Tradeoff: an extra full-size depth/color target, slightly enlarged maps and a
full depth blit per rendered frame. Approximate additional target storage is
10 MiB versus the original 1024² target (driver allocation can differ). The copy
adds bandwidth; static-heavy scenes should be compared with the cache toggle on
the target device, since savings are workload/driver dependent. The Three shadow
callback and depth-copy behavior are pinned by rendered regression checks.

## Ordered cloud-bank culling

Retain one instanced cloud draw and the existing billboard/noise/alpha shader.
Keep per-bank source matrices in the original z/x/instance order. Conservative
spheres include every billboard's half-diagonal for every camera rotation. Test
banks against the camera frustum in group-local coordinates (including world
rebasing); compact surviving banks into the existing instance buffer only when
the visible bank selection changes. Do not sort the remaining instances or split
transparent draw calls. This preserves blending order and visible pixels.
`cull(camera,false)` restores the reference submission for parity testing.
No cloud density, range or resolution is reduced.

## Worker coverage and integration budgets

Keep initial startup coverage as before. A dedicated module worker owns the
cached fallback sampler and subsequent vertex, color, water-depth, normal and
bounds preparation. Transfer completed typed arrays; main-thread update atomically
copies them into existing GPU-bound attributes without computing normals/bounds.
At most one request is active and one reply is staged; newer travel coalesces.
Nearby results publish to ensure progress; obsolete distant results are rejected.
Worker replies wake demand rendering, but waiting for a worker does not force
continuous idle rendering. Terminate and discard replies on disposal. Creation,
worker or deserialization failures use the existing bounded staged CPU fallback.

Chunk workers also calculate bounding spheres. Chunk attachment adopts those
bounds instead of scanning positions on the main thread. Frontier retains the
maximum of two integrations but stops after the first once a soft 2 ms budget is
spent; pending ready results wake the owner even after both workers have become
idle. One integration always progresses. A single integration, array copy or GPU
upload is indivisible; this is not a hard frame-time guarantee. Actual GPU buffer
uploads remain renderer work, not worker work.

Tradeoffs: one more worker, ~150 KB minified worker code and bounded extra worker
state/transfer buffers. Collision, save formats and authoritative simulation are
unchanged. Initial startup remains synchronous and is not claimed optimized.

## Verification

Unit checks cover ordered cloud compaction/reuse, worker bounds equivalence,
request coalescing and atomic publication, stale replies, worker failure/disposal,
and time-budgeted integrations that still wake a paused owner. Short software
WebGL comparisons cover shader and cloud parity and cached vs ordinary shadows
with moving/removed/added casters, light-region changes and world rebasing.
These are correctness evidence, not physical-GPU timings or Pixel acceptance.

The retained software-WebGL report is
`docs/performance/2026-11-21-render-parity.json`: all 15 view comparisons have
zero channel differences. Three cloud views submit 152 / 200 / 224 billboards
versus the original 808, retaining one draw. Seven shadow frames perform six
static builds (each intentional static/anchor change) and seven depth copies;
the dynamic-only move does not rebuild static depth. This measures work removed,
not GPU milliseconds saved.
