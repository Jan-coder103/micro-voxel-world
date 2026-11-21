# 0044 — Reduce shadow invalidation, distant tree geometry and shader work

Jan requested the four improvements proposed from the 29.2 FPS profiler image.
That image records 10.15 ms mean CPU callbacks and 5.98 ms render submission,
including 2.15 ms shadow passes. Its 46 frames and cropped GPU/buffer rows cannot
attribute the approximately 34.2 ms frame interval to GPU execution alone.

## Shadow region

Update the sun's shadow frustum before scanning. Use conservative world-space
geometry/instance spheres to exclude static casters outside that region from
stamp tracking and temporary cast-flag changes. Moving, streaming or changing
outside objects no longer rebuild static depth. Previously tracked objects leaving
invalidate the old depth; entering objects invalidate it too. Light anchors and
rebases still invalidate the whole cache. Retain visible scene traversal and
transform/buffer stamps to detect changes reliably: this is not an event-only
cache, and arbitrary geometry edits still require valid Three bounding spheres.
The existing combined depth copy, dynamic casters and driver fallback remain.

## Distant trees

Share a second tree geometry containing one box (12 triangles rather than 36).
Select it only when the camera distance to a tile's conservative sphere exceeds
700 m for the entire tile. Mixed/near tiles retain the existing morph. Restore
detail immediately on approach; no hysteresis can retain simplified geometry in
the transition. Tile spheres are transformed through matrixWorld for rebasing.
Tiles intersecting the sun shadow frustum keep detailed geometry, preserving the
previous depth silhouette (the depth shader does not use the surface morph).
No extra instance buffers or draw calls; dispose both shared geometries.

## Cloud noise

Bake a periodic 64³ lattice into one R8 Data3DTexture per scenery view (256 KiB,
no mipmaps). Preserve smoothstep interpolation using trilinear texture filtering.
Three texture samples replace the three octaves of eight lattice hash evaluations.
The volume is generated once, repeats with a 64-cell period and is disposed with
the clouds. Density, bank positions, culling, blending order, shading, alpha and
range stay the same. Quantization and periodic noise change fine detail slightly.
`createFrontierClouds(seed,{textureNoise:false})` retains the procedural reference.
Texture bandwidth versus arithmetic benefit requires measurement on the device.

## Matrix ownership

Frontier sets scene.matrixWorldAutoUpdate=false and explicitly updates the scene
once before forest selection/cloud culling/rendering. Camera and sun preparation
remain explicit. Three no longer repeats the scene traversal during render.
Streamed terrain roots and meshes and fixed forest-tile local transforms disable
matrixAutoUpdate after initial updateMatrix. World matrices still inherit moving
parents/rebases; aircraft and other moving objects retain automatic local updates.

## Verification

Rendered tests compare procedural/texture clouds across three headings, morphed
and single-box trees, explicit/automatic matrix updates, and cached/ordinary
shadows through dynamic/static movement, visibility, add/remove, anchor/rebase,
and out-of-region streaming followed by entry. Unit coverage exercises resource
disposal, conservative tree selection/restore/rebase, and cache invalidation.
Short software-WebGL checks establish correctness, not hardware speed or 60 FPS.
Retained heat restrictions preclude sustained physical-GPU benchmarking here.

Final verification: build/typecheck, lint, asset validation and whitespace pass;
352 unit tests pass in the final serial run. Five focused browser checks pass,
with final shadow refinement rechecked separately. Retained comparison metrics:
`docs/performance/2026-11-21-render-followups.json`. Far trees reduce 36 triangles
to 12 with zero channel differences; manual matrices also have zero differences.
Cloud mean channel differences are 0.13–0.22 / 255 across three headings (local
maxima 43–100). All 18 terrain/culling/shadow comparisons have zero differences.
Full browser suite and physical-GPU FPS acceptance remain unclaimed.
