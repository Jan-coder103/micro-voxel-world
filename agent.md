# Micro Voxel World

Browser TypeScript/Three.js aircraft combat game in a static procedural voxel-style world.
Read plan.md for design and phase acceptance, tracker.md for actual progress, and handoff.md for the stopping point.
Work one coherent phase at a time; preserve the distinction between implemented and user-verified work.
Add meaningful tests for features, rerun earlier tests, update tracker/handoff, and commit tested changes as required by plan.md §15.
Use npm scripts in README.md. Keep simulation state independent of rendering. Do not add destruction, multiplayer, or on-foot systems.
For asset work, read docs/asset-authoring/format.md and docs/asset-authoring/mvw-voxel-assets/SKILL.md. Read docs/asset-authoring/mesh-pipeline.md for optimized meshes/GLB. Phases 3–10 are implemented; Phase 11 is zombies and scalable horde simulation. Weapon decisions: docs/decisions/0010-weapons.md. Flight decisions: docs/decisions/0009-flight.md. Streaming/delta decisions: docs/decisions/0008-streaming.md. Outdoor rendering choices and baseline: docs/decisions/0007-outdoor-rendering.md and docs/benchmarks/phase-7-outdoor.md. Engine timing and lifecycle decisions: docs/decisions/0006-engine.md.
