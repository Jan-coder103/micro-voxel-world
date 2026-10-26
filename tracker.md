# Progress tracker

## Phase 1 — Project setup

Status: automated checks passed; phase 1 exit met. Awaiting user verification.

- Initialized Git on main; preserved the supplied plan.md.
- Added TypeScript strict mode, Three.js, Vite game/workshop entry points, shared scale fixture, resize handling, WebGL fallback, and resource disposal.
- Added ESLint, Vitest, production Playwright smoke checks, lockfile, ignore rules, and reproducible README commands.
- Added agent.md / AGENTS.md routing and foundation decisions in docs/decisions/0001-foundation.md. Plan/tracker/handoff remain separate.
- Browser baseline: desktop WebGL 2, keyboard/mouse. Units: 1 m per unit, provisional 0.1 m asset voxels. GPU/reference gameplay hardware remains unverified (host query denied); no performance claim.
- Clean npm ci succeeded with Node 24.21.0 / npm 11.19.0; audit reported zero vulnerabilities. Lint, two unit tests, typecheck, and both production entry-point builds passed.
- Final `npm run check` passed: lint, 2 unit tests, strict types, production build, and 4 Chromium browser tests (game/tool rendering and resize, navigation, unavailable-WebGL fallback). Browser coverage found and resolved a two-pixel canvas overflow caused by including container borders in render size.
- Visual inspection of both 800×600 browser captures confirmed the lit cube, aligned grid, active navigation, readable headings, and contained canvas. Browser interaction is automated; Jan has not verified the result.
- Earlier browser attempt ran before Chromium download completed and failed to launch. A leftover test process also held a native build module open on the first npm ci attempt; stopping it allowed clean install.
- Nonblocking limitation: shared Three.js setup bundle is approximately 534 kB minified / 133 kB gzip; Vite emits its default 500 kB warning.

## Phase 2 — Browser-based voxel asset viewer

Status: implemented; automated checks passed; agent visual inspection completed. Awaiting user verification.

- Workshop now provides OrbitControls (orbit, zoom, mouse/keyboard pan), perspective framing, front/top presets, hemisphere/directional lighting, metre grid/axes, and optional bounds.
- Added two fresh in-memory fixtures: asymmetric direction marker (158 cells) and metre cube (1,000 cells). Catalog selection updates preview, cell count, dimensions, and physical bounds.
- Solid-block creation supports names, colors, and whole-number dimensions from 1–16 cells per axis. Selected assets use shared instanced cube geometry/material. Selection and teardown release owned GPU/UI resources; unit tests check disposal.
- Names render as text. Validation rejects invalid dimensions, names, and colors before allocation. Session capped at 24 assets; all created data is discarded on reload, as stated in the UI. No saving/export or stable file format is implied.
- The adapter is explicitly provisional; see docs/decisions/0002-viewer.md. No dependencies added. Removed the obsolete Phase 1 tool branch from the game bootstrap.
- Final `npm run check` passed: lint, 13 unit tests, strict TypeScript, both production entry points, and 9 Chromium browser tests. Existing Phase 1 regressions pass. Added coverage for selection/creation, literal names, invalid input, reload semantics, allocation cap, orbit/zoom/pan, keyboard pan, frame/front/top views, display toggles across selection, and workshop WebGL fallback.
- Agent visual inspection: reviewed 1280 px full-page captures of the marker, a created 2×3×4 coral block, and top view, plus the 800×600 workshop capture. Confirmed readable catalog/measurements, asymmetric shape/color orientation, visible bounds, ground placement, and contained canvas. Pointer/key interactions were automated; Jan has not verified them manually.
- Limitations: internal cube faces and minor surface seams remain in this provisional preview (Phase 4 handles optimized meshing). Only Chromium is checked. Shared bundle warning remains (~539 kB minified / 134 kB gzip); no rendering benchmark or gameplay performance claim.

## Next

Phase 3: standardized voxel data format, validation, round-trip import/export, reference sources, and asset-authoring skill.md. Replace the provisional adapter after deciding the authoritative representation, bounds, palette/material policy, and versioning. Keep the existing viewer tests as regressions.

Phases 3–20: not started. No gameplay, meshing, editor, streaming, combat, persistence, or performance benchmark is implied by the setup.
