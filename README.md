# Micro Voxel World

TypeScript / Three.js browser game foundation and Phase 2 voxel asset viewer.

## Quick start

Use Node.js 24 LTS and npm (validated with Node 24.21.0 / npm 11.19.0).

```sh
npm ci
npm run dev
```

Open http://localhost:5173/ for the game setup scene, or http://localhost:5173/tools/voxel-editor/ for the voxel viewer. Gameplay and voxel editing are later phases.

## Voxel viewer

Select the direction marker or metre cube from the catalog. Left-drag to orbit, scroll to zoom, and right-drag to pan. Focus the canvas for arrow-key panning. Frame asset restores the perspective view; Front −Z and Top +Y give repeatable inspection angles. Toggle the metre grid/axes and bounding box independently. Measurements show voxel dimensions, physical bounds, and occupied cell count.

Create a solid block with a name, color, and 1–16 voxels per axis. Each voxel is provisionally 0.1 m. Assets are centred on XZ with the base at Y=0. The session is limited to 24 assets (including two fixtures); reloading discards created assets. There is no file saving or source import/export yet.

The in-memory adapter in tools/voxel-editor/provisional-assets.ts is temporary. It uses instanced cubes for inspection; schema/versioning and optimized surface meshing belong to Phases 3 and 4. See docs/decisions/0002-viewer.md.

## Commands

- `npm run dev` — local development server.
- `npm run typecheck` — strict TypeScript checks.
- `npm run lint` — ESLint.
- `npm test` — unit tests.
- `npm run build` — typecheck and build both entry points into dist/.
- `npm run preview` — serve the production build locally.
- `npx playwright install chromium` — install the browser once for smoke tests.
- `npm run test:browser` — production browser smoke checks (build first).
- `npm run check` — lint, unit tests, production build, browser smoke tests.

PowerShell users whose execution policy blocks npm.ps1 can use npm.cmd / npx.cmd.

## Repository conventions

Read agent.md, plan.md, tracker.md, and handoff.md before development. Runtime code lives in src/, tool entry points in tools/, and tests in tests/unit and tests/browser. Add subsystem folders when implementation requires them. Authoritative source assets belong in assets/source; generated derivatives belong in assets/generated with an explicit future export policy. No source assets exist yet.

Use small descriptive commits after tests pass. Never commit node_modules/, dist/, browser reports, caches, or credentials. Commit the lockfile; clean checkouts use npm ci. No remote or publishing target is configured.

Platform, units, and tooling choices are in docs/decisions/0001-foundation.md. Asset schema/authoring skill is deferred to Phase 3.
