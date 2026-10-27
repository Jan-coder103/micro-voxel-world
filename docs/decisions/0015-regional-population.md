# 0015 — Regional population authority

Phase 15 adds regional encounters to generator-v2 flight. The legacy Clearpass sortie,
Horde lab, generator-v1 populations and saves retain their earlier authority.

A population-v1 encounter owns one half-open 128 m cell inside [-4096,4096) on
both horizontal axes (4096 possible encounter IDs). IDs include cell coordinates;
the save scope includes seed, terrain version, structure flag/version and population
version. This is a declared initial supported population area, not release-scale
coverage. Terrain exploration continues outside it without enemies.

Road nodes select settlement habitat and placement. City cells budget 32 members,
rural 16, other districts 24. Wilderness groups cluster around a seeded anchor:
forest 12, mountains 4, other dry habitat 8; wet centre cells without settlement nodes
are omitted conservatively. At most 96 deterministic candidates are attempted.
Every accepted member belongs to its encounter cell, is at least 2 m from peers,
and passes the Phase 14 dry-ground/grade/building navigation query with 1 m
clearance. Unsafe candidates are omitted. Structures-disabled flight has separate
population/save scope and uses equivalent dry/grade checks without buildings.

Members hold these validated ground positions in this phase. We retain the legacy
moving-horde behavior in its prototype rather than graft its wall-specific patrol
onto regional roads. Regional migration, pursuit, connected-road patrols and mission
pressure are later work; Phase 15 implements population generation and lifecycle.
Vegetation remains visual and does not obstruct population navigation or weapons.

Simulation authority is independent of terrain jobs and GPU chunks. The camera
resides at most 49 encounters with hysteretic near/medium/far rendering; an encounter
cache has 64 entries. Near figures share one voxel geometry, medium figures share
one box, far groups use one aggregate marker (three batches, two geometries).
Queries regenerate encounter descriptors even without residents, so weapon rays
and blast damage cross presentation boundaries. Terrain and structure rays block
shots and explosions through the existing Combat implementation. Regeneration
uses stable member slots and merges saved health; damage is monotonic.

Only modified health arrays are saved, with a 2 MiB bound. Each damage callback
writes immediately; pause and teardown checkpoint too. Recover resets aircraft and
weapon counters, never population damage. Unsupported or malformed saves fail
atomically, retain their original bytes, and show an error; unavailable/quota-blocked
storage retains session authority and reports the limitation. Full-world save replay
and synchronous per-hit serialization remain Phase 16 profiling concerns.

The selected encounter's remaining members provide a minimal clearance objective.
Approach nearby horde positions the development aircraft for an attack. There is no
reward/progression framework or new persistent mission state; Phase 18 owns that.
No new art, dependencies, environment destruction or on-foot systems.

Validation: unit coverage for multi-seed placement, district density, water rejection,
IDs/query deduplication, tier/eviction/reload clearance, unresident combat, version
isolation, malformed/duplicate saves, quota failures and render disposal. Browser
coverage verifies partial-save display, flight weapons, approach/recovery/reload,
legacy isolation, corrupt-save handling and teardown. See tracker/handoff for actual
run results. Deferred player feedback and physical-GPU acceptance remain outstanding.
