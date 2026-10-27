# Phase 7 — Static outdoor rendering baseline

## Scene and scale

The game entry point assembles a fixed 64 × 64 m rural scene: two utility buildings, a barn, 36 field trees, six barriers, six streetlights, a road and split farm track. Existing source JSON remains authoritative and unchanged. Five optimized source meshes are derived once per scene and reused through InstancedMesh; lane markings form a sixth instance batch. Asset voxels retain 0.1 m dimensions, base-centred pivots and original matte vertex colors. No per-voxel runtime objects are created.

Terrain is an exposed heightfield surface, with 0.5 m horizontal sampling and heights snapped to the 0.1 m lattice. A surface tile covers five authoring voxels horizontally; it is not a change to asset voxel size. Shared edge coordinates and exposed vertical walls form voxel-style terraces without allocating a dense volume. The central village area is flat; fixed edge hills provide silhouette. The undersurface is intentionally open and outside the supported camera view. Regional generation, seeds, streaming and LOD belong to later phases.

## Lighting choices

High quality uses a warm directional light, cool hemisphere fill, 2048² PCF shadow map and device pixel ratio capped at 1.5. Low quality disables shadows and caps pixel ratio at 1. Switching presets marks scene materials for shader refresh so a cached High shader cannot keep sampling stale shadows in Low. Both use the same geometry, materials, camera and colors. Distance fog is independently switchable (55–140 m). The overview camera is fixed at (48,38,52), looking at the origin. This keeps quality comparisons reproducible.

This establishes directional shadows and ambient fill as the baseline. No screen-space AO or global-illumination implementation is claimed: ambient fill plus darker terrain sides gives readable forms with no extra screen-space passes, but cannot reproduce concave occlusion. SSAO would require additional depth/normal targets and passes and needs a later measured visual comparison before adoption. It is deferred. The existing matte source format is unchanged; no AO values are baked into sources or merge keys.

## Collision and ownership

One conservative world AABB is derived per placed source from its declared metre envelope, placement and quarter-turn rotation. The collider query is independent of Three.js. The test cube injects that query into the fixed-step simulation, resolves X then Z for wall sliding, and rests on the road/terrain height. Bounds can be displayed for inspection. This is a bounded low-speed test, not continuous collision detection, aircraft physics, detailed foliage collision or a traversable interior model. Tree envelopes intentionally overestimate foliage and empty space. Road tops are ground surfaces, not blocking AABBs.

Scene disposal releases terrain, shared source geometry/materials exactly once, instance GPU buffers, debug bounds, road/marking/cube resources and directional shadow targets. The browser adapter retains ownership of renderer, animation, pooled pulse resources and listeners. Reset clears simulation and keeps the static scene. Optional bounds allocate/upload their already-created helper geometries on first display, then reuse them on subsequent toggles.

## Measurement contract

The UI reports renderer calls/triangles (including shadow work), resident geometry count, scene build CPU time, and a rolling median of up to 120 CPU render-submission durations. It refreshes at most four times per second. These durations time the JavaScript renderer call; they are **not GPU frame times or FPS**. Changing quality clears the timing window. Browser automation records a sample after at least 30 frames for each preset at the same viewport, without collision overlays or active effects, along with screenshots and a JSON report. See docs/benchmarks/phase-7-outdoor.md for actual results and environment limitations.

Sources are currently bundled into the game and meshed synchronously on entry. Scene-build time and bundle size make that cost visible. This is acceptable for a fixed scene baseline; async derivatives/streaming should be evaluated with Phase 8 rather than adding a second cache pipeline here. No device performance target is asserted.
