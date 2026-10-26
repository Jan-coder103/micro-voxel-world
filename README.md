# Micro Voxel World

TypeScript / Three.js browser game foundation and voxel source workshop (Phase 3).

## Quick start

Use Node.js 24 LTS and npm (validated with Node 24.21.0 / npm 11.19.0).

```sh
npm ci
npm run dev
```

Open http://localhost:5173/ for the game setup scene, or http://localhost:5173/tools/voxel-editor/ for the voxel workshop. Gameplay and manual voxel editing are later phases.

## Voxel workshop

Select the direction marker or metre cube from the catalog. Left-drag to orbit, scroll to zoom, and right-drag to pan. Focus the canvas for arrow-key panning. Frame asset restores perspective; Front −Z and Top +Y provide repeatable inspection angles. Toggle the metre grid/axes and bounding box independently. Measurements show grid dimensions, declared physical bounds, and occupied cells.

Create a solid block with a name, color, and 1–16 voxels per axis. Each voxel is 0.1 m, with +Y up, −Z forward, and the base centred on XZ. Use **Export selected source** to download an editable `.voxel.json` file. Reload and use **Import voxel JSON** to reopen it. The session holds up to 24 assets including fixtures; reload discards the session, so keep your downloads. Duplicate IDs fail without overwriting existing assets.

Source v1 uses sparse occupancy, a named palette of opaque matte colors, explicit units/placement, and provenance. Imported sources may span up to 256 cells per axis with at most 32768 occupied cells, 64 palette entries, and 8 MiB of UTF-8 JSON. Unsupported versions, fields, scales, materials, references, and coordinates produce field-specific errors before catalog mutation. No GLB export or automatic persistence exists yet.

See [the format contract](docs/asset-authoring/format.md), [authoring skill](docs/asset-authoring/mvw-voxel-assets/SKILL.md), and [Phase 3 decision](docs/decisions/0003-voxel-source.md). The viewer still uses instanced cubes; optimized meshing and GLB export are Phase 4.

## Commands

- `npm run dev` — local development server.
- `npm run typecheck` — strict TypeScript checks.
- `npm run lint` — ESLint.
- `npm test` — unit tests, including source round trips and validation CLI checks.
- `npm run assets:validate` — validate and round-trip all committed `.voxel.json` reference sources.
- `npm run assets:validate -- path/to/asset.voxel.json` — validate one or more named source files; failures return nonzero.
- `npm run build` — typecheck and build both entry points into dist/.
- `npm run preview` — serve the production build locally.
- `npx playwright install chromium` — install the browser once for smoke tests.
- `npm run test:browser` — production browser checks (build first).
- `npm run check` — lint, unit tests, source validation, production build, browser checks.

PowerShell users whose execution policy blocks npm.ps1 can use npm.cmd / npx.cmd.

## Repository conventions

Read agent.md, plan.md, tracker.md, and handoff.md before development. Runtime code lives in src/, tool entry points in tools/, and tests in tests/unit and tests/browser. Shared schema/validation lives in src/assets/ and does not depend on Three.js. Authoritative source assets belong in assets/source; generated runtime derivatives belong in assets/generated after Phase 4.

Use small descriptive commits after tests pass. Never commit node_modules/, dist/, browser reports, caches, or credentials. Commit the lockfile; clean checkouts use npm ci. No remote or publishing target is configured.

Platform and tooling choices are in docs/decisions/0001-foundation.md. The initial scale convention is now fixed by source v1 in docs/decisions/0003-voxel-source.md.
