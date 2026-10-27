# 0016 — Regional idle rendering and population updates

28 October 2026. First implementation slice within Phase 16; full hardware,
maximum-speed and dense regional-combat acceptance remains outstanding.

A short browser measurement against baseline `1af654b` found 26 scene clears and
78 bufferSubData calls during 1.2 seconds of a settled regional ready scene. Regional
zombies are static, yet three instance buffers were rebuilt/uploaded each frame.
The selected changes eliminate repeated unchanged work without changing generation,
weapons, flight integration, quality, save schemas or supported population limits.

## Demand-driven regional frames

`demandFrames()` owns at most one animation request. A draw can request continued
frames, and invalidations coalesce even when delivered during a draw. Disposal
cancels the outstanding request and prevents restart.

Regional flight continues frames while running, while its chase camera settles,
or while completed terrain results still need pumping. Otherwise it sleeps.
Workers wake the owner after each job settles, including failed or cancelled jobs,
after removing the job from the outstanding set. Incoming results therefore finish
the 49-chunk window without polling an unfinished worker. Disposal suppresses late
wakeups. Existing two-payload/two-integration limits stay intact.

Controls, pause/resume, approach, recovery, resize, visibility/focus changes and
asynchronous sound status invalidate the scene. Wakeups also force a diagnostic
refresh. Resume/recovery still reset flight timing, so sleeping does not become
simulation catch-up. Camera easing and safety clamps are preserved; idle is reached
when visible motion falls below a small positional threshold. Paused combat effects
remain frozen with the simulation, as before.

This changes regional Flight only. Legacy Flight/Weapons keep continuous rendering;
Clearpass and the outdoor scene retain their earlier loops. Their idle optimizations
are future work, rather than silently changing several product paths at once.

## Population and persistence

Regional residency is rebuilt only when its 128 m observer cell changes. Existing
per-update distance checks preserve exact tier hysteresis. A presentation revision
changes for resident membership, tier or actual health changes. The view skips
unchanged revisions and removes temporary live-member filter arrays when rebuilding.
All three bounded instance batches still share their existing geometry. Moving
regional agents would need to mark positional changes too before this static
presentation contract could be extended.

Actual damage still synchronously writes the save before returning. Unchanged
checkpoints and stale/no-op damage no longer serialize or write. Monotonic health,
corrupt-save preservation, storage failure behavior and seed/version isolation
remain. There is no debounce, delayed write or durability window.

## Verification and limits

Unit coverage exercises scheduler sleep/coalescing/disposal, worker ready/error/
stale/disposal wakeups, unchanged matrix versions, damage visibility, tier changes,
eviction/return and immediate save durability with no redundant writes. Browser
checks count real WebGL clears/uploads in a settled window, then exercise resize,
weapon/assistance controls, approach, fire, pause, resume, focus loss, recovery and
teardown. Existing tests cover generation, collision and clearance regressions.

The initial after-check observed zero clears/uploads in the same 1.2 second settled
window and one population-buffer rebuild during initial loading. This is evidence
of removed work, not a measured hardware FPS or CPU-percentage gain. See the final
[performance report](../performance/2026-10-28-regional-idle.json) and tracker for complete run results. Startup source meshing,
active-scene rendering cost, broader streaming scheduling and hardware performance
acceptance remain separate work.

Final verification: lint, 182 unit tests, 22 asset validations, strict types and
production build passed. All 67 browser checks passed across the interrupted
46-check run and the resumed 21-check run against unchanged runtime code/build.
The focused eight-check browser run also passed. Agent inspected the resized
regional ready/recovery capture; user and physical-GPU verification remain separate.
