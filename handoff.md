# Handoff — 28 October 2026

Phase 18 mission/progression loop is implemented; automated checks passed and
agent visual inspection completed. Awaiting user mission-pressure/balance feedback.
Jan requested the next phase while Phase 16 Pixel 10a / Google Tensor / 720p /
60 FPS acceptance and earlier player-feedback gates remain open. Phase 19 not
started. No user mission-pressure/balance, phone or touch usability verification.

Clearpass remains default; first successful flyover/physical return gives one
service star and unlocks Relief Watch. Relief targets three other groups around
(16,80); live marked members drain post integrity, ~75 simulation seconds at full
strength. Kills reduce pressure, clearance stops it, pause/focus loss freezes it.
Post loss pauses/fails the attempt. No contact/assault AI or new respawns implied.
Relief's first completed return gives two stars and Flight lead rank. Replays give
zero; rewards global across seeds, population casualties remain per-seed.

Missions currently use the existing generator-v1 Clearpass region; regional-v2
mission integration remains unimplemented. Mission board changes targets/HUD/rings/navigation. Last debrief records outcome,
kills/shots/ticks/integrity/stars/save status. Prepare next sortie/rearm resets
attempt/cooldowns/effects/integrity/flyover at base, keeping casualties/equipment.
Recovery or mission/aircraft change abandons active attempts with no rewards.
Ammo remains unlimited; no takeoff/landing simulation or spending economy.

Campaign key mvw:campaign:v1:g1:p1 stores a schema-1 bounded unique completion set,
with derived stars/rank. Population flush precedes one atomic campaign write;
population failure forbids durable new rewards. Corrupt/unknown/denied/quota saves
preserve bytes and expose session-only progression. Fresh reads merge known claims;
no cross-tab transaction or cloud sync. Crash between keys can leave a cleared
unrewarded mission; flyover/return replay can claim it once. No population formats
changed. Reload restarts ready on Clearpass with default equipment, saved casualties
and stars; mission/position/integrity/last result are transient. World changes keep
the current session campaign/equipment. Benchmarks instantiate/access no campaign.

Decision: docs/decisions/0019-missions-progression.md. New code: src/game/missions.ts,
campaign.ts; modified sortie.ts, main.ts, prototype.css. Coverage:
tests/unit/campaign.test.ts and tests/browser/missions.spec.ts. README/plan current.

Passed: lint, 204 unit tests (one worker), 22 source validations, strict types/build
and 3 new mission browser checks (1.2 min). All 70 prior browser checks passed
in 13.6 minutes, one worker; optional sustained route skipped. Final debrief
clearing on world change was then corrected and verified with all 3 mission
scenarios again (1.1 min), plus lint/types/build. Mission/campaign models were
unchanged after the passing 204-unit run. Combined browser coverage: 73 passes. Initial Relief straight-line fixture
left one group behind; corrected to ordinary helicopter hover attack + flyover/
return, without changing gameplay/timing thresholds. Pause/abort/corruption and
isolated benchmark campaign checks passed. Agent inspected Relief completion and
pressure captures: board/debrief/HUD readable, post integrity visible, aircraft/
terrain/groups visible, no overlap. This is automated interaction and visual QA,
not player enjoyment/balance verification. Existing bundle-size warnings remain.

Test preview servers stopped; no listener remains on port 4173. This handoff
belongs to the local Phase 18 commit; consult git log for its hash.
Phase 19 feedback/sound/UI/comfort polish follows when requested. Phase 16 stale work attribution, damage-heavy/long-memory profiles,
hardware measurements and touch controls remain outstanding.

Use Node24: /home/user/.nvm/versions/node/v24.22.1/bin. Default shell Node is 22.
CLI subprocess/local-server checks may need reviewed outside-sandbox access. Use
one browser worker on this software-rendered host; tell Jan before sustained load.
Stop test servers/processes afterward. No deployment.
