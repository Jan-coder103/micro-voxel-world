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

## Phase 5 — Complete voxel asset editor

Status: implemented; automated checks passed; agent visual inspection completed. Awaiting user verification.

- Added rendering-independent VoxelDocument with atomic validated add/remove/paint, palette add/update/remove (including reference renames), and source name/grid changes. Coordinate selection reports occupancy and draws a white cell box; editor commands preserve the camera. Empty additions, occupied removals, invalid bounds/references, used-palette deletion and removing the final cell are handled with actionable errors. Shrinking never silently crops source data.
- Per-asset undo/redo retains up to 64 snapshots / 8 MiB UTF-8, evicting oldest steps. Invalid/no-op commands preserve history; new edits discard redo. Source getters return owned copies; source metadata/array order survive history and JSON round trips. Selection/catalog switching retains documents and histories.
- Created sources start unsaved; imported sources/fixtures start clean. Source JSON export records the exported comparison; GLB never clears dirty state. Browser unload guard detects any unsaved document. Explicit import replacement supports existing IDs, including edited fixtures, validates before replacement, discards only that document’s edits/history, and resets the replacement option after success. Default duplicate rejection and session limits remain.
- Updated README, format/authoring guidance, agent entry point and decision 0005. No new dependencies or schema changes. Edits remesh once per explicit command; coordinate selection only updates the helper. Generated derivatives remain ignored.
- Final `npm run check` passed on Linux, Node 24.22.1: lint, 74 unit tests, committed-source validation, strict TypeScript/production build and 20 Chromium browser tests. All earlier source/meshing/GLB/viewer regressions pass, including the 27 existing rendered comparisons. New coverage exercises edit/history round trips, branching and atomic failures, palette references, final-cell protection, step/UTF-8 history bounds, ownership, dirty/export comparisons, per-asset history, representative edit/export/reopen, fixture replacement, invalid replacement, browser navigation warning, and editing/GLB export without WebGL.
- Agent visual inspection of the 1280 px full-page edited block capture confirmed resized bounds, rose cells and disconnected addition, white selection box, readable file/edit/palette controls, history/dirty feedback and contained canvas. Interactions were automated; Jan has not verified them manually.
- Initial sandbox run could not capture Node subprocess output (EPERM); full checks succeeded outside the sandbox. Initial browser checks found an active-palette reset after rename and ambiguous alert selectors; corrected both, plus a test dialog handling deadlock, before the final passing run.
- Limitations: coordinate-based single-cell editing; no brush, raycast picking or multiselection. V1 requires at least one occupied cell. Downloads are user-managed; no automatic persistence/recovery. Browser unload warnings may be suppressed. History bounds exclude current sources and saved comparisons; large files retain fewer steps. Maximum-size interactive timing is unmeasured. Chromium only. Existing shared Three.js warning remains (~536 kB); workshop ~85 kB / 18 kB gzip. No gameplay performance claim.

## Reference asset kit — before Phase 6

Status: five assets authored; automated checks passed; agent visual inspection completed. Awaiting user verification.

- Added original VoxelSource v1 references: 1.8 m zombie, A-10-style attack aircraft (17.4 m span / 16.4 m length), 6 m field tree, 8 × 6 × 4 m utility building, and 12 × 16 m combined road/landing apron. Preserved 0.1 m scale, base-centred pivot, −Z facing, sparse source budgets and original provenance. Shared muted palette families; no third-party models/textures or new dependencies.
- Sources live under assets/source/ref-*.voxel.json and are imported through existing workshop file controls; the default two-fixture catalog is unchanged. Generated five ignored GLBs with the existing CLI. Aircraft/building shells keep occupancy bounded. Each asset is face-connected and reaches ground level. Aircraft has fixed gear, twin engines/fins and hardpoints; zombie has separated legs/boots and a readable face; building has door/windows/roof plant; pad has lane lines/ring/H.
- Added tests/unit/reference-kit.test.ts: source validation/round trips, expected envelope/category, grounded connected occupancy and mesh reduction for all five. Added five Chromium import/render tests exercising perspective/front/top views, displayed scale, clean import state and absence of page errors. Final npm run check passed: lint, 79 unit tests, all seven committed source validations, strict types/build and 25 Chromium tests. Existing regressions and 27 earlier render comparisons pass. CLI export also succeeds for all seven sources.
- Agent visually inspected a 15-view contact sheet plus the larger aircraft perspective capture. Confirmed silhouettes, orientation, named details, ground placement and all five inspection views; front view of the thin road module is correctly edge-on. Captures/interactions were automated; Jan has not verified manually. Prepared a local ZIP with five editable JSON sources, five GLBs, guide and preview; generated package/captures remain ignored in test-results.
- Limitations: static unrigged references, opaque matte canopy/windows, no collision or gameplay behavior. The 9 m marking ring is a ground/helicopter reference, not a fixed-wing runway. Rounded tree surfaces have 5,240 triangles before later LOD work. No new performance claim or Phase 6/7 completion. Existing Three.js bundle warning remains.

## Second reference asset kit — before Phase 6

Status: five more original assets authored; automated checks passed; agent visual inspection completed. Awaiting user verification.

- Added ref-pine-tree (4 × 8 × 4 m), ref-derelict-car (2 × 1.5 × 4.4 m), ref-streetlight (1 × 6.5 × 2.4 m), ref-road-barrier (3 × 1 × 0.8 m) and ref-small-warehouse (10 × 5 × 8 m). Matched existing 0.1 m scale, facing, pivot, opaque matte palette families and provenance. Sources remain below occupancy/byte budgets with connected grounded geometry. No third-party models/textures or dependencies.
- Pine has layered tapered foliage, car has grounded tires/bumpers/windows/rust, streetlight has a forward arm and lens, barrier has two marked faces and a tapered base, warehouse has a hollow shell/connected stepped gable roof/shutter/service door/windows. Static artwork only: no driving, animation, actual light source, collision or new game systems. Warehouse uses 31,446 cells; pine has 7,628 triangles pending later LOD work.
- Extended source integrity/connectivity/meshing and three-view browser import coverage to all ten references. Final npm run check passed: lint, 84 unit tests, all twelve source validations, strict typecheck/production build and 30 Chromium tests. New five GLBs exported successfully. Expanded library benchmark exceeded its old five-second test timeout; set a 30-second allowance for the CLI smoke test while preserving every assertion and all-source coverage. No production pipeline change.
- Agent inspected the 15-view kit-2 sheet: confirmed silhouettes, ground contact, front/top direction, roof, car details, marked barrier, lamp and foliage tiers. Browser interactions/captures are automated; Jan has not verified manually. Packaged five sources/five GLBs with guide and previews; verified ZIP integrity and source hashes in every GLB. Durable local deliveries live beside the repository in ../asset-deliveries/reference-kit-2/; test captures and derivatives are ignored. Updated source guide, README and handoff. Existing bundle warning remains. Phase 6 has not started.

## Third reference asset kit — before Phase 6

Status: five more original assets authored; automated checks passed; agent visual inspection completed. Awaiting user verification.

- Added ref-water-tower (6 × 11 × 6 m), ref-shipping-container (2.5 × 2.6 × 6.1 m), ref-bus-shelter (5 × 2.8 × 2 m), ref-fuel-tank (4.8 × 4 × 7 m) and ref-watchtower (4.6 × 9 × 4.6 m). All match the established 0.1 m scale, pivot, −Z facing and muted palette families. Original authorship/provenance, validated sparse source budgets and connected grounded geometry; no dependencies or third-party models/textures.
- Detailed silhouettes: braced/ladder-equipped water tower with cylindrical tank/conical roof, corrugated container/locking bars, bus shelter bench/sign/frame, horizontal fuel tank with saddles/bands/neck/pipe, and elevated military cabin with windows/ladder/braces/mast. All are static matte artwork; no interaction, collision, lighting, animation or gameplay behavior is implied.
- Extended integrity/round-trip/scale/connectivity/meshing and three-view browser import tests to all fifteen references. Final npm run check passed: lint, 89 unit tests, all seventeen source validations, strict types/build and 35 Chromium tests, retaining earlier regressions and 27 render comparisons. CLI export succeeds for all new assets.
- Agent reviewed all fifteen new perspective/front/top captures on a contact sheet: readable forms and details, correct facing and ground placement. Interactions/captures are automated; Jan has not manually verified this kit. Packaged five JSON sources/five GLBs with guide and previews; verified ZIP integrity and every GLB’s source hash. Durable local delivery: ../asset-deliveries/reference-kit-3/. Updated README/source guide/handoff. Prior praise is aesthetic feedback, not user verification of editor behavior or these new assets.
- Limits remain: no LOD/collision/gameplay integration; stepped rounded surfaces (water tower 4,894 triangles, fuel tank 1,732). Existing shared bundle warning unchanged. Phase 6 has not started.

## Fourth reference asset kit — before Phase 6

Status: five more original rural assets authored; automated checks passed; agent visual inspection completed. Awaiting user verification.

- Added ref-farmhouse (7 × 5 × 6 m), ref-barn (8 × 5.8 × 7 m), ref-tractor (2.4 × 2.9 × 4.2 m), ref-windmill (6 × 10 × 4 m) and ref-wooden-bridge (4 × 2.2 × 10 m). Established 0.1 m scale, base-centred pivot, −Z front, muted material families, original provenance and source budgets retained. Every asset is face-connected and reaches ground level. No dependencies or third-party artwork.
- Rural silhouettes/details: farmhouse pitched roof/chimney/framed windows, barn gambrel roof/cross-braced doors/loft window, tractor unequal wheel sizes/yellow hubs/cab/exhaust, windmill taper/cone/four diagonal pale sails, bridge deck planks/stringers/grounded piles/railings. Static references: no rigs, rotating sails, driving, collision, usable interiors or gameplay integration. Bridge deck is 0.8 m above its base and needs later terrain/approach placement.
- Extended round-trip/scale/category/connectivity/meshing and perspective/front/top import tests to all twenty references. Final npm run check passed: lint, 94 unit tests, all twenty-two source validations, strict types/build and 40 Chromium tests, retaining previous regressions/27 rendered comparisons. All five new GLBs exported successfully. No pipeline/dependency changes; existing shared bundle warning remains.
- Agent reviewed all fifteen new inspection captures: correct form/facing/grounding and recognizable rural details. Interactions/captures are automated; user verification remains outstanding. Packaged five sources/five GLBs, guide and previews; verified archive integrity and matching source hashes. Durable local delivery: ../asset-deliveries/reference-kit-4/. Updated README/source guide/handoff. Phase 6 has not started.

## Phase 6 — Game engine architecture

Status: implemented; automated checks passed; agent visual inspection completed. Awaiting user verification.

- Added rendering-independent Simulation with ready/running/paused/disposed lifecycle, a 60 Hz accumulator, eight-step catchup cap and reported discarded time. Pause drops fractional accumulated time; resume starts a new browser timestamp. Reset clears position, ticks, timing, input and pooled effects while retaining pool allocations.
- Focus-scoped WASD/arrows move the metre test cube at 3 m/s within an 8 m boundary. Space exercises a preallocated 16-slot, one-second cosmetic pulse pool. Input clears on focus loss; window blur/hidden tabs pause and require explicit resume. This is an architecture exercise, not aircraft or weapon gameplay.
- Game controls expose Start/Pause/Resume/Reset and diagnostics. The direction marker uses the same validated source and greedy mesher as the workshop. Explicit idempotent disposal cancels animation, disconnects resize/input/browser listeners, and releases all mesh/renderer resources. Persisted pagehide retains resources for browser back-forward cache; HMR removes its pagehide listener.
- New unit coverage compares 30/144 Hz results, lifecycle/reset/disposed guards, capped catchup, invalid elapsed time, fixed pool identity/reuse/expiry and repeated fixture disposal. Browser coverage exercises focused motion, pulses, pause/resume, repeated reset, control-focus isolation and repeated teardown. Existing regressions remain enabled.
- Agent inspected the full-page engine capture: readable controls/diagnostics, visible metre grid/cube/shared marker, contained viewport. Interactions were automated; Jan has not manually verified. Decision: docs/decisions/0006-engine.md. No new dependencies.
- Final `npm run check` passed on Node 24.22.1: lint, 97 unit tests, all 22 committed source validations, strict TypeScript/production build and 42 Chromium browser tests, preserving earlier regressions and 27 rendered comparisons. Shared bundle is ~548 kB minified / 137 kB gzip.
- Limitations: direct fixed-state rendering without interpolation, Chromium only, cosmetic pulses rather than weapons, no terrain/flight/combat or device performance claim. Existing bundle warning remains. Initial sandbox subprocess output failures required the established outside-sandbox check workflow; first browser run exposed diagnostics status-role ambiguity, corrected before final checks.

## Phase 7 — Micro-voxel terrain and environment rendering

Status: implemented; automated checks passed; agent visual inspection completed. Awaiting user verification.

- Replaced the game's isolated setup view with a fixed 64 × 64 m rural outdoor fixture. Exposed heightfield surfaces use 0.5 m samples on a 0.1 m lattice, a flat central area and stepped edge hills. No dense world occupancy or per-voxel render objects. Reused unchanged original utility-building/barn/tree/barrier/streetlight sources through the existing validator/greedy mesher and physical placement convention.
- Two utility buildings, one barn, 36 trees, six barriers and six streetlights share five source meshes through instance batches; road markings use a sixth batch. Road/track surfaces avoid overlapping coplanar junctions. Materials retain matte vertex colors and metre scale.
- Added warm directional lighting, hemisphere fill, optional distance fog, High (2048² PCF shadows, pixel ratio capped at 1.5) and Low (no shadows, cap 1) presets. Evaluated the baseline against screen-space AO requirements: SSAO/GI are not implemented or benchmarked, deferred pending a measured visual need. No baked source/merge-policy change.
- Derived 51 conservative source-envelope AABBs; optional wireframe display. Rendering-independent intersection queries injected into Simulation block the bounded low-speed cube and allow axis sliding; ground height follows road/terrain. Not aircraft collision or exact foliage/interior geometry. Explicit release covers instance buffers, shared source geometry/materials, debug helpers, terrain, road resources and shadow targets. Reset retains scene allocations.
- Added UI structural/CPU submission measurements and automated High/Low screenshots/JSON. Unit tests cover terrain lattice/bounds/normals, transformed/grounded proxies, hit/miss queries, scene batching, cube blocking/ground height, shared-resource disposal and simulation wall sliding. Browser coverage exercises presets/fog/bounds and geometry allocation stability; engine/editor/source/GLB/viewer regressions remain enabled.
- Initial unit checks found a test-only expensive assertion loop and signed-zero comparison; corrected without changing terrain semantics. The larger High scene under SwiftShader exceeded the engine interaction test's 30- and 90-second total limits (the latter at its final screenshot, after all assertions). Lifecycle coverage now selects Low and retains a 90-second allowance; the separate outdoor test still measures both presets, preserving quality coverage. Visual preset comparison then exposed cached High shadow shaders persisting after Low disabled the shadow pass; quality changes now refresh materials and viewport captures must differ. No feature/test assertions removed. Agent inspected final High, Low and no-fog bounds captures: readable rural silhouettes, directional shadows correctly removed in Low, terraced edges and aligned collider envelopes. Interactions were automated; Jan has not verified manually.
- Final `npm run check` passed on Node 24.22.1: lint, 101 unit tests, all 22 source validations, strict TypeScript/production build and 43 Chromium browser tests, including previous regressions/27 rendered comparisons. Measured at 1150 × 380 backbuffer on SwiftShader: High 17 calls / 440,152 triangles, Low 11 / 248,050, both 11 resident geometries. CPU submission medians 1.30 / 0.30 ms; scene CPU build 310.8 ms. These are software-renderer samples, not GPU frame times or a gameplay FPS target. Bounds upload 51 helper geometries once (62 total) and reuse them. Game bundle ~2.78 MB minified / 211 kB gzip; existing bundle warnings remain.
- Limits: fixed camera/finite static scene, synchronous source meshing, bundled source data, conservative AABBs, open terrain undersurface, no AO/GI, no chunking/LOD/flight/combat, Chromium only. Performance details and scope: docs/decisions/0007-outdoor-rendering.md; actual baseline: docs/benchmarks/phase-7-outdoor.md. User verification remains outstanding.

## Phase 8 — Chunks, LOD and world streaming

Status: implemented; automated checks passed; agent visual inspection completed. Awaiting user verification. Jan's “Looks good!” after Phase 7 is positive visual feedback, not confirmation of its full functional checklist.

- Added production Streaming Lab at /tools/streaming/, linked from Game. The Phase 7 rural scene and workshop remain regression entry points. A bounded moving camera, 256 m travel jumps, return-home action, seed control and streaming diagnostics exercise real worker generation before aircraft exist.
- Added pure seeded global heightfield generation with 32 m chunks and four geometric tiers (1/2/4/8 m interiors). Boundary-cell fans preserve identical 1 m perimeter samples at every tier, including negative coordinates; tests compare both axes for all mixed-tier pairs. Height samples retain 0.1 m quantization. Tier colors make transitions inspectable; no detailed asset LOD or advanced biome generation is implied.
- Rendering-independent ChunkStream keeps at most 49 residents and two jobs/completed payloads combined, integrates at most two chunks/frame, prioritizes nearer tiers and swaps each key atomically. Outside-window resources unload; old wanted tiers remain until replacement. Per-request abort state plus current signature prevents cancelled results from attaching, including leave/return to the same signature. Late/queued results and disposal are covered. Worker slots remain occupied until reply; seed reload/teardown terminate workers. Error signatures avoid frame-by-frame retry loops.
- Added schema/generator/seed-scoped localStorage deltas for stable test-beacon IDs. Cleared markers stay absent through unload/reload, seed switching and browser reload; attach reads live deltas before presenting a marker. Strict validation bounds records to 4096 canonical IDs / 256 KiB and rejects incompatible versions/seeds/fields. Corrupt bytes remain untouched; denied/full storage produces explicit session-only state. Terrain never changes; this is not an enemy/full-save system.
- Added lifecycle/ownership tests for work/resident bounds, tier replacement, exact regeneration, seed differences, mixed-tier edges, mathematical negative floor, cancellation/ABA stale results, completed/disposed output release, failures and shared GPU-resource lifetime. Browser traversal covers repeated east/west/home visits, seed changes/reload, durable marker clearance, focused movement, corrupt storage, WebGL fallback, worker-startup fallback and repeated teardown. Existing regressions remain enabled.
- The initial seed-difference test exposed adjacent seeds collapsing to the same quantized heights; added integer seed mixing before field generation. Initial full checks passed (112 unit / 46 browser); added final ownership/worker-fallback coverage afterward. Agent inspected home and return captures: continuous terrain at colored tier boundaries, visible markers, retained clearance and stable resident/GPU counts. Final home/away/return captures inspected: tier borders remain continuous, the cleared centre marker stays absent after return/reload, and two stale results were discarded with zero failures. Browser interactions are automated; Jan has not verified Phase 8 manually.
- Final `npm run check` passed on Node 24.22.1: lint, 113 unit tests, all 22 source validations, strict TypeScript/three-entry production build and 47 Chromium browser tests, preserving previous regressions/27 rendered comparisons. Captured home and return each retain 49 logical chunks / 39 uploaded geometries; the away view uploads 40, all below the tested 50-geometry cap. Home has 70 calls / 20,752 rendered triangles; return after clearing has 69 / 20,740. Counts depend on frustum visibility; no FPS claim. Streaming entry ~11.86 kB minified / 4.97 kB gzip, worker ~1.20 kB; shared runtime and prior rural bundle warnings remain.
- Limits: camera ±130900 m, 49-chunk radius-three patch, simple heightfield, flat-normal shading/tier pops, logical cancellation of short synchronous tasks, count-based integration budget, transient loading gaps after rapid travel, no hysteresis/velocity prefetch/asset LOD/streamed collision/aircraft/gameplay saves/cloud sync. Seed and camera selection are not saved. Storage is browser/profile/origin-specific, with no migration/export UI. No device FPS claim. Decision: docs/decisions/0008-streaming.md. No new dependencies or source-asset changes.

## Phase 9 — Aircraft flight mechanics and controls

Status: implemented; automated checks passed; agent visual inspection completed. Awaiting user verification.

- Chose an arcade fixed-wing attack aircraft; recorded model/controls in docs/decisions/0009-flight.md before implementation. Added Flight lab at /tools/flight/ with a lightweight six-part voxel-style silhouette; original source references remain unchanged.
- Pure rendering-independent 60 Hz Flight controls 30–100 m/s throttle, bounded pitch/bank and bank-driven turns. Assisted release levels attitude; Direct retains it. Explicit ready/running/paused/crashed lifecycle, eight-step catchup cap with discarded-time diagnostics, 250 m altitude ceiling and bounded world. Focus/window/visibility loss pauses with explicit resume. Recovery resets above home.
- Damped chase camera and bounded worker streaming follow aircraft position. Diagnostics expose current-chunk visibility/loading gaps, resident/jobs/results/stale/failure counts and geometry count. Authoritative seeded terrain collision sweeps each fixed step at at most 0.25 m intervals with conservative 3 m clearance, independent of render/worker readiness. Crashes freeze movement until recovery. No streamed props or full-airframe collision.
- Unit coverage: frame-rate equivalence, catchup/lifecycle/reset, invalid time/input, speed/climb/turns, assisted versus direct release, narrow terrain obstacle and world-limit crashes. Browser checks exercise high-speed traversal, controls, pause/focus isolation, direct-mode crash/recovery, bounded resources, fallback and idempotent teardown. Earlier regressions retained.
- Agent inspected the full-page chase-view capture: readable aircraft, colored terrain tiers, contained viewport and controls. Interactions are automated, not user-verified. No dependencies added.
- Validation: full `npm run check` passed on Node 24.22.1 (lint, 118 unit tests, all 22 sources, strict types/four-entry build, 48 Chromium tests). Then strengthened flight coverage to sustain over 90 m/s, bound uploaded geometries to 56, wait for settled recovery capture, and cover WebGL/worker fallback: both final flight browser tests passed; lint/typecheck rerun passed. Final capture has 49 residents, zero jobs/results and zero failures. Flight entry 7.60 kB minified / 3.53 kB gzip plus shared runtime; no device FPS claim. Sandbox CLI-output failures required the established outside-sandbox workflow; default Node 22 was replaced with installed Node 24 for validation.
- Limits: simple arcade model/silhouette rather than the reference aircraft mesh; no stall/lift/drag/damage/weapons, gamepad/rebinding, production scenery or velocity prefetch. Loading gaps remain visible during travel, with collision active. Count-based streaming integration and prior bundle warnings remain; no hardware FPS claim.

## Phase 10 — Reusable weapons and explosions

Status: implemented; automated checks passed; agent visual inspection completed. Awaiting user verification.

- Added Weapons lab at /tools/weapons/, linked from Game and Flight lab. Extracted shared flight lab mounting into tools/flight/lab.ts; the original Flight lab retains its controls, scene and resource baseline. New production entry uses six static resettable target spheres (three airborne, three ground), without implementing zombies or persistence. Decision: docs/decisions/0010-weapons.md.
- Data-defined minigun (20 Hz / 4 damage), autocannon (5 Hz / 22 damage) and explosive shell (1 Hz / 150 maximum blast damage, 16 m radius), all 240 m range. Unlimited test ammo/zero spread. Space fires; keys 1/2/3 or selector choose weapon. A successful-flight-tick callback drives authoritative combat at 60 Hz, including catchup cap, pause/crash guards and per-weapon cooldowns. Reset restores targets, counters, effects and aircraft; input remains focus scoped.
- Static 32 m spatial hash indexes bounded target spheres. Segment-envelope queries deduplicate candidates; exact nearest ray/sphere intersections prevent thin-target tunnelling. Seeded terrain samples at <=0.25 m / conservative 0.15 m clearance block shots and blast centre visibility independently of streamed geometry. Ground blast origins lift to at least 0.3 m above ground. Explosions apply linear centre-distance falloff once per live target, with zero at/outside radius and no extra direct damage. Dead hulls disappear; live target hulls block rays but do not shield blasts. Terrain stays intact; no building collision/medium-far enemy population exists in this test range.
- Fixed 128-slot tracer/muzzle/impact/blast pool drops only cosmetics on saturation. Shared target/effect geometry/materials have explicit idempotent disposal; no per-shot GPU allocations, persistent debris or dynamic lights. Distinct synthesized Web Audio placeholders are muted by default, gesture enabled, capped at eight voices, stopped on pause/reset and closed on disposal. Unavailable audio is reported and cannot suppress damage. Shot sounds may coalesce per render frame; audible quality has not been auditioned by the user.
- New unit checks cover 30/144 Hz cadence and damage for all weapons, thin/nearest/inside ray hits, terrain shields, spatial exclusion/negative boundaries/deduplication, blast falloff/once-only damage/dead targets/ground impacts, selection cooldowns, cosmetic saturation/expiry/reset, bounded malformed inputs, GPU ownership and audio cap/mute/failure/disposal. Flight callbacks exclude crash ticks and cap combat catchup. Browser tests exercise target kills, all weapon selection, two explosion/reset passes, focused firing and pause isolation, optional sound/failure, resource caps and repeated teardown. Initial browser check exposed an implicit selector label including its option text; explicit accessible naming fixed it. Both weapon tests and existing flight tests pass.
- Agent inspected the full-page paused explosion capture: readable gold targets, orange blast bounds, aircraft and controls. Capture reports one shot / two damaging hits / one target cleared, 49 residents and no jobs/results/failures. Interactions are automated; user verification remains outstanding.
- Final `npm run check` passed on Node 24.22.1 using the established outside-sandbox workflow: lint, 132 unit tests, all 22 sources, strict types/five-entry production build, and 51 Chromium tests. All earlier regressions and 27 rendered comparisons retained. Shared flight/weapons lab bundle 17.80 kB minified / 7.35 kB gzip, plus shared runtime. Repeated range passes stay within 58 uploaded geometries; Flight lab retains its tested 56 cap.
- Limits: ray weapons and visual blast bounds rather than ballistic rounds/final explosion VFX; simple static range targets, no zombie AI, saved kills, damageable buildings, ammo/heat/spread/recoil or final audio assets. Existing streaming gaps/bundle warnings remain. No hardware FPS claim; no dependencies or source assets changed.

## Phase 11 — Zombies and scalable horde simulation

Status: implemented; automated checks passed; agent visual inspection completed. Awaiting user verification.

- Added sixth production entry /tools/hordes/, an observer lab linked from Game and Flight/Weapons labs. Reuses unchanged original ref-zombie source through existing validation/greedy meshing at metre scale. Four instance batches render near zombies, medium boxes, far survivor proxies and static walls; no per-agent render objects. Decision: docs/decisions/0011-hordes.md.
- Seeded bounded 9 × 9 encounter region, 32 stable member slots each (2,592 represented before kills). At most 49 groups resident; compact authoritative state bounded to 81 groups independently of individual/render residency. Near 60 Hz / medium 10 Hz / far 1 Hz with 45/55 m and 85/100 m hysteresis. Unloaded groups freeze. Tier/attack/checkpoint changes integrate pending elapsed motion. Stable IDs, exact health arrays, formation offsets and patrol progress survive all transitions.
- Four-waypoint coarse corridors route formations around each wall. Near agents use a 2 m spatial neighbour hash for local separation and formation following; all stay terrain-grounded in bounded lanes. Not a general city/bridge/slope pathfinder. Hit reactions tint/compress visible instances; death removes the instance, with no corpse allocations.
- Combat now accepts general target-query and damage callbacks plus optional blocker queries. Horde broadphase visits intersecting home cells, resolves exact per-member spheres even for far/unloaded groups, and writes damage to stable slot health. No aggregate random kills/tier immunity/resurrection. Exact static wall AABBs block rays and blast visibility; terrain/weapon cadence/falloff/effect/audio behavior retained. Environment impacts start slightly outside their surface to avoid self-occlusion.
- Versioned seed/generator/population-scoped localStorage saves wounds, dead slots and formation/path state; whole-group clearance means 32 dead. Strict unknown-field/version/seed/duplicate/pose/health checks, max 81 groups / 512 KiB. Damage batches flush per frame; movement at pause/travel/seed change/teardown. Compact state outlives region eviction. Corrupt/denied/quota storage reports session-only, preserves bytes and keeps session progress. No reset silently repopulates groups; seed selection reopens separate records.
- New unit checks cover seeded stable slots, work frequencies/hysteresis, conservation through all tiers/eviction/reload/seed scopes, full clearance, obstacle-safe patrols through all corners, spatial separation, grounding, far/unloaded damage, moving hit proxies, wall shields, instanced resource lifetime, batched saves and corrupt/denied/oversized/malformed records. One initial repeated-blast assertion incorrectly assumed wounded neighbouring groups could not lose additional members; corrected to require unique kill accounting and no resurrection while allowing legitimate later damage. Existing weapon tests remain enabled.
- Three new browser checks passed: moving/hit-reacting populations, partial clearance across tiers/travel/reload, complete clearance after reload/seed switching, focused fire/pause, resource bounds, corrupt/denied storage, WebGL/worker fallback and repeated teardown. Near/far/cleared captures inspected: recognizable zombie formations and medium/far proxies, visible walls, readable controls/diagnostics, empty home formation after reload. Interactions automated, not user-verified. Initial capture: 49 groups, 5/16/28 tiers, 159 near + 512 medium individuals after one kill, 39 geometries / 40 calls / 58,390 triangles. Cleared capture: 54 global kills (including blast collateral), home 0/32, 38 geometries / 40 calls / 47,896 triangles. Counts are sample/frustum dependent, not GPU timing or FPS claims.
- Final `npm run check` passed on Node 24.22.1 via the established outside-sandbox workflow: lint, 143 unit tests, all 22 source validations, strict TypeScript/six-entry production build, and 54 Chromium browser tests. All earlier regressions and 27 rendered comparisons retained. Horde entry 34.51 kB minified / 9.46 kB gzip plus shared modules; no FPS claim.
- Limits: finite inspection region and basic obstacle corridors, synchronous CPU crowd simulation/lazy hit materialization, unloaded groups frozen, tier pops, sphere body proxies, no corpses/attack animation, arbitrary city navigation or offscreen infinite population. No cross-tab merge/save migration/cloud sync. Existing terrain loading gaps and bundle warnings remain. No mission/aircraft integration or stress acceptance yet; those are Phase 12. No dependencies/source assets changed.

## Phase 12 — First complete combat prototype and stress test

Status: implemented; automated checks passed; agent visual inspection and reproducible measurements completed. Awaiting player feedback and a physical-GPU reference before the milestone gate passes; no enjoyment or supported-hardware FPS claim.

- Added seventh production entry /play/ (Operation Clearpass), linked as Play prototype from Game. Combines existing fixed-step aircraft, authored attack-aircraft mesh, streamed terrain, instanced moving hordes, all three weapons, optional audio, durable casualties and one complete objective. Earlier six entry points remain regression fixtures. Decision: docs/decisions/0012-combat-prototype.md.
- Objective: clear three stable encounters (-1,0)/(0,0)/(1,0), visit within 60 m of the sector at <=70 m AGL, and physically return within 20 m of the base. Default seed 12012 avoids the lab's default world. Spawn at 40 m/s / 32 m AGL. HUD shows progress/flyover/speed/altitude/lock/navigation and attempt kills. Assisted aim locks living objective members inside 70° / 240 m; manual mode fires along the nose. Return assist explicitly drives bank/pitch/throttle through real flight, cancels on manual input and cannot teleport to victory.
- Crashes fail an attempt; recovery resets aircraft/visit/counters and retains wounds/deaths. Reload retains population and starts ready. Already-cleared sectors still require a flyover/return. No rewards or later mission/progression framework. New seed selection retains separate saves; corrupt/unavailable storage remains session-only. Player input is focus scoped; Esc/blur/visibility loss pauses/checkpoints and stops audio.
- Added optional swept obstacle queries to Flight; existing primitive fixtures retain their behavior. Prototype uses 9 m expanded wall checks plus 9 m ground clearance for the authored aircraft at all attitudes; occupied source cells plus voxel corners are tested to fit that envelope. Initial visual inspection placed the base on a lab wall, so it now lies outside the population at (16,192). No sources edited.
- A reusable 1,024 m coarse heightfield underlay covers late detail/horizon, independently of collision. Two-chunk forward lookahead biases the existing bounded terrain/horde windows toward travel. Underlay buffers/materials, authored airframe, markers, HUD listeners, resize observer, stream/workers, effects and audio all have explicit release. Worker/resident/effect/voice bounds retained; no per-shot GPU allocations.
- Added isolated crowd/fire benchmark routes (60 warmup + 180 measured frames), bounded measurement histories and downloadable JSON with device/renderer/backbuffer, real rAF intervals, simulation/presentation/submission CPU distributions, dropped time, population and resource peaks. Fresh benchmark worlds never read/write player records. Standard and 75% render scale exercise the software renderer bottleneck observed in early samples. Node CLI runs two 60-second fixed-tick CPU scenarios with deterministic orbit/fire; timings are not GPU frame times or hardware FPS promises. Evidence: docs/benchmarks/phase-12-combat.md.
- New unit/integration checks cover real flight/attack/return completion, recovery exploit prevention, save/reload/seed scopes, pause/crash/retry, wall/ground envelope collision, aim cone/range, 30/144 Hz damage equivalence, underlay buffer lifetime, bounded warmup/sample histories and CPU benchmark invariants. Browser tests cover completion/return assist, recovery/reload/crash/Esc, settings/seed/render scale, isolated crowd and two fire profiles, report download, resource/work bounds, saved-byte preservation and graphics/worker fallback.
- Final six single-worker prototype browser checks passed. Agent inspected final attack/complete captures: authored aircraft and nearby formations readable, HUD explains return/flyover/clearance and 9 m floor, success pauses only at an empty base ring. Benchmark interruption cannot finish sampling paused simulation. Lookahead stays bounded at the world limit. Interactions are automated; player enjoyment/control/audio feedback has not been gathered yet.
- Final validation passed as bounded batches: lint, 153 unit tests, all 22 source validations, strict TypeScript/seven-entry build, 54 previous browser regressions and six final prototype tests (60 total), retaining earlier rendered comparisons. The initial combined run received SIGTERM before completion; its verified orphan preview process was stopped and all checks rerun. No assertion failures remain. Prototype entry 1.279 MB minified / 93.41 kB gzip plus shared modules; source payload/earlier bundle warnings retained.
- Durable evidence saved in docs/benchmarks/phase-12-combat.md and four raw JSON reports. Single-worker Linux/i5-3570K/Chromium 156 SwiftShader sample: peak 864 live individual agents, 2,592 total represented; crowd/fire 100% rAF medians 100 ms, fire 75% 83.3 ms. Fire p95 intervals 133.3/100.1 ms at 1216×475 / 912×356. Simulation CPU p95 5.9/4.3 ms; submission p95 1.0/1.6 ms; backend cadence is the main measured limitation, not a hardware-GPU guarantee. CPU-only 60-second scenarios p95 0.555/0.560 ms per fixed tick; fire 1,220 shots including warmup, 108 kills, no discarded CPU simulation time. Browser dropped time and unfinished detail queues are recorded, not hidden.
- Limits: finite 81-encounter test population, primitive patrol navigation, conservative body/envelope collision, assisted gimballed hitscan weapons, simple explosion bounds/synth audio, visual coarse underlay below actual terrain, synchronous source meshing/bundled source payload, tier pops/late detail and previous bundle warnings. No general world generation/cities, mission rewards, realistic aerodynamics or full save migration. Physical-GPU frame budget and player-experience checks remain outstanding; Jan explicitly deferred them on 27 October 2026 and authorized Phase 13.

## Phase 13 — Advanced procedural terrain generation

Status: implemented; automated checks passed; agent visual inspection completed; awaiting later user playtesting.

- Jan explicitly deferred Phase 12 player-feedback and physical-GPU acceptance on 27 October 2026 and authorized this phase. Those gates are outstanding, not passed.
- Added independent generator v2 and a regional terrain explorer at `/tools/streaming/?terrain=regional`, linked from Game. Legacy generator v1, combat populations and marker saves retain their identities and terrain. Regional routes do not read or write saved world deltas.
- Global layered noise, moisture biomes, ridged elevation and drainage-envelope shaping produce plains, forests, mountains, a connected river/level lake reach, coast and ocean. Elevation and upstream water are bounded below the aircraft ceiling across the finite world. Surface terraces retain 0.1 m vertical precision and full 1 m shared LOD boundaries.
- Stable 8 m vegetation lattice places bounded dry, slope-filtered trees in near tiers, baked into chunk buffers. Stable dry, low-slope settlement descriptors reserve tree-free sites and show gold preview beacons; roads/buildings remain Phase 14. No new source assets or dependencies.
- Landmark navigation and seed changes reuse bounded streaming. Fly this region opens a regional variant of the existing Flight lab with seed/location handoff, water/ground collision independent of meshes, a reused coarse underlay and forward preloading. Existing six labs and combat remain regression fixtures. Regional flight has no combat/population/save integration yet.
- Tests cover deterministic fixtures, seven biomes, continuous river/lake/ocean water, mixed LOD seams/colors, negative coordinates, vegetation and settlement identities, finite-world elevation bounds, real fixed-step flight and water crashes. Browser coverage checks all biome landmarks, seed changes, transfer to real flight, pause, stream/resource bounds, saved-byte preservation and repeated teardown.
- Final validation passed: lint, 161 unit tests, all 22 source validations, strict types/seven-entry build, all 61 browser tests (60 prior regressions plus the regional test), and a final single-worker regional test after the last changes. Agent inspected forest/lake/flight captures; no user playtest or hardware-FPS claim. Existing bundle warnings remain.
- CPU generation/payload report: docs/benchmarks/phase-13-terrain.json. Measurements are CPU work, not GPU frame time or hardware-FPS acceptance.
- Limits: authored-style procedural cuboid trees (visual only), opaque surface water, one regional drainage backbone/lake, approximate erosion-inspired shaping, heightfield geometry, tier pops/late detail and coarse-underlay approximation. Settlement descriptors are not generated towns. Player playtest and physical-GPU evidence remain deferred.

## Phase 14 — Procedural cities and buildings

Status: implemented; automated checks passed; agent visual inspection completed; user playtest and physical-GPU evidence remain deferred.

- Added structure content v1 on regional terrain, independent of v1 combat/marker save scopes. Regional explorer/flight enable it by default; `&structures=0` retains terrain-only inspection. Chunk signatures reject stale payloads across structure-content changes.
- Deterministic 512 m regional plans create rural, city, industrial, military, airport and shoreline-constrained harbor districts. Safe connected local streets, driveways and validated paired cross-region road portals use stable IDs. Plot footprints reject water/steep relief and reserve vegetation margins. Roads are clipped to chunks; terrain remains static.
- Reuses seven unchanged original voxel sources through shared global instance batches plus shared foundation geometry. Repeated buildings share geometry/materials, retain single owner chunk and LOD identity, and release membership on eviction/replacement. A 512-building cap and explicit final disposal bound resources.
- Regional flight samples authoritative structure envelopes without loaded meshes, with 6 m primitive-airframe padding and a building-aware camera height. Navigation exposes connected road graphs, plot access IDs and dry-ground/building walkability for Phase 15. No new population or mission integration.
- Airport constraints keep the runway clear, with apron/hangars/control landmark. Harbor requires an ocean shore, a valid fixed deck and safe land approach. Other mixes distinguish houses, city height variants, tanks/warehouses and military containers/towers.
- Interior furniture/loot remains a deferred decorative idea until an aircraft gameplay purpose exists. No explorable interiors, pickups or on-foot systems. Decision: docs/decisions/0014-procedural-settlements.md.
- Unit checks cover four seeds/six types, deterministic IDs/load order, connected graphs and paired portals, dry foundations, non-overlap, driveways, chunk ownership/LOD identity, vegetation, unloaded collision/real flight, navigation, bounded queries and shared instance lifetime. Browser district/seed/traversal/flight/recovery/save-preservation checks and earlier regressions passed. Navigation also rejects radius footprints that cross water despite a dry centre.
- CPU evidence: docs/benchmarks/phase-14-settlements.json; `npm run settlements:benchmark`. 49-chunk windows held 16–36 buildings and 2.85–3.82 MB terrain arrays, peak chunk 515,376 bytes. Local generation p95 ~3.2–7.1 ms; discovery ~145–309 ms (overlapping final validation). Excludes source meshing, GPU copies, temporary arrays and descriptor strings; no gameplay FPS claim.
- Final validation passed: lint, 170 unit tests, all 22 source validations, strict types/seven-entry build and all 63 browser tests (61 earlier regressions plus two settlement checks). The final shoreline-footprint correction is covered by the complete unit rerun and rebuilt output; it is not used by browser rendering/flight. Agent inspected final city/airport/harbor/flight captures; no user/hardware verification claimed.
- Limits: bounded small settlements, sampled terrain rules and conservative solid collision, no universal inter-city connectivity/river routing, visual trees and static opaque water, no metropolitan districts at release scale, inherited coarse underlay/LOD artifacts. Source JSON adds startup payload/synchronous meshing; Phase 16 optimization remains separate. No new dependencies or source edits.

## Next

Phase 14 is implemented, tested and committed. Phase 15 regional zombie populations is next; do not begin it within this phase. Preserve deferred Phase 12 player-feedback and physical-GPU gates for later review.

Phases 15–20: not started. Full user functional verification remains outstanding.

## Repository privacy audit — 27 October 2026

- Audited all 18 local commits and 307 historical file blobs for common provider tokens, private keys, credential assignments and authenticated URLs; no credential patterns found. GitHub main matched the audited local HEAD before this change. This is a pattern-based audit, not a guarantee against all possible secrets.
- Commit metadata exposes the author name/email; historical handoff notes include local home paths. Existing history was preserved.
- Hardened `.gitignore` for environment files, local credentials/keys, logs and editor files, preserving placeholder environment examples and existing generated-output rules. Verified representative paths and that no tracked files match the new rules.

## Phase 15 — Procedural regional zombie populations

Status: implemented; automated checks passed; agent visual inspection completed. User verification remains outstanding.

- Added generator-v2 population authority with stable encounter/member IDs, independent of terrain workers and mesh residency. One half-open 128 m cell owns each encounter in the declared 8 km × 8 km population area; terrain still extends outside it.
- Settlement road nodes drive district distribution/density (city 32, rural 16, other districts 24 maximum members). Seeded wilderness clusters budget 12 forest, 4 mountain, 8 other dry members. Wet-centre wilderness cells are omitted. Up to 96 candidates undergo owner-cell, spacing, water/grade and building-clearance checks; invalid candidates are omitted.
- Regional groups hold validated positions. Legacy moving hordes retain their existing prototype behavior. Regional patrol/pursuit and mission pressure are deferred; no new navigation AI, migration, progression or rewards.
- Regional flight now uses existing guns/shells, terrain and building occlusion, fixed-flight-tick weapon updates, shared effects/audio, three bounded population render batches and clearance diagnostics. Approach nearby horde sets up an attack pass. Recover resets aircraft and combat counters while preserving population health.
- At most 49 resident encounters, 32 slots each, 64 cached encounter descriptors and 4096 possible modified records. Unresident ray/blast queries regenerate deterministic descriptors with authoritative damage. Near voxel figures/medium boxes/far aggregate markers share two geometries; teardown is idempotent.
- Separate seed/generator/structure/population save scope stores only modified health arrays, immediately on damage. Partial wounds and complete clearance survive presentation tiers, eviction, reset and reload. Corrupt/versioned/duplicate saves fail atomically and retain original bytes; quota/unavailable storage reports session-only behavior. Generator-v1 saves remain isolated.
- Added six unit tests covering four seeds, placement and density, water rejection, ownership/query deduplication, unresident blast damage, partial/full clearance across lifecycle, save validation/isolation/errors and renderer caps/disposal. Two browser tests cover seeded partial-save display, approach/fire/pause/recover/reload, legacy-save isolation, corrupt-save protection and teardown.
- Decision: docs/decisions/0015-regional-population.md. No dependencies, source assets or existing persistent world formats changed. Synchronous source meshing, per-hit storage serialization and larger integrated performance workloads remain Phase 16 concerns. Deferred Phase 12 player feedback and physical-GPU acceptance remain outstanding.

- Verification: lint, all 176 unit tests, all 22 source validations, strict types and production build passed. The full 65-test browser run was stopped after Jan reported sustained 100% CPU usage; Chromium used SwiftShader software rendering. At stop: 39 passed, 2 failed (existing engine lifecycle timeout; new encounter fixture expected >2 members but received 2), 2 interrupted, 22 not run. The encounter fixture now selects a generated group with >2 members and holds Space across a simulation tick; this correction has not been rerun. Corrupt population-save browser coverage and existing regional-terrain traversal passed. No Phase 15 screenshot inspected. Do not restart CPU-heavy browser checks without discussing the load with Jan. No implementation commit yet because required verification is unfinished.

- Final verification (Jan authorized restarting tests after the CPU discussion): focused population/engine checks passed 4/4 with one worker. Full `npm run check -- -- --workers=1` then passed lint, all 176 unit tests, all 22 source validations, strict types/seven-entry production build and all 65 Chromium browser tests. Browser suite: 8.2 minutes, one worker, SwiftShader software rendering. The earlier engine timeout did not recur in either serial run. Corrected encounter fixture and held-fire coverage passed. Existing bundle-size warnings remain.
- Agent inspected the Phase 15 full-page encounter capture: grounded grouped figures, distant aggregate markers, aircraft and contained scene, readable controls/population/weapon diagnostics. Interactions were automated; Jan has not playtested this phase. Software-rendered test timings are not physical-GPU performance acceptance.
- Tests run automatically closed their server/browser processes. Phase 15 is ready for its required local commit. Phase 16 optimization is next; no optimization changes made in this phase. Useful investigation targets: separate software-test cost from physical-GPU gameplay, inspect continuous rendering while paused, synchronous generation/meshing, population presentation allocations and per-hit save serialization. Measure before selecting changes.

## Phase 16 — Performance planning notes

Status: investigation notes only; implementation not started.

- Added docs/performance/phase-16-notes.md with evidence-based priorities: controlled hardware/software baselines; settled paused rendering; dirty population buffers; generation/mesh startup; streaming latency/budgets; save serialization; measured quality/collision tuning.
- Preserved a compact summary of the completed serial-run measurements in docs/performance/2026-10-27-test-baseline.json. SwiftShader fire median frame intervals were 116.6 ms at full scale and 83.4 ms at 75%; different trajectories/residency prevent an isolated speedup claim. Legacy benchmarks do not establish regional supported loads or physical-GPU performance.
- Notes separate observed repeated work from unmeasured bottleneck hypotheses, define checks for each proposal, preserve save/streaming invariants, and recommend one-worker focused testing while iterating. No runtime code, dependencies or performance acceptance changed. No stress tests were rerun for this documentation task.


## Phase 16 — First optimization slice, 28 October 2026

Status: first optimization slice implemented; automated checks passed; agent visual inspection completed. Phase 16 overall and user/hardware verification remain in progress.

- Regional Flight uses demand-driven frames after the camera settles. Controls, resize, asynchronous sound status and worker completion wake it. Running simulation, camera easing, collision, effects and streaming limits remain intact. Legacy Clearpass/outdoor loops retain their earlier behavior.
- Population residency rebuilds only when the observer cell changes; tier hysteresis remains per-update. Revision tracking skips unchanged instance-buffer work and temporary live-member arrays. Actual damage still saves synchronously; unchanged checkpoints/stale damage skip writing.
- Before/after ready-scene measurement over 1.2 seconds: 26 scene clears and 78 buffer updates → zero clears/updates. One population-buffer rebuild during loading. This measures eliminated idle work, not a hardware FPS or total CPU percentage improvement. Evidence: docs/performance/2026-10-28-regional-idle.json; decision: docs/decisions/0016-regional-idle-rendering.md.
- Passed 19 focused unit checks and all 8 focused browser checks, including all six districts, new idle/wake controls, combat/persistence and flight regressions. The full check then passed lint, all 182 unit tests, all 22 asset validations, strict types and production build. Browser tests 1–46 passed (including new performance/population checks and regional traversal) before the turn was intentionally interrupted. The full 67-test run was stopped; remaining checks are unverified in this run. No commit yet.
- Agent visually inspected the resized recovered regional ready scene: readable controls, aircraft/terrain/groups visible, no overlaps. User playtesting and physical-GPU acceptance remain outstanding. No dependencies, asset sources, save schemas, weapon or flight physics changed.

- Completion after interruption: the remaining 21 browser checks passed with one worker in 2.3 minutes (settlements, setup/navigation, streaming, viewer, source round-trips and weapons). Combined with the 46 passed before interruption, all 67 browser checks are verified against the same runtime implementation/build. No runtime changes were made between those runs. Earlier lint, all 182 unit tests, all 22 asset validations, types/build and the 8 focused browser checks passed. This is split-run verification, not a claim of one uninterrupted 67-test run.
- Final documentation and baseline report are current; the first optimization slice is ready for its required local commit. No further stress tests were needed. Phase 16 remains in progress for hardware targets, maximum-speed/dense regional workloads, startup/source meshing and broader streaming profiling. Deferred Phase 12 playtesting and physical-GPU gates remain outstanding.

## Phase 16 — Second optimization slice, 28 October 2026

Status: streaming plan reuse implemented; automated checks passed; agent visual inspection completed. Phase 16 overall remains in progress.

- Flight owns a frozen chunk plan keyed by the current look-ahead cell. Seed and regional/structure options are fixed per mounted session. Legacy flight/weapons preserve their unbiased point; regional flight preserves its 64 m heading bias.
- Shared ChunkStream compares ordered incoming specs against owned snapshots before rebuilding request maps/signatures and scanning cancellation/eviction. Unchanged plans still pump completed payloads, submit jobs and honor failure suppression. Bounds remain 49 residents/two payloads/two integrations; authoritative collision and save behavior are unchanged.
- Added full-plan equivalence checks for negative/boundary/world-limit/return locations and legacy/regional structure combinations, plus stream regressions for equivalent fresh arrays, caller mutation, seed/content changes and priority. Existing lifecycle checks cover stale replies, failures, disposal, LOD replacement and travel.
- Fixed 60-second 100 m/s square route, 60 Hz, regional seed 103 with structures: 3600 → 185 plan constructions; median aggregate planning CPU 20.10 → 2.49 ms across 15 warmed samples. This is a small isolated CPU saving, not integrated streaming latency or hardware FPS. Evidence and reproducible runner: docs/performance/2026-10-28-chunk-plan.json and tools/benchmarks/chunk-plan.ts. Decision: docs/decisions/0017-streaming-plan-reuse.md.
- Initial sandbox run passed 180 unit checks but four CLI-output checks failed with empty captured subprocess output. Reviewed outside-sandbox rerun passed lint, all 184 unit tests, all 22 asset validations, strict types and production build. Browser verification is still running. Existing bundle-size warnings remain.
- No visual design, asset sources, dependencies, simulation, persistence schema or gameplay settings changed. No new user/hardware verification claimed. Phase 16 remains in progress; Phase 17 aircraft variety has not started.

- Final verification: all 67 browser checks passed across two single-worker runs with unchanged runtime/build (46 before process termination, exit 143; remaining 21 passed in 2.4 minutes). The leftover preview server was explicitly stopped before resumption. Agent inspected the regional recovery capture: readable controls, aircraft/terrain/groups visible, no overlaps. Browser checks use software rendering; user and physical-GPU acceptance remain outstanding. Changes are ready for the required local commit.

### Phase 16 third slice — startup CPU profiling

- Added reproducible regional startup CPU benchmark and raw timing report for seven
  settlement kits and two population seeds, with/without structures.
- Built-in assertions check deterministic descriptors after travel/return, one-kill
  reload durability, stable mesh statistics and bounded residents/cache.
- First kit meshing calls measured 24–96 ms each; structure-backed initial
  population residency measured 29–67 ms. These are Node CPU stages, excluding
  browser/GPU/integrated gameplay; no runtime optimization or acceptance claim.
- Regional population runtime imports now use explicit TypeScript extensions so
  the Node 24 benchmark can execute the same implementation as the browser.
- Verification passed: benchmark assertions, lint, 184 unit tests, 22 source
  validations and strict types/production build. CLI-output sandbox failures
  disappeared on reviewed outside-sandbox rerun. Browser checks were not rerun
  for this profiling-only slice; previous slice's 67-check result remains prior
  evidence. Phase 16 acceptance and Phase 17 remain outstanding.

### Phase 16 fourth slice — integrated streaming telemetry

- Added constant-space load round-trip, ready wait and synchronous attachment
  totals/maxima/counts; Flight exposes these with draw calls and triangles.
  Scheduling, collision, save scopes and ownership limits remain unchanged.
- Deterministic clock unit coverage checks intervals and stale reply accounting.
  New single-worker browser workload records ordinary throttle-up travel, home
  recovery and shell firing; asserts caps, >95 m/s, geometry return and no errors.
- SwiftShader baseline reached 100 m/s, with 55 stale travel replies, no generation
  failures and a 4.4 ms lifetime max attachment interval. Home geometry count
  returned to 43. Attack caused no damage; dense combat remains unverified.
- Evidence: docs/performance/2026-10-28-regional-travel.json. Timings exclude GPU
  upload/FPS; short recovery is not long-travel memory acceptance.
- Final verification: lint, 185 unit tests, 22 asset validations, strict types/build,
  3 focused browser checks and all 65 remaining browser checks passed (same build,
  one worker; remaining suite 8.4 minutes). Initial unnecessary snapshot-ignore
  launch was stopped, then the entire remaining set reran with normal assertions.
  Agent visually inspected the regional population capture: readable controls and
  diagnostics, visible aircraft/groups, no overlap. User/hardware checks remain
  open. No dependency or save-format changes. Test preview servers stopped.

### Phase 16 fifth slice — continuous return profiling

- Added opt-in two-pass regional outbound/return browser guidance using ordinary
  flight controls, no recovery/teleports. Per-poll assertions check running state,
  no failures and streaming caps; settled checkpoints check population/cache caps.
- SwiftShader route profile passed in 50 seconds (45.4 s recorded workload),
  reaching 100 m/s. Geometry counts: 43 initially, 53 at both returns. Post-GC JS
  heap: 26.56 → 28.02 → 28.42 MB, not a demonstrated plateau or leak diagnosis.
- Stale resolved replies per pass: 81/716 and 80/814. No runtime scheduling changes
  are justified yet; document transition/cancellation analysis as the next step.
- Raw evidence: docs/performance/2026-10-28-regional-route.json. Added Chromium heap
  checkpoints explicitly distinguish JS/backing storage from GPU memory.
- Agent inspected return capture: readable controls/diagnostics, visible aircraft
  and terrain, no layout overlap. User/hardware acceptance remains outstanding.
- Verification: opt-in browser route, lint, strict types and all 185 unit tests
  passed. Prior 68 browser checks, assets and build remain prior evidence for
  unchanged runtime/build; not repeated for this profiling-only addition.
  No runtime/assets/dependency/save changes; benchmark is skipped by default.


### Phase 16 reference target selected — 28 October 2026

- Jan selected Pixel 10a with a Google Tensor chip, 720p rendering at 60 FPS.
- Updated plan, performance notes and handoff. This is an unverified acceptance
  target; existing software-rendered evidence does not establish phone performance.
- On-device travel/combat/sustained resource tests, measurement protocol and mobile
  controls remain outstanding. No runtime changes or tests needed for this
  documentation update; checked diff formatting.

## Phase 17 — Aircraft variety and customization

Status: implemented; automated checks passed; agent visual inspection completed;
awaiting user handling/balance verification. Jan requested the next phase on 28 October 2026. Phase 16
Pixel 10a / 720p / 60 FPS acceptance remains open, not passed.

- Added Kestrel helicopter beside existing fixed-wing default in Clearpass and all
  Flight/Weapons lab routes. Helicopter offers stationary hover, yaw, reverse and
  up to ±55 m/s tilt-driven translation with independent ±12 m/s lift. Shared 60 Hz
  stepping, collision, pause, damage and saves remain authoritative. Zero-length,
  vertical and reverse movements have explicit collision coverage.
- Added Multirole, Precision and Siege loadouts with nose/port/starboard mounts.
  Muzzle transforms match rendered YXZ attitude; visible barrels follow the mount.
  Equipped sets gate both UI hotkeys and Clearpass firing authority. Loadout/mount
  changes pause without resetting cooldowns or progress; aircraft changes reset the
  approach/flyover requirement and retain casualties. Session-only configuration;
  recovery and world changes retain equipment, reload uses defaults.
- Added original code-native helicopter silhouette/rotor, reused geometries and
  idempotent disposal. No source asset/dependency/save-schema changes. Helicopter
  return assist steers physically back to base. Benchmarks keep fixed-wing defaults.
- Eight new unit cases cover hover, translation, fixed-step equivalence, collision,
  configuration validation, mount orientation, saves/cooldowns, return assist,
  shared damage and resource disposal. All 193 unit tests passed, with lint,
  22 source validations and strict types/production build. Two new browser cases
  passed for Clearpass and regional switching/controls/persistence/seed isolation.
- Early checks found a test-only TS narrowing error, missing exact selector labels
  and unsupported option-disabled matcher behavior. Corrected before passing runs.
  Remaining prior browser suite is running with one worker. Existing bundle-size
  warnings remain. User playtesting, finished helicopter source art, touch controls
  and Pixel hardware performance remain unverified/outstanding.

- All 68 prior browser checks passed with one worker in 10.3 minutes; opt-in
  sustained route skipped. New aircraft cases passed again (42.1 s), and agent
  inspected both Clearpass/regional captures: readable UI/HUD, visible helicopter
  and scenery, no overlaps. Final review found and fixed stationary hover skipping
  structure queries; now uses a normalized zero-range overlap ray, with unit
  coverage. Final focused browser verification follows. All 193 unit tests passed
  again with one worker; a parallel CLI export timeout disappeared without changing
  its timing threshold. Footer/clearance text corrected for the helicopter.

- Final overlap correction verified: all 193 unit tests, lint/types/build and both
  aircraft browser cases passed afterward (42.3 s). The prior 68-browser regression
  run preceded that helicopter-only fix; no further legacy runtime behavior was
  changed. Combined Phase 17 browser coverage: 70 passing scenarios, one opt-in
  route skipped. Visual inspection completed for both helicopter routes. Test
  servers stopped. Phase 17 ready for its required local commit; no user handling,
  touch usability or Pixel performance acceptance claimed.

## Phase 18 — Missions, gameplay loop and progression

Status: implemented; automated checks passed; agent visual inspection completed;
awaiting user mission-pressure/balance verification. Jan requested Phase 18 on 28 October 2026;
Phase 16 Pixel 10a / 720p / 60 FPS and earlier feedback gates remain open.

- Added mission definitions and board: default Clearpass awards one first-completion
  star and unlocks Relief Watch's three different hordes/supply post. Living marked
  members drain integrity over ~75 simulation seconds at full population; kills
  reduce pressure, clearance stops it, pause freezes it. Post loss fails/pauses.
- Mission HUD, markers, lock targets and navigation follow selection. Debriefs show
  outcome/kills/shots/ticks/stars; physical return commits success. Prepare next
  sortie/rearm resets attempt/cooldowns/effects/integrity/flyover, retaining kills.
  Recovery, mission/aircraft changes abandon active attempts with zero reward.
- New bounded campaign key stores unique known completion IDs, with stars/rank
  derived. First-time rewards are global across seeds, not farmable by replay.
  One atomic campaign write follows casualty flush; population storage failure
  blocks durable rewards. Corrupt/denied/quota failures preserve bytes and provide
  session-only progression; fresh reads merge prior claims. No cross-tab atomicity.
- Reload restarts ready on Clearpass with defaults and fresh integrity, retaining
  casualties and stars; last results/mission/position are session-only. Isolated
  benchmarks instantiate/access no campaign. Existing population formats unchanged.
- Eleven new unit cases cover unlock/one-time rewards, schema limits/corruption,
  quota/denial/casualty failure, stale claims, abort/crash, pressure/pause, physical
  returns, replay and mid-sortie reload. All 204 unit tests, lint, 22 asset validations
  and strict types/build passed. Browser pressure/pause/corruption/isolation passed;
  first unlock flow passed Clearpass, but Relief's naive straight-line test missed
  one horde. Test now uses normal helicopter hover attack plus flyover/return.
- All three new mission browser scenarios passed in 1.2 minutes: real Clearpass
  return/unlock, helicopter Relief attack/flyover/return/rank/reload, pressure
  pause/abandon/corrupt-byte protection, and isolated campaign access checks.
  Agent inspected Relief result and pressure screens: readable board/HUD/debrief,
  visible post integrity/aircraft/terrain/groups, no layout overlap. Full earlier
  browser suite is running with one worker. No player/balance/hardware claim.

- Final verification: all 70 prior browser scenarios passed with one worker in
  13.6 minutes; optional sustained route skipped. Fixed stale debrief text on world
  changes, then all 3 mission scenarios passed again on the final build (1.1 min),
  including new-world casualty scope/global-star retention and debrief clearing.
  Lint/types/build passed afterward; no model changes since 204 unit passes.
  Combined Phase 18 browser coverage: 73 passing scenarios. Visual inspection
  confirmed Clearpass/Relief completion and post-pressure screens are readable,
  with visible controls/HUD/aircraft/groups and no overlap. Preview servers stopped.
- Mission loop currently targets generator-v1 Clearpass; regional-v2 missions remain
  unimplemented. No dependencies, source assets or population format changed.
  User balance/phone/touch verification remains open. Ready for the required local
  commit; Phase 19 not started.

## Phase 19 — Feedback, sound, UI and comfort

Status: implemented; automated checks passed; agent visual inspection completed;
awaiting player comfort/sound/feel feedback. Phase 16 Pixel hardware and earlier feedback gates stay open.

- Clearpass now has authoritative hit/kill confirmation, readable HUD plates,
  low-altitude/post-critical text warnings, integrity meter, collapsed rules and
  narrow-screen controls. Tone mapping/fog refine atmosphere without extra passes.
- Full/Reduced/Off effects, flash/smoke toggles, opt-in bounded camera recoil,
  contrast, fog and master volume are session-only. Reduced-motion startup picks
  Reduced/no flash/smoke/shake; sound starts muted. Controls cannot change damage,
  saves or rewards. Camera recoil does not accumulate into chase tracking.
- Shared combat view adds low-poly sphere explosions and sixteen reusable smoke
  puffs beside the 128 combat slots, retaining only two owned geometries. Pause
  freezes puffs, reset clears them, overflow drops cosmetics only. Flash suppression
  also removes zombie hurt color/flinch. All resources have bounded disposal.
- Added synthesized hit/clear/warning/mission sounds under the same eight-voice cap,
  volume/zero-volume behavior and optional playback-error handling. Completion cues
  can finish while paused; focus/pause input stops voices.
- Six new unit cases cover feedback/reset/rebase, offset bounds, reduced defaults,
  saturated smoke/reuse/disposal, full/reduced/off damage/save equivalence and audio
  volume/cue/failure/cap behavior. All 210 unit tests, 22 asset validations, lint and
  strict types/build passed. Four new browser cases passed (three comfort cases plus
  low-altitude warning). A test-only negative-zero edge was normalized; a hidden-text
  warning assertion was corrected to require visibility. No timing limits loosened.
- Agent visual inspection caught a narrow-screen mission selector overflow; fixed
  control widths and verified scrollWidth<=390 and separated HUD panels. Captures
  show readable desktop post/danger HUD and narrow-screen UI without overlap.
  Full earlier browser suite now runs with one worker. No user/aural/hardware claim.

- Earlier browser regression: 70 passed, 3 failed on an unintended implicit status
  role from the volume output, 1 optional route skipped. Replaced it with a plain
  readout and slider aria-valuetext. Also fixed positive-shot rebasing so recovery
  cannot synthesize a ghost shot. Final lint/types/build passed; all 7 selected
  cases passed (1.7 min): four new comfort cases and all three affected legacy
  cases. Unmuted recovery is instrumented to assert zero new oscillator creation.
- Combined coverage: 210 unit tests and 77 unique browser scenarios passing across
  the runs; no loosened timing/resource thresholds. Agent visually inspected
  desktop feedback/post/danger and corrected 390 px captures. Preview servers
  stopped. Recorded preliminary Full crowd/fire resource snapshots in
  docs/benchmarks/phase-19-feedback.json, with software-rendering/smoke/audio limits
  stated. No Pixel FPS, listening quality or user-comfort acceptance claimed.
- No source assets, dependencies, gameplay authority or save formats changed.
  Phase 19 is ready for its required local commit. Phase 20 not started.

## Player entry and developer-tool separation — 28 October 2026

Jan requested a player-facing game entry instead of the environment/lab dashboard.
Root now mounts the existing combat game in a full-window scene with a mission /
equipment dialog. Esc pauses and opens the menu; Settings contains comfort,
sound, render scale and an opt-in developer-tools toggle (stored locally when
available). Lab links are hidden by default. The former root environment scene
is preserved at /tools/outdoor/; /play/ remains the combat diagnostics lab.
This is a player-interface slice, not completion of release or hardware gates.

Validation: lint/types/build passed; 8 targeted browser checks passed, including
player launch, Escape pause, developer links, narrow layout and preserved labs.

## Reference-directed autumn valley presentation — 28 October 2026

Status: implemented; automated checks passed; user visual/hardware
acceptance remains open. Jan requested a visual improvement from the two attached
images. This extends the main game's presentation, without starting release work.

- Added an analytic sun/gradient sky, voxel cloud banks, terraced horizon scenery,
  warm directional/hemisphere lighting and a bounded 1024² PCF shadow map. The
  camera exposes more landscape; compact HUD plates, heading readout and a quieter
  menu overlay the root's full-window scene.
- Seeded autumn/pine woodland uses cullable 96 m patches and shared 0.4/1 m LODs
  derived from original editable tree sources. The forest avoids encounters/home
  approach, stays below the conservative flight envelope, and owns no colliders.
  Hills/clouds are camera-relative scenery, not new explorable regional terrain.
- World-space grass/field grain, painted service lanes, concrete pads and contact
  shading refine the existing terrain without changing heights or save scopes.
  Broad-color fallback avoids narrow-road sampling artifacts at distance.
- Added an original editable 4×3×12 m depot (18,448 cells), matching the old blocker
  exactly, with cladding, roof ribs, framed windows and doors. Source generation,
  validation and GLB export use the existing asset pipeline. Main combat renders
  detailed zombie silhouettes at all visual tiers; simulation LOD stays intact.
- Initial High-quality SwiftShader runs were too slow for the existing aircraft
  test. Measured work drove forest patch/LOD changes, bounded shadow coverage and
  paused-frame reuse. Automatic now transparently selects Low on software renderers;
  High remains selectable, with an independent shadow toggle. Reports state actual
  quality/renderer/shadow settings. Low keeps a deterministic 55% tree subset.
  Ready/paused scenes stop GL submissions after the camera settles; controls,
  resizes and arriving terrain redraw. No test timing thresholds were increased.
- All 214 unit tests passed before the last presentation wiring; the four art unit
  cases passed again afterward. Typecheck/lint/build and all 23 source validations
  passed. Depot GLB export passed. Five targeted browser scenarios passed, plus a
  temporary diagnostic flight profile; profile removed after investigation.
  Those checks cover High/Low, real shader compilation, fog/shadow toggles,
  idle rendering, reload resource bounds, aircraft behavior and workshop views.
  The complete browser suite passed: 81 cases in 16.8 minutes, one optional
  sustained route skipped. Final narrow-header CSS alignment and stronger overlap/
  resource assertions passed all four selected browser cases in 1.1 minutes.
  Agent inspected the final High desktop, corrected 390 px HUD and depot views.
  Final lint/types/build passed; owned inspection/test servers were stopped.
  Ready for the required local commit; no push or deployment.
  Software Low reports are saved in docs/benchmarks/autumn-valley.json; p95
  rAF ~333–350 ms is not physical-GPU or target-phone performance evidence.
- Decision: docs/decisions/0021-autumn-valley.md. Pixel 10a / 720p / 60 FPS,
  physical-GPU High performance, visual/comfort feedback and regional-v2 mission
  integration remain outstanding. No dependency, combat rule, population schema,
  deployment or release change.

## Ground seams and distant-city visibility — 28 October 2026

Status: implemented; automated checks passed; awaiting user visual/hardware verification.
Jan's marked screenshot showed bare city/forest transitions, holes beneath distant
mountains and nearby building pop-in. All 81 existing static depots now render
independently of the 49-cell horde ring, reaching ~330 m on the initial approach.
Continuous overview ground extends 1536 m, with finer city/forest samples,
consistent roads/pads, and a six-metre wooded verge. Mountain boundary skirts
reach −64 m beneath the ground. Missions, collisions, seeds and save formats stay
unchanged. No new scenery geometry/material count budget or worker residency is
required; the far overview gets a lighter material without grass hashing/shadows.

Three new unit cases cover every exposed mountain direction across seeds/movement,
coverage/depot grounding/ownership, and static city visibility without loading more
populations. Fixed an overly exact Float32 test assertion; all 217 then passed.
Build/types/lint passed. A new browser case checks approach/travel/recovery and
81-depot coverage. First browser run passed 24 cases, including new coverage,
shader/quality checks and aircraft/comfort/streaming/editor checks, before being
stopped to test the cheaper overview material on a fresh final build. No failure
or timeout threshold was suppressed. Final full browser run is next/in progress.

Final full browser run: 81 passed, one optional route skipped, one end-to-end
sortie hit its unchanged 90-second overall budget while opening final settings
after successful mission/save/recovery checks. Low foliage was then reduced to
40% / 80 m detail distance to budget the larger city; High remains unchanged.
Final build/types/lint and seven affected unit tests passed. All four targeted
browser cases then passed in 2.9 minutes, including the timed-out sortie within
its unchanged budget. Combined coverage: 82 browser cases passing across runs,
one optional route skipped. All 217 unit tests passed, with affected 19- and
7-case subsets repeated after final changes. Agent inspected the final screenshots.
No test timing/resource threshold was increased. Preview servers stopped. Ready
for the required local commit; no push or deployment. Pre-adjustment stress
reports are retained in docs/benchmarks/coverage-distance.json with settings and
software-renderer limits stated explicitly.

## Flight handling and camera follow-up — 28 October 2026

Status: implemented; requested features pass automated and agent visual checks;
awaiting Jan's handling/visual verification. One legacy end-to-end wall-clock
budget remains failing on this software-rendered host (details below).

- Hold C + move the mouse over the focused viewport to orbit. Release/focus loss
  eases back to chase by the shortest route. Angular smoothing keeps the camera
  at a constant radius during fast half-turns. Shared across root/combat, flight,
  regional and weapons; disabled in isolated benchmarks. C does not steer/fire.
- Found a reproducible presentation jitter source: discrete 60 Hz aircraft pose
  versus separately smoothed camera translation/current-tick look. Render pose
  interpolation and camera offsets relative to that pose remove tick stepping and
  straight-flight relative bobbing without changing simulation/collision/weapons.
- Added a terrain-conforming soft oval directly below the displayed aircraft,
  independent of sunlight shadows and altitude fading. One reusable grid/texture
  with unchanged-position caching and idempotent disposal. Explicit geometry
  budgets increase by one: combat 67, flight 57, weapons 59. Residency stays fixed.
  CPU-only regional update probe: p95 0.28 ms / 200 warmed samples, 512 triangles;
  docs/benchmarks/flight-shadow-cpu.json explains method and excludes GPU/FPS claims.
- Settings → Flying mode selects Assisted auto-level / Direct hold-attitude,
  separately from aim/return assistance. Choice survives recover, aircraft/mission/
  world changes during the session. Labs retain Flight assistance.
- Final checks: all 223 unit tests, lint/types/build and 23 source validations
  passed. Four existing CLI tests initially lost subprocess output in the sandbox;
  the full unit suite passed outside it with no test changes. Full browser run:
  83 passed, two timing failures, one optional route skipped (19.5 min).
- Final camera review added shortest-route return and constant-radius angular
  smoothing. All six presentation unit cases and the full 223-unit suite passed.
  All seven focused browser cases passed on the rebuilt final code (2.4 min):
  scenery/shader/idle/resources, mode behavior/retention/narrow settings, combat and
  regional orbit/release/blur/shadow/disposal, ordinary flight, regional resume
  and weapons. Agent inspected combat/regional orbit and 390 px settings captures.
- The regional resume timing failure (0.10 s discarded catch-up versus expected 0)
  passed unchanged in the final focused run. The legacy 90-second complete-sortie
  case timed out twice, in full-suite and isolated final-build runs, during final
  seed/settings validation after mission completion/rewards, saved-clearance
  reload, recovery and collision checks passed. It is still failing; no timeout,
  test step or failure was hidden/relaxed. Combined: 84 unique browser cases pass,
  one legacy overall-timeout failure, one optional route skipped. Earlier handoff
  documents a similar budget failure. Keep this open for software-renderer work.
- Decision: docs/decisions/0022-flight-camera-and-presentation.md. No dependencies,
  source assets, save formats, deployment or release changes. Pixel hardware/FPS
  and player-feel/visual acceptance remain outstanding. Preview servers were
  managed/stopped by Playwright; the user's existing 5173 server was untouched.
