# Micro Voxel World

Phase 1 foundation for a TypeScript / Three.js browser game and voxel workshop.

## Quick start

Use Node.js 24 LTS and npm (validated with Node 24.21.0 / npm 11.19.0).

```sh
npm ci
npm run dev
```

Open http://localhost:5173/ for the game setup scene, or http://localhost:5173/tools/voxel-editor/ for the tool setup scene. Both show a one-metre cube and grid. Gameplay and asset editing are later phases.

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
