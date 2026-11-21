# 0040 — Homing combat, tactical map and airfield presentation

Accepted 21 November 2026 for Jan's requested expanded sortie slice.

- Weapon 4: continuous 60-successful-tick acquisition inside an 18° forward cone,
  480 m range, 180-tick reload, at most eight authoritative missiles. Launch stores
  its origin; the projectile interpolates toward the moving target with a sine
  loft, checks each traveled segment against terrain/structures/targets, and deals
  6,000 direct damage plus 20% blast damage (24 m radius). This is arcade guidance,
  not a physical rocket model. Lost/switched/dead locks reset; pause stops all ticks.
- M pauses flight and presents a CPU-painted 48×48 top-down terrain grid. Terrain
  samples are cached until pan/zoom; no secondary renderer, chunk residents or
  encounter generation. The procedural world spans ±900 million metres, so an
  entire finite detailed map is inappropriate. Bounded sampling with pan/zoom up
  to the full coordinate range is the selected whole-world map. Markers show
  aircraft, known bases and resident/nearby hostiles, rather than claiming complete
  hostile intelligence. Arrow/WASD pan; +/− zoom; center and close controls.
- Exhaust is two small shared cone meshes, switching to flame at >=90% throttle;
  lower positive throttle has a faint gas plume. CSS peripheral wind streaks fade
  in above 65 m/s, reach their cap at 145 m/s, and obey pause/ground/effects.
- Humanoid mutants add layered musculature, exposed ribs/spine/teeth/toes, wounds
  and skin relief. Detailed parts are visual within 1 km; distant silhouettes and
  original coarse collision/hit shapes remain. Shared 4,096-instance pool retains
  its ceiling. Nearby giants slowly pursue aircraft within a bounded 90 m roaming
  radius. A close strike takes one second, can be evaded by leaving reach, then
  cools down four seconds. Visible arms and boss marker telegraph the strike.
- Clouds retain one instanced billboard draw: 11×11 stable world cells, at most
  968 billows / 1,936 triangles, fading from 2.8–3.9 km. Brighter tops, shaded bases
  and density noise approximate lit cloud volumes. No volumetric render pass.
  Increased transparent overdraw is a cost, not a measured FPS improvement.
- Hangar controls flank an unobscured aircraft on its current base runway. The
  camera automatically orbits; reduced-motion preference holds it still. Four
  explicitly locked aircraft slots reserve future roster space, without fake
  aircraft purchases. In-flight pause retains the actual aircraft location.
- Crash camera orbits the wreck; skip returns immediately. Two pooled procedural
  helicopters approach and settle on terrain over eight seconds, with rotating
  main/tail rotors. Rescue is cosmetic and has no AI/flight collision authority;
  over water, landing represents surface recovery rather than naval rescue physics.
- Modular base adds walls, watchtowers, barracks, tents, hangars, crates, runway
  lights and tank guards. One instanced draw; shared part descriptions supply
  solid collision. Tanks are static guards. Runway/terrain/save scopes stay intact.
- Crashes bank base run earnings exactly once at the transition. Safe landing and
  full stop bank 2× cash and XP, after existing progression bonuses. Skipping or
  waiting for rescue resets the sortie without paying again. Existing pilot v2
  records and wound keys require no migration.

Ownership: new presentation adapters release geometry/materials/instances; UI
listeners and map canvas release with the player shell. Physical GPU FPS, sustained
flight, human visual/handling and balance acceptance remain open. Retain the
previous heat restriction; short static/UI checks are not hardware acceptance.
