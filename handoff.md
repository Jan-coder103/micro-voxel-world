# Handoff — 27 October 2026

Phase 6 game engine architecture is implemented; automated checks passed; agent visual inspection completed. User verification remains outstanding for Phases 1–6. Next is Phase 7 terrain/environment rendering; do not start later phases automatically.

Read agent.md, plan.md, tracker.md and README.md. New decision: docs/decisions/0006-engine.md. Simulation lives in src/engine/simulation.ts, focus-scoped input in src/engine/input.ts, rendering/lifecycle adapter in src/rendering/mount-preview.ts. Game (/) now offers Start/Pause/Resume/Reset, WASD/arrows to move the metre cube, Space for cosmetic pooled test pulses and timing/position/pool diagnostics. This is not flight or combat. Workshop is unchanged.

Simulation runs at 60 Hz with eight-step maximum catchup and discarded-time diagnostics. Pause clears accumulated remainder; resume starts a fresh timestamp. Reset clears state/input/effects while retaining pool objects. Window blur and hidden tabs pause; resume is explicit. Disposal cancels animation and releases listeners, observers and renderer/mesh resources idempotently. The setup scene now imports the direction marker through the shared source/greedy-mesh package. No new dependencies.

Final `npm run check` passed on Node 24.22.1: lint, 97 unit tests, all 22 committed source validations, strict types/build and 42 Chromium browser tests (including previous 27 rendered comparisons). Shared bundle: ~548 kB minified / 137 kB gzip.

New tests: tests/unit/simulation.test.ts and tests/browser/engine.spec.ts; existing setup disposal test now checks repeated release. Agent visually inspected the full-page engine capture; interactions are automated and Jan has not verified manually. Initial sandbox subprocess output failures required outside-sandbox checks. Initial browser run found ambiguous status roles; changed diagnostics to a labeled group to keep the fallback status unique and avoid announcing ticks.

Limitations: no rendering interpolation, no terrain/flight/weapons, bounded cosmetic pulse demo, Chromium only, no reference-device performance claim. Existing Three.js bundle warning persists. Existing editor retains session-only sources/history: export JSON before leaving; no automatic recovery. All twenty original reference sources remain under assets/source and four durable kits remain beside the repo under ../asset-deliveries/. Generated GLBs/captures remain ignored.

Repository instructions require committing tested work; this handoff belongs to the Phase 6 commit (see git log). Main tracks origin/main; no deployment configured. Use Node 24, npm ci, npm run check and npm run dev. npm run assets:export regenerates ignored GLBs.
