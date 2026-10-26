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

## Phase 3 — Standardized voxel source format and authoring guidance

Status: implemented; automated checks passed; agent visual inspection completed. Awaiting user verification.

- Replaced the provisional adapter with rendering-independent VoxelSource v1: fixed metre/0.1 m scale, base-centred pivot, +Y up/−Z front, explicit sparse occupancy, named opaque matte palette, category/tags/provenance, and stable IDs.
- Strict shared validation rejects unsupported versions/fields/materials/scale, invalid dimensions/coordinates, duplicate cells/palette IDs, unresolved palette references, and excessive allocations. Budgets: 256 per axis, 32768 occupied cells, 64 palette entries, 8 MiB UTF-8. The block creator remains 16 per axis and sessions remain capped at 24.
- Workshop import/export downloads editable JSON and reopens it after reload. Validation and duplicate-ID/session checks precede catalog mutation; failures retain the selection/preview. Download URLs/timers and asynchronous import callbacks respect teardown. Reload still discards session assets.
- Committed original marker and metre-cube sources; the catalog loads validated independent copies. Added structural JSON Schema, format contract, scale/orientation examples, project asset-authoring SKILL.md, and decision 0003. Geometry operations are bounded authoring helpers producing occupancy; executable recipes are not source fields. No dependencies added.
- Added npm run assets:validate for shared validation and round trips; it runs inside npm run check and returns nonzero on invalid sources. CLI input size is checked before reading.
- Full npm run check passed: lint, 53 unit tests, reference-source validation, strict TypeScript, both production entry points, and 13 Chromium tests, retaining earlier regressions. New coverage includes field failures, collection/byte bounds, maximum sparse occupancy, metadata/palette/placement preservation, CLI success/failure, browser download/reopen with identical rendered output, atomic invalid imports, literal names, duplicate IDs, and session limits.
- The skill-creator quick validator passed after installing its missing PyYAML dependency into ignored test output. The JSON Schema and both references were checked with jsonschema; the skill example passed both JSON Schema and the shared source validator. Project dependencies/lockfile are unchanged. Windows UTF-8 BOM imports, sparse array rejection, padded bounds/palette colors, and source file controls without WebGL also pass. Camera clipping now accommodates the larger source envelope.
- Agent visual inspection of full-page marker and exported/reopened coral-block captures confirmed readable file controls, preserved colors/orientation, displayed metre bounds, contained canvas, and no layout overlaps. Interactions were automated; Jan has not verified manually.
- The initial test attempt had one incorrectly prepared palette fixture; corrected it and the full suite passed. Shell sandbox process setup was unavailable; checks ran through reviewed commands outside it.
- Limitations: opaque matte material only, no arbitrary pivots/voxel scales, no automatic persistence, manual voxel editing, optimized meshing, or GLB export. Chromium only. Existing shared Three.js warning remains (~539 kB minified / 134 kB gzip); workshop bundle is ~73 kB / 13 kB gzip including sources. No gameplay performance claim.

## Phase 4 — Optimized voxel-to-mesh conversion

Status: implemented; automated checks passed; agent visual inspection completed. Awaiting user verification.

- Added rendering-independent sparse exposed-face extraction and deterministic greedy rectangle merging. Shared occupied faces are removed even across colors; merging preserves plane, outward direction and palette identity. No dense 256³ allocation or source schema change.
- Replaced workshop cube instances with indexed BufferGeometry, flat outward normals and linear vertex colors in one opaque matte material batch. Uses 32-bit indices above 65536 vertices. Declared authoring bounds/pivot and occupied mesh bounds remain distinct. Resource disposal remains idempotent.
- Added lazy-loaded browser GLB downloads and npm run assets:export for reproducible local derivatives. Installed Three.js GLTFExporter exports only the optimized mesh, without helpers/lights/cameras. Source values remain intact; metadata includes scale/pivot/orientation, source ID/schema, mesh version, provenance and SHA-256 source hash. Export failure releases temporary resources; browser retry and export without WebGL pass.
- Added npm run assets:benchmark and documented a local CPU measurement in docs/benchmarks/phase-4-meshing.md. Marker: 1896 original triangles → 580 culled → 46 greedy (23 quads, 97.57% reduction). Metre cube: 12000 → 1200 → 12 (6 quads, 99.90% reduction). Initial warm-run median validation+CPU meshing: 0.904 ms / 3.782 ms on Node 24.21.0, Windows x64, i5-8265U. These are small reference measurements, not gameplay/GPU targets.
- Generated GLBs are ignored and reproducible via npm run assets:export after pulling on another machine. Added pipeline ownership/batching/versioning/regeneration/LOD planning documentation, decision 0004, updated authoring guidance and desktop setup instructions. Project dependencies and lockfile are unchanged.
- Final npm run check passed: lint, 68 unit tests, reference source validation, strict TypeScript/production build, and 16 Chromium tests including earlier regressions. New coverage includes every nonempty 2³ occupancy pattern, multicolor adjacency, cavities, thin/disconnected/boundary features, deterministic ordering, exact face coverage, winding, unit normals, surface area, bounds, 98304-vertex index safety, disposal, binary headers, GLTFLoader reload/geometry/color/material/pivot/hash fidelity, deterministic repeated export, source preservation, CLI export/error/benchmark behavior, browser downloads/retry and WebGL fallback.
- Browser visual comparison renders original cube instances, culled faces, greedy meshes and reloaded GLBs from perspective/front/top views for the marker, metre cube and a two-color pair. All 27 comparisons passed with mean RGB difference below 0.5 on a 0–255 scale and nonempty foreground checks. Test harness routes read actual modules and are not shipped as a product entry point.
- Agent visual inspection of full-page Phase 4 marker/cube captures confirmed preserved shape/orientation/colors/metre bounds, clean merged surfaces, readable export controls/triangle statistics and contained canvas. Pointer/download interactions were automated; Jan has not verified manually. Updated authoring skill passed skill-creator quick validation using PyYAML in ignored test output.
- Early check attempts found test-only TypeScript issues and a JSON import attribute mismatch in the browser harness; corrected them before the full passing run. Sandbox process setup remains unavailable; work/checks used reviewed commands outside it.
- Limitations: opaque matte only; no manual editing/undo, lower-detail LOD generation, collision proxies, or runtime export cache. Only Chromium is checked. Existing Three.js bundle warning remains (~536 kB minified / 134 kB gzip); workshop ~78 kB / 16 kB gzip and lazy GLB exporter ~37 kB / 11 kB gzip. No gameplay performance claim.

## Next

Phase 5: manual add/remove/paint tools, palette editing, selection, reliable undo/redo, dirty-state feedback and source/export file handling using the existing v1 format and GLB pipeline. Keep meshing/source/viewer/export tests as regressions.

Phases 5–20: not started. User verification of Phases 1–4 remains outstanding.
