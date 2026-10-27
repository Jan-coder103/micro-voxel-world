# Micro Voxel World

Browser TypeScript/Three.js aircraft combat game in a static procedural voxel-style world.
Read plan.md for design and phase acceptance, tracker.md for actual progress, and handoff.md for the stopping point.
Work one coherent phase at a time; preserve the distinction between implemented and user-verified work.
Add meaningful tests for features, rerun earlier tests, update tracker/handoff, and commit tested changes as required by plan.md §15.
Use npm scripts in README.md. Keep simulation state independent of rendering. Do not add destruction, multiplayer, or on-foot systems.
Phases 3–15 are implemented; user verification remains outstanding. Jan explicitly deferred Phase 12 player-feedback and physical-GPU acceptance on 27 October 2026 and authorized Phase 13. Preserve those checks for later playtesting; do not report them as passed. Phase 16 first regional idle/buffer optimization slice is implemented and tested; broader profiling and hardware acceptance remain in progress. Read handoff.md before continuing; work one requested phase at a time.
For asset work, read docs/asset-authoring/format.md and docs/asset-authoring/mvw-voxel-assets/SKILL.md; for meshes/GLB read docs/asset-authoring/mesh-pipeline.md. Regional population decisions: docs/decisions/0015-regional-population.md. Settlement/road/collision decisions: docs/decisions/0014-procedural-settlements.md. Terrain v2 decisions: docs/decisions/0013-regional-terrain.md. Legacy prototype decisions/evidence: docs/decisions/0012-combat-prototype.md and docs/benchmarks/phase-12-combat.md. Earlier decisions 0006–0011 cover engine, outdoor rendering, streaming, flight, weapons and hordes. Preserve v1 terrain/save scopes when working on regional terrain.
