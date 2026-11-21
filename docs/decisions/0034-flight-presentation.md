# 0034 — Energy flight, distant tree morph and cockpit

21 November 2026. Jan requested a flight overhaul and visual polish as one coherent
slice, with a plan followed by implementation and regression checks.

Fixed-wing flight now separates pitch attitude from velocity inclination. Thrust,
quadratic drag, climb gravity and load drag change airspeed. Low speed and excessive
angle of attack reduce lift response and drop the nose; bank/pull raises stall
speed. Pitch is continuous through loops. Low-speed elevator authority is reduced
so runway rotation remains safe. This is an approachable point-mass model, not a
certified aerodynamic simulator: no wind, sideslip or six-axis rigid-body solver.
The safety ceiling is 2400 m, replacing the 250 m loop-blocking shelf. Helicopter
handling is retained. Retired headless Sortie explicitly opts into historical
handling for its reproducible combat/campaign benchmarks.

Distant forest retains canonical positions, async generation, 97 tiles, original
instance capacity and shared material. Three cuboids per instance reconstruct
trunk/lower/upper crown through 420 m and morph positions/colors continuously to
the distant cuboid through 700 m. Detailed trees no longer depend on near terrain
residency. Resident worker trees still replace their proxies; near forms match
silhouettes/colors (trunk ground inset differs by 0.2 m). Cost: three times the
forest vertex work, same draw count and instance capacity, no alpha overdraw.

V toggles cockpit/chase. The procedural cockpit presentation module is dynamically
imported, allocates only while in FPV, and releases geometries/materials on exit.
It includes canopy framing, dashboard, six animated dial needles with tick marks,
side consoles, stick and throttle. It is scene presentation, not a new editable
voxel-source asset. No save format change. FPV inherits pitch/bank through loops.

High loads drive bounded deterministic rumble and two additive wing-vapor sheets.
Facing the sun drives a warm radial/ray screen veil; one terrain horizon sample
suppresses it behind nearby terrain. This is inexpensive stylized glare, not
volumetric shadow-marched god rays; buildings/clouds do not occlude the veil.
Existing Combat effects disables vapor, rumble and sun glare. Pausing freezes
rumble phase. No new dependencies, textures or offscreen render targets.

Acceptance: energy climb/dive, stall/recovery, full loop, fixed-step determinism,
runway/carrier regression, resource disposal and shader morph checks. Browser
coverage checks FPV lifecycle and shader compilation. Physical-GPU timing,
sustained travel, human flight balance and visual acceptance remain open under
the retained heat restriction.
