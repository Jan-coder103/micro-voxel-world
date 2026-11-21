# 0047 — Distant cutout trees and cheaper profiler reports

Jan authorized the next appropriate steps after discussing distant tree sprites.
Implement a comparable sprite path and reduce the profiler's measured reporting
spikes before interpreting device FPS. Existing simulation, canonical tree
placement, resident proxy compaction, density and view range remain authoritative.

## Crossed distant cards

Use two upright crossed cards: four triangles instead of the far box's twelve.
A shared 64×32 RGBA DataTexture (8 KiB before mipmaps) contains four code-authored
voxel canopy/trunk silhouettes. No downloaded or generated external image asset.
Alpha test, opaque depth writes and double-sided faces avoid transparent sorting
and blending. Keep matte standard lighting, tone mapping and fog. Variants derive
from local canonical instance translations, so rebasing/compaction retain them.

Select by conservative tile bounds after world matrices update. Tiles intersecting
the shadow frustum retain prior detailed geometry; sprites never change nearby
shadow silhouettes. Tiles with any centre closer than 700 m retain geometry,
as do steep views (relative elevation above .65 of horizontal clearance). This
keeps overhead forests solid. At tile-centre distances 1000–1080 m use a short
complementary screen-door dissolve between the far box and cards; beyond 1080 m
submit only cards. Bounds ensure trees are already beyond the old morph before
a tile can transition. Nearby detailed geometry and existing 420–700 m morph stay.

Tiles share their current compacted instance buffer with a child card mesh;
no second instance upload. A transition adds one draw only while active. Two
transition materials with a shared per-tile fade uniform are created lazily,
reuse shader programs and dispose on eviction. Uniform ownership per tile avoids
cross-tile material update ambiguity. Global geometry/texture/material ownership
and both meshes dispose with the forest. Histories/material counts are bounded
by 97 tiles. F8 Distant tree sprites is an independent on/off comparison and
restores its original value on close. sceneState.forest records sprite instances
and transition tiles, scoped to residency rather than camera-visible draws.

Initial prototype used per-instance distance dithering over conservative whole
tiles; many tiles remained dual-drawn and slightly increased total submitted
triangles. Replace that with the short tile-centre dissolve described above.
Cards approximate silhouettes/lighting and can cost fill bandwidth; fewer
triangles do not prove better hardware FPS. Device comparison remains required.

## Profiler report work

Replace per-metric filter/map/full sort with one traversal building metric
columns, zero-padding only work metrics, and in-place nearest-rank quickselection
on temporary arrays for p95. Preserve observed-only pacing samples, mean/max,
600-frame eviction, sparse-zero semantics and frame storage. Requested-column
reports allow live draw tables to omit line/point summaries. Live panel snapshots
skip export-only cpuCalls; explicit JSON export still contains full statistics.
Refresh live reports at 1 Hz, forcing an immediate refresh after reset/toggles.
The measured Observer report/aggregation row and overhead caveats remain.

`tools/benchmarks/profiler-report.ts` retains the previous report algorithm and
compares results on deterministic 600-frame/160-metric data. This is CPU-only
aggregation evidence, not a device FPS benchmark. It excludes DOM layout, driver
costs and the additional live-UI subset/cadence savings.

## Verification scope

Unit checks cover exact sorted-reference percentiles without mutating history,
filtered reporting, card topology/atlas/opacity, range/steep/shadow guards, shared
buffers, comparison toggle and resource disposal. Rendered fixtures compare
geometry/cards at low/oblique/overhead views, inspect mean pixel change and sample
sun depth through a display shader for parity. Existing compaction, cache and
profiler export/restore checks remain required. Short software-WebGL checks and
synthetic CPU timings do not establish target-device FPS, long-flight visual
acceptance or physical-GPU performance under the retained heat restriction.

Final evidence: low-view total triangles 574,238 → 517,030 with 53 calls in both;
oblique 557,138 → 500,238 with 52 → 53 calls. Mean channel differences 0.149/0.380
(out of 255); sampled sun depth identical. Steep overhead color/triangle counts
identical with sprites disabled automatically. Retained report:
`docs/performance/2026-11-21-tree-sprites.json`. Inspected comparison montage.
CPU-only report benchmark mean 53.83 → 11.72 ms over 30 full reports, excluding
live-subset/cadence savings and browser rendering/layout. Retained report:
`docs/performance/2026-11-21-profiler-report.json`.

Build/typecheck, lint and whitespace pass. Full serial subprocess-enabled unit
suite passes 363/363 (55 files, 127.35 s). Six unique focused browser checks pass;
final three sprite/profiler/toggle checks pass again in 24.9 s. Earlier broad
sprite transition was rejected after work counts increased. Initial full unit
run terminated without results; final suite passes. Full browser suite/npm check,
hardware FPS gains and long-flight human visual acceptance remain unclaimed.
