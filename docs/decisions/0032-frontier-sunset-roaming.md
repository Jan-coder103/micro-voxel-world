# Frontier roaming giants and sunset countryside

Requested by Jan on 30 October 2026. Implemented; awaiting user visual and flight verification.

Giants wander passively at 0.6 m/s (brutes) and 0.9 m/s (colossi), only within
850 m of the player in three dimensions. Simulation updates at 5 Hz, checks dry,
gently sloping footprints and the airbase exclusion, and limits roaming to 90 m
from spawn. Render matrices, collision boxes, and weapon hit spheres follow the
same position. Pausing freezes movement. Damage/death persistence is unchanged;
roaming positions are session state and can reset on cache eviction/reload.

Cities and rural towns use seeded irregular block widths, interrupted peripheral
streets, plot offsets, and radial occupancy falloff. Dense office cores transition
to houses on the outskirts. Other functional district grids remain. Farm blocks
with at least two agricultural parcels attempt one or two farmhouses, with dry,
flat foundations outside planted rectangles, avoiding towns and their roads.
Unsuitable sites are skipped. Farm descriptors are cached with a 128-block limit;
the same buildings serve rendering, collision, vegetation reservations and weapons.
Existing worlds regenerate settlements under the same seed; save keys stay intact.

A westward sun about 22 degrees above the horizon drives warm light, long shadows,
and the sky. The sun-facing horizon is orange/red with purple higher haze; the
opposite horizon is dark blue. One player-following 1024-square PCF shadow map
covers a 480 m square. Terrain, roads, buildings, giants, aircraft and distant
forest batches participate. No additional reflection camera or water geometry.
Ocean and river pixels use static, world-anchored, warped wave normals, lower
roughness, a Fresnel sky tint and a directional sunset highlight. Dry terrain and
collision/water heights stay unchanged; the waves are a presentation surface.

Verification is recorded in tracker.md and handoff.md. Static browser captures
are visual checks, not a physical-GPU performance or sustained-flight claim.
