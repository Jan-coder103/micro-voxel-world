# 0038 — World clouds, water and siege spiders

Jan requested procedural cloud spawning/despawning, better translucent clouds,
a river rework, breaking white beach foam and giant spiders on 21 November 2026.

## Atmosphere

Only the sky dome follows the camera. Clouds have deterministic 768 m world cells,
with a bounded 7×7 residency window, eight billows per occupied cell and a maximum
392 instances. Matrices rebuild only when crossing cells; billows retain their
world coordinates and noise pattern across recentering/revisits. A 1,650–2,150 m
fade hides residency changes. No timers or per-cloud objects are retained.

Clouds are soft procedural billboard impostors with noisy density/optical-depth
alpha and warm rim/dark underside shading, not opaque low-poly spheres. They use
one transparent instanced draw, no textures or render targets and no depth writes.
This is a volume appearance approximation, not a volumetric raymarcher. Overlapping
transparent billows are not individually depth-sorted. Triangle cost falls to at
most 784, but translucent overdraw and fragment noise cost more than opaque boxes;
physical-GPU performance remains unverified.

## Rivers and surf

Keep authoritative watercourse paths and saved world scopes. The home approach
apron previously flattened the river centre into a dry gap. Its northern plateau
now starts 12 m before the runway instead of 50 m, leaving the channel connected;
matching analytic collision bounds use the same extent. The runway stays flat/dry.
The shared detail/coarse material now shades deep versus near-bank water, adds
advected ripples/flow bands and wave normals, uses the actual shared sun direction,
and darkens damp coastal sand. A local derivative-based distance from the sharp
wet/dry edge, combined with authoritative sampled water depth, drives broken white breaker bands moving shoreward and dissolving
into foam. Sea-level gating keeps coastal breakers out of inland rivers/lakes.
This uses the existing geometry; no fluid solver, moving collision or extra water
pass. Water appearance follows the existing LOD silhouette and does not increase
terrain detail. Water depth is one extra float per terrain vertex (about 11% more terrain buffer
bytes), transferred with worker results and supplied by coarse terrain as well.
No extra terrain samples are required. Bank distances remain approximate.

A presentation clock advances only while unpaused with effects enabled. Pausing
or disabling effects freezes water animation. The isolated sharp-edge regression
fixture disables presentation coloring to continue measuring coverage separately;
additional coast/river captures compare actual rendered pixels across two times.

## Siege spiders

Original procedural boss anatomy extends the existing runtime primitive system:
64 m envelope, armored abdomen/thorax, eight jointed legs, knees, fangs and eyes.
Rotated leg segments share box geometry; conservative segment AABBs and chains of
hit spheres follow their geometry rather than one giant empty target sphere.
A deterministic early-world spider and procedural regional spiders coexist with
brutes and colossi. Spiders have 12,000 HP, $2,200 / 3,200 XP before bonuses, and
slow nearby roaming. Existing passive-hazard behavior, targeting, banking and death
persistence apply; no new attack mechanic is implied. The v1 wound loader accepts
the additive `mutant:spider` identity. Existing IDs/wounds remain valid; some seeded
regional brute slots now select spiders. The fixed boss mesh capacity is 4,096
parts in the existing single draw. No new source/GLB asset or external artwork.
