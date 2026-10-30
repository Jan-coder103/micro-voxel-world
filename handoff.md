# Handoff — 30 October 2026

## 30 October 2026 — Roaming giants and sunset countryside

Implemented Jan's requested giant movement, organic city/rural placement,
field-side farmhouses, sunset lighting/shadows, directional warm/cool atmosphere,
and static reflective ocean/river waves. See docs/decisions/0032-frontier-sunset-roaming.md.
Giant movement is nearby-only, passive and paused with simulation; hit spheres and
solid bodies follow. Town outskirts thin into houses. Farm groups attempt 1–2
houses per 2–4 parcels and skip unsuitable footprints. Same terrain/water collision
heights and wound/progression save keys; procedural structures may regenerate.

Validation: all 274 unit tests (38 files) pass in the final serial run (68.65 s).
Types, production build, lint and diff whitespace checks pass. Three final browser
checks pass (36.2 s): countryside/ocean/boss static views, paused runway/narrow
player smoke, and unavailable WebGL. Inspected the runway, fields and ocean
captures; final water glints were softened after the initial visual pass. Initial
sandbox CLI/server restrictions passed with approved subprocess access.
Local commit follows; consult git log. No sustained flight or physical-GPU
performance claim; human visual/balance acceptance remains open. User server left
alone; Playwright owns its short-lived preview. No push/deployment.

# Handoff — 30 October 2026

## Latest: Frontier countryside, ocean bases, mutants and expanded hangar

Jan requested the staged expansion in docs/frontier-expansion-plan.md. Features
are implemented end to end; see decision 0031 and README for gameplay and costs.
Fields form connected triangular/trapezoid/clipped-corner parcels, with smaller
flower fields. A 25-tile road view presents streets well ahead of near terrain,
including rural dirt roads and farm access lanes; no duplicate Frontier worker roads.

New NavalWorld supplies sparse groups of 5–8 battleships plus a carrier. One fleet
southwest of home guarantees Carrier Resolute. Procedural fleets check ship
footprints against ocean. Shared original block descriptions supply visuals and
solid hulls/islands. Spatial runway queries allow the same manual landing, full
stop/banking, hangar, takeoff and crash recovery loop at every carrier and home.
The hangar destination selector changes navigation only. Reload starts at home;
session recovery returns to the latest landed base.

New Mutants population adds passive 24 m brutes (3500 HP / $600 / 900 XP) and 125 m
colossi (24000 HP / $4000 / 6000 XP). Wounds/deaths persist separately; body hit
spheres and skin-distance explosions make all weapons useful. Living bodies are
solid collision hazards; there are no enemy attacks. Larger rewards remain
unbanked until stopping at any base. A boss kill→carrier landing→bank→spend skill
point→reload regression exercises the complete new loop.

New progression.ts migrates valid v1 pilot money/XP/three upgrades into a separate
v2 save; original bytes remain untouched. Added 18 prerequisite skills (54 ranks),
one skill point per 300 lifetime banked XP, and 18 permanent functional purchases
with four exclusive equipment slots. Landed hangars permit training, purchase,
equip and unequip. Menu updates are revision-driven. Existing three cash upgrade
tracks remain. All new resources are scene-owned, cancel timers on teardown and
preserve the borrowed cube geometry. Ship/mutant instance positions are rebased.

Verification: all 275 unit checks pass across 37 files in the final serial run
(66.9 s); final types/production build/lint pass. Seven focused browser checks passed
(58.5 s): actual landscape/fleet/boss captures, desktop/narrow skill/shop navigation
and save reload, crop GPU pixel comparison, distant forest, sharp shoreline,
paused root smoke and unavailable WebGL. Inspected the final scene and hangar
screenshots; copies in /tmp/mvw-frontier-expansion/. These are static/mostly paused
checks, not hardware FPS or balance acceptance. Initial deck slab collision and
escort coastal placement regressions were fixed. No sustained flight/load/browser
suite under the retained heat restriction. User server untouched; preview owned
and stopped by Playwright. Local commit follows final checks; consult git log.
No push/deployment. Human visual/flight/balance and physical-GPU gates remain open.

# Handoff — 30 October 2026

## Latest: procedural crop fields and larger mountains

Jan requested flat, realistically proportioned rectangular crop fields using an
attached aerial landscape as direction, plus bigger/more common mountains.
Implemented shared seeded farm descriptors and flat plateaus with smooth grassy
headlands in regional-terrain.ts; canonical tree rendering/collision clear their
interiors. Frontier's terrain material adds sharp crop edges, five crop/soil colors
and filtered planting rows via a 5.3 KiB descriptor atlas, with no added draw calls
or geometry. Natural vertex colors avoid coarse halos. Atlas updates on farm-block
crossings, supports render rebasing, and is disposed with the scene. Near/far
terrain geometry and collision share the flattened heightfield. Existing regional
labs receive the terrain shaping; crop surface detail is Frontier presentation.

Mountain amplitude 125→170 m, wavelength 240→320 m; foothills begin 150 m closer
to lowlands. Updated 235 m global terrain ceiling and Frontier collision bounds;
250 m flight ceiling retained. Tight local field-blend bounds preserve near-ground
collision work budgets. See decision 0030 and README. Existing regional terrain,
settlements and tree layouts may regenerate under the same seed; no save reset or
legacy-v1 changes.

Verification: all 263 unit cases pass serially; final types/build/lint pass. Five
focused browser cases pass across final runs: crop shader pixel comparison and
landscape, distant forest, sharp shoreline, paused/narrow Frontier, and unavailable
WebGL. Inspected final crop landscape PNG, copied to /tmp/mvw-crop-landscape.png.
Initial shader reserved-name and local-collision-bound issues were fixed. Four
sandboxed CLI test failures passed outside the sandbox; final full suite also
passed there. An initial player smoke raced the build; both player checks passed
again after build completion. No heavy flight/load/browser suite under retained
heat restriction. Physical FPS and human visual/handling acceptance remain open.
Preview servers were managed/stopped by Playwright; user server untouched.
Required local commit follows checks; consult git log. No push/deployment.

# Handoff — 30 October 2026

## Latest: dense green distant forest

Jan requested removal of sparse dark tree blocks and dense far-away trees in the
near foliage's green, retaining tall simple cuboids. Replaced the old 32 m scenery
lattice with canonical `regionTrees` 8 m placement, matching linear RGB, water /
slope / settlement / airfield filters. The new view reaches roughly 1.4 km in
97 culled 256 m instance tiles; all share the existing cube geometry and one
material. Explicit scenery capacity is now 99,328 slots (~6.36 MB per matrix copy),
not the prior 4096. See decision 0029 for cost/ownership and verification.

Generation uses <=16 canonical chunks / ~3 ms target per async batch, yielding
8 ms. Existing tiles persist during travel; settled buffers do not rebuild.
Paused scenes receive throttled invalidations while loading and stop after it.
Proxy slots hide when actual resident LOD 0/1 vegetation is present and restore
at identical positions on unload. Root diagnostics include forestPending. Timers,
unloaded tiles and shared resources are cleaned up. No terrain/collision/save/
canonical tree-layout/legacy-lab changes.

Validation: all 261 unit cases pass; build/types/lint pass. Three short browser
checks pass (15.6 s), including an actual-scenery one-frame capture with thousands
of trees at 500–1200 m and <60 draw calls in the isolated view. Inspected the PNG:
dense matching green cuboids into the horizon. No heavy flight/load/browser suite
under the heat restriction. Increased vegetation GPU/memory cost is real;
physical FPS, long travel and human visual acceptance remain open. User server
untouched; preview managed/stopped by Playwright. Required local commit follows
checks; consult git log. No push/deployment.

# Handoff — 30 October 2026

## Latest: sharp distant shoreline colors

Jan showed blurry distant shores versus a sharp nearby edge. Horizon triangles
interpolated water and land vertex colors over 16–128 m. Frontier's shared material
now interpolates a vertex water mask, recovers the unmixed dry palette, and uses
a pixel-antialiased coverage threshold. Removes the wide blue/green smear at both
terrain tiers without new geometry, textures, samples, draw calls or streaming
work. Same water palette/grain/rebasing; terrain/collision/saves unchanged.
Decision 0028 records the method and geometric-resolution limit.

Verification: all 259 unit cases pass serially; build/types/lint pass. Two short
mostly paused player smoke cases pass. New actual-shader one-frame GPU pixel test
passes: >100 mixed pixels in the interpolated reference versus <=2 in the sharp
version. Inspected both before/after PNGs. Initial fixture output-array handling
was corrected and the test rerun passed (2.5 s overall). Fixture bundles with
existing Vite only and is excluded from production. No heavy browser/flight load
suite under the heat restriction; physical FPS and human visual acceptance remain
open. User server untouched; preview managed/stopped by Playwright. Required local
commit follows checks; consult git log. No push/deployment.

# Handoff — 30 October 2026

## Latest: raised water walls / shoreline correction

Jan reported the elevated blue river wall. Root cause: fixed-width water above
unraised plains (seed 103 x=0: water 18.925 m, outside bank 11.5 m), plus airfield
flattening that moved land without moving water. Regional profiles now shape beds
and containing banks, merge river/lake junctions continuously, and blend into the
landscape. Airfield land/water now use the same flattening weights. Decision 0027
has details. Visual meshes, fallback and collision use the same corrected field.

Updated conservative land/water collision bounds for raised banks and airfield
blending; low-flight hierarchy/work-budget tests still pass. No added rendering
objects/materials/workers or dependency. Regional-v2 shore-adjacent content can
regenerate; no save-key reset/write or legacy-v1 terrain change.

Verification: all 259 unit cases passed serially; final strengthened three-case
shoreline subset passed again. Build/types/lint pass. Three short mostly paused
browser checks passed in 12.1 s, including new river/lake captures. Inspected both:
water meets banks without the elevated blue wall. Bounded CPU sweep diagnostic
retained <=2 exact ground calls in sampled scenarios; 5 m runway used zero calls
(~0.085 ms), not hardware FPS. No heavy flight/browser load suite under the heat
restriction. Keep physical-device FPS and human visual/flight acceptance open.
User server untouched; preview managed/stopped by Playwright. Required local
commit follows final checks; consult git log. No push/deployment.

# Handoff — 30 October 2026

## Latest: remaining near-ground collision cost

Jan still reported stutter below ~30 m. The previous broad rejection was
incomplete: clear 5 m passes still made 62k–72.6k terrain calls (~39–45 ms per
movement). Added a spatial hierarchy over the full unchanged hull-point set;
active near-ground checks now reject clear sections and sample only potential
contact. Tightened actual river/lake carving/water and airfield blend bounds;
added cheap obstacle AABB rejection before full SAT. No new AGL cutoff, hull
thinning, sweep reduction, terrain-height or save change. Decision 0026 explains.

Bounded diagnostic `tools/benchmarks/near-ground.ts` / JSON: clear 3/5 m runway
passes use zero samples (~0.25/~0.09 ms); actual 2 m contact still detected with
two exact samples (~0.64 ms). CPU-only, individual/JIT-sensitive sweeps, not
verified physical-device FPS. Original 30 m evidence did not cover the active
narrow phase and should not be treated as complete low-flight acceptance.

Verification: all 256 unit cases passed serially outside sandbox; all 28 affected
cases passed again after final interval refinements. New parity/work-budget tests
cover 2/3/5/10/20/29 m, banks, ridges, water, base blends, lake corners and actual
Frontier maximum catch-up frames at 5 m. Build/types/lint pass. Short mostly paused player browser smoke passes (two cases); the final mixed
runway/core paint-bound guard was covered by the affected unit rerun and build. No heavy browser/load
run under the retained heat restriction; physical FPS, long travel and human
flight feedback remain open. User server untouched, preview managed by
Playwright. Required local commit follows checks; consult git log. No push.

# Handoff — 30 October 2026

## Latest: low-flight CPU cliff and terrain detail

Jan reported ~3 FPS below ~140 m AGL and muddy ground. Fixed Frontier's
collision hot path with a conservative local terrain/water interval ceiling.
The 6,050-point hull previously caused 66,550 procedural samples per 1 m sweep
below a global world-space elevation limit. Clear low passes now need zero
samples (isolated CPU 33–51 ms → 0.05–0.45 ms at 30 m AGL). Detailed contact,
landing, tree/building collision remain active. Other worlds do not opt in.
This is CPU evidence, not verified hardware FPS. See decision 0025 and the bounded
`tools/benchmarks/low-flight.ts` diagnostic / JSON evidence.

Added filtered, world-anchored grass/soil grain across Frontier ground LODs,
removed a dulling tint and extended the finer underlay to 512 m. Same shared
material/mesh; world rebasing preserves patterns. Inspected final runway capture.
Heights, saves and worker/residency caps are unchanged.

Validation: 253 unique unit tests passed (249/253 initially in sandbox; all 64
cases in the four CLI files passed on a serial outside-sandbox rerun). Build,
types, lint passed. Two short mostly paused player smoke checks passed after
fixing a GLSL reserved identifier caught on the initial attempt. No heavy browser,
flight or load suite; retain Jan's heat restriction. Hardware FPS, longer travel,
human visual/landing acceptance and earlier legacy gates remain open. User server
untouched; preview server managed/stopped by Playwright. No push/deployment.
Required local commit follows verification; consult git log.

# Handoff — 30 October 2026

## Latest: integrated Frontier runway runs

Jan requested the final base → manual takeoff → procedural exploration/combat →
manual landing/full stop → bank money/XP → upgrades loop, plus ten seconds viewing
a crash before automatic return. Root now loads `game/frontier-main.ts`; `/play/`
and all labs retain their earlier gameplay/save scopes. Decision 0024 and README
cover controls, economy, persistence and limits. The plan records the selected
integration scope. This is implemented integration, not release/hardware approval.

New modules: `game/frontier.ts`, `frontier-main.ts`, `frontier.css`,
`world/airbase.ts`, `world/frontier-collision.ts`,
`rendering/frontier-settlements.ts`, `frontier-scenery.ts`. Shared Flight gains an
opt-in runway model; default labs stay airborne. Worker specs gain a signatured
base-flattening/reservation flag. Roaming population uses a separate key and
continues past the old 8 km population square; shared coordinate validation is
expanded. Four detail LOD tiers, 49 resident chunks/groups, two jobs/results and
two attachments/frame remain. Coarse terrain covers the horizon; settlement and
tree proxies are bounded; GPU transforms rebase in 4096 m steps. No cosmetic
mountain annulus in Frontier. Trees now collide in Frontier via the same cached
cuboids the worker renders; base/terrain/water/building contact remains independent
of GPU readiness. Legacy labs keep their existing tree behavior.

The player starts on a 480 m strip. E accelerates, S rotates above 28 m/s. Touchdown
requires runway containment, alignment/level wings, <=48 m/s and <=4 m/s descent;
Q idles and brakes. One stopped second banks once and opens the hangar. Crash
recovery takes ten unpaused seconds and loses unbanked rewards. Reload starts at
home; casualties persist separately. Engine/damage/bounty upgrades have five levels
and save with money/XP. Corrupt/denied saves preserve bytes and show session-only
status. Population save limit is 4096 changed encounters / 2 MiB. The underlying
v2 geography keeps its existing broad coast/river layout, with a very large numeric
safety envelope rather than a mathematical infinite-coordinate representation.

Verification: 249 unique unit checks passed across serial runs and targeted
reruns (original 233 + 16 new). Initial full serial run passed 243/247; four CLI
checks returned empty sandbox child stdout/stderr. All 64 cases in those four
files passed unchanged outside the sandbox. Final Frontier + tree collision tests
passed (15 cases); scenery tests passed separately. Types/build/lint and 23 source
validations passed. New two-case player browser smoke passed with one 800×600,
mostly paused browser (7.3 s), including all LODs, settings, pause, narrow layout,
shader/JS errors, cleanup and unavailable WebGL. A prior label lookup failure was
fixed with explicit select accessible names; no timeout was relaxed. Inspected
final runway and narrow captures. Tree collision was added afterward and verified
in CPU tests; it does not change the paused render path. Root browser tests now
assert Frontier; legacy flying-mode assertions remain at `/play/`.

IMPORTANT: retained Jan's earlier heat restriction. No heavy browser suite, route,
load or flight benchmark was run. The full browser regression, longer travel,
physical-GPU FPS/Pixel 10a, human landing/flight feel and balance remain open;
prior legacy sortie-budget and user-feedback gates remain open. Browser preview
servers were stopped by Playwright; no user server was started/stopped. No push or
deployment. Required local commit follows these checks; consult git log.

# Handoff — 28 October 2026

## Latest: corrected orbit axes and fitted aircraft collision

Jan reported wrong orbit direction and premature crashes. Both mouse axes are
reversed; C still toggles unlock/lock-reset. The old main-game margins were 9 m
centre AGL (plane) / 14 m (helicopter), plus 9 m building inflation. Fitted,
attitude-aware swept hulls replace them. Player fixed wing uses 204 solid boxes
covering every source voxel at the renderer's y=-2.4 pivot. Labs match their
visible boxes; helicopter body/skids/tail/mast plus thin rotor disk are fitted
(disk radial excess <0.25 m). Ground/water sampling <=0.5 m; sweep point travel
<=0.1 m, eight contact refinements, full OBB/AABB building tests. Static collision
is independent of streaming. Regenerate the derived hull with
`node tools/assets/collision-hull.ts > src/flight/attack-aircraft-hull.ts`.

All 233 unit tests passed serially; lint/types/build passed. New combat/regional
browser checks passed: clear the old buffer, pause safely, then skid contact
(~1.6–1.8 m centre AGL). Both corrected orbit-axis cases also passed. Agent
inspected contact captures. The initial new combat fixture overshot its pause
point under software rendering; it now pauses earlier below the old 14 m limit
and tests final contact separately. No existing timeout/threshold was relaxed.
A safe generator-proven regional 190 m ceiling removes needless high-altitude
sampling; terrain generation itself is unchanged. CPU-only low-pass sweep p95
1.42 ms is not GPU/FPS evidence. Decision 0023 has details and limitations.

IMPORTANT: Jan reported CPU spikes/heat while the full software-rendered browser
suite was running. Stopped it immediately with SIGINT; verified no test Chromium,
Playwright CLI or 4173 preview server remained. Do not restart heavy browser/load
checks without Jan's agreement. Full run stopped at 36 passing cases, one known
legacy 90-second sortie-budget failure (after mission/reload/collision recovery),
one benchmark interrupted and 50 not run (16.8 min). This is partial coverage,
not a full-suite pass. The user's 5173 server was untouched. An unverified scalar
micro-optimization was reverted to the exact version that passed the above checks;
no further CPU-heavy validation was started after the heat report.

Changed: flight/collision.ts, aircraft-hulls.ts, generated attack-aircraft-hull.ts,
assets/collision-hull.ts and its CLI; Flight/Sortie/lab/Hordes bindings; regional
ceiling metadata; orbit axes; relevant old/new tests; README and decision 0023.
No original source asset/dependency/save/renderer cap changed. Regional structures
retain foundation/AABB approximations, terrain contact is sampled, weapon barrels
are cosmetic and landing is not introduced. Prior hardware/player-feel gates and
legacy overall-sortie timeout remain open. Ready for the required local commit;
consult git log. No push/deployment.

## Latest: C toggles camera unlock and lock/reset

Jan changed the camera control to a toggle. Press C once to unlock orbit, then
move the mouse over the focused scene; press C again to lock and immediately
reset chase position and look direction. Keyup keeps orbit unlocked; auto-repeat
is ignored. Blur/pause/recovery still lock/reset. This supersedes hold-C below.

Changed the shared FlightCamera/binding, combat/lab state access, control text,
README/decision 0022 and presentation tests. Lint/types/build passed. The full
unit run passed 223 of 224; the unrelated GLB CLI check exceeded its unchanged
five-second budget under parallel load. All five GLB cases passed unchanged in
isolation, giving 224 unit cases passing across the runs. All three selected
browser cases passed (49.4 s): combat/regional toggle, keyup persistence, repeat
protection, reset, blur/cleanup, plus player menu behavior. Agent inspected the
combat orbit capture with C released. No assets/dependencies/save formats changed.

The prior legacy 90-second sortie timeout remains documented below and was not
rerun for this input-only follow-up. Preview server stopped by Playwright; user
5173 was untouched. Ready for the required local commit; consult git log.


## Latest: flight orbit, altitude shadow and smooth presentation

Jan requested hold-key camera orbit, a shadow straight below the plane, jitter
investigation and Assisted/Direct selection in Settings. Implemented in the main
player/combat and shared flight/regional/weapons views. Hold C and move the mouse
over the focused scene; release or blur restores chase by the shortest route.
Fast half-orbits maintain radius. Settings → Flying mode retains its session
choice through recovery/aircraft/mission/world changes; reload defaults Assisted.

The 60 Hz aircraft was rendered without interpolation alongside a camera that
smoothed world translation but looked at the latest tick. Interpolated render
poses and relative camera offsets fix that source of stepping/relative bobbing.
Collision, combat, objectives and saves keep authoritative poses. A soft blob
conforms to ground/water directly under the displayed aircraft at every altitude,
including Low/soft-shadows-off. It owns one cached grid/small generated texture;
geometry budgets explicitly increase by one (combat 67, flight 57, weapons 59).

Changed: flight.ts, new rendering/flight-camera.ts and aircraft-shadow.ts, main.ts,
lab.ts, aircraft-controls.ts, presentation unit/browser tests, resource assertions,
README, decision 0022 and CPU-only shadow probe. Final lint/types/build, all 223
unit tests and 23 source validations passed. Initial sandbox CLI capture failed
four old tests; the full unit suite passed outside the sandbox without changes.
Full browser run: 83 pass, two timing failures, one optional route skipped.
Final angular refinement was rebuilt; all seven affected browser checks passed
(2.4 min), including narrow settings, orbit/radius, idle/shader/resources, flight,
weapons and regional resume. Agent inspected combat/regional orbit and 390 px
settings captures. Software shadow update CPU p95 0.28 ms is not GPU/FPS evidence.

Known remaining failure: the legacy complete-sortie case still exceeds its
unchanged 90-second total budget during final seed/settings checks, both in the
full run and isolated final-build retry. Mission completion/rewards, saved reload,
recovery and collision checks passed before timeout. No failure/step/timeout was
hidden or relaxed. The other timing failure (regional resume dropped 0.10 s) passed
unchanged in the final focused run. Combined coverage: 84 unique browser cases
passing, one overall-budget failure, one optional route skipped. Keep that legacy
software-renderer budget issue open; a similar timeout is in the previous slice.

Ready for the required local commit; consult git log. No push/deployment.
Playwright stopped its preview servers; user 5173 was untouched. Hardware/FPS,
player feel/visual acceptance and prior regional-v2 mission gates remain open.

## Latest: continuous ground and distant city

Jan requested fixes for the marked empty strips, mountain-foot gaps and nearby
urban pop-in. Render all 81 existing depots independently of horde residency;
continuous city/forest ground now reaches 1536 m with 16 m central samples, roads
and pads, and a 0.12 m offset. It uses an inexpensive overview material (no grass
hash/shadow reception), while nearby streamed terrain keeps detailed shading.
Mountain annulus edges have skirts down to −64 m; forest verges are six metres
outside the city after jitter. Base/mission coordinates, collision, seeds, saves,
49 terrain/horde residency and 66-geometry cap are unchanged.

Changed: battlefield-surface.ts, battlefield-view.ts, battlefield-material.ts,
terrain-fallback.ts, horde-view.ts, game/main.ts, art unit/browser cases. Decision
0021 has full rationale. All 217 unit tests passed; build/types/lint passed.
First 24 browser cases passed before stopping to validate the lighter overview.
The subsequent full run passed 81 cases, skipped the optional route, and hit the
90-second overall limit in the end-to-end sortie after its mission/save checks.
Low now keeps 40% foliage and selects coarse trees beyond 80 m; High is unchanged.
The final build/types/lint and seven affected unit tests passed. All four focused
browser cases then passed in 2.9 minutes, including the full sortie within its
unchanged limit. Combined browser coverage is 82 passing cases across the full
run and focused final rerun; one optional route was skipped. All 217 unit tests
passed, with 19 affected tests and the final seven-case art subset rerun afterward.
Agent inspected the corrected final city/forest and mountain coverage screenshots.
The work is ready for its required local commit; consult git log for the commit.
Preview servers were stopped by Playwright. No inspection server was created. No physical-device performance claim; earlier hardware,
comfort and regional-v2 mission gates remain open. No new server on 5173 was
started or stopped. Browser test server 4173 is owned by Playwright.

## Previous visual pass

Jan requested a reference-directed visual improvement to the main game. The autumn
valley presentation is implemented in root and `/play/`; the full browser suite passed (81 cases, one optional route skipped).
The final narrow-header CSS fix and four affected browser checks also passed. Do not claim human visual or physical-GPU acceptance. No release or
Phase 20 work has started. Read docs/decisions/0021-autumn-valley.md for scope.

Main changes: sunlit gradient sky, stepped clouds, terraced scenic hills, seeded
instanced autumn/pine woodland, world-space grass/fields/service lanes/contact
shading, original editable depot, detailed zombie silhouettes, real sunlight
shadows and cleaner full-window HUD/menu/heading instruments. The terrain seed,
heights, flight/combat rules, obstacle envelope and saves are unchanged. Distant
hills/clouds follow the camera as scenery; this does not integrate regional-v2
terrain into missions. Trees avoid encounters/base and remain beneath the existing
conservative flight envelope. Labs retain diagnostic proxies.

Settings offer Automatic / High / Low scenery. Automatic selects Low only for
identified software renderers, High otherwise. Low draws 55% of trees, uses coarser
foliage beyond 100 m and starts with shadows off. High uses foliage LOD at 220 m
and tree shadows within 180 m. The separate shadow checkbox overrides the preset.
Reports identify actual quality, software rendering, tree count and shadow-map
size. High SwiftShader flight initially failed old wall-clock limits; that is why
software defaults are lighter. High static rendering is tested, not hardware FPS.
The 1024² PCF map spans 210 m. Paused shadow maps are reused, and settled ready/
paused scenes stop GL submission until controls, resizing or terrain invalidate.

New modules: src/rendering/battlefield-view.ts and battlefield-surface.ts.
Integration: src/game/main.ts, player-shell.ts, prototype.css, horde-view.ts,
streamed-terrain.ts and terrain-fallback.ts. Editable source:
assets/source/clearpass-depot.voxel.json; reproduce with tools/art/create-depot.ts.
The 4×3×12 m source exactly matches legacy collision. Exported GLB is ignored.
Geometry budget is bounded at 66; the eight new scenic/depot geometries replace
one old obstacle box. Existing resident/job/effect/voice budgets are unchanged.

Verification so far: 214 unit tests passed; four art tests passed again after
quality/idle changes. Lint/types/build passed and 23 sources validated; depot GLB
export passed. Five targeted browser cases passed (plus temporary diagnostic
profile): quality/shader/fog/shadows, pause idle, seed reload bounds, desktop/narrow
HUD, workshop perspective/front/top, aircraft/loadout behavior. Complete final
browser regression passed: 81 cases in 16.8 minutes, one optional route skipped.
The final CSS-only narrow-header alignment fix and stronger overlap/resource
assertions passed all four targeted browser cases on the final build (1.1 minutes).
Agent inspected the final desktop, corrected narrow HUD and depot workshop views.
All 23 source validations and the production build passed; existing bundle-size
warnings remain. Reports: docs/benchmarks/autumn-valley.json (SwiftShader Low,
p95 rAF ~333–350 ms; no physical GPU/FPS claim).
Initial sandbox subprocess checks needed outside-sandbox execution; no failure
was hidden. One browser worker on this software-rendered host.

Keep open: Pixel 10a / Google Tensor / 720p / 60 FPS, touch controls, human effects/
sound/comfort/balance feedback, physical-GPU High performance, regional-v2 missions.
No deployment. Root is the player game; `/play/` is the combat diagnostics lab;
`/tools/outdoor/` preserves the old environment lab. Dev tools are opt-in in Settings.

Use Node24: /home/user/.nvm/versions/node/v24.22.1/bin (shell default is Node22).
The agent's Vite inspection server on 5174 has been stopped;
an existing user server on 5173 was left alone. Preview test server on 4173 was managed and stopped by Playwright. No owned
inspection tab remains. The work is ready for its required local commit; consult
git log for the resulting commit. No push or deployment.

## 30 October 2026 — Remove obsolete development pages

Removed the legacy `/play/` prototype and outdoor, flight/regional-flight, hordes,
weapons, streaming/terrain-explorer pages and their exclusive page controllers,
old player shell, demo mount, helicopter/mount and legacy horde presentation.
Frontier and the voxel workshop are the only build entries. Frontier links only
to the retained workshop; its simulation/rendering/landing/progression code is
unchanged. Archived retired browser checks and original affected unit files;
kept shared-model tests and extracted the depot workshop check.

Preserved every source asset, legacy environment/vegetation implementation,
editor/export support, all benchmark/generation scripts and their headless model
dependencies (including Sortie/campaign/missions/metrics), development artifacts,
archives and historical documentation. Old README route descriptions are marked
historical. Verification results follow below.

Verification: Node 24 typecheck, lint, production build and all 23 source asset
validations pass. All 271 unit tests across 37 files pass in the final serial run
(80.45 s), including preserved benchmark/asset CLIs. Eleven focused browser checks
pass across final runs: Frontier start/pause/narrow/WebGL fallback, workshop entry
and navigation, depot import, GLB export/error recovery, actual crop/forest/shore
and navy/mutant rendering, and saved skill/shop progression. The last hangar case
exhausted the default 30 s in the combined run and passed alone in 21.6 s with a
60 s limit. Initial sandbox subprocess-output failures passed outside the sandbox;
the browser preview also required unsandboxed local execution. Generated test
screenshots were refreshed; Playwright disposable output now uses a nested
folder so future runs preserve the screenshot collection. No sustained flight/
load checks or hardware FPS claim under the retained heat restriction. No assets,
benchmark/generation scripts or existing historical docs were deleted. No push.

## 30 October 2026 — Documentation, workshop CSS and benchmark organization

Moved retired lab/prototype/phase instructions from README into
`docs/development-history.md`, preserving their text except heading levels and
relative links. README covers Frontier and the workshop; current workshop editing,
asset, command and repository instructions live in `docs/development.md`.

Moved the workshop's sole base stylesheet from `src/ui/style.css` to
`tools/voxel-editor/base.css`, removing only six unused `.controls` lab rules.
All remaining rules are byte-identical. Moved Sortie, Campaign, mission definitions
and measurement helpers from `src/game/` into `tools/benchmarks/legacy/`, updated
benchmark/test imports, and documented their benchmark/regression-only role.
Verified all four modules are identical except relative import paths; Frontier
imports none of them. No gameplay, save keys, assets or benchmark scenarios changed.

Verification results follow below. No sustained flight/load checks or hardware FPS
claim under the retained heat restriction. No push/deployment.

Verification: Node 24 types, lint and production build pass. Frontier's game JS,
CSS and terrain-worker content hashes match the preceding cleanup build. Local
links in README and the three new guides resolve. All 271 unit cases pass across
final runs: the full serial run passed 270/271, with only the asset-export CLI
exceeding its 5 s test limit under concurrent browser work; its unchanged five-case
file passed alone in 4.28 s. The preserved combat benchmark CLI invariants pass.
All 14 focused browser checks passed in 49.6 s: workshop editing/history/palette,
imports/invalid edits, GLB export/failure, viewer navigation/toggles, allocation
limits, unavailable WebGL, resize/navigation and paused/narrow Frontier smoke.
Browser and CLI subprocess checks used approved execution outside the sandbox.
No gameplay or asset edits. Local commit follows; no push.

## 30 October 2026 — Pre-push credential audit

Scanned all 679 reachable historical blobs (~39 MB, 48 commits) for private keys,
common provider tokens, JWTs, embedded URL credentials and secret assignments;
no matches or sensitive credential filenames found. No dedicated secret-scanner
binary was installed, so this was a local pattern/path audit, not a guarantee.
Existing author name/email metadata and a historical local username path remain.
Hardened .gitignore for service-account credentials, browser authentication state,
local agent authentication/session data, private key names and Terraform state.
Validated 12 excluded paths and five retained source/example paths; diff checks
pass. No game changes or history rewrite. Push authorized by Jan after audit.

## 30 October 2026 — Anonymize published commit history

At the user's request, rewrote all 49 commits with an anonymous author and
committer identity and removed the local username path from historical handoffs.
Set the repository-local future commit identity to Anonymous with an invalid
example email. Verified all commit identities and 682 historical blobs, preserved
commit count, messages, dates and parent structure, and checked Git connectivity.
The only current file change from the rewrite is the anonymized handoff path;
game code/assets are unchanged, so game tests were not repeated.
A private recovery bundle is kept outside the repository in /tmp. Published
history is replaced with force-with-lease, preserving concurrent remote updates.
Old GitHub caches and copies in existing clones cannot be erased by this rewrite.
