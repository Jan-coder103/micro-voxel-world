# Handoff — 28 October 2026

Phase 19 feedback/audio/comfort pass is implemented; automated checks passed and
agent visual inspection completed.
Player effects/sound/comfort feedback remains unverified. Phase 16 Pixel 10a /
Google Tensor / 720p / 60 FPS acceptance and touch controls remain open. No release,
deployment or Phase 20 work has started.

Clearpass `/play/` has hit/kill confirmation from combat counters, high-contrast
HUD plates, low-altitude/post-critical text, integrity meter, collapsed help and
narrow-screen controls. It uses ACES tone mapping / exposure 1.05 and optional fog.
Optional recoil is deterministic and bounded to 0.18 m X / 0.108 m Y, defaults off,
is zero while paused and never biases chase tracking or changes flight/aim.

Comfort controls: Full/Reduced/Off, flashes, smoke, recoil, contrast, fog, volume.
Startup reduced-motion preference selects Reduced/no flash/smoke/shake. Defaults
otherwise Full, contrast/fog on, 65% volume, shake off; sound always starts muted.
Settings last for the page session and pause/clear input/audio on change. Reduced
hides bright flashes/smoke/flinch and uses thin traces/outline blasts; Off hides
cosmetics while retaining authoritative damage, targets and text confirmation.

Shared combat view uses sphere blasts and sixteen reusable 1.2-second smoke puffs
beside existing 128 combat slots. Two owned shared geometries; no per-shot assets,
extra rendering passes, lights or shadows. Smoke/feedback age in simulation ticks,
freeze on pause and clear on reset. Cues (hit/clear/warning/mission + weapons) share
an eight-voice cap. Volume zero stops/prevents voices; optional audio failures do
not break play. Completion cues can finish after automatic pause. Positive shot
counter deltas prevent ghost audio after recovery; plain volume readout avoids an
extra implicit live status role. No gameplay/save/schema/dependency/source-asset
changes. Labs use default bounded visuals; comfort/tone/cue wiring is in Clearpass.

Decision: docs/decisions/0020-feedback-comfort.md. Load evidence:
docs/benchmarks/phase-19-feedback.json (software-rendered Full crowd/minigun runs;
no smoke/audio saturation or physical-GPU claim). Core code: src/game/feedback.ts,
main.ts/prototype.css, src/rendering/combat-view.ts/horde-view.ts, src/combat/audio.ts.
Coverage: tests/unit/feedback.test.ts, weapon-audio.test.ts, browser/comfort.spec.ts.

Passed: 210 unit tests (one worker), 22 assets, lint/types/build. Four new comfort
scenarios passed. The earlier 73-case run passed 70 and found three duplicate-status
failures (plus one optional route skipped). Final fixes rebuilt/typechecked/linted,
then all seven selected cases passed in 1.7 minutes: four comfort cases including
unmuted recovery with no extra oscillator, and the three previously failed legacy
cases. Combined browser coverage is 77 passing scenarios, across split runs. Agent inspected desktop post/danger/feedback
and 390 px captures. Fixed a narrow-screen selector overflow; page-width/HUD
separation checks passed. The duplicate output status role and
positive-shot audio rebasing fixes are verified. Core feedback/audio/view functions
are unchanged since the 210-unit pass; final changes were main UI/audio dispatch
and stronger browser assertions.
Existing bundle warnings remain. No human listening/comfort or phone acceptance.

Test preview servers stopped; no listener remains on port 4173. This handoff
belongs to its local Phase 19 commit; consult git log for hash. Phase 20 release
scope/validation follows only when requested; phone/hardware, touch, regional-v2
mission integration and earlier user-feedback gates remain outstanding.

Use Node24: /home/user/.nvm/versions/node/v24.22.1/bin. Default shell Node is 22.
CLI subprocess/local-server checks may need reviewed outside-sandbox access. Use
one browser worker on this software-rendered host; tell Jan before sustained load.
Stop test servers/processes afterward. No deployment.

## New player-facing entry

Jan identified the old environment landing page as inappropriate for the game.
Root now loads combat with a full-window scene and a mission/equipment modal.
Esc opens the paused menu; Settings holds comfort/sound/render scale and the
persistent optional developer-tools toggle. /play/ retains the developer combat
UI; /tools/outdoor/ preserves the former root. Developer tools remain directly
addressable, not access-controlled. Saves and combat rules are unchanged.
Typecheck, lint and production build passed; targeted browser checks underway.
No deployment, phone acceptance or claim of a finished game.

Verification: 8 targeted browser scenarios passed (player entry/menu, legacy
engine lifecycle/cleanup, outdoor rendering, entry points/navigation and WebGL
fallback). Final header-height correction is CSS-only; final player test repeated.
Existing build-size warnings remain. No full gameplay regression rerun for this
UI-only slice; combat simulation and persistence code were not modified.
