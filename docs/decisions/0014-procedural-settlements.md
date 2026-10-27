# 0014 — Deterministic settlements, infrastructure and shared building kits

Phase 14 implements rule-based settlement content on the Phase 13 regional heightfield. Phase 12 player playtesting and physical-GPU acceptance remain deferred by Jan; neither has passed.

## Region and placement authority

Structure content v1 is independent of terrain generator v2. `ChunkSpec.structures` opts into it and adds `:s1` to chunk signatures. Legacy v1 terrain, combat populations and marker saves keep their identities. Regional inspection/flight enable structures by default; `&structures=0` retains the terrain-only inspection route. These routes have no persistent changes.

512 m regions own stable district, node, road, plot and building IDs. A whole-region plan precedes chunk clipping. Seeded rural, city, industrial, military and airport selections produce different kit mixes and heights. An ocean-only west-to-east shoreline can select a harbor instead, with a fixed-height bridge-derived pier. Impossible sites produce no settlement rather than floating buildings or fake landmarks. The inspection search is bounded and reports an unavailable district when appropriate; four seed fixtures include all six types.

A 24 m street grid supplies local access. Every road samples the terrain across its width, rejects water and slopes over 22%, then retains only the root-connected graph. Plots validate their complete footprint plus a 1 m margin on a <=2 m grid, reject water and over 1.6 m relief, and have a safe driveway to a reachable street. Foundations extend from slightly below the lowest sampled ground to the building base above its highest sample. Lots avoid streets and each other; vegetation reserves an additional margin. These are bounded sampling rules, not a terrain editing or exhaustive continuous-surface solver.

Neighboring regions agree on canonical boundary portals. Both halves must be dry, gentle and joined to each local graph before either creates its link. Endpoint IDs and boundary coordinates agree independently of chunk/load order. Unsafe links are omitted; this does not guarantee a highway route between every settlement or bridges across every river. Region-owned road rectangles are clipped to chunks and tessellated on a global 2 m grid. The underlying terrain remains intact.

## District content and landmarks

- Rural: original farmhouse kit and local roads.
- City: utility-building kit at several height variants, with lower residential plots.
- Industrial: warehouses and fuel tanks.
- Military: container barracks, service streets and repeated watchtower landmarks. No weapons or simulated security.
- Airport: a dry, grade-checked 120 × 14 m runway, center marks, apron where valid, hangars and a watchtower-style control landmark. Plots/streets keep the runway clear, and vegetation is excluded from the airfield envelope. This is arcade scenery, not a certified airfield or a landing simulation.
- Harbor: land-side warehouses/containers and a dry-to-ocean bridge-derived quay with a safe shore approach. The pier validates terrain beneath its fixed deck and rejects higher ground.

Building fronts face their driveway. Bounds account for the quarter-turn. Entire buildings have one half-open owner chunk regardless of LOD. Terrain roads remain in every tier; building descriptors persist across tiers, avoiding silhouette disappearance when terrain LOD changes. This phase uses small bounded settlements, not metropolitan-scale megacities or a general road-routing solver.

## Assets and GPU ownership

Reuse seven original, unchanged validated voxel sources: farmhouse, utility building, warehouse, fuel tank, watchtower, shipping container and wooden bridge. Runtime scale/placement derives from their declared metre bounds. Seven global instance batches share one geometry/material per kit; an eighth uses a shared box for foundation skirts. The view caps total membership at 512 buildings. Chunk integration/eviction registers/releases membership; same-chunk tier replacement can briefly register the replacement before releasing its predecessor without removing the new instances. The dirty view rebuilds matrices once per frame, reuses GPU allocations and recomputes bounds. Final teardown disposes instance buffers and each owned source/foundation resource once.

No source asset is created or edited. The existing source/greedy-mesh workflow remains authoritative. Bundling seven editable JSON sources increases the inspection/flight payload (source chunk ~3.73 MB plus a shared ~779 kB utility source). Source meshing is synchronous at startup, as in earlier labs. Phase 16 can evaluate generated derivatives/code splitting using actual evidence; this phase makes no loading-time or supported-GPU claim.

## Collision and navigation

`SettlementWorld` resolves the same deterministic plans without rendering or worker readiness. Swept normalized ray/AABB queries include foundation bottoms and building roofs, with optional aircraft padding. Regional Flight uses 6 m padding for its primitive airframe; camera height clears building envelopes. Legacy Flight/Weapons/Combat fixtures retain their prior behavior. All structures are static, conservatively solid envelopes, including hollow towers and piers; no destructible geometry.

Navigation exposes connected road nodes/edges, building access node IDs and a terrain/water/building walkability query. This establishes placement/obstacle data for Phase 15, not a new pathfinder or population. Pier/water traversal and building interiors are not walkable ground. The query API validates bounds and caps spatial extents; raw/final region caches each hold at most 64 entries. Worker world caches hold two seed scopes. Cache eviction affects generation cost only.

## Interiors and loot decision

Keep the source idea for later decorative interiors visible from outside. This aircraft phase adds no explorable interiors, furniture simulation, pickups, loot economy or on-foot interaction. Such systems need a concrete aircraft-gameplay purpose before implementation. The reused kits' existing windows/detail remain visual.

## Validation and evidence

Unit coverage verifies four seeds including uint32 endpoints, load-order-independent plans, six district types, graph connectivity and paired portals, full-footprint dryness/foundations, lot/road separation, accessible plots, chunk ownership/LOD identity, vegetation exclusion, unloaded collision, real Flight crash/clearance, navigation, bounded malformed queries and instance resource ownership. Browser checks inspect six districts, eviction/return, seed change, preserved legacy bytes, regional flight, recovery and teardown; existing regressions remain enabled.

`npm run settlements:benchmark` records CPU generation and typed-array load for two seeds at all six districts. The committed report excludes source-kit meshing, descriptor strings, GPU copies and JS temporaries. Initial sample: 16–36 buildings in each 49-chunk window; 2.85–3.82 MB of terrain arrays; peak chunk array payload 515,376 bytes; per-chunk CPU p95 ~3.2–7.1 ms. Discovery of the bounded district search took ~145–309 ms. This sample overlapped final validation, so CPU contention contributes to timings. These are local CPU measurements, not GPU frame times or gameplay FPS.
