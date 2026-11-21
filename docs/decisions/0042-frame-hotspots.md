# 0042 — Terrain, HUD and ground-shadow CPU hotspots

Jan requested the first three fixes identified from an actual profiler screenshot:
rare fallback terrain stalls (54 ms maximum), HUD/diagnostics (3.68 ms mean), and
small aircraft ground-shadow placement (1.26 ms mean). These screenshot timings
are evidence for investigation, not a controlled before/after benchmark.

## Changes

Fallback coverage retains samples on an absolute world-coordinate lattice. A
replacement grid reads overlapping samples from the last committed grid and
samples only missing positions. Frontier opts into at most 128 new samples per
update and a soft 2 ms sampling budget, checked every 32 visited vertices. Initial
coverage remains synchronous at startup. Staging arrays keep the old mesh and its
anchor intact until the replacement's positions, colors and water depths are
complete; then buffers, normals, bounds and position publish together. That final
publication is outside the sampling budget. Ordinary movement completes its
current build before retargeting; distant teleports cancel obsolete work. Only
the previous and next grids are retained. Pending work keeps demand rendering
awake, including while paused. Collision does not use this mesh. Synchronous
callers/fixtures retain immediate publication unless they opt into a budget.

HUD text, target discovery and compact browser-test telemetry update at 10 Hz,
plus immediate input/state changes and the final idle frame. Cached live contacts
are projected every rendered frame so markers still follow the camera smoothly.
Text and compass/boss markup are replaced only when values change. Projection
uses dimensions cached by ResizeObserver to avoid repeated layout reads after
DOM writes. Menu base discovery is gated by an open hangar. Pretty diagnostics
JSON is produced only when developer tools, the hangar and its settings section
are open. The compact data-sample attribute remains available at HUD cadence for
browser checks; flight/control/weapon cadence is unchanged.

The reusable blurred aircraft ground shadow uses a 4×4-cell grid instead of
16×16 cells, retaining the same footprint, terrain-conforming vertices, texture,
altitude behavior and resource ownership. The center vertex reuses the center
height: 25 ground queries per moving frame instead of 290. Unchanged poses still
do no terrain sampling. This coarser cosmetic surface can bridge sharper terrain
features differently; human visual acceptance remains open.

## Evidence and limits

Run `node --import tsx tools/benchmarks/frame-hotspots.ts` for a short CPU-only
comparison against the original terrain/shadow implementations in commit
29f8759 (Git history required; temporary modules are removed in finally).
`docs/performance/2026-11-21-frame-hotspots.json` records seed 103, six 128 m
recenters and 120 moving shadow frames after warm-up. Terrain samples fall from
47,526 to 4,272; maximum per-update CPU falls from 39.84 to 4.95 ms, spread across
36 updates instead of six. Mean total CPU per recenter falls from 33.11 to 9.54 ms.
Shadow mean CPU falls from 0.805 to 0.088 ms; samples from 34,800 to 3,000.
These measurements exclude startup, browser work, GPU work and device FPS.
A soft budget cannot prevent GC, scheduling or a costly individual sample.
Reprofile the same laggy scene on Jan's device before claiming improved FPS or
assigning a new hardware frame budget. Existing physical-GPU/heat restrictions
and outstanding acceptance remain unchanged.
