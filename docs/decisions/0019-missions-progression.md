# Phase 18 — Missions, return, and progression

Jan requested the next phase on 28 October 2026. Phase 16 Pixel 10a / 720p / 60 FPS
acceptance, touch controls, and player handling/balance verification remain open.

## Mission framework and pressure

Missions currently run in the existing generator-v1 Clearpass region; regional-v2
mission integration is not implemented. Mission definitions are rendering-independent data: stable ID, title/brief, three
objective groups, flyover sector, first-completion reward and optional prerequisite
and post-defense budget. Existing Operation Clearpass remains the default with
its established three groups and return rules. Completing it unlocks Relief Watch,
which targets three different persistent groups around a supply post at (16,80).
Markers, target assistance, HUD and navigation follow the selected definition.

Relief post integrity starts at 100. Each successful simulation tick drains
`100 / (75 * 60) * livingMarkedMembers / 96` points while the attempt is active.
With all 96 enemies alive the post lasts approximately 75 simulation seconds;
kills reduce pressure immediately, clearance stops it. These are threat points,
not simulated zombie contact/ground-defense pathfinding. Existing groups still
use their established patrols; no new attack AI, respawns or destructible scenery.
Integrity zero fails the sortie and pauses flight/fire. Pause/focus loss freezes
pressure; discarded catch-up time does not count. A cleared mission still needs a
flyover and physical return. Both aircraft and existing return assist are supported.

## Attempt, failure, return, and rearm

Mission selection starts ready at base, retaining equipment. Complete/failed attempts
produce one immutable last-result snapshot with mission, outcome, kills, shots,
simulation ticks, integrity, reward, persistence status and failure reason.
Recovery, aircraft change, mission change or preparing another sortie abandons an
active/returning attempt with zero reward. Returning completes the attempt; the
Prepare next sortie / rearm button then returns ready at base, resets counters,
cooldowns, effects, flyover and post integrity. Ammunition remains unlimited; rearm
has no currency cost. Equipment changes continue Phase 17's pause/retained-cooldown
rules; no unlock removes previously available aircraft/weapons.

Casualties/wounds remain in the existing per-seed population records through all
of these transitions. Reload starts ready on Clearpass/default seed 12012 with default equipment and
fresh post integrity, preserving casualties and earned progression. World changes keep equipment/campaign but clear the last debrief. Mission
selection, mid-flight position, integrity, elapsed time and last debrief are not
saved. Retrying can therefore finish a partially cleared world; this is intentional,
without a failure penalty or reappearance of killed enemies. No reward is granted
for merely clearing enemies, crashing, abandoning, or loading a cleared sector.
First-time reconnaissance completion of an already-cleared sector is eligible
only after flyover and return; replays earn no further stars.

## Bounded progression and durability

Campaign key: `mvw:campaign:v1:g1:p1`, separate from all population/editor/marker
records. Schema 1 is exactly `{schema:1, completed: MissionId[]}` with at most two
unique known IDs and a 4 KiB input limit. Relief completion requires Clearpass.
Clearpass gives one service star (Wingmate), Relief gives two (Flight lead), with
Cadet as the initial rank. Stars/rank derive from the set; no editable wallet,
random rewards, spending, aircraft stat upgrades or repeated seed farming. Rewards
are once per mission globally in this browser/origin, not once per seed. This small
campaign unlock/rank loop is the selected Phase 18 progression mechanism.

At completion casualty saves flush first. Only if population persistence is healthy
can the campaign record be written durably. A single localStorage setItem atomically
stores the new completion/unlock/reward set; repeated completion is a no-op. A fresh
read merges known completions before writing and suppresses a stale duplicate award.
Cross-tab read/write transactions and cross-device sync are not supported. This is
single-player local progression, not an anti-cheat ledger.

Population/campaign corruption, blocked storage and quota errors preserve existing
bytes and expose session-only status. Earned session rewards/unlocks remain playable
in the current session, including world changes; reload restores only saved state.
No reward is presented as durable if casualty storage failed. A crash between
population persistence and campaign persistence may leave an unrewarded cleared
mission; replaying the required flyover/return can award it once. There is no
cross-key atomic transaction. Existing population formats are unchanged; no data
migration or reset is needed. Unknown campaign versions/fields/IDs are preserved
as unsupported session-only data, never silently rewritten.

Isolated benchmarks instantiate no campaign, read/write no campaign records, stay
on default Clearpass and disable mission/rearm selection. Existing 49-resident,
two-payload, 128-effect and eight-voice caps remain. Mission pressure and saves are
CPU/gameplay changes, not Pixel performance or player-enjoyment acceptance.
