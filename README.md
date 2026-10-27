# Micro Voxel World

TypeScript / Three.js browser game foundation and voxel source workshop with manual editing, optimized meshing and GLB export, plus an outdoor scene, streaming lab, arcade flight, weapons range and seeded horde lab.

## Quick start

Use Node.js 24 LTS and npm (validated with Node 24.21.0 / npm 11.19.0).

```sh
npm ci
npm run dev
```

Open http://localhost:5173/ for the outdoor test scene, or http://localhost:5173/tools/voxel-editor/ for the voxel workshop. Start the simulation, focus the scene, use WASD/arrows to move the test cube and hold Space for cosmetic test pulses. Pause/Resume freezes and continues simulation; Reset returns to ready with zero ticks and cleared effects. Window blur/hidden tabs pause automatically. Diagnostics report 60 Hz simulation ticks, pool use and discarded catchup time. The 64 × 64 m scene contains stepped terrain, a road, buildings, and instanced vegetation at the established metre scale. The cube stops at conservative static collision bounds. Compare High (shadows) and Low presets, toggle distance fog, or show collision bounds. Rendering measurements include draw calls, triangles, resident geometries and CPU submission time; these are not GPU frame times. Flight and combat are later phases. See [the outdoor rendering decision](docs/decisions/0007-outdoor-rendering.md) and [baseline](docs/benchmarks/phase-7-outdoor.md).

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
- `npm run build` — typecheck and build all six entry points into dist/.
- `npm run preview` — serve the production build locally.
- `npx playwright install chromium` — install the browser once for smoke tests.
- `npm run test:browser` — production browser checks (build first).
- `npm run check` — lint, unit tests, source validation, production build, browser checks.

PowerShell users whose execution policy blocks npm.ps1 can use npm.cmd / npx.cmd.

## Repository conventions

Read agent.md, plan.md, tracker.md, and handoff.md before development. Runtime code lives in src/, tool entry points in tools/, and tests in tests/unit and tests/browser. Shared schema/validation lives in src/assets/ and does not depend on Three.js. Authoritative source assets belong in assets/source; generated GLB derivatives belong in assets/generated/ and are rebuilt locally.

Use small descriptive commits after tests pass. Never commit node_modules/, dist/, browser reports, caches, or credentials. Commit the lockfile; clean checkouts use npm ci. The Git remote is https://github.com/Jan-coder103/micro-voxel-world.git; main tracks origin/main. No deployment target is configured.

Platform and tooling choices are in docs/decisions/0001-foundation.md. The initial scale convention is now fixed by source v1 in docs/decisions/0003-voxel-source.md.

## Continue on another computer

Pull main (or clone the GitHub repository), use Node 24, then run `npm ci`, `npm run check`, and `npm run dev`. Use `npm run assets:export` to regenerate ignored GLBs. Read handoff.md for the latest stopping point. Browser-created session assets must be exported as JSON and transferred separately; they are not automatically committed.
