# Fitted aircraft contact and orbit direction — 28 October 2026

Jan reported reversed orbit input and aircraft crashes before visible contact.
Mouse X and Y orbit deltas now use the opposite sign. C remains a toggle: unlock
on one press, lock/reset on the next. Tests assert direction on both axes.

## Findings

The old main-game terrain sampler added 6 m before Flight added another 3 m for
fixed wing or 8 m for helicopter: centre-based contacts at 9/14 m AGL. All depot
bounds also expanded by 9 m on every axis, regardless of aircraft attitude. Labs
used 3/8 m terrain clearances and 6/8 m building padding. These were deliberately
conservative earlier prototypes, but could leave several metres of visible air
between a level aircraft and the ground/roof. The model was not being tested.

## Replacement

- The main fixed-wing hull is 204 disjoint solid boxes, exactly covering the
  original source's 30,262 occupied voxels. Palette does not affect collision.
  Bounds apply the same y=-2.4 pivot as the rendered aircraft. A deterministic
  offline tool generates src/flight/attack-aircraft-hull.ts; tests check both the
  generated result and complete, nonoverlapping occupancy against the source.
  Regenerate with `node tools/assets/collision-hull.ts > src/flight/attack-aircraft-hull.ts`.
- The lab plane uses its five visible component boxes. Helicopter body, skids,
  tail and mast have matching boxes. The fast-spinning rotor uses a thin disk
  represented by quarter-metre strips at y=1.9, with <0.25 m radial overcoverage,
  instead of a large all-direction buffer. Cosmetic weapon barrels are excluded.
- Every simulation step sweeps translation AND heading/pitch/bank through the
  hull. Maximum point travel between samples is bounded to 0.1 m using translation
  plus radius × angular change. The first contact interval is bisected eight
  times. Crashes retain the contact pose, including attitude; rendering shows
  that pose rather than an interpolated pre-impact position.
- Building contact uses the full 15-axis oriented-box/AABB separating-axis test,
  which catches a post inside a wing face even when the centre/corners miss it.
  Main depots are queried by hull footprint independently of horde/chunk residency,
  including neighbouring chunks. Regional buildings retain their authoritative
  building/foundation bounds, with aircraft padding removed. Those bounds still
  approximate decorative recesses/curved building kits rather than mesh triangles.
- Terrain/water contact samples hull faces on a <=0.5 m lattice against the
  authoritative sampler. This is bounded sampled contact, not triangle-perfect
  terrain or continuous analytic rigid-body physics. The 0.1 m sweep avoids
  tunnelling through ordinary terrain/buildings at supported speeds; terrain
  features narrower than the spatial lattice remain a limitation.
- Safe broad-phase ceilings skip work only when guaranteed by the generator:
  legacy ground <=11.5 m and depots <=14.5 m; regional ground/water <=190 m.
  The regional upper bound follows from 60-7+9+2.5+0.4+125=189.9 m, with valley/lake
  shaping only lowering terrain and water <=55 m. This metadata does not alter
  terrain generation, seed scopes, resident limits or saves.

The legacy point-ray callback remains available for callers that explicitly
supply one. Player and lab aircraft use fitted hull queries. Weapons retain their
original ray/blocker rules; damage, persistence and mission rewards are unchanged.
The AGL readout measures the aircraft centre, not the lowest wing/skid. Crashes
still fail a sortie; landing is not introduced.

## Verification

Unit coverage checks exact authored occupancy/pivot, renderer rotation agreement,
close roof passes, wing/post overlap, forward/reverse/zero-length sweeps,
rotation-only wing/terrain and tail/building contact, terrain ridges, actual low
clearance, neighbour-cell/unloaded depot queries, water contact and world limits.
Browser coverage descends below the old clearance, pauses safely, then contacts
visible skids in combat and regional flight. Existing orbit checks assert the
reversed axes, C toggle/repeat/reset and focus behavior. See tracker/handoff for
final command results and outstanding earlier timing/hardware checks.

A preliminary CPU-only probe of 100 warmed fixed-wing 1 m sweeps at 5 m AGL
measured p50 1.26 ms / p95 1.42 ms on this host. It excludes rendering/GPU work and
is not physical-device FPS evidence. Normal high passes use the safe broad phase.
