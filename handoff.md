# Handoff — 28 October 2026

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
