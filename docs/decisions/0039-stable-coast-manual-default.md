# 0039 — Stable coast and manual player default

Jan reported the coast repeatedly relocating on approach and requested auto-level
be off at startup, with an opt-in setting (21 November 2026).

## Reproduction and correction

The fallback mesh sampled a 128 m coarse lattice but snapped its moving origin in
64 m increments. At seed 103 / z=-700, its inferred shoreline alternated between
x=-704 and x=-768 on successive updates, then became x=-728 in the 16 m inner grid.
Thresholding interpolated per-vertex wet colors made a crisp but moving coast;
incoming detailed chunks could choose another boundary again. Foam and wet-sand
placement inherited the changing triangle coverage/depth as well.

Fallback origins now move by whole coarse lattice cells (at least 64 m). More
importantly, coastal coverage is evaluated at each fragment's absolute world
position using the generator's seeded natural basin height. Its GLSL mirror
retains unsigned hash arithmetic, noise salts and coast/river/lake profiles; a
browser numerical regression compares it against the authoritative CPU field for
four seeds, including the maximum unsigned seed. Terrain generation, collision,
save keys, LOD residency and simulation are unchanged.

Canonical coastal coverage replaces the triangle wet mask near sea level. It also
supplies sand color, depth and static foam/damp-sand placement, with only breaker
time intentionally animated. Inland water keeps the existing presentation. Deep
ocean skips the field evaluation; inland beyond the coastal band skips it too.
No new draw, texture, render target, generated terrain buffers or async tasks.
Coastal fragments do additional hash/noise work; hardware performance remains open.
The field is a rendering mirror, so future generator profile changes must keep the
GLSL and comparison checks in sync. Mesh lighting/detail can still change with LOD;
this correction fixes the wet/dry boundary rather than freezing terrain detail.

## Default assistance

Only the player Frontier model starts with `flight.assisted=false`; historical
Flight/lab defaults remain intact. The settings selector starts on Direct, clearly
labeled auto-level off. Assisted explicitly enables auto-level and automatic trim.
Rearm/crash recovery preserves the user's session choice. No saved preference or
physics tuning is introduced. README and browser toggling checks cover the default.
