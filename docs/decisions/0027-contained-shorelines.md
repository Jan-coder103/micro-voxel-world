# Contained river/lake shores and consistent airfield water blending

30 October 2026. Jan reported elevated blue water walls, with a screenshot of a
river surface hanging several metres above its neighboring bank.

## Cause

The regional field assigned a river water level inside a hard 42 m distance and
a lake level inside a hard ellipse. Terrain shaping could only lower land, even
where the water level exceeded the surrounding plains. At seed 103, x=0, river
water was at 18.925 m while the land immediately outside the width cutoff was
11.5 m. The combined surface therefore dropped more than seven metres at that
boundary, and triangulation rendered the blue wall. Near the airfield, terrain
was flattened/blended toward the strip but water kept its original elevation,
introducing another discontinuity at the cleared-core boundary.

## Correction

River and lake profiles now shape both their beds and containing banks. The
channel profile is fully applied through 50 m, then blends into surrounding land
through 140 m. The lake profile is fully applied through normalized radius 1.3,
then blends out through 1.8. The actual shore crosses the water plane before the
old water eligibility cutoffs. Bank relief tapers at the river mouth. Overlapping
profiles merge continuously with the lower channel retaining influence, so lake
entry/exit does not become a dam. Existing downstream river levels and the lake's
level reach remain; legacy generator v1 is untouched.

Airfield land and water now use the same flattening weights; water depth tends
to zero at the cleared core instead of leaving an elevated water shelf. Rendering,
coarse coverage and authoritative collision all consume these same fields.

Collision bounds were updated for the bank profiles, which can raise terrain.
Separate conservative land/water bounds allow correct airfield blending. The
hydrology blend is monotone in height inputs and piecewise affine in its two
weights; evaluate interval corners and equal-weight intersections for its upper
bound. The previous detailed collision hierarchy and its work-budget regressions
remain enabled. No new rendering objects, materials, workers or dependency.

This is a correction to the regional-v2 geography. Shore-adjacent procedural
content can regenerate with the corrected terrain; save keys/bytes are not reset
or rewritten by this change. Legacy-world terrain and persistence stay separate.

## Verification

All 259 unit cases passed in one serial run. The final strengthened three-case
shoreline subset passed again. Tests cover four seeds, both river banks, lake
perimeters, actual wet/dry transitions, airfield core/blend edges, conservative
collision ceilings and nonvertical water triangles in generated chunks. Existing
low-flight exhaustive-reference/work-budget tests, landing, structures and
population tests pass. Build, typecheck and lint pass.

Three short mostly paused browser checks passed in 12.1 seconds, one worker:
player rendering/settings/cleanup, unavailable WebGL and new idle river/lake
captures. Inspected `test-results/shoreline-river.png` and `shoreline-lake.png`:
water meets the banks without the raised blue wall. No heavy flight/load suite
under the retained heat restriction. A bounded CPU sweep diagnostic after the
field changes retained at most two exact ground calls in its sampled scenarios;
the 5 m runway pass used zero calls (~0.085 ms). Individual CPU timings are not
hardware FPS. Human visual/device acceptance remains open.
