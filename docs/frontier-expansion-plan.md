# Frontier expansion — 30 October 2026

User-authorized work, implemented sequentially. Human playtesting and physical GPU
acceptance remain separate from automated checks. Retain the existing CPU heat
restriction: serial unit checks and short mostly paused browser captures only.

1. **Connected countryside.** Extend seeded farms with triangular/polygonal
   subdivisions, tighter shared grass boundaries and smaller flower parcels.
   Preserve flat field interiors, collision bounds, deterministic seams, and the
   shared near/distant crop presentation.
2. **Road visibility.** Present existing settlement roads well before near chunks
   arrive, with terrain-following distant batches. Add rural dirt roads and farm
   access tracks; avoid overlapping duplicate near roads and water crossings.
3. **Ocean and bases.** Add deterministic sparse ocean fleets of 5–8 ships,
   including landable aircraft carriers. Home and carrier bases share landing,
   stopping, banking, hangar/shopping, takeoff and recovery behavior. Add navigation
   for selecting a base, safe carrier deck collision and solid ship obstacles.
4. **Mutant encounters.** Add large and colossal zombies, durable health pools,
   persistent damage/deaths, visible health/reward information, weapons support,
   collision and larger money/XP rewards. Mutants never attack aircraft.
5. **Progression and hangar.** Add prerequisite-based skill branches, earned skill
   points, a larger catalog of functional purchases/unlocks and equipment choices.
   Migrate existing pilot upgrades and banked money/XP without losing progress.
6. **Integration and verification.** Test each feature, earlier regressions,
   persistence, rewards and landings. Build/lint; inspect short actual rendered
   captures. Document costs/limits and create a local commit; no push/deployment.

Status: stages 1–6 implemented and automated checks passed: 275 unit cases, seven
focused browser checks, lint, types and production build. Final scene and hangar
captures inspected. Required local commit follows; consult git log. Human visual,
balance and physical-GPU acceptance remain open.
