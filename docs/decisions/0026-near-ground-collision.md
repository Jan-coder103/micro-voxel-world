# Near-ground collision hierarchy

30 October 2026. Follow-up to decision 0025. Jan still experienced very low,
stuttering FPS below about 30 m. The previous optimization was incomplete: its
30 m clear-pass test did not exercise the expensive active narrow phase.

## Reproduction

A bounded CPU probe using Frontier's actual flight geometry reproduced 72,600
terrain calls and ~45 ms for a clear 5 m AGL runway sweep; another clear 5 m pass
made 62,076 calls and cost ~39 ms. These were isolated ~1 m movements, not frames.
The prior global/local broad rejection left exhaustive hull-point work intact
whenever the loose terrain ceiling admitted the aircraft. Physics catch-up can
run eight such movements in one rendered frame. This explains how a costly tick
can sustain very slow frames. Earlier 30 m measurements were insufficient to
claim the whole low-flight problem resolved.

## Implementation

Prepare a spatial hierarchy over all existing hull terrain points once. At each
swept pose, transform each visited node's bounds with the actual aircraft attitude.
Reject clear subtrees; descend to original individual samples only for sections
that can touch. Do not reduce the 6,050-point aircraft hull, sweep resolution or
contact-time refinement. This accelerates the active contact path, rather than
introducing an AGL threshold. Geometry without a bound callback retains the
exhaustive path, providing an independent reference in tests.

Make interval ceilings reflect actual river and lake carving and local water
presence. Bound river sine extrema and distance, account for guaranteed valley
lowering, and use ellipse/rectangle distance for lake overlap. Airfield bounds
include the exact flat core, local blend weights, water and raised runway paint;
the base no longer raises the bound for distant or nearly unmodified ground.
These bounds remain conservative, independent of rendering/residency.

Obstacle contact rejects separated world-space boxes before allocating full SAT
helpers. Remaining cases retain the full 15-axis test. Static tree/building bounds
and their collision rules remain unchanged.

## Evidence and limits

`node --experimental-strip-types tools/benchmarks/near-ground.ts` is a bounded
CPU-only diagnostic, with exhaustive and hierarchical sweeps from 30 m down to
actual contact, including bank and yaw. Output is committed in
`docs/benchmarks/frontier-near-ground.json`. Clear runway passes at 3 m and 5 m
use zero terrain calls (~0.25 ms and ~0.09 ms respectively). Actual runway ground
contact at 2 m still occurs (two exact terrain calls, ~0.64 ms). River, plain and
mountain cases retain identical contact outcomes. Individual/JIT-sensitive times
are not sustained frame/GPU measurements or verified user-device FPS.

All 256 unit cases passed in one serial outside-sandbox run. After final
lake/airfield interval refinements, all 28 affected regional/Frontier/collision
cases passed again. New tests compare complete contact poses/reasons with exhaustive
sampling at 2/3/5/10/20/29 m AGL, including base-blend and lake-corner cases;
cap actual sample work below 512 per sweep; check narrow wing-tip ridges, rotating
wings and banked land/water contact across seeds; and run eight maximum catch-up
frames at 5 m AGL through the actual Frontier model. Typecheck/build/lint passed.
Two short mostly paused player browser cases passed; a subsequent mixed runway/core
paint-bound guard passed the final affected tests, build/types and lint. No heavy
browser/load run was started; keep the prior heat restriction and physical-device
FPS, long-flight and human-feel acceptance open. No rendering/save/terrain-height
changes in this fix.
