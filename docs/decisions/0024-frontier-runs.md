# 0024 — Frontier player runs

Accepted 30 October 2026 at Jan's request. Root `/` now loads Frontier; `/play/`
retains the previous Clearpass/Relief mission prototype, and developer tools remain
available through settings. This replaces the player's airborne return-ring
completion with manual runway operations. No push, deployment or release claim.

## Run rules

The fixed-wing aircraft starts stationary at the flattened home airfield. E raises
throttle, Q lowers it and applies wheel brakes; S rotates above 28 m/s. Airborne
speed follows throttle and low speed adds sink. Ground steering is deliberately
limited. The existing fitted source hull handles airborne collision. Only a
terrain contact inside the runway with ten metres of edge clearance, heading
within about 9 degrees of either runway direction, bank under 0.10 radians,
pitch −0.12 to +0.18 radians, descent <=4 m/s and speed <=48 m/s becomes a touchdown.
Other terrain, water, tree and structure contacts crash. Tree contact uses the
same three worker vegetation cuboids, cached in at most 64 chunks independently
of rendering; terrain <=190 m, buildings <=208.1 m and trees <=200.8 m give a
conservative 210 m obstacle broad-phase ceiling. A grounded aircraft is supported
by the known flat strip; leaving the strip crashes. Base building collision matches
its visible envelopes. This is an arcade landing model, not wheel/aero simulation.

After at least one airborne tick, one second stopped below 0.5 m/s and below 5%
throttle banks rewards exactly once and returns ready to the hangar. No quotas,
sector flyover, automated landing or return teleport can bank a run. Crashes hold
the wreck camera for ten foreground seconds, then rearm at home. Pause/focus loss
freezes recovery; resuming clears elapsed time. Reload abandons pending rewards.
Casualties persist independently, including casualties from a lost run.

Kills earn $10 and 15 XP. Five levels each: engine +12% acceleration, weapons +20%
damage, bounty +$2 per kill per level. Next level costs $100 × (level+1). Purchasing
requires the hangar state. XP displays pilot level 1 + floor(XP/300). Pilot money,
XP and purchased levels save together under `mvw:frontier:pilot:v1`. Invalid data
is never overwritten. Roaming population records have a distinct `frontier:`
prefix and retain the 4096-wounded-encounter / 2 MiB persistence budget. Storage
failures preserve existing bytes, report session-only state and keep playing.
Legacy schemas, deterministic coordinates and keys are retained.

## Landscape and presentation

Reuse generator v2's continuous terrain, biomes/water and procedural settlements;
flatten and reserve the home airfield consistently in worker geometry, collision,
coarse coverage and enemy/structure/tree placement. The reservation includes the
terrain blend shoulders. There is no decorative mountain annulus in Frontier.

Stream four 32 m detail tiers with identical 1 m perimeter samples, <=49 residents,
<=two outstanding jobs/results, <=two attachments/frame and a directional 48 m
lookahead. The player plan does not stop at the old 4096-chunk boundary. A reused
128 m coarse grid with 16 m inner samples covers a 4096 m-wide horizon beneath
detail. Shared authored settlement kits within ~360 m become box proxies out to
~1024 m (512 detailed / 2048 proxy caps); terrain fog reaches 1650 m. A separate 4096-instance distant-tree batch and 72
clouds retain the sky/woodland presentation without a false mountain backdrop. Hordes retain
near/medium/far tiers, 49 residents and a 64-descriptor cache; roaming encounters
continue beyond the lab's ±4096 m population square. GPU transforms are rebased
in 4096 m steps without changing authoritative/save coordinates. Numeric safety
bounds remain approximately ±900 million metres, rather than a mathematical
infinite-coordinate claim. Generator v2 still has its original broad coastal
layout; it is not a new multi-continent/hydrology generator.

Paused scenes use demand frames; arriving worker results and controls wake them.
Crash fire/smoke use two reused meshes and obey the effects switch. Reduced-motion
preferences default effects off. Audio shares the eight-voice cap and starts muted.
Rendering quality, weapon and camera settings are session-only. Helicopters and
legacy mission equipment remain in labs; Frontier's runway loop uses fixed wing.

## Verification

Meaningful CPU tests cover takeoff, both landing directions, unsafe touchdowns,
one-time stop banking, upgrades/persistence, crash timing/pause/loss, world travel,
base geometry and save isolation/corruption. Browser player-entry smoke coverage
checks the stationary base, settings, pause, LOD residency, desktop/narrow layout,
resource cleanup and unavailable WebGL. Consult handoff.md for actual run results.
Do not run heavy browser or load suites without Jan's agreement: the previous
session recorded CPU heat. Hardware FPS, flight/landing feel, balance, longer
travel and human visual/audio acceptance remain open. Existing Pixel 10a and
legacy sortie-budget gates are unchanged.
