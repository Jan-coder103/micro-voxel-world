# Legacy headless combat model

These modules belong to the retired Clearpass prototype, not Frontier gameplay.
They are retained for reproducible CPU benchmarks and regression tests:

- `sortie.ts`: headless flight/combat/objective orchestration.
- `campaign.ts` and `missions.ts`: legacy mission/reward behavior used by that model.
- `metrics.ts`: bounded measurement helpers and benchmark distributions.

`../combat.ts` runs the model with isolated in-memory population state and no
campaign storage. Run `npm run combat:benchmark` from the repository root with
Node.js 24. Unit checks under `tests/unit/` also exercise the legacy model and
its shared flight/combat/collision dependencies. Save keys and model behavior
are unchanged by this move. Current gameplay lives in `src/game/frontier.ts`
and `src/game/progression.ts`; keep Frontier independent of this directory.

See [development history](../../../docs/development-history.md) for the retired
prototype's original controls, mission rules and measurement notes.
