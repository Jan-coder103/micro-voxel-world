## 22 November 2026 — GitHub Pages build deployment

Pages was publishing raw main-branch files, leaving the TypeScript entry point
uncompiled. Added a pinned GitHub Actions workflow using Node 26, npm ci, the
Pages base path and the dist artifact; switched Pages to workflow deployment.
Home/workshop links use Vite BASE_URL. README documents the hosted URL/setup.
Production build/typecheck and lint pass (existing bundle-size warning remains).
A static-server software-WebGL check loaded game/workshop under the repository
prefix with no HTTP/module errors. Retained deployment regression passes (16.1 s); preview uses PAGES_BASE_PATH
to match the built prefix. Deployment run 44966787764 succeeded. Live HTML and
its compiled entry module return HTTP 200; JavaScript MIME is correct. Full unit
run: 366/370 pass in the restricted sandbox; the four CLI test files pass
64/64 outside it (57.5 s), covering all four initial failures. All 370 checks
therefore pass across the final runs. Lint/whitespace pass. The full browser
suite was not rerun. Gameplay/hardware acceptance remains open.

## 22 November 2026 — Lazy scenery and coarse independent tree shadows

Implemented Jan's three capture-5 fixes and authorization for delayed scenery
arrival/coarse tree shadows. Bounded immutable layout/site caches and early
candidate rejection preserve canonical trees. One shared scenery worker prepares
forest, road tessellation/normals/bounds and settlement discovery; nearest jobs
win, obsolete replies drop, old settlement meshes stay until replacement.
One staged reply publishes per 16 ms pump rather than bursting on the UI thread.
Worker failure uses the same generators in small cooperative slices. Collision,
full resolution, MSAA and 896² sun maps retain their existing settings.

Completed forest tiles now publish once. Separate immutable shadow batches cover
128 m quadrants with 12-triangle boxes (vs 36-triangle detailed trees), anchored
to canonical positions and the existing sun direction. Color residency/LOD edits
do not dirty these buffers; actual caster/anchor/rebase changes remain immediate.
Proxies are visible only inside depth rendering, restored in finally. Views and
shared queue dispose worker/timers/staged data/meshes. F8 exports worker/queue and
shadow-group counters plus main-thread publication/fallback timings.
Decision 0049 documents ownership, failure paths, soft-budget limits and tradeoffs.

Evidence: CPU-only warm 6,208-cell benchmark ~424 → ~179 ms (~58% less generator
CPU), same 19,706-tree hashes; retained docs/performance/2026-11-22-scenery-generation.json.
Four-seed eviction/boundary hashes and road hashes match pre-change fixtures.
Five software-WebGL browser checks pass in 51.8 s: actual worker use, lazy arrival,
shadow/color parity through rebase, hidden proxies, prior cached-shadow behavior
and profiler restoration. Inspected forest screenshot showing coarse directional
shadows. Typecheck/build/lint/whitespace pass; existing bundle warning remains.
Full serial unit run: 368/370 passed, two unchanged asset CLI tests exceeded their
5 s limits; separate rerun results follow. No full browser suite/npm check,
physical GPU/long-flight acceptance or stable 60 FPS claim. Local commit follows;
no push/deployment.

Final verification: all 370 unit checks pass across the final runs: the full
serial run passed 368/370, then both asset CLI files passed 44/44 with a 30 s
allowance (14.6 s). The two initial failures were 5 s timeouts, not assertion
failures. Five browser checks pass; final build/typecheck/lint and whitespace
pass. No push/deployment or hardware FPS claim.

## 22 November 2026 — Capture 5 generation investigation

New capture is detailed and ~31.2 FPS. Background forest jobs now directly
measure 3.975 ms mean / 10 ms p95 / 26 ms max; roads reach 69 ms. Forest changes
involved 216 of 233 static shadow rebuilds. This establishes generation and
publication churn as real contributors; no sole root cause or GPU attribution.

Traced repeated terrain/slope/site generation. Added CPU-only temporary-variant
benchmark tools/benchmarks/scenery-generation.mjs and retained results/analysis
under docs/performance/2026-11-22-*. Current game code unchanged. Bounded caches
plus rejection before slope sampling reduced warm 6,208-cell generation from
~449 to ~193 ms in the exploratory run; all 12 output hashes match (19,706 trees).
One seed and ordered runs limit inference; not a hardware FPS result. Next work:
optimize generation, yield/offload road tiles and stabilize shadow caster groups.
Further steady-view attribution requires lightweight/detailed comparison or a
Firefox Performance trace. No browser/hardware workloads run in this turn.
Local investigation commit follows; no push.

## 22 November 2026 — Image quality restoration and pacing investigation

Restored MSAA, the 1.5 DPR cap and default 100% render scale at Jan's request;
Auto remains optional. Retain 896² sun maps and preceding 900–980 m distant-tree
transition. Removed the previous forest-only shadow throttle after the existing
immediate-invalidation regression failed: stale shadows are not acceptable.
Earlier claims of spatial forest groups were inaccurate; those were not built.

Compared supplied profile(3)/(4): 27.62 → 28.49 ms intervals despite 44% fewer
pixels; CPU callback 8.16 → 12.39 ms, p95 14 → 22 ms; settlement max 72 ms;
static rebuilds 108 in each. Different moving views prevent causal comparison.
No 30 Hz limiter in demandFrames; no GPU timings in either Firefox capture.
No confirmed root cause or hardware FPS gain.

Added F8 detailed/lightweight comparison, restoring deep hooks in lightweight,
plus backgroundCpu timing for main-thread forest/road timers, backend/context
metadata and actual quality settings. Histories bounded, sinks restored;
background time is already part of outside-callback time. Decision 0048 and
profiler guide describe next same-view captures and Firefox Performance trace.
Physical GPU/heat acceptance and human visual checks remain open.

Verification: build/typecheck, lint and whitespace pass. Fifteen focused unit
checks pass (five files); two short software-WebGL profiler checks pass (24 s),
including pixel parity, native hook restoration, capture mode reset and background
sample accounting. Earlier regressions exposed shadow throttle and stale test
transition coordinates; fixed and rerun clean. Initial sandbox browser run could
not start its preview server; approved local run passed. Full npm check not run.
Local commit follows; no push/deployment.

## 21 November 2026 — Distant cutout cards and cheaper F8 reports

Implemented Jan's authorized next steps after the sprite discussion. Shared
four-triangle crossed cards and an 8 KiB code-authored four-variant atlas replace
far boxes beyond tile-centre 1080 m, with an 80 m complementary dither dissolve.
Conservative bounds keep every transitioning tree beyond the 700 m morph. Nearby
shadow tiles and steep overhead views retain geometry. Opaque alpha cutout/depth
writes, standard lighting/fog, unchanged placement/density/residency/collision.
F8 Distant tree sprites compares/restores the mode; resident sprite/transition
counts export. Buffers are shared with a child mesh; transition material pairs
are lazy/bounded and resources dispose. Decision 0047 details tradeoffs.

First prototype's broad per-instance blend dual-drew too many tiles and slightly
increased submitted work. Final tile-centre dissolve reduces total fixture
triangles 574,238 → 517,030 (low) and 557,138 → 500,238 (oblique), about 10%, with
same/+1 draw respectively. Mean image channel differences 0.15/0.38 on 0–255;
inspected comparisons. Sampled sun depth is identical; overhead image/geometry
is identical. Retained docs/performance/2026-11-21-tree-sprites.json. This is
submitted work and software-WebGL visual evidence, not target-device FPS.

Profiler aggregation now builds columns once and uses nearest-rank quickselection
instead of full sorts, preserving sparse/observed-only statistics. Live updates
skip export-only cpuCalls and draw line/point summaries and refresh at 1 Hz;
reset/toggles refresh immediately and full JSON keeps all fields. Reproducible
CPU-only benchmark tools/benchmarks/profiler-report.ts retains the old algorithm;
report docs/performance/2026-11-21-profiler-report.json: synthetic full-report
mean 53.83 → 11.72 ms (30 iterations, 600 frames/160 metrics). Observer effects/layout/
driver work remain; no uninstrumented/hardware FPS claim.

Verification: production build/typecheck, lint and whitespace pass; retained
bundle warning. Full serial subprocess-enabled unit suite passes 363/363 (55
files, 127.35 s). Final three sprite/toggle/profiler checks pass again in 24.9 s.
Six focused browser checks pass in 1.1 min, covering new sprite
views/shadow guards, compact/reference parity, profiler export/native-hook
restoration, prior shader/culling/shadow parity and worker integration. Initial
unit fixture needed an all-containing frustum; first full unit run terminated
before results, final rerun is clean. Full browser suite/npm check not claimed.
No sustained physical-GPU work under retained heat restriction; hardware and
long-flight human visual acceptance remain open. Local commit follows; no push.

## 21 November 2026 — Compact forest proxies and explain shadow rebuilds

Implemented Jan's profiler-driven follow-up. Forest tile buffers now compact
only visible canonical cells into the submitted prefix rather than retaining
zero-scale proxies under resident detailed chunks. Canonical tree records/order
restore exact transforms on eviction; generated treeCount stays compatible.
Recompact changed tiles once, skip unchanged/empty cells and hidden generation,
and avoid unnecessary instance-buffer version changes. No additional GPU buffers
or draws. sceneState.forest and F8 overview expose generated/submitted/omitted
counts; existing conservative LOD/shadow guard and collision remain intact.

Shadow diagnostics classify initial/anchor/rebase/map/context and each stamp
change, count each reason once per successful build, and identify forest versus
settlement/other caster changes. Constant-space lifetime counters and up to eight
last caster labels export under shadowCache.invalidations. F8 separately shows
capture-window event totals; reset/toggles clear those and stop restores both
sinks. Multiple reasons can apply to a build; sums are not rebuild counts.
Decision 0046 documents algorithms, semantics, tradeoffs and verification.

Verification: build/typecheck, lint and whitespace pass; existing bundle warning.
Full serial subprocess-enabled unit suite passes 359/359 (54 files, 109.73 s).
Five focused browser checks pass in 47.9 s, including new compact/reference forest
color+shadow pixel parity through hide/restore/rebase, profiler events/sink
restoration, prior shader/culling/shadow parity and game worker integration.
Fixture removes 1,099 hidden instances; triangles 625,502 → 546,374 (12.65%), draws
69 → 67, with identical pixels. Savings depend on view/residency, not a device
FPS claim. Retained report docs/performance/2026-11-21-forest-compaction.json;
inspected forest capture. Final F8 overview/events rerun passes both checks in
14.6 s. Full browser suite/npm check not claimed.

The user's live Firefox game is not exposed by the browser connection (only
empty in-app surfaces). Same-device/view Trees-off, Shadows-off and 75%-scale FPS
comparisons therefore remain open; instructions are in the profiler guide. No
sustained physical-GPU work under the retained heat restriction. No hardware
FPS or 60 FPS acceptance claimed. Local commit follows; no push/deployment.

## 21 November 2026 — Detailed F8 rendering attribution

Implemented Jan's requested granular profiler; decision 0045 documents semantics.
Capture-only draw hooks split color/shadow CPU submission by bounded scene
categories, with actual renderer.info call/triangle/line/point deltas including
instancing. GL child rows time buffer and 2D/3D texture allocations/updates,
shader compile/link submission and draw commands; cpuCalls exports per-frame
operation counts. Exclusive render remainder removes measured child calls,
while draw/shadow inclusive totals retain their children. Shadow sink separates
scan, flag changes, static rebuild, dynamic depth, depth-copy CPU and uncached
passes. Matrix, tree selection, camera, streaming-plan and observed ground-query
rows added. Direct model.ground calls are observed, not every retained sampler.

GPU queries now run sequential setup/shadow/main-color segments, publish whole
frames atomically and sum to gpuRender. Eight pending frames/24 queries maximum,
no nested queries, waits, readbacks or extra renders in production. Disjoint,
reset, stop, context loss/restore and driver-error cleanup covered. Unsupported
GPU time remains unknown. Schema v2 retains old fields, adds gpuPasses, draws,
cpuCalls and sceneState cache/worker/resource context. Pacing excludes idle wakes
and missing first samples, retaining long continuous stalls. Outside previous
callback remains unattributed, not a GPU estimate. Overview precedes CPU detail;
category table is separately expandable. Histories stay at 600 frames; deep
hooks add observer overhead, requiring F8 on/off comparisons. Reverse-order
restoration removes nested render/GL hooks and shadow timing sink on stop.

Verification: production build/typecheck, lint and whitespace pass; existing
bundle warning remains. Full serial subprocess-enabled unit suite passes 357/357
(53 files, 104.37 s); focused 16-check rerun passes after GL/shadow detail changes.
Four unique browser checks pass across batches: game profiler/export/restoration,
known instanced draw and native-GL restoration fixture, rendered shadow/terrain/
cloud parity, and worker/shadow integration. New fixture compares pixels exactly
and verifies one static rebuild, actual instanced triangle counts and idle-aware
pacing. Fixture initially invalidated tree matrices every frame; moved the upload
test to the non-casting floor to test cache reuse correctly. Inspected compact
profiler capture. Full browser suite/npm check and physical-GPU timing acceptance
not claimed. No sustained GPU work under retained heat restriction. Local commit
follows; no push/deployment. Next: same-device/view short F8 capture and JSON.

## 21 November 2026 — Shadow region, far trees, cloud noise and matrix ownership

Implemented Jan's four requested rendering improvements; decision 0044 records
scope and tradeoffs. Static shadow stamps/temporary flags now exclude casters
outside the sun frustum; outside streaming/movement reuses depth, entry/exit
invalidates correctly. Visible traversal remains for robust transform/buffer
change detection. Distant forest tiles use one box only once the whole tile is
past the 700 m morph and outside the shadow frustum, restoring detail on approach
and keeping prior shadow silhouettes. Rebase-safe conservative tile bounds.
One 256 KiB R8 noise volume replaces cloud fragment hash octaves; retains the
procedural reference option. Fine cloud detail changes slightly. Frontier owns
one explicit scene matrix update; fixed terrain/tile local matrices are frozen.

Rendered comparisons: far tree 36 → 12 triangles with identical pixels; manual
matrices identical; cloud mean channel differences 0.13–0.22 / 255 across three
headings (local maxima 43–100). Inspected cloud comparisons and runway capture.
All 18 existing/expanded terrain, culling and cached-shadow comparisons have zero
pixel differences. Three added shadow frames confirm outside add/move does not
rebuild, entry does. Retained report: docs/performance/2026-11-21-render-followups.json.
No sustained physical-GPU work under the retained heat restriction; hardware
FPS gains and human long-flight/visual acceptance remain open. Reprofile the
same device/view to establish the actual benefit. No push/deployment.

Verification: production build/typecheck, lint, asset validation and whitespace
checks pass; existing bundle-size warning remains. Final serial subprocess-enabled
unit suite passes 352/352 (51 files, 120.09 s). Five focused browser checks pass
(37.2 s); final shadow flag-filter refinement passes both rendering/integration
checks again (26.5 s) and all three new unit checks. Full browser suite not run.
Initial sandbox subprocess/server failures were retried with permitted access;
new shadow mock needed the production light range and a disposable fake target.
One redundant browser launch hit the occupied test port and was rerun serially.
Local commit follows; no push/deployment.


## 21 November 2026 — Shader fast paths, shadow reuse, cloud culling and worker coverage

Implemented Jan's four follow-up optimizations; decision 0043 records algorithms,
tradeoffs and verification. Terrain skips zero-contribution water, wave, reflection,
land-grain and crop shading while calculating filtering derivatives outside fast
paths. Reference fastPaths=false supports rendered comparisons. No quality/range
or draw-resolution reduction. Ordered cloud-bank frustum compaction retains one
instanced draw, billboard bounds and transparency order, uploading only when the
visible bank selection changes. Three tested views submit 152/200/224 of 808
instances with exactly unchanged pixels.

Static sun depth is cached in the active Three shadow callback, GPU-blitted into
the live depth target, then moving aircraft/props, mutants and rescue casters draw
every frame. No extra lighting sample/light contribution; normal PCF sees the
same combined depth. 32 m anchors, light-space texel snapping and ±256 m / 1096²
maps preserve the prior footprint/density with travel margin. Visible caster
transforms, membership, instance/position buffers, anchor/rebase and context
restoration invalidate static depth. Failure restores ordinary shadows, cast
flags/hooks restore in finally, GPU resources/listeners dispose. Extra target
storage is approximately 10 MiB plus depth-copy bandwidth; target-device benefit
requires measurement. F8 adds Cache static shadows and Shadow depth passes
(inclusive)/Cloud bank culling timings. Error/build/copy status is in telemetry.

A dedicated bounded worker prepares fallback recentering, normals and bounds after
the unchanged synchronous initial coverage. Transfer/stage replies, atomically
copy into existing attributes, coalesce travel, reject distant stale replies, and
wake demand rendering on completion without rendering continuously while waiting.
Worker creation/execution/deserialization failure retains the staged CPU fallback.
Chunk workers provide bounds; attachment no longer rescans positions. Frontier
uses a soft 2 ms / maximum-two integration budget, always progresses one payload,
and wakes again for remaining ready replies even if workers are now idle.
Additional worker bundle ~150 KB minified; collision/simulation/saves unchanged.

Verification: production build/types/lint and whitespace pass; existing bundle
warning remains. Full serial subprocess-enabled unit suite: 347/347 passes (50
files, 165.83 s). Final six-test optimization rerun passes, including two additional
shadow-driver/worker-construction failure checks; all 349 checks covered across
runs. Five unique focused browser checks pass across batches: 15 rendered pixel
comparisons, game worker/shadow integration, stable coastline, profiler/export /
restore/disposal and keyboard takeoff. Final integration passes in 19 s. Retained
report docs/performance/2026-11-21-render-parity.json has zero channel differences
in all views; inspected shadow fixture and compact game captures.

Initial shadow preparation outside renderer.render hit null render state; moved
inside the active shadow callback and parity passed. A broad idle integration
wait timed out because unrelated forest residency was still generating; terrain
and worker coverage were already settled. Scoped that check to coverage (static
reuse is tested by the controlled fixture). Tiny-viewport summary click waiting
also blocked the engine check; direct demand-frame wake now verifies the intended
integration independently of menu scrolling. One automatic review timed out;
permitted retry succeeded. Full browser suite/npm check not claimed. No sustained
physical-GPU benchmark under retained heat restriction; no hardware FPS gain or
Pixel acceptance claimed. Reprofile the same device/view and compare the cache
on/off. Preview stopped by Playwright; no push/deployment. Local commit follows.

## 21 November 2026 — Terrain, HUD and ground-shadow CPU fixes

Implemented Jan's requested profiler-driven fixes 1–3; decision 0042 documents
algorithms, costs and limits. Frontier fallback caches absolute terrain samples,
stages at most 128 new samples/update with a soft 2 ms sampling budget, and keeps
the prior mesh until complete atomic publication. Initial construction stays
synchronous. Normals/bounds/publication add work outside the sampling budget.
Previous/next grids bound cache residency. Pending/latest-target work keeps demand
rendering awake even when paused; teleports abandon obsolete builds. The late
latest-target check caught a pending-flag edge case; final terrain/shadow rerun
passes after keeping work pending until the latest requested anchor publishes.
Collision, water fields and stable world lattice are preserved.

HUD text/target discovery/compact data-sample telemetry run at 10 Hz plus input,
state changes and final idle frames. Marker projection remains per-frame; text,
compass and boss markup update only when changed. Projection reuses resize-cached
viewport dimensions. Menu discovery runs only with an open hangar. Verbose JSON
is generated only with visible developer diagnostics. Compact telemetry remains
available for browser checks. No flight, weapons, progression or save changes.
The blurred ground-shadow grid drops from 289 to 25 vertices, reuses its center
height and retains exact sampled vertex heights: 25 queries vs 290 per moving
frame. Coarser triangle conformance needs human visual acceptance on rough ground.

CPU-only warmed comparison: tools/benchmarks/frame-hotspots.ts reads original
implementations from 29f8759; report docs/performance/2026-11-21-frame-hotspots.json.
Six recenters: terrain samples 47,526 → 4,272; maximum update CPU 39.84 → 4.95 ms;
mean total recenter CPU 33.11 → 9.54 ms spread across updates. Shadow mean CPU
0.805 → 0.088 ms over 120 moving frames. Excludes startup/browser/GPU/device FPS;
no improvement to actual device FPS is claimed. Sample budget is soft, not a
hard callback deadline. Reprofile the same laggy scene on Jan's device next.

Verification: build/types/lint and whitespace pass; existing bundle warning.
Full serial subprocess-enabled unit run passes 342/343; final terrain/shadow
rerun passes 13/13 after the latest-target fix, covering all 343 checks across
runs. Five unique focused browser checks pass across batches: player shell,
no-WebGL, profiler, keyboard takeoff and final HUD cadence. Initial artificial-RAF
HUD test blocked Playwright click waiting; switched fixture interaction to direct
DOM events. Stationary marker styles did not mutate; final test moves the camera
and verifies marker changes every frame while text/telemetry refresh 2–3 times in
18 simulated frames. It also verifies hidden diagnostics, immediate pause and
visible dev diagnostics. Final cadence check passes in 13 s. Inspected runway
capture. Full browser suite/npm check not claimed. One automatic approval review
timed out; permitted retry succeeded. Playwright stopped its preview. No sustained
physical-GPU benchmark under retained heat restriction; hardware FPS and human
visual/long-travel acceptance stay open. No push/deployment. Local commit follows.

## 21 November 2026 — Opt-in frame profiler

Implemented requested makeshift profiling without sustained GPU stress. F8 or
Settings opens a bounded 600-frame CPU profiler: plane/collision/tick glue,
zombies, mutants, combat, worker-result integration, terrain, roads, naval,
settlements, trees/clouds, presentation, matrices, render submission and HUD.
Inclusive stages are labeled; multiple fixed ticks accumulate per render frame.
Asynchronous EXT_disjoint_timer_query_webgl2 measures whole-render GPU time,
including shadow maps; unsupported GPU time remains unknown. At most eight pending
queries, disjoint rejection, no synchronous GPU waits or extra render passes.
Shadow/tree/cloud/zombie/mutant visibility toggles reset captures and restore on
stop. Simulation/collision remain authoritative. F8 off restores original methods.
JSON export includes buffer size, browser and active toggles. Observer bookkeeping
and report work are measured separately with explicit lower-bound caveats.
See docs/performance/frame-profiler.md for reproducible comparisons and CPU/GPU
nonadditivity. No laggy-device timing or 60 FPS achievement is claimed.

Verification: build/types/lint and whitespace pass (existing bundle warning).
New aggregation tests pass. Full serial unit run: 334/338 pass; four retained CLI
checks initially fail with sandbox-empty output/timeouts. Permitted four-file
rerun passes 62/64; remaining export/validation five-second timeouts pass all 44
checks in a final two-file rerun with --testTimeout=30000. Thus all 338 unit checks
pass across runs; default full suite is not claimed clean. Final short browser
check passes (18 s): capture display, visual toggle, JSON contents/export,
restore/reopen and disposal; inspected compact panel capture. No full browser
suite, sustained load or physical-GPU benchmark under the retained heat restriction.
User-device lag attribution, observer A/B overhead and hardware FPS remain open.
Preview stopped by Playwright; no push/deployment. Required local commit follows.

## 21 November 2026 — Five-tier aircraft progression and run debriefs

Implemented Jan's progression request; decision 0041 and README list the roster,
XP/credit requirements and save behavior. Kestrel S-1 starts free (single center
prop), then Mule T-2 (twin wing props), Comet J-3 (first jet), original Frontier A-4
(Tier 4) and Spectre X-5 (advanced twin-engine delta/canard fighter). Four new
original 0.1 m voxel sources have 8,632 / 12,450 / 13,486 / 24,578 cells. They retain
cockpit glazing/frames, landing gear, control surfaces, maintenance details, lights,
engine/weapon pods and distinct silhouettes. Props rotate from their source cells.
Only one displayed aircraft owns render resources; replacements dispose the old
mesh. All source JSON is bundled (~181 KB extra gzip); no world streaming increase.
Source-derived cached conservative hulls and matching runway clearance follow the
selected plane. Locked previews do not change authoritative flight. Selected thrust,
speed, handling and damage stack with the retained global upgrades/equipment.
Shared approximate aerodynamic core and all four existing weapons are retained.

Tier 2–5 unlocks require the prior aircraft, 600 / 2,500 / 8,000 / 24,000 lifetime XP
and the same credit costs. XP is not consumed. Aircraft unlock/select requires the
hangar; cards preview locked planes and select owned ones. Credit/XP milestones,
ownership, selected aircraft, completed run count and last debrief persist in pilot
v3. Migration retains v1/v2 credits, XP, skills, upgrades and equipment without
rewriting old bytes; both migrated and new pilots begin the aircraft chain at Tier 1.
Corrupt records remain untouched and progress continues session-only. Landing/stop
records and banks 2× cash/XP; crash records/banks 1× exactly once. Rescue and rearm do
not pay again. Active run time survives pause/resume; a new sortie resets it. Hangar
shows outcome, aircraft, kills, duration, base rewards and bonus, then the next unlock.

Verification: all 336 unit tests / 47 files pass in the full serial subprocess-enabled
run (126.05 s). Final source/preview alignment and reward/progression rerun passes all
40 checks / 3 files (11.49 s). Includes all-five manual departures/climb-outs, strict
unlock/save checks, render disposal/source-to-hull alignment and landing → debrief →
unlock → upgrade → relaunch → crash/rescue. The new departure test initially released
elevator at first liftoff; retaining the documented one-second rotation after lift-off
fixes its three early-aircraft failures. Earlier upgrade expectations now include the
starter's multiplier. Asset-benchmark CLI allowance increased from 30 to 60 s for the
larger source library, retaining every invariant. Build/types, lint, all 27 asset
validations and whitespace pass; existing bundle-size warning remains.

Browser verification: nine unique focused checks pass across batches: aircraft
chain/selection/reload, 15 perspective/front/top aircraft views, saved debrief,
lossless workshop import/export/reload for all four sources, player shell/narrow,
no-WebGL, paused map/showroom, prior static content and keyboard takeoff. Final
four-check aircraft/debrief/workshop batch reports 4 passed (1.8 m); shell returned
143 during preview teardown, but a process check confirmed no preview remained.
An earlier longer batch terminated after six passing checks and left its own
preview PID 133555; identified against the exact prior run PID and stopped. A retry
correctly refused that occupied port. User servers were untouched.

The initial keyboard check was airborne/climbing (51 m/s, 11 m AGL, +5.3 m/s) but
missed its height deadline: one wall-clock second covered less than one simulation
second under software rendering. The test now holds 60 actual flight ticks after
liftoff, retaining height/speed/no-stall assertions; final check passes (31.8 s).
Flight tuning was not changed to fix this test. One approval review timed out;
permitted retry succeeded. Inspected all new aircraft, front/top views, workshop,
hangar/narrow and debrief captures. Corrected Spectre's separated wingtip lights,
regenerated hulls, and aligned previews with their source-derived gear clearance.
Primary launch action stays above the longer aircraft/debrief panels.

No sustained/heavy physical-GPU work under retained heat restriction. Full browser
suite/npm check is not claimed; focused short UI/static/workshop checks were used.
Human flight, art, unlock-economy balance and hardware FPS acceptance remain open.
Playwright preview was stopped; no push/deployment. Required local commit follows.

## 21 November 2026 — Homing missiles, world map and expanded sortie presentation

Implemented Jan's requested feature slice; decision 0040 records limits and costs.
Weapon 4 acquires for 60 flight ticks, then launches a moving-target sine-loft
missile (6,000 direct damage plus blast), with terrain/structure collision, reload
feedback and bounded projectile/effect pools. M pauses and displays a cached 48²
CPU terrain overview; WASD/arrows pan, +/− zoom, with center/close buttons. Terrain
can be viewed across the full playable coordinate range without another chunk set;
markers represent known contacts, clustered at large zoom levels.

Added throttle-driven gas/afterburner, peripheral speed streaks, layered humanoid
mutant anatomy, bounded slow pursuit and evadable one-second close strike windups.
Clouds use denser 11×11 billboard cells (968 billows maximum) with extended distance
fades and revised density lighting. Split hangar panels flank an orbiting runway
showcase; four locked plane slots reserve future roster space. Narrow framing keeps
the aircraft above service panels; reduced motion stops automatic orbit. Crash
orbit includes two pooled rescue helicopters approaching/landing and a skip button.
Base has instanced modular fortifications, towers, hangars, barracks, tents, supply
crates and static tank guards; shared descriptions supply solid collision.
Crashes bank ordinary earnings once; landing/stopping pays double money and XP.
No save migration. Updated README/plan and reward regressions.

Verification: all 321 unit tests / 46 files pass across the full run and affected
reruns. The full subprocess-enabled run passed 320/321; its existing 30-second
asset benchmark timed out during browser contention. Final isolated six-file
rerun passed all 59 checks (35.73 s); final nine-feature rerun also passes (1.22 s).
Initial sandbox CLI output failures were rerun with subprocess access. One approval
review timed out; permitted retry succeeded. Build/types, lint, all 23 asset source
validations and whitespace pass; existing bundle warning remains. Five focused
browser checks pass (1.7 m): player shell/narrow/settings, unavailable WebGL,
cockpit lifecycle, showroom/map controls, and four bounded static content views.
Earlier active software-rendered menu checks exceeded time budgets; reduced-motion
checks avoid continuous orbit while retaining an explicit animated showroom check.
Final map marker/narrow showroom polish and static content rerun: both pass
(51.7 s), including the initial narrow runway showcase capture.
Inspected desktop showroom, map, narrow menu, detailed boss, base and rescue captures.
No sustained flight/heavy GPU benchmark under retained heat restriction. Actual
physical-device FPS, human handling/visual/balance acceptance remain open. Cloud
overdraw increases; no measured FPS improvement is claimed. Rescue is cosmetic;
tanks are static guards; map terrain is sampled and hostiles are known contacts.
Playwright owns/stops its preview; user server untouched. Required local commit
follows; no push/deployment.

# Handoff — 21 November 2026

## 21 November 2026 — Stable coastline and auto-level off by default

Investigated/reproduced the reported moving coast. At seed 103 / z=-700, the same
coarse shore alternated x=-704 / -768 on 64 m recenterings of its 128 m grid, then
changed again at the inner detail tier. Decision 0039 fixes origin alignment and
makes the coastal wet/dry boundary, sand/depth and foam placement use an absolute
world-position basin field rather than changing triangle wet-color interpolation.
Deep sea/inland fast paths bound extra fragment work. No new GPU resources/draws;
terrain/collision/save fields and streaming residency are retained. GPU mirror
must track future generator changes; physical-GPU cost remains unverified.

Frontier alone defaults to assisted=false; Direct is the initial settings option,
labeled auto-level off. Assisted mode enables auto-level/automatic trim. Rearm
preserves an explicit user choice; historical Flight/lab defaults are retained.
README updated. No flight-force tuning or saved preference change.

Verification: 312 unit tests / 45 files pass (129.59 s); final browser: all five checks pass (56.1 s), including manual-default keyboard climb-out. New browser check compares CPU/GPU heights/wetness for
four seeds (including UINT_MAX), then holds a fixed camera while moving coverage
25 times and swapping all four incoming LODs. Nonempty water and land masks are
required; at most two boundary-pixel differences allowed. Inspected stable-coastline
capture. Unit checks cover negative-coordinate grid alignment/reuse and default /
rearm assistance choice. Browser shell covers Direct startup and assisted on/off;
keyboard departure checks the new manual default. Build/types/lint, assets and
whitespace: pass (23 source assets); existing bundle-size warning remains. One browser permission review timed out; permitted retry
succeeded. No hardware/heavy flight benchmark under retained heat restriction.
Human visual/flight and physical-GPU acceptance remain open. Required local commit
follows; no push/deployment. Playwright owns/stops its preview, user server untouched.


## 21 November 2026 — Procedural clouds, waterways, surf and siege spiders

Implemented Jan's follow-up visual/content slice; decision 0038. Clouds now occupy
seeded world cells and stream through a bounded 7×7 window, fading at distance.
World positions/noise persist across recentering and revisits; only the sky follows
the aircraft. Soft transparent density-shaded billboards replace opaque spheres;
maximum 392 billows / 784 triangles in one draw. Transparent overlap is approximate;
fragment noise/overdraw cost is unmeasured on physical GPU.

Shared terrain water uses authoritative depth, near-bank tint, darker channels,
flow bands aligned to the river, advected wave normals and the actual sun direction.
Coasts add pale/damp sand and white broken breakers moving shoreward through the
shallows. Depth adds one float/vertex (~11% terrain buffer overhead), transferred
with workers and supplied by fallback terrain; no extra sampling or render pass.
Watercourse paths and save scopes are retained. The home apron north plateau
starts 12 m before the runway (previously 50 m) to reopen its river gap; analytic
collision bounds match. Runway height/dryness are retained. Pausing or disabling
Combat effects freezes water animation. Shore distance/foam are presentation
approximations on the current LOD silhouette, not moving water collision.

64 m siege spiders coexist with brutes/colossi: eight jointed legs, dark armored
body, eyes/fangs; rotated render segments, conservative collision bounds and
chains of hit spheres. One deterministic early-world spider plus regional spawns;
12,000 HP / $2,200 / 3,200 XP, nearby slow roaming, existing passive combat/reward
rules. V1 wounds accept the additive mutant:spider ID; old records remain valid.
Some former regional brute slots now select spiders. Render capacity 4,096 shared
primitive parts, no new external art/source assets. HUD and manual name spiders.

Verification: final full unit run passes 310 tests / 44 files (120.33 s), including
continuous river across the approach apron, dry runway and analytic terrain bounds.
Four browser checks passed (1.5 m) before the apron correction: all six static
views, coast/river animated pixel differences, isolated sharp edge and player shell /
WebGL fallback. The hangar purchase/navigation check also passed in the earlier
five-check run. Final apron-corrected scenery capture: passed (1.1 m), including both water pixel checks. Inspected cloud, spider, river and coastal captures.
Cloud tests cover fixed world coordinates, retained overlap across cell boundaries,
revisits, capacity, transparency and disposal. Spider checks cover 16 leg segments,
hit geometry, damage/death persistence and once-only boss rewards. Browser coast/
river checks compare pixels at two times; the isolated edge fixture disables water
presentation to continue testing sharp LOD coverage. An intermediate new depth assertion caught slightly negative presentation depth
from 0.1 m terrain rounding; clamping depth to zero fixed it without changing the
height field. Initial browser run hit suite
budgets while sharing CPU with unit regressions; static multi-view and hangar budgets
now allow their actual sequential workload. Build/types/lint, 23 source validations
and whitespace checks pass; existing bundle warning remains. No sustained flight
or hardware benchmark under retained heat restriction. Human visual/handling and
physical-GPU acceptance remain open. Required local commit follows; no push/deploy.
Playwright owns/stops its preview; user server untouched.


## 21 November 2026 — Sunset combat reference presentation

Implemented the requested screenshot-inspired presentation; decision 0037. Amber
sky/fog, lower shared sun direction, warm lighting and 72 shaded low-poly cloud
puffs replace the purple/blue sky and flat cloud slabs. Green aviation instruments,
continuous heading tape, open navigation diamonds, red target lock, top boss-health
panel and heading-up 2.5 km radar use actual navigation/combat state. Radar omits
out-of-range contacts and shows the base plus nearest horde and mutant. Desktop
and narrow layouts keep the reticle clear. Simulation and world assets retained.

Verification: all 306 unit tests / 42 files pass (103.91 s), including
radar heading/range and compass wrap checks. Two browser checks pass (28.6 s), including green HUD,
radar, seven heading ticks, narrow-screen fit, pause/tools and unavailable-WebGL
fallback. Inspected final desktop/narrow captures in test-results. Build/types,
lint, 23 asset validations and whitespace checks pass; existing bundle warning
remains. Initial sandboxed unit run was stopped after subprocess CLI failures;
final regression uses the required subprocess access. Cloud geometry increases
from 864 to 7,200 triangles in the same single instanced draw; no new render targets.
No sustained-flight/heavy GPU benchmark under retained heat restriction. Human
visual/handling and physical-GPU acceptance remain open. Required local commit
follows; no push/deployment. Browser preview owned/stopped by Playwright.


## 21 November 2026 — Banked elevator axis and 2.5× thrust

Jan reported elevator pull still rotated toward the world sky during a bank, and
requested 2–3× thrust. Fixed the remaining world-Euler attitude shortcut; see
0036. `flight/attitude.ts` rotates the basis about aircraft-local wing, fuselage
and fin axes, then chooses continuous equivalent Euler coordinates for existing
rendering/collision/weapons. Elevator now pulls toward the banked canopy, sideways
at knife-edge and downward inverted. Yaw stabilization uses body sideslip/local
fin axis; automatic recovery uses local roll. Full rolls/loops are supported.
Ground pitch reaction applies only to level-wing rotation. Force integration,
stall curves, saves, assets and streaming budgets remain unchanged.

Base thrust is 30 kN, up from 12 kN (2.5×), retaining throttle/upgrade scaling.
Higher climb/acceleration and equilibrium speed follow the physical force model.
README and decision 0036 document the change; plan records requested scope.

Verification: final full serial run passes all 304 tests / 41 files (102.38 s),
with subprocess access and a 15 s CLI timeout. Fourteen new checks cover banked
wing-axis rotation, knife-edge/inverted pull, exact local roll/yaw, repeated
vertical/compound rotations, actual knife-edge flight, mirrored tighter banked
turns at 30/60/144 Hz and thrust/throttle/upgrade forces. Existing stall, loop,
landing, collision and reward regressions pass. Departure tests now rotate at
measured 33 m/s instead of a stale fixed acceleration duration; the stronger
engine can naturally lift off before that old duration. The no-launch-jump check
now measures ground/liftoff rather than later fast climb. Carrier climb regression
retains three seconds of neutral climb after rotation; separate airfield tests
still cover 20 s at three update rates. Presentation tests bound one-tick velocity
lag using acceleration; direct mode no longer assumes Euler bank is immutable
while pitching/yawing about local axes.

Final build/types/lint, 23 asset validations and whitespace checks pass; existing
bundle warning remains. Three browser checks pass (33.9 s): player shell, no-WebGL,
and actual keyboard takeoff/climb-out (15.6 s test) at 320×200 render resolution,
effects disabled. Inspected final capture: 70 m/s, 25 m AGL, +19.5 m/s climb.
No sustained/heavy flight benchmark or physical-GPU claim under retained heat
restriction. Human handling acceptance and sustained higher-speed travel remain
open. Playwright owned/stopped its preview; user server untouched. Required local
commit follows; consult git log. No push/deployment.

# Handoff — 21 November 2026

## 21 November 2026 — Flight correction after failed user takeoff acceptance

Jan rejected the previous flight handling after reporting inability to take off.
Decision 0035 supersedes 0034's flight approximation. New rendering-independent
`flight/aerodynamics.ts` supplies dynamic-pressure lift, profile/induced/separated
flow drag, thrust, gravity and elevator pitching moments. Flight integrates a real
velocity vector. Bank tilts lift; critical AoA drives stall; static stability and
pitch-rate damping drive nose response. Assisted automatic trim changes elevator
moment, not the trajectory. Direct mode uses fixed aerodynamic trim. Parameters
are approximate for this fictional aircraft; reduced-order yaw/roll/contact models
are explicit in the decision. No six-DOF/spin fidelity claim.

Runway acceleration shares thrust/drag, rolling friction and braking. Ground
reaction supports the rotated underside; near-contact angular reaction prevents
rotation through the runway during initial wheel unloading. Lift-off follows net
upward force. Removed fixed launch-speed/upward jump, pitch-following flight path,
scripted stall sink and minimum airspeed. Landing/banking/carriers, saves, collision
hull and visuals are retained. Updated UI/manual: full power, rotate at 32–35 m/s,
ease S about a second after liftoff, then use short inputs. Stall advice says lower
nose/add power. Existing maximum-speed upgrade scales available thrust.

Verification: final full serial unit run passes all 290 checks / 40 files (78.99 s),
with subprocess access and a 15 s CLI timeout. Includes 20-second actual-airfield
departures at 30/60/144 Hz, delayed rotation, extended carrier climb-out, force
scaling, bank/inversion, AoA stall/recovery, zero-speed gravity, dissipative work,
and a full velocity-vector loop. Previous exact 4.84 m near-ground snapshot was
obsolete under physical forces; replaced it with clear-flight bounds and exact
single-tick/maximum-catch-up parity. It passed independently and in the final full
run. Tests retain terrain/contact/work budgets and landing/reward coverage.

Build/types/lint, all 23 source validations and whitespace checks pass; existing
bundle warning remains. Three browser checks pass (49.9 s): player shell, no-WebGL,
and actual keyboard takeoff/climb-out (26.9 s total test). Flight used 640×400 view
at 50% scale (320×200 render) with effects disabled. Inspected climb-out capture:
48 m/s, 24 m AGL, positive 9.7 m/s climb, no stall. Browser inputs accelerate to
33 m/s, rotate, release elevator after one airborne second, then verify sustained
climb and pause/cleanup. Earlier short takeoff tests had not covered this sequence.

User flight feel/visual acceptance, physical-GPU FPS and sustained/heavy flight
benchmarks remain open under the retained heat restriction. Playwright owned and
stopped its preview; user server untouched. Required local commit follows; consult
git log. No push/deployment.

# Handoff — 21 November 2026

## 21 November 2026 — Energy flight and cockpit presentation

Implemented Jan's requested flight/presentation slice; decision 0034 records scope
and costs. Fixed-wing flight separates attitude/velocity, trades speed for altitude,
adds load/angle-of-attack stalls and recovery, permits loops, and raises the safety
ceiling to 2400 m. Reduced low-speed pitch authority preserves runway/carrier
rotation. Retired headless Sortie explicitly retains historical handling.

Trees use three instanced cuboids and a 420–700 m vertex/color morph, independently
of terrain detail residency. Same canonical placement, tile/instance/draw budgets;
three times forest vertex work. V toggles a dynamically imported cockpit with
canopy, consoles, stick/throttle and six animated gauges; resources release on exit.
Load-driven rumble/wing vapor and directional warm sun glare obey Combat effects.
Glare is a stylized screen veil with a nearby terrain horizon check, not volumetric
occlusion. Saves/world geometry are unchanged.

Verification: all 280 unit tests / 39 files passed serially with subprocess access
and a 15 s CLI timeout (74.15 s). Final tree/color/cockpit changes passed affected
reruns (9 checks, then final 6). Final build/types/lint, all 23 asset validations
and diff whitespace pass; existing bundle warning remains. Installed Chromium for
short mostly paused checks: player shell and unavailable-WebGL passed; final
cockpit lifecycle and isolated dense-forest shader checks passed (12.9 s).
Inspected final cockpit and forest captures in test-results/. Initial sandbox CLI
output failures passed outside sandbox. Initial takeoff stall regression was
fixed. A browser check unnecessarily waited for all async forest generation and
timed out; it now waits for actual tree instances to exercise shader compilation.
The full forest queue completes in the isolated forest regression. Final cockpit
placement was adjusted after inspecting cropped lower gauges.

No sustained-flight/heavy browser suite or physical-device FPS check under the
retained heat restriction. Human flight/visual/balance acceptance remains open.
Approximate aerodynamics and sun occlusion limits are explicit in decision 0034.
Preview owned/stopped by Playwright; user server untouched. Local commit only;
consult git log. No push/deployment.

# Handoff — 21 November 2026

## 21 November 2026 — Node.js 26 migration

At Jan's request, moved the supported development runtime to Node 26.x in
package.json, the lockfile, `.nvmrc`, README and the development guide. Added
`tsx` for benchmark TypeScript parameter properties because Node 26 removed
`--experimental-transform-types`; updated the existing combat CLI regression.
Decision 0033 records the choice. No gameplay or browser bundle changes.

Verification on Node 26.13.0 / npm 11.20.0: dependency installation, lint, all 23
source validations, types and production build pass (existing bundle-size warning).
The full serial unit run passed 273/274; only the asset-export CLI exceeded its
5 s limit. Its five-case file passed on rerun with a 15 s limit in 3.50 s; all
274 tests therefore pass across runs. Initial sandbox CLI subprocess failures
were rerun outside the sandbox; a failed network install cleanup initially
interrupted the first test attempt, then clean dependency installation completed.
Benchmark regression and settlement module import work with tsx. Browser tests
were not run; Chromium is not installed on this fresh laptop. Physical-GPU and
human gameplay acceptance remain open. Local commit only; no push/deployment.

# Handoff — 30 October 2026

## 30 October 2026 — Roaming giants and sunset countryside

Implemented Jan's requested giant movement, organic city/rural placement,
field-side farmhouses, sunset lighting/shadows, directional warm/cool atmosphere,
and static reflective ocean/river waves. See docs/decisions/0032-frontier-sunset-roaming.md.
Giant movement is nearby-only, passive and paused with simulation; hit spheres and
solid bodies follow. Town outskirts thin into houses. Farm groups attempt 1–2
houses per 2–4 parcels and skip unsuitable footprints. Same terrain/water collision
heights and wound/progression save keys; procedural structures may regenerate.

Validation: all 274 unit tests (38 files) pass in the final serial run (68.65 s).
Types, production build, lint and diff whitespace checks pass. Three final browser
checks pass (36.2 s): countryside/ocean/boss static views, paused runway/narrow
player smoke, and unavailable WebGL. Inspected the runway, fields and ocean
captures; final water glints were softened after the initial visual pass. Initial
sandbox CLI/server restrictions passed with approved subprocess access.
Local commit follows; consult git log. No sustained flight or physical-GPU
performance claim; human visual/balance acceptance remains open. User server left
alone; Playwright owns its short-lived preview. No push/deployment.

# Handoff — 30 October 2026

## Latest: Frontier countryside, ocean bases, mutants and expanded hangar

Jan requested the staged expansion in docs/frontier-expansion-plan.md. Features
are implemented end to end; see decision 0031 and README for gameplay and costs.
Fields form connected triangular/trapezoid/clipped-corner parcels, with smaller
flower fields. A 25-tile road view presents streets well ahead of near terrain,
including rural dirt roads and farm access lanes; no duplicate Frontier worker roads.

New NavalWorld supplies sparse groups of 5–8 battleships plus a carrier. One fleet
southwest of home guarantees Carrier Resolute. Procedural fleets check ship
footprints against ocean. Shared original block descriptions supply visuals and
solid hulls/islands. Spatial runway queries allow the same manual landing, full
stop/banking, hangar, takeoff and crash recovery loop at every carrier and home.
The hangar destination selector changes navigation only. Reload starts at home;
session recovery returns to the latest landed base.

New Mutants population adds passive 24 m brutes (3500 HP / $600 / 900 XP) and 125 m
colossi (24000 HP / $4000 / 6000 XP). Wounds/deaths persist separately; body hit
spheres and skin-distance explosions make all weapons useful. Living bodies are
solid collision hazards; there are no enemy attacks. Larger rewards remain
unbanked until stopping at any base. A boss kill→carrier landing→bank→spend skill
point→reload regression exercises the complete new loop.

New progression.ts migrates valid v1 pilot money/XP/three upgrades into a separate
v2 save; original bytes remain untouched. Added 18 prerequisite skills (54 ranks),
one skill point per 300 lifetime banked XP, and 18 permanent functional purchases
with four exclusive equipment slots. Landed hangars permit training, purchase,
equip and unequip. Menu updates are revision-driven. Existing three cash upgrade
tracks remain. All new resources are scene-owned, cancel timers on teardown and
preserve the borrowed cube geometry. Ship/mutant instance positions are rebased.

Verification: all 275 unit checks pass across 37 files in the final serial run
(66.9 s); final types/production build/lint pass. Seven focused browser checks passed
(58.5 s): actual landscape/fleet/boss captures, desktop/narrow skill/shop navigation
and save reload, crop GPU pixel comparison, distant forest, sharp shoreline,
paused root smoke and unavailable WebGL. Inspected the final scene and hangar
screenshots; copies in /tmp/mvw-frontier-expansion/. These are static/mostly paused
checks, not hardware FPS or balance acceptance. Initial deck slab collision and
escort coastal placement regressions were fixed. No sustained flight/load/browser
suite under the retained heat restriction. User server untouched; preview owned
and stopped by Playwright. Local commit follows final checks; consult git log.
No push/deployment. Human visual/flight/balance and physical-GPU gates remain open.

# Handoff — 30 October 2026

## Latest: procedural crop fields and larger mountains

Jan requested flat, realistically proportioned rectangular crop fields using an
attached aerial landscape as direction, plus bigger/more common mountains.
Implemented shared seeded farm descriptors and flat plateaus with smooth grassy
headlands in regional-terrain.ts; canonical tree rendering/collision clear their
interiors. Frontier's terrain material adds sharp crop edges, five crop/soil colors
and filtered planting rows via a 5.3 KiB descriptor atlas, with no added draw calls
or geometry. Natural vertex colors avoid coarse halos. Atlas updates on farm-block
crossings, supports render rebasing, and is disposed with the scene. Near/far
terrain geometry and collision share the flattened heightfield. Existing regional
labs receive the terrain shaping; crop surface detail is Frontier presentation.

Mountain amplitude 125→170 m, wavelength 240→320 m; foothills begin 150 m closer
to lowlands. Updated 235 m global terrain ceiling and Frontier collision bounds;
250 m flight ceiling retained. Tight local field-blend bounds preserve near-ground
collision work budgets. See decision 0030 and README. Existing regional terrain,
settlements and tree layouts may regenerate under the same seed; no save reset or
legacy-v1 changes.

Verification: all 263 unit cases pass serially; final types/build/lint pass. Five
focused browser cases pass across final runs: crop shader pixel comparison and
landscape, distant forest, sharp shoreline, paused/narrow Frontier, and unavailable
WebGL. Inspected final crop landscape PNG, copied to /tmp/mvw-crop-landscape.png.
Initial shader reserved-name and local-collision-bound issues were fixed. Four
sandboxed CLI test failures passed outside the sandbox; final full suite also
passed there. An initial player smoke raced the build; both player checks passed
again after build completion. No heavy flight/load/browser suite under retained
heat restriction. Physical FPS and human visual/handling acceptance remain open.
Preview servers were managed/stopped by Playwright; user server untouched.
Required local commit follows checks; consult git log. No push/deployment.

# Handoff — 30 October 2026

## Latest: dense green distant forest

Jan requested removal of sparse dark tree blocks and dense far-away trees in the
near foliage's green, retaining tall simple cuboids. Replaced the old 32 m scenery
lattice with canonical `regionTrees` 8 m placement, matching linear RGB, water /
slope / settlement / airfield filters. The new view reaches roughly 1.4 km in
97 culled 256 m instance tiles; all share the existing cube geometry and one
material. Explicit scenery capacity is now 99,328 slots (~6.36 MB per matrix copy),
not the prior 4096. See decision 0029 for cost/ownership and verification.

Generation uses <=16 canonical chunks / ~3 ms target per async batch, yielding
8 ms. Existing tiles persist during travel; settled buffers do not rebuild.
Paused scenes receive throttled invalidations while loading and stop after it.
Proxy slots hide when actual resident LOD 0/1 vegetation is present and restore
at identical positions on unload. Root diagnostics include forestPending. Timers,
unloaded tiles and shared resources are cleaned up. No terrain/collision/save/
canonical tree-layout/legacy-lab changes.

Validation: all 261 unit cases pass; build/types/lint pass. Three short browser
checks pass (15.6 s), including an actual-scenery one-frame capture with thousands
of trees at 500–1200 m and <60 draw calls in the isolated view. Inspected the PNG:
dense matching green cuboids into the horizon. No heavy flight/load/browser suite
under the heat restriction. Increased vegetation GPU/memory cost is real;
physical FPS, long travel and human visual acceptance remain open. User server
untouched; preview managed/stopped by Playwright. Required local commit follows
checks; consult git log. No push/deployment.

# Handoff — 30 October 2026

## Latest: sharp distant shoreline colors

Jan showed blurry distant shores versus a sharp nearby edge. Horizon triangles
interpolated water and land vertex colors over 16–128 m. Frontier's shared material
now interpolates a vertex water mask, recovers the unmixed dry palette, and uses
a pixel-antialiased coverage threshold. Removes the wide blue/green smear at both
terrain tiers without new geometry, textures, samples, draw calls or streaming
work. Same water palette/grain/rebasing; terrain/collision/saves unchanged.
Decision 0028 records the method and geometric-resolution limit.

Verification: all 259 unit cases pass serially; build/types/lint pass. Two short
mostly paused player smoke cases pass. New actual-shader one-frame GPU pixel test
passes: >100 mixed pixels in the interpolated reference versus <=2 in the sharp
version. Inspected both before/after PNGs. Initial fixture output-array handling
was corrected and the test rerun passed (2.5 s overall). Fixture bundles with
existing Vite only and is excluded from production. No heavy browser/flight load
suite under the heat restriction; physical FPS and human visual acceptance remain
open. User server untouched; preview managed/stopped by Playwright. Required local
commit follows checks; consult git log. No push/deployment.

# Handoff — 30 October 2026

## Latest: raised water walls / shoreline correction

Jan reported the elevated blue river wall. Root cause: fixed-width water above
unraised plains (seed 103 x=0: water 18.925 m, outside bank 11.5 m), plus airfield
flattening that moved land without moving water. Regional profiles now shape beds
and containing banks, merge river/lake junctions continuously, and blend into the
landscape. Airfield land/water now use the same flattening weights. Decision 0027
has details. Visual meshes, fallback and collision use the same corrected field.

Updated conservative land/water collision bounds for raised banks and airfield
blending; low-flight hierarchy/work-budget tests still pass. No added rendering
objects/materials/workers or dependency. Regional-v2 shore-adjacent content can
regenerate; no save-key reset/write or legacy-v1 terrain change.

Verification: all 259 unit cases passed serially; final strengthened three-case
shoreline subset passed again. Build/types/lint pass. Three short mostly paused
browser checks passed in 12.1 s, including new river/lake captures. Inspected both:
water meets banks without the elevated blue wall. Bounded CPU sweep diagnostic
retained <=2 exact ground calls in sampled scenarios; 5 m runway used zero calls
(~0.085 ms), not hardware FPS. No heavy flight/browser load suite under the heat
restriction. Keep physical-device FPS and human visual/flight acceptance open.
User server untouched; preview managed/stopped by Playwright. Required local
commit follows final checks; consult git log. No push/deployment.

# Handoff — 30 October 2026

## Latest: remaining near-ground collision cost

Jan still reported stutter below ~30 m. The previous broad rejection was
incomplete: clear 5 m passes still made 62k–72.6k terrain calls (~39–45 ms per
movement). Added a spatial hierarchy over the full unchanged hull-point set;
active near-ground checks now reject clear sections and sample only potential
contact. Tightened actual river/lake carving/water and airfield blend bounds;
added cheap obstacle AABB rejection before full SAT. No new AGL cutoff, hull
thinning, sweep reduction, terrain-height or save change. Decision 0026 explains.

Bounded diagnostic `tools/benchmarks/near-ground.ts` / JSON: clear 3/5 m runway
passes use zero samples (~0.25/~0.09 ms); actual 2 m contact still detected with
two exact samples (~0.64 ms). CPU-only, individual/JIT-sensitive sweeps, not
verified physical-device FPS. Original 30 m evidence did not cover the active
narrow phase and should not be treated as complete low-flight acceptance.

Verification: all 256 unit cases passed serially outside sandbox; all 28 affected
cases passed again after final interval refinements. New parity/work-budget tests
cover 2/3/5/10/20/29 m, banks, ridges, water, base blends, lake corners and actual
Frontier maximum catch-up frames at 5 m. Build/types/lint pass. Short mostly paused player browser smoke passes (two cases); the final mixed
runway/core paint-bound guard was covered by the affected unit rerun and build. No heavy browser/load
run under the retained heat restriction; physical FPS, long travel and human
flight feedback remain open. User server untouched, preview managed by
Playwright. Required local commit follows checks; consult git log. No push.

# Handoff — 30 October 2026

## Latest: low-flight CPU cliff and terrain detail

Jan reported ~3 FPS below ~140 m AGL and muddy ground. Fixed Frontier's
collision hot path with a conservative local terrain/water interval ceiling.
The 6,050-point hull previously caused 66,550 procedural samples per 1 m sweep
below a global world-space elevation limit. Clear low passes now need zero
samples (isolated CPU 33–51 ms → 0.05–0.45 ms at 30 m AGL). Detailed contact,
landing, tree/building collision remain active. Other worlds do not opt in.
This is CPU evidence, not verified hardware FPS. See decision 0025 and the bounded
`tools/benchmarks/low-flight.ts` diagnostic / JSON evidence.

Added filtered, world-anchored grass/soil grain across Frontier ground LODs,
removed a dulling tint and extended the finer underlay to 512 m. Same shared
material/mesh; world rebasing preserves patterns. Inspected final runway capture.
Heights, saves and worker/residency caps are unchanged.

Validation: 253 unique unit tests passed (249/253 initially in sandbox; all 64
cases in the four CLI files passed on a serial outside-sandbox rerun). Build,
types, lint passed. Two short mostly paused player smoke checks passed after
fixing a GLSL reserved identifier caught on the initial attempt. No heavy browser,
flight or load suite; retain Jan's heat restriction. Hardware FPS, longer travel,
human visual/landing acceptance and earlier legacy gates remain open. User server
untouched; preview server managed/stopped by Playwright. No push/deployment.
Required local commit follows verification; consult git log.

# Handoff — 30 October 2026

## Latest: integrated Frontier runway runs

Jan requested the final base → manual takeoff → procedural exploration/combat →
manual landing/full stop → bank money/XP → upgrades loop, plus ten seconds viewing
a crash before automatic return. Root now loads `game/frontier-main.ts`; `/play/`
and all labs retain their earlier gameplay/save scopes. Decision 0024 and README
cover controls, economy, persistence and limits. The plan records the selected
integration scope. This is implemented integration, not release/hardware approval.

New modules: `game/frontier.ts`, `frontier-main.ts`, `frontier.css`,
`world/airbase.ts`, `world/frontier-collision.ts`,
`rendering/frontier-settlements.ts`, `frontier-scenery.ts`. Shared Flight gains an
opt-in runway model; default labs stay airborne. Worker specs gain a signatured
base-flattening/reservation flag. Roaming population uses a separate key and
continues past the old 8 km population square; shared coordinate validation is
expanded. Four detail LOD tiers, 49 resident chunks/groups, two jobs/results and
two attachments/frame remain. Coarse terrain covers the horizon; settlement and
tree proxies are bounded; GPU transforms rebase in 4096 m steps. No cosmetic
mountain annulus in Frontier. Trees now collide in Frontier via the same cached
cuboids the worker renders; base/terrain/water/building contact remains independent
of GPU readiness. Legacy labs keep their existing tree behavior.

The player starts on a 480 m strip. E accelerates, S rotates above 28 m/s. Touchdown
requires runway containment, alignment/level wings, <=48 m/s and <=4 m/s descent;
Q idles and brakes. One stopped second banks once and opens the hangar. Crash
recovery takes ten unpaused seconds and loses unbanked rewards. Reload starts at
home; casualties persist separately. Engine/damage/bounty upgrades have five levels
and save with money/XP. Corrupt/denied saves preserve bytes and show session-only
status. Population save limit is 4096 changed encounters / 2 MiB. The underlying
v2 geography keeps its existing broad coast/river layout, with a very large numeric
safety envelope rather than a mathematical infinite-coordinate representation.

Verification: 249 unique unit checks passed across serial runs and targeted
reruns (original 233 + 16 new). Initial full serial run passed 243/247; four CLI
checks returned empty sandbox child stdout/stderr. All 64 cases in those four
files passed unchanged outside the sandbox. Final Frontier + tree collision tests
passed (15 cases); scenery tests passed separately. Types/build/lint and 23 source
validations passed. New two-case player browser smoke passed with one 800×600,
mostly paused browser (7.3 s), including all LODs, settings, pause, narrow layout,
shader/JS errors, cleanup and unavailable WebGL. A prior label lookup failure was
fixed with explicit select accessible names; no timeout was relaxed. Inspected
final runway and narrow captures. Tree collision was added afterward and verified
in CPU tests; it does not change the paused render path. Root browser tests now
assert Frontier; legacy flying-mode assertions remain at `/play/`.

IMPORTANT: retained Jan's earlier heat restriction. No heavy browser suite, route,
load or flight benchmark was run. The full browser regression, longer travel,
physical-GPU FPS/Pixel 10a, human landing/flight feel and balance remain open;
prior legacy sortie-budget and user-feedback gates remain open. Browser preview
servers were stopped by Playwright; no user server was started/stopped. No push or
deployment. Required local commit follows these checks; consult git log.

# Handoff — 28 October 2026

## Latest: corrected orbit axes and fitted aircraft collision

Jan reported wrong orbit direction and premature crashes. Both mouse axes are
reversed; C still toggles unlock/lock-reset. The old main-game margins were 9 m
centre AGL (plane) / 14 m (helicopter), plus 9 m building inflation. Fitted,
attitude-aware swept hulls replace them. Player fixed wing uses 204 solid boxes
covering every source voxel at the renderer's y=-2.4 pivot. Labs match their
visible boxes; helicopter body/skids/tail/mast plus thin rotor disk are fitted
(disk radial excess <0.25 m). Ground/water sampling <=0.5 m; sweep point travel
<=0.1 m, eight contact refinements, full OBB/AABB building tests. Static collision
is independent of streaming. Regenerate the derived hull with
`node tools/assets/collision-hull.ts > src/flight/attack-aircraft-hull.ts`.

All 233 unit tests passed serially; lint/types/build passed. New combat/regional
browser checks passed: clear the old buffer, pause safely, then skid contact
(~1.6–1.8 m centre AGL). Both corrected orbit-axis cases also passed. Agent
inspected contact captures. The initial new combat fixture overshot its pause
point under software rendering; it now pauses earlier below the old 14 m limit
and tests final contact separately. No existing timeout/threshold was relaxed.
A safe generator-proven regional 190 m ceiling removes needless high-altitude
sampling; terrain generation itself is unchanged. CPU-only low-pass sweep p95
1.42 ms is not GPU/FPS evidence. Decision 0023 has details and limitations.

IMPORTANT: Jan reported CPU spikes/heat while the full software-rendered browser
suite was running. Stopped it immediately with SIGINT; verified no test Chromium,
Playwright CLI or 4173 preview server remained. Do not restart heavy browser/load
checks without Jan's agreement. Full run stopped at 36 passing cases, one known
legacy 90-second sortie-budget failure (after mission/reload/collision recovery),
one benchmark interrupted and 50 not run (16.8 min). This is partial coverage,
not a full-suite pass. The user's 5173 server was untouched. An unverified scalar
micro-optimization was reverted to the exact version that passed the above checks;
no further CPU-heavy validation was started after the heat report.

Changed: flight/collision.ts, aircraft-hulls.ts, generated attack-aircraft-hull.ts,
assets/collision-hull.ts and its CLI; Flight/Sortie/lab/Hordes bindings; regional
ceiling metadata; orbit axes; relevant old/new tests; README and decision 0023.
No original source asset/dependency/save/renderer cap changed. Regional structures
retain foundation/AABB approximations, terrain contact is sampled, weapon barrels
are cosmetic and landing is not introduced. Prior hardware/player-feel gates and
legacy overall-sortie timeout remain open. Ready for the required local commit;
consult git log. No push/deployment.

## Latest: C toggles camera unlock and lock/reset

Jan changed the camera control to a toggle. Press C once to unlock orbit, then
move the mouse over the focused scene; press C again to lock and immediately
reset chase position and look direction. Keyup keeps orbit unlocked; auto-repeat
is ignored. Blur/pause/recovery still lock/reset. This supersedes hold-C below.

Changed the shared FlightCamera/binding, combat/lab state access, control text,
README/decision 0022 and presentation tests. Lint/types/build passed. The full
unit run passed 223 of 224; the unrelated GLB CLI check exceeded its unchanged
five-second budget under parallel load. All five GLB cases passed unchanged in
isolation, giving 224 unit cases passing across the runs. All three selected
browser cases passed (49.4 s): combat/regional toggle, keyup persistence, repeat
protection, reset, blur/cleanup, plus player menu behavior. Agent inspected the
combat orbit capture with C released. No assets/dependencies/save formats changed.

The prior legacy 90-second sortie timeout remains documented below and was not
rerun for this input-only follow-up. Preview server stopped by Playwright; user
5173 was untouched. Ready for the required local commit; consult git log.


## Latest: flight orbit, altitude shadow and smooth presentation

Jan requested hold-key camera orbit, a shadow straight below the plane, jitter
investigation and Assisted/Direct selection in Settings. Implemented in the main
player/combat and shared flight/regional/weapons views. Hold C and move the mouse
over the focused scene; release or blur restores chase by the shortest route.
Fast half-orbits maintain radius. Settings → Flying mode retains its session
choice through recovery/aircraft/mission/world changes; reload defaults Assisted.

The 60 Hz aircraft was rendered without interpolation alongside a camera that
smoothed world translation but looked at the latest tick. Interpolated render
poses and relative camera offsets fix that source of stepping/relative bobbing.
Collision, combat, objectives and saves keep authoritative poses. A soft blob
conforms to ground/water directly under the displayed aircraft at every altitude,
including Low/soft-shadows-off. It owns one cached grid/small generated texture;
geometry budgets explicitly increase by one (combat 67, flight 57, weapons 59).

Changed: flight.ts, new rendering/flight-camera.ts and aircraft-shadow.ts, main.ts,
lab.ts, aircraft-controls.ts, presentation unit/browser tests, resource assertions,
README, decision 0022 and CPU-only shadow probe. Final lint/types/build, all 223
unit tests and 23 source validations passed. Initial sandbox CLI capture failed
four old tests; the full unit suite passed outside the sandbox without changes.
Full browser run: 83 pass, two timing failures, one optional route skipped.
Final angular refinement was rebuilt; all seven affected browser checks passed
(2.4 min), including narrow settings, orbit/radius, idle/shader/resources, flight,
weapons and regional resume. Agent inspected combat/regional orbit and 390 px
settings captures. Software shadow update CPU p95 0.28 ms is not GPU/FPS evidence.

Known remaining failure: the legacy complete-sortie case still exceeds its
unchanged 90-second total budget during final seed/settings checks, both in the
full run and isolated final-build retry. Mission completion/rewards, saved reload,
recovery and collision checks passed before timeout. No failure/step/timeout was
hidden or relaxed. The other timing failure (regional resume dropped 0.10 s) passed
unchanged in the final focused run. Combined coverage: 84 unique browser cases
passing, one overall-budget failure, one optional route skipped. Keep that legacy
software-renderer budget issue open; a similar timeout is in the previous slice.

Ready for the required local commit; consult git log. No push/deployment.
Playwright stopped its preview servers; user 5173 was untouched. Hardware/FPS,
player feel/visual acceptance and prior regional-v2 mission gates remain open.

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

## 30 October 2026 — Remove obsolete development pages

Removed the legacy `/play/` prototype and outdoor, flight/regional-flight, hordes,
weapons, streaming/terrain-explorer pages and their exclusive page controllers,
old player shell, demo mount, helicopter/mount and legacy horde presentation.
Frontier and the voxel workshop are the only build entries. Frontier links only
to the retained workshop; its simulation/rendering/landing/progression code is
unchanged. Archived retired browser checks and original affected unit files;
kept shared-model tests and extracted the depot workshop check.

Preserved every source asset, legacy environment/vegetation implementation,
editor/export support, all benchmark/generation scripts and their headless model
dependencies (including Sortie/campaign/missions/metrics), development artifacts,
archives and historical documentation. Old README route descriptions are marked
historical. Verification results follow below.

Verification: Node 24 typecheck, lint, production build and all 23 source asset
validations pass. All 271 unit tests across 37 files pass in the final serial run
(80.45 s), including preserved benchmark/asset CLIs. Eleven focused browser checks
pass across final runs: Frontier start/pause/narrow/WebGL fallback, workshop entry
and navigation, depot import, GLB export/error recovery, actual crop/forest/shore
and navy/mutant rendering, and saved skill/shop progression. The last hangar case
exhausted the default 30 s in the combined run and passed alone in 21.6 s with a
60 s limit. Initial sandbox subprocess-output failures passed outside the sandbox;
the browser preview also required unsandboxed local execution. Generated test
screenshots were refreshed; Playwright disposable output now uses a nested
folder so future runs preserve the screenshot collection. No sustained flight/
load checks or hardware FPS claim under the retained heat restriction. No assets,
benchmark/generation scripts or existing historical docs were deleted. No push.

## 30 October 2026 — Documentation, workshop CSS and benchmark organization

Moved retired lab/prototype/phase instructions from README into
`docs/development-history.md`, preserving their text except heading levels and
relative links. README covers Frontier and the workshop; current workshop editing,
asset, command and repository instructions live in `docs/development.md`.

Moved the workshop's sole base stylesheet from `src/ui/style.css` to
`tools/voxel-editor/base.css`, removing only six unused `.controls` lab rules.
All remaining rules are byte-identical. Moved Sortie, Campaign, mission definitions
and measurement helpers from `src/game/` into `tools/benchmarks/legacy/`, updated
benchmark/test imports, and documented their benchmark/regression-only role.
Verified all four modules are identical except relative import paths; Frontier
imports none of them. No gameplay, save keys, assets or benchmark scenarios changed.

Verification results follow below. No sustained flight/load checks or hardware FPS
claim under the retained heat restriction. No push/deployment.

Verification: Node 24 types, lint and production build pass. Frontier's game JS,
CSS and terrain-worker content hashes match the preceding cleanup build. Local
links in README and the three new guides resolve. All 271 unit cases pass across
final runs: the full serial run passed 270/271, with only the asset-export CLI
exceeding its 5 s test limit under concurrent browser work; its unchanged five-case
file passed alone in 4.28 s. The preserved combat benchmark CLI invariants pass.
All 14 focused browser checks passed in 49.6 s: workshop editing/history/palette,
imports/invalid edits, GLB export/failure, viewer navigation/toggles, allocation
limits, unavailable WebGL, resize/navigation and paused/narrow Frontier smoke.
Browser and CLI subprocess checks used approved execution outside the sandbox.
No gameplay or asset edits. Local commit follows; no push.

## 30 October 2026 — Pre-push credential audit

Scanned all 679 reachable historical blobs (~39 MB, 48 commits) for private keys,
common provider tokens, JWTs, embedded URL credentials and secret assignments;
no matches or sensitive credential filenames found. No dedicated secret-scanner
binary was installed, so this was a local pattern/path audit, not a guarantee.
Existing author name/email metadata and a historical local username path remain.
Hardened .gitignore for service-account credentials, browser authentication state,
local agent authentication/session data, private key names and Terraform state.
Validated 12 excluded paths and five retained source/example paths; diff checks
pass. No game changes or history rewrite. Push authorized by Jan after audit.

## 30 October 2026 — Anonymize published commit history

At the user's request, rewrote all 49 commits with an anonymous author and
committer identity and removed the local username path from historical handoffs.
Set the repository-local future commit identity to Anonymous with an invalid
example email. Verified all commit identities and 682 historical blobs, preserved
commit count, messages, dates and parent structure, and checked Git connectivity.
The only current file change from the rewrite is the anonymized handoff path;
game code/assets are unchanged, so game tests were not repeated.
A private recovery bundle is kept outside the repository in /tmp. Published
history is replaced with force-with-lease, preserving concurrent remote updates.
Old GitHub caches and copies in existing clones cannot be erased by this rewrite.

## 30 October 2026 — Restore GitHub attribution while retaining email privacy

Clarified intent: commits should remain attributed to the user's GitHub account.
Replaced the anonymous author/committer identity throughout history with the
GitHub username and account-ID-based GitHub no-reply email, and configured future
local commits the same way. Private email and full personal name remain absent
from reachable history; the earlier local-path redaction remains. Historical file
trees, messages and dates are preserved. This supersedes the Anonymous identity
choice documented above. Verified identity consistency and unchanged file trees;
no game changes or game-test rerun. Publish with force-with-lease and verify
GitHub associates the resulting commit with the intended account.
