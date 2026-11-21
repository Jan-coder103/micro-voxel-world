# 0046 — Compact hidden forest instances and explain shadow invalidation

Jan asked to follow up on a 209-frame device export: 34.69 ms frame intervals,
9.06 ms CPU callbacks, roughly 592,000 submitted tree triangles across color and
shadow passes, and 120 static shadow rebuilds. GPU timers were unsupported, so
outside-callback time is not assigned to GPU work. Device comparisons still need
a same-view capture with Trees off, Shadow maps off and 75% render scale.

## Forest compaction

Keep canonical per-cell RegionalTree records, but serialize only cells without a
resident LOD 0/1 detailed chunk into the tile's active instance prefix. Lower
mesh.count instead of submitting zero-scale trees. Preserve cell/tree insertion
order, transforms, geometry/material, shadow participation, bounds and residency.
On chunk eviction restore the same canonical matrices. Generation already inside
a hidden cell does not dirty the GPU buffer. Batch changed cells once per tile;
compare float32 matrix values and count before setting needsUpdate. Unchanged
membership and empty cells do not upload. Count-only removal to zero needs no
buffer upload. Tile bounds remain conservative for restoration and shadow scans.

Keep treeCount as the generated canonical population for compatibility. Export
forest generated/submitted/omitted counts, tile count, compaction count and pending
status in sceneState. These describe resident buffers, not camera-visible tree
counts. Instances outside the active prefix are retained in the existing capacity
but not submitted. No additional GPU buffers or draw calls. An explicit
compactInstances:false option preserves zero-scale reference submission for
rendered tests. Whole-tile far geometry selection remains governed by decision
0044's conservative bounds and shadow silhouette guard.

Tradeoff: compaction rewrites changed tiles, bounded at 1024 instances each,
rather than patching only a changed cell. It runs only for generation/visibility
changes, never merely because the camera moves. Initial generation and compaction
remain main-thread work; no hard CPU deadline or hardware FPS gain is claimed.

## Shadow rebuild explanations

Classify reasons during the same existing stamp scan: initial depth, anchor,
world rebase, map resize, context restore, caster add/remove, transform change,
instance buffer/count change, geometry replacement and position-buffer change.
A reason counts once per successful static build, even with many changed meshes.
Multiple reasons may apply to a build; totals must not be summed as build counts.
Builds invalidated by caster changes also identify Forest/Settlements/Other.
Caster added/removed includes entering/leaving the light region or visibility.
Instance-buffer changes can reflect generation, proxy visibility or other edits;
anchor movement is independent. Static cache behavior is otherwise preserved.

Keep constant-space lifetime reason counters and at most eight last changed
caster labels; do not retain objects or event histories. sceneState.shadowCache
exports lifetime counters, last reasons/casters and pending reasons (useful after
failure). A reversible counter sink emits capture-window events only while F8 is
active. The profiler keeps a separate bounded 600-frame events history and
exports mean/p95/max/count plus total. Its Shadow rebuild reasons disclosure
shows counts for the current capture; reset/toggle clears them and stop restores
both timing and counter sinks. Stable frames add zero; failures do not claim a
successful rebuild. Lifetime counts and capture counts have different scopes.

## Verification

Unit checks cover hidden-before-generation cells, exact restoration, repeat
visibility with no uploads, world travel/disposal, all invalidation reasons,
stable/off-region changes, disabled caching and source grouping. Short rendered
checks compare compact/reference color and shadows through hiding, restoration,
hiding again and rebasing, and record submitted triangle/call reductions. Profiler
browser coverage verifies capture events and full sink restoration.

The user's Firefox game tab is not exposed by the available browser connection;
only empty in-app browser surfaces were available. Local software-browser checks
cannot substitute for the requested same-device/view FPS comparisons. Retained
heat restrictions also preclude sustained physical-GPU benchmarking here.

Rendered result: the controlled 225-hidden-cell fixture omits 1,099 of 22,715
canonical instances. Submitted color+shadow triangles drop 625,502 → 546,374
(12.65%), calls 69 → 67, with zero differing channels through hide/restore/rebase.
These savings depend on scene residency/view, not a guaranteed percentage in
Jan's device capture. Retained report: docs/performance/2026-11-21-forest-compaction.json.

Final verification: build/typecheck, lint and whitespace pass. The serial unit
suite passes 359/359 (54 files, 109.73 s). Five focused browser checks pass in
47.9 s; final two profiler checks pass again in 14.6 s after the overview count
addition. Full browser suite/npm check and physical-GPU FPS acceptance remain open.
