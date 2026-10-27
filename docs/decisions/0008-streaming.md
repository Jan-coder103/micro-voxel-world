# Phase 8 — Chunk streaming and persistent-delta foundation

## Test surface and generation

The Streaming Lab at `/tools/streaming/` is a third production entry point, linked from Game. Keeping it separate preserves the measured Phase 7 rural scene and its rendering/editor regressions while providing a test camera before aircraft exist. The lab imports the shared Three.js runtime but does not load the rural source JSON bundle.

Generator v1 is a deliberately simple seeded heightfield, not the later biome/city generator. Integer uint32 seeds are mixed before selecting the global trigonometric height field; heights are quantized to 0.1 m. Each chunk covers 32 × 32 m. Geometry uses chunk-local positions, placed through a world transform. The generator has no dependency on load order, storage or Three.js. Tests check identical regeneration and representative distinct seeds; no cross-engine bit-identical physics claim is made.

Four tiers use 1, 2, 4 and 8 m interior cells. They are terrain surface derivatives, not a change to the 0.1 m authored asset convention or completed asset LODs. Each cell is triangulated around a sampled centre. Boundary cells subdivide their outside edge at 1 m spacing, leaving every chunk perimeter with the same 33 global height samples regardless of tier. Adjacent mixed-tier polygons therefore share identical edge segments rather than hiding mismatches behind skirts. Both axes and negative coordinates are tested for every tier pair. Flat triangle normals can still differ across a shared edge; this is a shading transition, not a geometric hole. Tier colors intentionally show the four square distance bands.

## Lifecycle and budgets

The camera chunk is selected with mathematical floor, including negative positions. A Chebyshev radius-three window contains at most 49 chunks (224 × 224 m). Centre/ring priorities give tier counts 1 / 8 / 16 / 24. Wanted descriptors are derived each frame rather than accumulated in an unbounded queue.

Two module workers produce transferable position/normal/color buffers. ChunkStream, independent of rendering, permits at most two outstanding jobs plus completed payloads combined, and at most two integrations per animation frame. Work is count-budgeted, not governed by a measured millisecond deadline. Unwanted residents unload immediately; wanted residents retain their previous tier until the replacement attaches. There is a transient maximum of 50 resource objects during attach-before-release, with 49 retained after integration. Each terrain chunk owns its geometry; terrain/marker materials and marker geometry are shared and owned by the lab.

Every request has its own abort state as well as a seed/coordinate/tier signature. Both must still be current before results enter the integration queue. A cancelled result remains invalid even if the camera leaves and returns to that same signature before completion. Unloading also discards already-completed CPU results; disposal cancels jobs and rejects later attachments. Integration replaces the prior resource for a key rather than adding duplicates.

Cancellation of a small synchronous worker task is logical: it can finish in its existing worker slot, then its stale result is discarded. The slot stays occupied until reply so rapid travel cannot accumulate a worker message queue. Seed reload and full teardown terminate the old workers. Failed request signatures are held until they leave the wanted set, preventing per-frame error retry loops; Load seed rebuilds the worker pool for an explicit retry. Partial worker startup failure terminates workers already created and releases the canvas/scene resources.

## Initial persistence path

Each chunk has one test beacon, with stable ID `beacon:x,z`. Clearing it records a logical delta and hides its render representation without changing terrain. Storage is scoped by schema v1, generator v1 and seed using `mvw:chunk-deltas:v1:g1:<seed>`. A chunk reads the current delta state when it attaches, so a pending terrain result cannot resurrect a cleared marker. Leaving/reentering, changing seeds and reloading restore the relevant state before presenting the marker.

The record stores only schemaVersion, generatorVersion, seed and cleared IDs. Validation rejects unknown fields, incompatible versions/seeds, noncanonical/out-of-world IDs, duplicates, more than 4096 IDs and stored text larger than 256 KiB. Invalid saves are preserved byte-for-byte; session changes do not overwrite them. Denied/quota-full storage produces an explicit session-only status while retaining changes in memory. It does not silently claim durability.

This is local browser storage for a test delta, not a full game save, enemy system, cloud sync or terrain destruction. Data is per browser/profile/origin (dev and preview ports differ), and selected seed/camera position are not saved. Reload begins at seed 103; load another seed to reopen its marker record. No save export/import/migration UI is included.

## Camera and limits

Focus the viewport and use WASD/arrows to move the inspection camera at 80 m/s. It uses frame delta capped at 100 ms; this is not authoritative flight simulation. Focus/window/visibility changes clear held input and timestamps. Travel buttons jump 256 m to exercise unload/cancellation; Return home targets (16,16). Camera position is bounded to ±130900 m, inside supported chunk coordinates ±4096. This is a bounded development world, not an infinite-world/precision claim.

The lab reports current chunk, residency/jobs/ready payloads, tier counts, discarded stale results, failures, GPU-resident geometry count, calls and triangles. Settled means every wanted chunk matches seed/tier and there are no pending or completed jobs. Teleports and fast travel can show loading gaps/pop-in until settled; there is no promise of an always-covered high-speed horizon. No hysteresis, velocity prefetch, disk mesh cache, asset LOD, advanced biomes, collision/aircraft integration, or reference-device FPS target is included. Those remain later measured work.
