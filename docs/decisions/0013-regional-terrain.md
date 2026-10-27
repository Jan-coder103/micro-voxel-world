# 0013 — Versioned regional terrain and traversal

Jan authorized Phase 13 on 27 October 2026 and deferred the Phase 12 player-feedback and physical-GPU gates until later playtesting. Neither gate has passed.

## Generation contract

Keep the existing sine-field generator, saved marker keys and combat population scopes at v1. Optional `ChunkSpec.generator = 'regional-v2'` selects the new field and participates in chunk signatures, so stale jobs cannot replace a different generator's mesh. Regional routes do not access persistent deltas. Later adoption in combat requires explicit population-placement/save policy, not a silent migration.

Retain the finite bounds established in Phase 8 (32 m chunks, chunk indices ±4096). Use global integer-hashed value noise at several scales, ridged elevation and a moisture field. Drainage envelopes carve a seed-offset meandering river and connected lake; a plateau in the river's elevation matches the lake surface. The river descends continuously toward sea level. Coast, ocean, plains, forest and mountains derive from those same fields. This approximates erosion-shaped valleys; it is not physical erosion or a drainage-network solver. Elevation caps keep the finite world below 210 m, leaving room beneath the 250 m flight ceiling.

Authoritative ground is separate from water elevation. Visual geometry samples their maximum and uses opaque water colors. Regional flight collides with that same maximum, independent of workers. Water has no waves, underwater geometry, transparency or buoyancy. Stepped height samples retain 0.1 m vertical precision; all four tiers retain identical 1 m perimeters and shared colors. Props are not part of authoritative terrain collision.

## Distribution and ownership

An 8 m global lattice derives tree positions/size from seed/cell IDs. Dry, gentle ground and biome density filter candidates. Each chunk owns a half-open set of cells; tree layout is identical across near tiers, absent in far tiers. Three cuboids per tree are appended to each owned chunk's position/normal/color arrays. No per-tree Three.js objects or GPU allocations; existing shared material and disposal contracts apply. Tree silhouettes are procedural preview content, not newly authored source assets.

512 m regions provide up to twelve deterministic settlement candidates. Dry, low-slope centre/cardinal/corner tests select one site or none. Stable v2 IDs, radius and terrain height describe reservations. Vegetation avoids them; a single gold beacon previews a site's location. Roads, lots, buildings, detailed terrain validation and collision/navigation integration belong to Phase 14.

## Inspection and aircraft

Reuse the existing streaming route with `?terrain=regional`, seed controls, per-biome landmarks and regional diagnostics. Retain 49 residents, two outstanding payloads and two integrations per frame. A 1,024 m coarse reusable underlay fills late detail/horizon, with regional height/colors. This remains an approximation under detailed terrain, with visible LOD/pop transitions.

Fly this region transfers seed/location to the optional regional Flight lab. Controls, focus pause, collision sampling, recover/reset and resource teardown reuse the existing flight system. Ground/water contact crashes; trees have no collision. A two-chunk directional preload stays inside the existing resident budget. There is no new persistence, combat, population or mission integration. Invalid seed/position query parameters fall back safely to the default seed/approach.

## Verification and measurements

Unit fixtures cover four seeds including uint32 endpoints, all biomes, connected monotonic water, shared LOD edges, stable placement, full-world elevation bounds and real flight/water collision. Browser inspection covers landmark navigation, seed changes, selected-location flight, bounded resources, saves and teardown. Full earlier regression checks remain required.

`node --experimental-transform-types tools/benchmarks/terrain.ts` generates 49 chunks at five landmarks for seeds 103/12012. Committed JSON records CPU generation durations, payload bytes and triangles. The initial sample ran concurrently with browser verification; its timings include warmup/contention and establish no frame budget. It reports roughly 2.45–2.87 MB of resident typed-array payload and at most 489,024 bytes per chunk. GPU copies, temporary JS arrays and runtime overhead are additional. Physical-GPU acceptance remains deferred.
