# 0049 — Lazy scenery generation and coarse independent tree shadows

Jan authorized all three capture-5 fixes, much coarser tree shadows that retain
sun direction, and delayed scenery arrival in exchange for steadier frames.

## Generation cost

Cache immutable seed-only layout objects (8 entries) and immutable settlement
site descriptors including null results (256 entries). Reject water, parcels,
site exclusions and sparse hash candidates before two slope-height samples.
Coordinates, density, heights, palettes and terrain/save versions remain the
same. Regression hashes from pre-change commit 5ad7ce0 cover four seeds, negative
coordinates, parcel/region boundaries and eviction/recomputation.

## Lazy generation and publication

One shared module worker prepares forest, roads and settlement presentation.
Terrain/collision authority stays synchronous/independent; existing coarse
terrain remains visible while optional scenery arrives. Closest forest/road
jobs are preferred, settlement refreshes receive priority, and old settlement
meshes survive until their replacement is ready. A complete forest tile is
published once, replacing repeated partial growth/instance uploads.

The queue has at most one worker job and one staged payload. Owner residency
limits requests to 97 forest tiles, 25 road tiles and one current settlement
refresh; leaving an area cancels queued work. In-flight obsolete work occupies
its slot until reply, then is discarded by id and cancellation token. Re-entered
coordinates receive a new id. A timer publishes at most one result per 16 ms
pump; no multi-result integration bursts. This limits arrival rate, not overall
frame time or a guaranteed number of frames before arrival.

Road tessellation, normal/bounds preparation and discovery run off-thread;
position/normal/color arrays transfer to the main thread without a second data
copy. Forest records retain doubles for exact canonical placement. Worker jobs
use a separate bounded SettlementWorld cache, avoiding shared simulation state.
Settlement discovery/filtering/sorting also runs off-thread; applying bounded
instance batches remains main-thread work.

Worker creation, postMessage, execution or message errors terminate the worker
and use the same generators cooperatively. Fallback timers permit at most 32
yields or about 1 ms before rescheduling after 16 ms. They yield between forest
cells, road quads, discovery steps and normal batches. A single cell, district
or parcel query, allocation or publication can exceed that soft budget. This
fallback is functional recovery, not a hard frame-deadline guarantee.

All timers, staged replies, job references, workers and owned GPU resources are
cancelled/disposed. Shared queues are disposed by Frontier; standalone views own
their own queues. Worker replies/publications wake demand rendering without
requiring continuous idle frames. Frontier/F8 expose queue mode, pending jobs,
completed/stale counts and worker failure, plus background publication/fallback
CPU timing. Off-thread computation is not mislabeled as main-thread CPU.

## Tree shadows

Color tree batches no longer cast sun shadows themselves. Once a complete tile
arrives, create independent immutable shadow groups for its four 128 m quadrants.
Tight actual instance bounds exclude irrelevant groups from static-cache stamps.
Each tree uses a 12-triangle box in place of the detailed three-box 36-triangle
mesh. This is a coarser silhouette, using canonical tree locations/heights and
the existing sun camera/direction; it is not a screen-aligned decal. Keep 896² sun
maps, normal aircraft/settlement shadows, full resolution and MSAA.

Shadow instance buffers never change for color compaction, detailed terrain
residency or color LOD selection. Therefore these changes cannot invalidate
cached depth. Genuine shadow-group arrival/removal, light anchors, transforms
and rebase still invalidate immediately; no stale-shadow throttle.

Proxies are hidden when Three builds its color list. The existing shadow hook
reveals the registered proxies only during depth passes (cached or ordinary)
and restores visibility in finally, including fallback/error paths. This relies
on the pinned Three renderer preparing color lists before shadow rendering;
rendered tests guard visibility/parity. Proxies inherit their tile/world transform
and preserve visibility through forest toggles and rebasing. Color LOD can now
simplify independently of shadow-region overlap.

## Evidence and limits

CPU-only native Node comparison against 5ad7ce0: 6,208 cells / 19,706 trees,
identical hashes across three runs of both versions. Warm run means ~424 ms →
~179 ms (about 58% less generator time), excluding reservations, publication,
GPU and browser scheduling. Retained report:
docs/performance/2026-11-22-scenery-generation.json. Ordered runs and JIT limit
benchmark precision; no hardware FPS gain is established.

Focused tests cover cancellation/re-entry, priority, delayed single publication,
worker failure recovery, disposal, exact tree/road output and unchanged shadow
buffers across color residency changes. Five short software-WebGL checks pass,
including actual scenery-worker use, hidden proxy color exclusion, compact vs
reference shadow/color parity through rebase, cached/ordinary shadow parity and
profiler restoration. Inspected forest screenshot: coarse shadows retain sun
direction. Full unit and final check results are recorded in tracker/handoff.
Physical-GPU/long-flight visual acceptance and stable 60 FPS remain open.
