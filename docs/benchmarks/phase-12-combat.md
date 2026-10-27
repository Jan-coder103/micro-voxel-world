# Phase 12 — Clearpass combat and load evidence

Measured 27 October 2026. This is a reproducible implementation/load baseline, not acceptance of a 60 FPS target or player enjoyment. Phase 13 remains gated on player feedback, a physical-GPU reference run and resolving material findings.

## Reproduce

Use Node 24.22.1 and `npm run build`. Run the normal production browser regressions separately from the measurement file, then run `npx playwright test tests/browser/prototype.spec.ts --workers=1` with no concurrent test browser. The file performs an actual aircraft attack/flyover/return, crash/recovery/reload checks, isolated crowd/fire measurements, report download and fallback checks. It writes ignored captures/reports under test-results/. Open `/play/?benchmark=crowd`, `/play/?benchmark=fire` or `/play/?benchmark=fire&scale=0.75` to reproduce interactively; download JSON from Settings after completion. A focus/visibility/Esc interruption pauses sampling and requires reload for an uninterrupted report.

For a bounded runner, the exact equivalent validation batches are:

```sh
npm run lint
npm test
npm run assets:validate
npm run build
npx playwright test --grep-invert 'complete aircraft sortie|isolated .* benchmark|graphics/worker failures'
npx playwright test tests/browser/prototype.spec.ts --workers=1
```

Each browser measurement uses seed 12012, an isolated in-memory population, a deterministic 40 m/s banked orbit, 60 real-frame warmup and 180 measured rAF frames. Fire holds the 20 Hz minigun with assisted acquisition of available resident crowds. Controls cannot modify the run. Player storage is neither read nor written; a sentinel saved record is checked afterward. Population losses follow real hit/occlusion/falloff rules and never reset within a run. Paths and actor counts therefore vary with elapsed simulation time; render-scale results are separate representative workloads, not a perfectly identical-frame GPU A/B test.

`npm run combat:benchmark` runs the same seeded orbit without Three.js/rendering: one second warmup plus 60 measured seconds at 60 Hz, for crowd and sustained fire. Native Node parameter-property support uses --experimental-transform-types. The CLI reports CPU per fixed tick, not per rendered frame; total fire counts include warmup. Its assertions cover population/work/resource invariants, not timing thresholds.

## Interpretation and gates

Reports distinguish rAF intervals, simulation CPU, presentation CPU and renderer submission CPU. Submission can finish before backend work: it is not GPU frame time. Browser intervals also include browser scheduling/render-backend work. Large frame intervals with small measured CPU stages suggest a rendering/backend bottleneck; they do not identify a physical GPU's limits. Frames longer than the eight-tick catchup budget drop simulation time explicitly. Saved reports include that loss, final ticks, population, buffer sizes and peaks.

The supported correctness envelope is finite: 2,592 represented members in 81 encounters; at most 49 resident groups, 49 detail chunks, two outstanding jobs/results, two detail integrations/frame, 128 visual slots and eight audio voices. Active individual counts are measured separately from aggregate proxies and unloaded/frozen population. The 1,024 m coarse underlay provides continuous visual ground under missing detail; authoritative field and expanded-wall collision stay available. Late detail, underlay height differences and LOD pops remain visible limitations.

The playable objective clears 96 members across three groups, records a low flyover and physically returns to base. Success pauses the aircraft. Recovery/reload retain casualties but cannot bypass the visit/return requirement. The base was moved outside the encounter grid after visual inspection found a wall under its original marker. Authored-aircraft occupied voxels plus corners fit a 9 m radius; the prototype's ground/expanded-wall collision uses that conservative envelope at every attitude.

Agent inspection of attack/complete captures found readable airframe, formations, HUD/lock/progress/navigation and an empty base ring at success. Automated controls establish interaction correctness; they do not establish enjoyable approach/aiming/feedback/recovery, and synthesized audio has not been perceptually user-verified. Ask the player for those observations before expanding content.

Remaining bottlenecks/limitations: software rendering on the test backend, synchronous source parsing/meshing and a ~1.28 MB minified authored-aircraft entry (~93 kB gzip) plus shared runtime, coarse fallback/detail transitions, simple patrols/body proxies, assisted instantaneous weapons and placeholder effect/audio presentation. There are no claims about production cities, arbitrary navigation, an infinite active population or hardware-GPU frame budget.

## Recorded isolated samples

Final runs used one browser worker, independently of parallel regression timing. Linux x64 / Intel Core i5-3570K (4 logical CPUs), Node 24.22.1; Playwright Headless Chromium 156.0.8078.4; ANGLE Vulkan SwiftShader Device (Subzero), DPR 1; viewport 1280 × 720. This is a software renderer, not a physical GPU reference.

| Scenario | Backbuffer | rAF median / p95 | Simulation CPU p95 | Presentation CPU p95 | Submit CPU p95 | Peak live individuals | Peak GPU geometries | Dropped sim time |
| --- | --- | --- | --- | --- | --- | ---: | ---: | ---: |
| crowd-100 | 1216 × 475 | 100.00 / 116.70 ms | 5.60 ms | 1.40 ms | 1.20 ms | 864 | 43 | 0.317 s |
| fire-100 | 1216 × 475 | 100.00 / 133.30 ms | 5.90 ms | 1.60 ms | 1.00 ms | 855 | 36 | 0.683 s |
| fire-75 | 912 × 356 | 83.30 / 100.10 ms | 4.30 ms | 1.30 ms | 1.60 ms | 859 | 37 | 0.267 s |

The software backend did not meet a responsive 60 FPS / 16.7 ms frame-budget target. Low improved the representative fire median interval from 100 to 83.3 ms, while CPU stages remained much smaller than the interval. This supports the backend/fill bottleneck hypothesis, but different simulation duration, casualties and visible geometry prevent treating the comparison as an exact GPU speedup. Neither quality setting establishes hardware playability. No generation failures occurred. Windows changed continuously during the orbit; detail often remained unsettled (the coarse underlay supplied coverage), so continued streaming throughput/pop-in is an explicit further finding.

Peak detail residents were 42 / 31 / 32 and peak resident hordes 42 in these paths; the 49 limits were checked independently by earlier regressions. Outstanding jobs/results stayed at two, fire effects peaked at seven, and muted voice count was zero. The eight-voice implementation is exercised by existing audio unit/browser tests. Crowd lost no members; fire-100 and fire-75 lost 38 and 29 members respectively. These are different elapsed-time runs, not a damage-rate comparison.

### Fixed-tick CPU results

| Scenario | Measured ticks | CPU median / p95 / max per tick | Peak resident groups / individuals | Shots including warmup | Kills |
| --- | ---: | --- | --- | ---: | ---: |
| crowd | 3600 | 0.340 / 0.555 / 2.345 ms | 42 / 864 | 0 | 0 |
| fire | 3600 | 0.352 / 0.560 / 3.664 ms | 42 / 863 | 1220 | 108 |

Both CPU runs conserved 2,592 total members (living plus dead), kept flight running and dropped zero simulation time. Raw evidence: [crowd 100%](phase-12-crowd-100.json), [fire 100%](phase-12-fire-100.json), [fire 75%](phase-12-fire-75.json), [CPU scenarios](phase-12-cpu.json).

### Validation and next gate

Final lint, strict types/seven-entry build, all 22 source validations and 153 unit tests passed. Browser coverage passed as 54 earlier regressions plus six final single-worker prototype checks (60 total), retaining prior rendered comparisons. The first combined run received SIGTERM before completion; its verified leftover preview process was stopped, then checks were rerun in bounded batches. Timings from that interrupted/parallel run are not the recorded baseline.

Before Phase 13: gather player observations on approach, aiming, hit feedback and recovery; repeat these reports on a declared physical GPU/resolution and assess the frame-budget/streaming findings. There is no claim that enjoyment or the hardware performance gate has passed.
