# Micro Voxel World

TypeScript / Three.js browser game foundation and voxel source workshop with manual editing, optimized meshing and GLB export, plus the Phase 7 outdoor rendering scene.

## Quick start

Use Node.js 24 LTS and npm (validated with Node 24.21.0 / npm 11.19.0).

```sh
npm ci
npm run dev
```

Open http://localhost:5173/ for the outdoor test scene, or http://localhost:5173/tools/voxel-editor/ for the voxel workshop. Start the simulation, focus the scene, use WASD/arrows to move the test cube and hold Space for cosmetic test pulses. Pause/Resume freezes and continues simulation; Reset returns to ready with zero ticks and cleared effects. Window blur/hidden tabs pause automatically. Diagnostics report 60 Hz simulation ticks, pool use and discarded catchup time. The 64 × 64 m scene contains stepped terrain, a road, buildings, and instanced vegetation at the established metre scale. The cube stops at conservative static collision bounds. Compare High (shadows) and Low presets, toggle distance fog, or show collision bounds. Rendering measurements include draw calls, triangles, resident geometries and CPU submission time; these are not GPU frame times. Flight and combat are later phases. See [the outdoor rendering decision](docs/decisions/0007-outdoor-rendering.md) and [baseline](docs/benchmarks/phase-7-outdoor.md).

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
- `npm run build` — typecheck and build both entry points into dist/.
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
