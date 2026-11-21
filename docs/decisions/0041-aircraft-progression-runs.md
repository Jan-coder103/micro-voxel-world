# 0041 — Five aircraft tiers and a persistent run loop

Accepted 21 November 2026 for Jan's requested progression slice.

New pilots start with Kestrel S-1, an original high-wing single-center-prop scout.
The sequence continues through Mule T-2 (larger twin wing props), Comet J-3 (first
swept-wing single jet), the unchanged original Frontier attacker at Tier 4, and
Spectre X-5 (advanced twin-engine delta/canard fighter). All share 0.1 m voxel units,
matte palette styling, detailed editable occupancy and the existing greedy mesher.
Four new sources contain 8,632 / 12,450 / 13,486 / 24,578 cells, within v1 limits.

Unlocks require the preceding aircraft, lifetime XP and credits. Tiers 2–5 cost
600 / 2,500 / 8,000 / 24,000 credits and require the same amounts of lifetime XP.
XP is not consumed; credits are. Owned planes can be freely selected at a base.
Locked aircraft can be previewed, but do not change the authoritative flight plane.
All four weapons remain available from Tier 1. Performance grows through thrust,
speed, handling and damage multipliers, layered with existing global upgrades and
loadout bonuses. No per-aircraft consumable repair or ammunition economy is added.
The shared approximate 2,000 kg aerodynamic core is retained, rather than claiming
five physically calibrated aircraft. All tiers use the same manual runway rules.

New source-derived hulls group occupied cells into conservative metre bins, retain
occupied extents inside each bin, and are prepared/cached independently of the
renderer. They can cover small holes within a bin; they are not exact micro-voxel
collision. Tier 4 retains its previous exact hull. Prop blades are removed from
the body mesh and reassembled around their hubs from the original source cells.
Only the displayed aircraft is meshed; replacements dispose prior geometry and
materials. All five source JSON records ship in the player bundle; gzip increases
about 182 KB in the first build. No extra world streaming or per-tier render pass.

A run starts when departing the hangar, continues through pause/resume, and ends
on safe landing/full stop or crash. Successful ticks measure flight time. Ending
atomically records run number, aircraft, outcome, kills, time, base money/XP, actual
money/XP and landing bonus. Safe return pays 2×; crash pays 1×. Rescue skip/rearm
never pays or increments again. Hangar shows the saved debrief and next aircraft
milestone, then existing service, skill and equipment choices before the next run.

Pilot schema 3 uses mvw:frontier:pilot:v3 and preserves old v1/v2 bytes. It migrates
money, XP, upgrade levels, skills and equipment. Aircraft ownership starts at Tier 1
for both new and migrated pilots; old credits and XP can fund the sequential chain.
Corrupt v3 does not fall back to or overwrite an earlier save. The model validates
ownership prerequisites, selected ownership, bounded IDs and reward-consistent
last-run records. Existing world casualty, mutant and terrain save keys are retained.

Tests cover chain enforcement, XP/funds checks, save migration/validation, resource
lifetimes, source/hull alignment, each aircraft's manual takeoff, and a complete
landing → debrief → unlock → upgrade → next-run → crash/rescue loop. Static browser
views inspect perspective/front/top silhouettes and hangar interaction. Physical
GPU and human handling/art/balance acceptance remain open under the retained heat
restriction; targeted short checks replace sustained/heavy browser work.
