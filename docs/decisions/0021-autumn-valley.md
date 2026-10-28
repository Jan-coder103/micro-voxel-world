# Clearpass autumn valley presentation

28 October 2026. Jan requested a visual improvement using the supplied atmospheric
voxel landscapes as direction. This extends Phase 19 presentation, not Phase 20
release or completion of the regional world.

The root game and `/play/` now use an original warm autumn palette, analytic sky
and sun halo, stepped cloud banks, terraced distant ridges, and seeded woodland.
Sunlight uses one 1024² PCF shadow map covering a 210 m square around the aircraft;
hemisphere lighting approximates sky/ground bounce. ACES exposure is 0.95. No bloom,
screen-space AO, depth of field, new dependencies or imported reference imagery.
The shadow map is reused while paused, and can be disabled independently in Settings.

Settings expose Automatic / High / Low scenery. Automatic chooses Low for an
explicitly identified software renderer (SwiftShader, llvmpipe, softpipe), and High
otherwise. Low draws a deterministic 55% woodland subset, selects coarse foliage
beyond 100 m and disables shadows initially. Both presets keep the same terrain,
depots, sky, gameplay and saves. The shadow checkbox can override its preset.
Reports include the actual quality, software-renderer flag and shadow-map size;
software defaults do not constitute validation of High on physical hardware.
Once a ready/paused camera settles, the main scene stops submitting GL frames.
Controls, resizing and terrain attachments invalidate the frame; simulation and
DOM diagnostics keep their existing schedule. Moving flight always renders.

The seven owned scenic geometries are sky, distant terrain, cloud box and four tree
meshes. Woodland uses 96 m cullable instance patches sharing the tree geometry and
materials. The original 0.1 m editable tree assets derive 0.4 m foliage LODs near the camera
(312 broadleaf / 656 pine triangles, versus 5240 / 7628 originals), and 1 m
foliage at distances beyond 220 m (72 / 130 triangles). Tree shadows stop at 180 m.
Autumn leaf colors are a runtime palette; authored references remain intact.
Trees occupy a bounded ~490 m radius outside the encounter square and home
approach. Their 6/8 m heights fit below the existing conservative flight envelope.
There are no new tree collisions. Hills and clouds are camera-relative background
scenery, not new explorable terrain or a replacement for regional-v2 generation.

The existing seeded terrain/collision heights and terrain job budgets stay intact.
World-space ground shading adds grass grain, field variation, painted service lanes,
depot pads and contact darkening independently of terrain LOD. Coarse fallback
coverage extends to 1024 m in each direction and samples only broad grass colors
to avoid aliasing narrow roads into a dark plain.

`clearpass-depot.voxel.json` is original editable source, generated reproducibly
by `tools/art/create-depot.ts`. It uses 18,448 shell cells in a 40×30×120 grid,
exactly matching the former 4×3×12 m obstacle. Doors, windows, roof ribs and cladding
remain inside that envelope. Its ignored GLB derives through the standard exporter.
Combat uses four instance batches as before, with detailed zombie silhouettes in
all visual tiers; simulation LOD and saved health are unchanged. Isolated labs keep
their diagnostic proxies. Eight fixed scenic/depot geometries replace the original
obstacle box; Clearpass's tested geometry budget is now at most 66, independent of
travel, seed reloads or kills. Worker/resident/effect/voice limits are unchanged.

The root's HUD now overlays the full scene, with compact instruments, a magnetic
heading readout and a quieter pause menu. The chase camera looks a little farther
ahead to expose more sky and landscape; aircraft controls and aiming are unchanged.

Validation and measured results belong in tracker.md and handoff.md. Pixel 10a /
720p / 60 FPS, human visual/comfort acceptance, and a full regional landscape in
the mission game remain open. Software-rendered automated checks cannot establish
physical-GPU performance.

## Coverage and distant-city correction

Jan identified bare strips around the city, holes below the mountain base and
buildings appearing too close to the aircraft. The original presentation tied
depots to the 49-cell horde simulation ring; on the initial approach only 28 of
81 existing blockers were rendered. Detailed combat now instances all 81 static
depots once, independently of simulation residency. The far side is visible from
about 330 m on approach. Buildings, mission/base coordinates, colliders and saves
are unchanged; no distant populations are instantiated for presentation.

City/forest coverage now extends 1536 m per axis around its snapped anchor, with
16 m samples within 768 m and 96 m outer samples (12,769 vertices / 25,088
triangles, one reused mesh). City depots sit on sampled heights, with only a
0.12 m coverage offset. World-space roads/pads also render on this overview; the
nearby 49 streamed terrain chunks retain their finer geometry and grass/shadows.
The overview uses its own scene-owned material, broad vertex grass colors and no
shadow reception or subpixel grass hash. Both material programs share seed/palette
and have distinct shader cache keys. Resource ownership and the geometry cap are
unchanged. This avoids spending detailed ground-shader work across the expanded
coverage. The wooded verge is six metres outside the city after placement jitter,
retaining clear encounters and the home approach.

The mountain annulus now seals all exposed inner/outer edges down to −64 m. This
overlaps continuous ground even as the coverage anchor snaps while the backdrop
tracks the aircraft. Tests cast rays around the full mountain base for multiple
seeds/positions, verify coverage overlap and all depot heights across anchor
changes, and check constant 81-depot visibility without expanding simulation or
population records. Numerical Float32 instance heights use a small tolerance.

The expanded city adds fixed visual work. Low scenery now draws a deterministic
40% tree subset and selects coarse foliage beyond 80 m, reserving its budget for
the longer urban view. High stays at full density / 220 m detail distance. An
end-to-end SwiftShader sortie exceeded the unchanged 90-second test budget with
the previous Low settings; final checks cover the lighter Low preset explicitly.
