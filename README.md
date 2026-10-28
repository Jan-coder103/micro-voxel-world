# Micro Voxel World

TypeScript / Three.js browser game foundation and voxel source workshop with manual editing, optimized meshing and GLB export, plus an outdoor scene, streaming lab, arcade flight, weapons range seeded horde lab the Phase 12 combat prototype, and regional terrain with procedural settlements and Phase 15 persistent zombie encounters.

## Quick start

Use Node.js 24 LTS and npm (validated with Node 24.21.0 / npm 11.19.0).

```sh
npm ci
npm run dev
```

Open http://localhost:5173/ for the outdoor test scene, or http://localhost:5173/tools/voxel-editor/ for the voxel workshop. Start the simulation, focus the scene, use WASD/arrows to move the test cube and hold Space for cosmetic test pulses. Pause/Resume freezes and continues simulation; Reset returns to ready with zero ticks and cleared effects. Window blur/hidden tabs pause automatically. Diagnostics report 60 Hz simulation ticks, pool use and discarded catchup time. The 64 × 64 m scene contains stepped terrain, a road, buildings, and instanced vegetation at the established metre scale. The cube stops at conservative static collision bounds. Compare High (shadows) and Low presets, toggle distance fog, or show collision bounds. Rendering measurements include draw calls, triangles, resident geometries and CPU submission time; these are not GPU frame times. Flight and combat are later phases. See [the outdoor rendering decision](docs/decisions/0007-outdoor-rendering.md) and [baseline](docs/benchmarks/phase-7-outdoor.md).

## Play the combat prototype

Open http://localhost:5173/play/ or select **Play prototype** from Game. Operation Clearpass combines the authored aircraft, streamed terrain, moving hordes, weapons, audio and one complete objective. Clear the three marked encounters (96 members), fly within 60 m of the sector below 70 m AGL, then return within 20 m of the base ring. Default seed 12012 keeps this sortie separate from the lab's default population.

Start / Resume focuses the scene. W/S or up/down pitch down/up; A/D or left/right bank to turn; Q/E adjust throttle; Space fires; 1/2/3 choose minigun/autocannon/explosive shell. Assisted aim is on by default and locks objective members within 70° of the aircraft nose and 240 m. Uncheck it for nose aiming. After clearance, steer toward the base marker or choose **Return assist**; it flies the same aircraft model and manual steering cancels it. Esc, focus loss, window blur and hidden tabs pause flight/firing.

A crash fails the attempt. **Recover aircraft** returns to the approach, preserving wounds and kills; it resets the flyover requirement so recovery cannot teleport to victory. Reload keeps population but starts a fresh ready aircraft/attempt. Already-cleared sectors still require a flyover and return. Load another seed in Settings for a separate population. First mission completions now award service stars and unlock Relief Watch; see Phase 18 below.

A coarse reusable terrain underlay covers late streamed detail and the horizon; authoritative terrain/wall collision remains available independently of workers. A two-chunk forward bias preloads the attack direction. Keep above 9 m AGL: the authored aircraft uses a conservative envelope at every attitude. The HUD shows clearance, flyover, speed, altitude, target lock and base/sector navigation. Audio starts muted. Settings includes 100% / 75% render scale, save status and measured diagnostics.

Run isolated **Crowd benchmark** and **Sustained-fire benchmark** from Settings, or open `/play/?benchmark=crowd` and `/play/?benchmark=fire`. Add `&scale=0.75` for Low. They use fresh in-memory population and never read/write player saves; controls are disabled during the automated orbit. After 60 warmup + 180 measured frames, download the JSON report. `npm run combat:benchmark` runs two reproducible 60-second fixed-tick CPU scenarios without rendering. Browser rAF intervals, simulation/presentation CPU and rendering submission CPU are separate measurements, not GPU frame times. See [the prototype decision](docs/decisions/0012-combat-prototype.md) and [benchmark evidence](docs/benchmarks/phase-12-combat.md).

Implementation and automated verification do not establish player enjoyment or physical-GPU performance. The Phase 12 gate remains open for feedback on approach, aiming, hit feedback and recovery (deferred by Jan until later playtesting).

## Regional terrain and settlements (Phases 13–14)

Open `/tools/streaming/?terrain=regional` or choose **Terrain explorer** from Game. Load a uint32 seed and jump to Plains, Forest, Mountains, River, Lake, Coast, Ocean or an earlier Settlement reservation. The district buttons below select the generated settlements. WASD/arrows move the inspection camera at 80 m/s. Choose **City**, **Rural**, **Industrial**, **Military**, **Airport**, or **Harbor** to inspect generated districts. Seeded streets connect valid plots and neighboring regions where terrain permits. Houses, height-varied city blocks, warehouses, tanks, barracks, towers, runways/aprons and coastal piers reuse shared original voxel kits. A missing valid district is reported explicitly.

**Fly this region** opens `/tools/flight/?terrain=regional&seed=103` at the selected location. Existing flight controls apply. Water contact crashes, terrain/water collision works independently of workers, and Recover / Reset returns to the selected approach. Buildings and foundation envelopes stop the aircraft even before chunks arrive; trees remain visual scenery. A conservative chase-camera adjustment clears building envelopes. Regional flight saves zombie damage in its separate population scope; terrain/structures stay static. Existing combat populations and saved markers retain generator v1.

Generator v2 combines global layered value noise, ridged mountain elevation, moisture biomes, a continuous descending river with a level lake reach, coastal/ocean fields and terraced surfaces. Vegetation is baked into owned chunk meshes in the two near tiers. Four terrain tiers keep shared 1 m boundaries; a reused coarse underlay covers late detail. This is an erosion-inspired heightfield, with opaque water surfaces rather than full physical hydrology. Structure content v1 adds terrain-checked roads/plots and bounded settlements; `&structures=0` disables structures, with a separate population save scope in regional flight. Interiors and loot remain deferred decorative ideas; there is no on-foot interaction. See [settlement decisions](docs/decisions/0014-procedural-settlements.md). See [terrain decisions](docs/decisions/0013-regional-terrain.md). `node --experimental-transform-types tools/benchmarks/terrain.ts` measures CPU generation and payload sizes.

Jan deferred the Phase 12 playtest and physical-GPU gates on 27 October 2026. They remain outstanding; neither player enjoyment nor hardware FPS has been verified.

## Horde lab

Open http://localhost:5173/tools/hordes/ or follow **Horde lab** from Game. Start / Resume runs the population and focuses the scene. WASD/arrows move the observer; hold Space to fire the selected Phase 10 weapon. Tracking explicitly aims at the first living home member (encounter 0,0); uncheck it to aim with the pointer. This observer lab proves crowd systems; aircraft and a complete combat objective are Phase 12 work.

The seeded test region contains 81 encounters × 32 stable members = 2,592 total before kills. At most 49 groups are resident. Near zombies use the original instanced voxel model and 60 Hz local separation; medium boxes update formations at 10 Hz; far gold proxies advance a group at 1 Hz. Hysteresis reduces tier switching. Near / Medium / Far move the observer to inspect home LOD. Rectangular patrol corridors keep formations clear of the visible static walls. Walls and terrain block shots and blast visibility. Damage queries resolve real member slots even in far/unloaded groups.

Wounds, kills, formation offsets and patrol progress save per seed/generator/population version in this browser/origin. Travel east unloads home; Near view / Home returns without respawning it. Reload starts paused at home with saved population. A cleared encounter has all 32 members dead; partial clearance persists too. Another seed opens its own population. There is no respawn/reset button. The record is bounded to 81 groups / 512 KiB; corruption/storage denial/quota failures show **Session only**, preserve saved bytes and retain this session's state. No cloud sync or cross-tab merge. Unloaded groups freeze, then resume on return.

Diagnostics distinguish global population, residents, active individuals and far proxies, plus worker/render/resource counts. Effects/audio retain their 128-slot/eight-voice caps. Focus/window/visibility loss pauses and checkpoints; resume explicitly. Sound starts muted. This is a bounded correctness demonstration, with simple patrol navigation and body-sphere hit proxies, not a huge-horde FPS claim. See [horde decisions](docs/decisions/0011-hordes.md).

## Weapons lab

Open http://localhost:5173/tools/weapons/ or follow **Weapons lab** from Game. Start / Resume focuses flight; Space fires forward. Keys 1/2/3 or the Weapon selector choose minigun (20 shots/s), autocannon (5 shots/s) or explosive shell (1 shot/s). Flight controls are shared with Flight lab. Gold spheres are resettable test targets: three airborne for level passes and three on the ground for dive attacks. Recover / Reset restores aircraft, target health, counters and pooled effects. These are range fixtures, not zombies or persistent enemies.

Tracers, muzzle flashes, impacts and wireframe blast volumes accompany authoritative ray hits. Terrain blocks shots and blast visibility even while chunks load. Explosions use linear centre-distance damage falloff with a 16 m radius and leave terrain intact. Ammunition is unlimited for testing. Diagnostics report damage, clears, blasts, effects and dropped cosmetics. Sound starts muted; Enable sound activates synthesized placeholder audio, and Mute sound disables it. Audio failure is reported and leaves weapons working. Leaving viewport focus pauses flight/firing and stops sound; resume explicitly. See [weapon decisions](docs/decisions/0010-weapons.md).

## Flight lab

Open http://localhost:5173/tools/flight/ or follow **Flight lab** from Game. Start / Resume focuses the scene. W/S or up/down pitch down/up; A/D or left/right bank to turn; Q/E reduce/increase throttle (30–100 m/s). Assisted levels pitch/bank on release; Direct holds attitude. Pause, leaving scene focus, window blur or visibility changes pause flight. Resume explicitly. Recover / Reset returns above home in ready state after collision. The chase camera follows a voxel-style attack-aircraft silhouette; altitude is capped at 250 m.

Collision samples authoritative seeded terrain even when streamed geometry is late, with conservative 3 m clearance. Diagnostics expose terrain loading gaps, resident/job counts, generation failures and discarded catchup time. This prototype has no weapons, realistic aerodynamics or streamed props. See [flight decisions](docs/decisions/0009-flight.md).

## Streaming lab

Open http://localhost:5173/tools/streaming/ or follow **Streaming lab** from Game. Focus the scene and use WASD/arrows to move the test camera at 80 m/s. Travel east/west jumps 256 m; Return home goes back to the starting chunk. Inspect four color-coded terrain LOD rings, generated by two workers from a uint32 seed. Load seed rebuilds the region; default seed is 103. Wait for Terrain ready after travel; loading can produce temporary gaps.

Clear current marker records that chunk's test beacon as cleared. It stays cleared when returning or reloading the same seed in this browser/origin. Records are seed/generator-version scoped, limited to 4096 marker IDs, and stored in localStorage. Dev and preview ports have separate records. Storage errors/corruption are reported as session-only; existing corrupt data is preserved. This does not save editor sources, camera position, selected seed or gameplay state. Terrain remains intact.

The lab caps residents at 49 chunks, outstanding terrain jobs/results at two combined, and integrations at two per frame. Every tier preserves identical 1 m boundary samples to join mixed LODs. Diagnostics show tier counts, jobs, stale results and rendering resources. See [the streaming decision](docs/decisions/0008-streaming.md) for lifecycle, persistence, world bounds and limitations. Aircraft and streamed collision are later work; the original rural scene remains available at Game.

## Voxel workshop

Select the direction marker or metre cube from the catalog. Left-drag to orbit, scroll to zoom, and right-drag to pan. Focus the canvas for arrow-key panning. Frame asset restores perspective; Front −Z and Top +Y provide repeatable inspection angles. Toggle the metre grid/axes and bounding box independently. Measurements show grid dimensions, declared physical bounds, and occupied cells.

Use **Edit source** to select a zero-based X/Y/Z coordinate; a white wire box marks it in the preview. **Add voxel** fills an empty cell, **Remove voxel** clears an occupied cell, and **Paint voxel** applies the active palette entry. The last occupied voxel cannot be removed because v1 sources must be nonempty. Edit the source name or enlarge its grid envelope (up to 256 per axis) before adding outside the original block. Shrinking across occupied cells fails without cropping. Resizing keeps integer coordinates and recalculates the base-centred pivot.

Palette controls add named colors, update colors/IDs (including cell references), and remove unused entries. Each asset has independent Undo/Redo history, capped at 64 steps and 8 MiB; oldest steps expire. Invalid commands preserve source and history. Switching assets retains edits/history. Source JSON export clears the unsaved indicator for that exact source; GLB export leaves it unchanged. Closing or leaving with unsaved source changes triggers the browser's warning when supported. Keep downloaded JSON; there is no automatic persistence or recovery. History and selection are session-only.

Create a solid block with a name, color, and 1–16 voxels per axis. Each voxel is 0.1 m, with +Y up, −Z forward, and the base centred on XZ. Use **Export selected source** to download an editable `.voxel.json` file. Reload and use **Import voxel JSON** to reopen it. The session holds up to 24 assets including fixtures; reload discards the session, so keep your downloads. Duplicate IDs fail by default. Explicitly enable **Replace matching session ID on import** to reopen an existing ID, including an edited fixture; successful replacement discards only that asset’s current edits/history and resets the option. Invalid imports preserve existing assets.

Source v1 uses sparse occupancy, a named palette of opaque matte colors, explicit units/placement, and provenance. Imported sources may span up to 256 cells per axis with at most 32768 occupied cells, 64 palette entries, and 8 MiB of UTF-8 JSON. Unsupported versions, fields, scales, materials, references, and coordinates produce field-specific errors before catalog mutation. Use **Export runtime GLB** to download an optimized runtime mesh. Keep JSON for editing; there is no automatic persistence. The workshop reports triangle reduction for the selected source.

See [the format contract](docs/asset-authoring/format.md), [authoring skill](docs/asset-authoring/mvw-voxel-assets/SKILL.md), and [Phase 3 decision](docs/decisions/0003-voxel-source.md). The viewer now uses hidden-face removal and greedy surface meshes; [the mesh pipeline](docs/asset-authoring/mesh-pipeline.md) explains GLB export and [reference measurements](docs/benchmarks/phase-4-meshing.md).

## Reference assets

Twenty original editable reference sources are available in [assets/source](assets/source/README.md): zombie, attack aircraft, field tree, utility building, combined road/landing pad, pine tree, derelict car, streetlight, concrete barrier, small warehouse, water tower, shipping container, bus shelter, fuel tank, military watchtower, farmhouse, barn, tractor, windmill, and wooden bridge. Import their `ref-*.voxel.json` files into the workshop; `npm run assets:export` generates their GLBs alongside the two fixtures. They are static scale/gameplay references for the next phases.

## Commands

- `npm run dev` — local development server.
- `npm run typecheck` — strict TypeScript checks.
- `npm run lint` — ESLint.
- `npm test` — unit tests, including source round trips and validation CLI checks.
- `npm run assets:validate` — validate and round-trip all committed `.voxel.json` reference sources.
- `npm run assets:validate -- path/to/asset.voxel.json` — validate one or more named source files; failures return nonzero.
- `npm run assets:export` — regenerate all optimized GLBs into assets/generated/ (ignored by Git); pass source paths after `--` for selected assets.
- `npm run assets:benchmark` — measure reference geometry reduction and CPU meshing time.
- `npm run build` — typecheck and build all seven entry points into dist/.
- `npm run preview` — serve the production build locally.
- `npx playwright install chromium` — install the browser once for smoke tests.
- `npm run test:browser` — production browser checks (build first).
- `npm run settlements:benchmark` — deterministic district-generation CPU/payload measurements (not GPU time).
- `npm run combat:benchmark` — fixed-tick crowd/sustained-fire CPU measurements (Node 24 transform-types flag).
- `npm run check` — lint, unit tests, source validation, production build, browser checks.

PowerShell users whose execution policy blocks npm.ps1 can use npm.cmd / npx.cmd.

## Repository conventions

Read agent.md, plan.md, tracker.md, and handoff.md before development. Runtime code lives in src/, tool entry points in tools/, and tests in tests/unit and tests/browser. Shared schema/validation lives in src/assets/ and does not depend on Three.js. Authoritative source assets belong in assets/source; generated GLB derivatives belong in assets/generated/ and are rebuilt locally.

Use small descriptive commits after tests pass. Never commit node_modules/, dist/, browser reports, caches, or credentials. Commit the lockfile; clean checkouts use npm ci. The Git remote is https://github.com/Jan-coder103/micro-voxel-world.git; main tracks origin/main. No deployment target is configured.

Platform and tooling choices are in docs/decisions/0001-foundation.md. The initial scale convention is now fixed by source v1 in docs/decisions/0003-voxel-source.md.

## Continue on another computer

Pull main (or clone the GitHub repository), use Node 24, then run `npm ci`, `npm run check`, and `npm run dev`. Use `npm run assets:export` to regenerate ignored GLBs. Read handoff.md for the latest stopping point. Browser-created session assets must be exported as JSON and transferred separately; they are not automatically committed.

Regional population (Phase 15): open `/tools/flight/?terrain=regional`, or use
**Fly this region** in the regional terrain explorer. **Approach nearby horde** sets
up a development attack pass; Start, Space and 1/2/3 use the flight weapon controls.
The population panel shows nearby survivors and persistent kills/cleared encounters.
Recover resets the aircraft, preserving zombie damage. Seeded population coverage
is −4096 to 4096 m per axis; terrain continues beyond it. Damage saves automatically
in a separate generator-v2/seed/structure population scope. Storage failures appear
in the population panel and preserve session play. Regional groups currently hold
validated positions; moving regional patrols and mission progression are deferred.

Performance planning: [Phase 16 notes](docs/performance/phase-16-notes.md) summarize
observed costs, the software-rendered test baseline, proposed priorities and the
measurements needed before changing behavior.

The first Phase 16 optimization lets **regional Flight** sleep once a paused/ready
scene and camera settle. Controls, resizing and arriving terrain wake it again.
Static zombie instance buffers update only after population changes; damage still
saves immediately. Legacy Clearpass/outdoor rendering is unchanged by this slice.

Flight also reuses its requested terrain plan until the look-ahead point crosses
a chunk boundary. Worker replies continue to integrate while plans are unchanged.
The [planning microbenchmark](docs/performance/2026-10-28-chunk-plan.json) measures
this CPU work separately from integrated gameplay and hardware FPS.

Phase 16 streaming diagnostics in Flight include cumulative worker round-trip,
ready-result wait and synchronous attachment timings, plus draw calls/triangles.
Run `npx playwright test tests/browser/regional-performance.spec.ts --workers=1`
after building for the short travel/firing baseline. See the
[measurement definitions and limitations](docs/performance/phase-16-notes.md).
These CPU diagnostics do not measure GPU upload time or establish hardware FPS.

For the longer continuous regional return profile, build and run
`MVW_ROUTE_PROFILE=1 npx playwright test tests/browser/regional-route.spec.ts --workers=1`
(Node 24, POSIX shell). It is skipped by default. The report includes Chromium
post-GC heap and renderer geometry checkpoints; see the Phase 16 notes for limits.

## Aircraft and loadouts (Phase 17)

Clearpass (`/play/`), Flight lab, Weapons lab and regional Flight now offer
**Clearpass · fixed wing** and **Kestrel · helicopter**. Fixed wing retains its
30–100 m/s attack passes. Kestrel can hover, reverse and fly at up to 55 m/s:
W/S tilt forward/back, A/D yaw, Q/E descend/climb; release Q/E to hold altitude.
Assisted levels tilt and brakes toward hover; Direct holds tilt. Arrow keys mirror
W/S and A/D. It is an arcade helicopter, without landing or rotor aerodynamics.

Choose Multirole (all weapons), Precision (minigun/autocannon) or Siege
(autocannon/shell), then a nose, port or starboard mount. Keys 1/2/3 retain their
weapon meanings and ignore unequipped weapons. Equipment changes pause flight.
Loadout/mount changes keep position and cooldowns; aircraft changes reset the
approach and flyover requirement while retaining casualties. Recover keeps
selected equipment. World loading keeps equipment with a separate population;
reload restores default equipment and keeps saved casualties. Equipment is
session-only; mission progression is described below. Clearpass return assist supports
both aircraft. Isolated benchmarks keep their original fixed-wing configuration.

Keep the helicopter above 8 m AGL in labs (14 m in Clearpass's conservative terrain
envelope). Its original block silhouette is a code-native prototype, not a new
workshop source asset. See [aircraft decisions](docs/decisions/0018-aircraft-loadouts.md).
Phase 16 Pixel 10a / 720p / 60 FPS validation and user handling/balance feedback
remain outstanding. Touch controls are not implemented.


## Missions and progression (Phase 18)

Open `/play/` and choose a mission on the board (the existing Clearpass generator-v1
region; regional-v2 missions are not implemented). **Operation Clearpass** remains
the introduction: clear its three hordes, fly over the sector and return to base.
Its first completion awards one service star and unlocks **Relief Watch**.
Relief Watch protects a supply post against three other hordes. Surviving marked
members drain post integrity; clearing them stops the damage. With every member
alive the post lasts about 75 simulation seconds. Pause/focus loss freezes pressure.
Clear, fly over the post, and return for two more stars and the Flight lead rank.

Debriefs show outcome, kills, shots, flight time and stars. **Prepare next sortie /
rearm** returns ready at base and resets weapons, counters, post integrity and the
flyover requirement. Ammunition remains unlimited. Recovery, changing aircraft or
switching missions abandons an unfinished attempt without rewards. Casualties
remain cleared. A helicopter hover attack followed by a flyover is an alternative
to fixed-wing passes; Return assist supports both aircraft after clearance/flyover.

Stars and unlocks save once per mission across all seeds in this browser/origin.
Replays earn no additional stars. Population saves retain their existing seed
scopes; the new campaign record is separate. Reload starts a fresh Clearpass
attempt on default seed 12012 with default equipment, retaining casualties/stars. Mid-flight position,
post integrity, selected mission and last debrief are session-only. Loading another
seed keeps equipment/stars and clears the prior debrief. Storage or
population-save errors preserve existing bytes and report session-only rewards.
There is no cloud sync or cross-tab transaction support. Isolated benchmarks never
access campaign records. See [mission decisions](docs/decisions/0019-missions-progression.md).
Player balance/pressure feedback and Pixel 10a performance verification remain open.
