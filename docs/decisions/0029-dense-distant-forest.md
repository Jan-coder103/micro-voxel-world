# Dense distant tree cuboids

30 October 2026. Jan requested removal of the sparse dark tree placeholders and
dense distant trees in the nearby foliage's green, retaining simple tall cuboids.

## Change

Replaced Frontier's 32 m lattice / 4096-instance / 864 m scenery proxies. New
proxies use the exact canonical `regionTrees` 8 m lattice, seeded positions,
heights, biome density, water/slope filters, settlement reservations and airfield
exclusions. Their linear material RGB (.16, .29, .12) matches the detailed tree's
main foliage. The old hexadecimal material was interpreted as sRGB, making the
old placeholders substantially darker. Each new proxy is one tall 3.5 m cuboid;
near authored trunks/canopy caps remain unchanged.

Forest tiles are 256 m with 1024 slots each. A fixed 97-tile circular plan reaches
roughly 1.4 km, blending into the existing distance fog. Tile-level frustum culling
limits visible submissions. All tiles and clouds share the existing cube geometry;
forest tiles share one material. Maximum resident matrix capacity is 99,328 trees
(~6.36 MB per CPU/GPU matrix copy); actual counts depend on biome/reservations.
This intentionally raises the former scenery budget to deliver the requested
density. It does not raise terrain worker/chunk/population caps.

Generation is incremental: at most 16 canonical 32 m chunks per timer batch,
targeting 3 ms before yielding for 8 ms. A single chunk cannot be preempted, so
this is a cooperative budget, not a strict worst-case timing guarantee. Tiles
are retained on travel; only newly exposed tiles generate. Static bounds avoid
matrix-wide bounding-sphere scans. Dirty matrix buffers are uploaded on render;
paused rendering is invalidated at most every 200 ms while loading plus completion.
There is no perpetual forest animation/render loop. Timers and instance resources
are cancelled/released on disposal and removed tiles are disposed.

Use actual resident terrain specs to hide proxy slots for chunks with detailed
vegetation (LOD 0/1), including while workers are catching up. Restore identical
proxy positions as detailed chunks unload. This removes overlapping placeholder
cubes and avoids an arbitrary player-distance hole. Terrain heights, collision,
seeded tree placement, saves, sky/cloud appearance and legacy labs are unchanged.
Developer samples include `forestPending` alongside `distantTrees`.

## Verification

All 261 unit cases passed serially; build/typecheck/lint pass. Forest tests cover
full dense generation/caps, exact linear palette, canonical placement at 500–1100 m,
airfield exclusions, tile reuse on travel, stable idle buffers, near/detail handoff,
restoration and cancellation/idempotent disposal.

Three short browser checks passed in 15.6 s, one worker: new one-frame forest
capture, player pause/settings/LOD/cleanup and unavailable WebGL. The fixture uses
the actual scenery, material and terrain underlay, waits for background generation,
then renders once. It verifies >4096 total proxies, >2000 trees at 500–1200 m,
97 resident tiles and fewer than 60 draw calls in the isolated view. Inspected
`test-results/dense-distant-forest.png`: dense green cuboids extend across the
landscape into the horizon, with water and settlement clearings preserved.

No heavy flight/load/browser suite under the retained heat restriction. Increased
vegetation has a real GPU/memory cost despite batching/culling; physical-device FPS,
long travel and Jan's visual acceptance remain open. No hardware FPS claim.
