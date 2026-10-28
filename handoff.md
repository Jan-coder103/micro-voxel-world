# Handoff — 28 October 2026

Phase 17 aircraft variety and session equipment are implemented; automated checks passed;
user handling/balance verification remains outstanding. Jan requested the next phase while keeping
Phase 16 Pixel 10a / Google Tensor / 720p / 60 FPS acceptance open. Phase 12 player
feedback and physical-GPU gates remain deferred, not passed. Phase 18 not started.

Clearpass and flight/weapons labs offer existing fixed wing plus Kestrel helicopter:
W/S tilt forward/back, A/D yaw, Q/E descend/climb, release lift to hold altitude.
Assisted levels tilt to hover; Direct holds tilt. Horizontal speed bounded to ±55
m/s, vertical ±12 m/s. Shared ticks, collision, saves and combat authority. Rotor
animation freezes on pause. New helicopter is code-native block art, not a voxel
source asset. Conservative 8 m lab envelope / 14 m Clearpass terrain clearance.

Loadouts: Multirole all three weapons, Precision minigun/autocannon, Siege
autocannon/shell. Mounts nose/port/starboard affect rotated muzzle and barrel.
Keys 1/2/3 ignore unequipped choices; Clearpass also gates firing in the model.
Equipment changes pause/clear input/audio. Aircraft changes return ready, reset
flyover/attempt and preserve casualties. Loadout/mount changes keep cooldowns,
position and mission state. Session-only choices survive recovery/world changes,
not reload. Both aircraft support Clearpass return assist. Isolated benchmarks
remain default fixed wing. No dependencies/source assets/save schema changed.

Decision: docs/decisions/0018-aircraft-loadouts.md. Key code: src/flight/aircraft.ts,
flight.ts, src/rendering/rotorcraft.ts, src/ui/aircraft-controls.ts, src/game/sortie.ts,
main.ts and tools/flight/lab.ts. Coverage: tests/unit/aircraft.test.ts and
tests/browser/aircraft.spec.ts.

Verification: 193 unit tests passed with one worker after a parallel-run CLI
export test exceeded its unchanged 5 s timeout; lint and 22 asset validations passed.
All 68 prior browser checks passed in 10.3 minutes, one worker; optional sustained
route profile skipped as intended. Two new aircraft browser cases also passed.
The final review added a stationary helicopter building-overlap query (valid
normalized zero-range ray), with unit coverage; final focused browser verification
of that fix passed (both aircraft cases, 42.3 s). Fixed-wing movement/collision path is unchanged by it. The 68-regression run
preceded that final helicopter-only fix; all 193 unit checks, lint/types/build and
the two aircraft browser scenarios passed afterward.
Agent inspected Clearpass and regional helicopter screenshots: readable controls,
HUD and diagnostics, visible rotorcraft/terrain/groups, no layout overlap. Final
Clearpass guide now distinguishes 9 m fixed-wing and 14 m helicopter clearance.
Early selector/option-matcher/test typing issues fixed. Existing bundle warnings
remain. No user/hardware acceptance claimed.

The test preview server stopped; no port 4173 listener remains. This handoff
belongs to the local Phase 17 commit; consult git log for the hash.
Phase 18 mission/progression is the next roadmap phase when requested.
Phase 16 stale work attribution, damage-heavy profiling, long-memory/hardware and
mobile input remain outstanding; prior measurements are historical evidence.

Use Node24: /home/user/.nvm/versions/node/v24.22.1/bin. Default shell Node is 22.
CLI subprocess/local-server checks may need reviewed outside-sandbox access. One
browser worker on this software-rendered host; tell Jan before sustained load.
Stop test servers/processes afterward. No deployment.
