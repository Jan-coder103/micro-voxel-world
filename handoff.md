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
