# Local terrain collision bounds and Frontier surface detail

30 October 2026. Jan reported about 3 FPS during low passes, a sharp transition
near 140 m AGL, and muddy terrain shading.

## Diagnosis and correction

Frontier's fitted aircraft has 6,050 collision sample points. A one-metre sweep
checks eleven poses: 66,550 possible procedural terrain evaluations per physics
tick, at 60 ticks/second. The global 191 m terrain ceiling skips that work only
above a world-space elevation. Its apparent AGL threshold therefore varies with
the ground height and hull attitude/radius. The isolated diagnostic reproduces
this discontinuity without rendering; it does not establish a physical-GPU FPS.

FlightGeometry now optionally accepts a conservative ground ceiling for the full
swept rectangle. Regional v2 derives it using interval bounds: smooth bilinear
noise extrema occur at clipped lattice-cell corners; the coast, mountain envelope
and ridge bounds are combined conservatively. River/lake carving can only lower
terrain. Include possible ocean, river and lake surfaces, rounding tolerance, and
the airfield's convex flattening blend and raised runway paint. This is not a
sampled estimate of the maximum. Existing full hull sampling still resolves actual
near-ground contact. Obstacle and world-boundary checks remain independent.
Only Frontier opts in; other worlds retain their existing collision behavior.

`node --experimental-strip-types tools/benchmarks/low-flight.ts` is a bounded
CPU diagnostic with one old/new 1 m sweep per altitude/location. Recorded output:
`docs/benchmarks/frontier-low-flight.json`. At 30 m AGL, 66,550 terrain samples
become zero; isolated cost drops from 33–51 ms to 0.05–0.45 ms on this host.
Do not interpret these individual/JIT-sensitive sweep times as complete frame
cost, GPU time, a sustained benchmark, or a hardware FPS guarantee.

## Appearance

Frontier now shares world-anchored 12 m patches, 3 m soil variation and 0.65 m
surface grain across streamed LODs and the coarse underlay. Derivative filtering
fades subpixel detail. Blue water keeps its palette, and surface variation favors
upward faces. World rebasing updates one shared origin uniform so patterns remain
anchored. Remove the dulling material tint. Extend the 16 m underlay sampling
from 256 m to 512 m in each direction while retaining the 2048 m outer extent,
one reused mesh/material and the existing worker/residency caps. Terrain heights,
biomes, vegetation placement and saved generator data are unchanged.

## Verification

253 unique unit tests passed across the serial run and a rerun of the four CLI
files outside the sandbox (sandbox child stdout/stderr was empty). New coverage
checks 16,000 terrain/water samples under conservative bounds across four seeds,
negative and distant coordinates, cell boundaries and base blending; clear low
passes including 139/140/141 m; optimized/reference ground-water contacts,
banking and obstacles; shader origin reuse and derivative filtering.
Typecheck/build/lint passed. Two short player browser smoke cases passed (9.4 s,
one worker, 800×600, mostly paused), including all LODs, shader errors, settings,
cleanup and unavailable WebGL. The first browser attempt caught the reserved GLSL
word `patch`; renamed it, rebuilt and reran both cases successfully. Inspected the
final runway screenshot: visible ground grain, intact runway and aircraft/HUD.
Full browser/load/flight benchmarks were not run, honoring the retained heat
restriction. Physical-device FPS, long travel and human visual/flight acceptance
remain open.
