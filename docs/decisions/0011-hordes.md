# Phase 11 — Bounded seeded horde lab

Use a separate observer lab to prove population conservation, steering, simulation LOD and persistent combat. Phase 12 combines aircraft, hordes and an objective; this lab is not that combat prototype. Reuse the original ref-zombie source through validation/greedy meshing at its authored scale; no source assets change.

## Population and ownership

The test region is 9 × 9 encounters at 32 m spacing, coordinates -4..4, with 32 stable member slots each: 2,592 total represented people before kills. At most 49 encounter descriptors are resident. Sparse authoritative compact records are bounded to the 81 encounters, independently of visual/agent residency. Each stores path progress, 64 formation offsets and 32 health values. Member IDs are `horde:x,z:slot`; deaths are health zero, never an inferred count redistribution. There is no spawning, migration or reset that silently refills a group.

A resident near/medium encounter owns up to 32 reusable target objects. Far/unloaded encounters retain compact slot state without active individual objects. Unloaded groups freeze; reattachment resumes their pose. Health and deaths remain authoritative across every transition. Counts distinguish global survivors, resident survivors, individual live agents, instance counts and far proxies.

## Movement and tiers

Near enters below 45 m/exits at 55 m and updates at 60 Hz; medium enters below 85 m/exits at 100 m and updates at 10 Hz. Far groups advance their patrol at 1 Hz. Distances use encounter centres in XZ. Pending elapsed time is integrated on transition, attack or checkpoint, preserving navigation progress. Simulation has a fixed 60 Hz clock/eight-step catchup cap, explicit pause/resume and focus/visibility pause. This is a bounded demonstration, not a hardware frame-rate or enormous-horde performance claim.

A coarse four-waypoint patrol follows a rectangular corridor around each static 4 × 3 × 12 m wall. Formation offsets and body clearance are bounded to stay inside that navigable corridor; near agents add local separation/alignment to formation using a 2 m neighbour hash. Terrain grounding samples the seeded heightfield. This solves the lab's rectangular barriers, not arbitrary city pathfinding, steep slopes, bridges or unreachable destinations. Medium holds formation offsets between 10 Hz updates; far holds offsets and moves only its group anchor. Hit reactions briefly tint/compress visible individuals. Dead instances disappear; no corpse/debris allocation.

## Damage and obstacles

Combat accepts a general target-query provider plus damage callback and optional blocker query. Horde queries visit intersecting home cells, integrate pending motion and lazily resolve individual sphere proxies from compact state even for far/unloaded groups. Hits write health back to the stable slot; no tier immunity or random aggregate casualty allocation. These temporary query objects do not increase resident/active-agent counts. A query is bounded by the 81 encounter region and the existing weapon range. No health is regenerated on reattachment.

The same static wall AABBs used for the patrol layout block rays and blast visibility with exact slab intersections. Terrain keeps Phase 10's sampled collision. Explosions on environment surfaces originate just outside the impact surface (0.05 m back along the ray, at least 0.3 m above terrain) to avoid self-occlusion. Live zombie sphere proxies block direct fire; they do not shield blasts. Explosive falloff and visual/audio pool caps remain unchanged. Models use a conservative sphere centred 0.9 m above terrain, not per-voxel hitboxes.

## Persistence

`mvw:hordes:v1:g1:p1:<seed>` separates schema, generator and population versions. Strict records reject unknown fields, duplicate/out-of-region groups, unsupported versions/seeds, invalid health, progress or offsets. At most 81 groups / 512 KiB. Wounds and deaths flush once after the frame's combat batch; motion flushes at pause, travel, seed change and teardown. Compact session records survive ordinary region eviction. A complete encounter means all 32 health values are zero; partial damage is saved too. Seed changes reopen their own records. Browser origin/profile restrictions apply.

Corrupt/denied/full storage produces explicit session-only status, preserves existing bytes and keeps current session state. No migration, cloud sync, save editing UI or cross-tab merge exists. Positions/progress/formation are saved along with health. Clean reload starts the observer at home, paused. Choosing another seed gives a separate population; Home never resurrects members.

## Presentation and controls

Four shared instance batches render authored near zombies, medium boxes, far survivor proxies and walls. Max allocations: 49 × 32 near and medium instance slots each, 49 far/wall slots; actual counts reflect tiers/survivors. Existing terrain workers retain 49 residents/two jobs-results/two integrations. Cosmetic/audio effects keep 128 slots/eight voices.

WASD/arrows move an observer, Space fires the selected Phase 10 weapon. Tracking explicitly aims at the first living home member; disabling it uses pointer aim from the observer camera. Near/Medium/Far buttons move the observer to inspect home LOD; Travel east unloads it. No missions, aircraft integration, victory/reward flow or stress-performance acceptance in this phase.
