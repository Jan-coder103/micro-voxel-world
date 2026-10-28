# Phase 9 — Arcade fixed-wing flight

Collision-clearance policy below is historical; [decision 0023](0023-fitted-aircraft-collision.md) supersedes it with fitted hulls.

Choose one fixed-wing attack-aircraft prototype, represented by a lightweight voxel-style silhouette. Forward speed is 30–100 m/s; pitch and bank are bounded, bank turns heading. Assisted controls level attitude when released; Direct retains attitude. W/S pitch down/up, A/D bank, arrows mirror these controls; Q/E decrease/increase throttle. No aerodynamic stall, helicopter behavior or weapons.

Flight runs at 60 Hz independently of rendering. Focus/window loss pauses with explicit resume. Terrain collision samples the authoritative seeded heightfield along each step with conservative 3 m aircraft clearance, independent of worker readiness. Crashes stop flight; Recover resets above home. World limits crash rather than wrapping; altitude is capped at 250 m. A damped chase camera follows the aircraft.

A dedicated Flight lab retains earlier regression fixtures. Bounded streaming exposes missing geometry through current-chunk readiness and pending/stale diagnostics. Collision remains available during generation gaps; coarse coverage/prefetch and production scenery remain improvements. No FPS claim or terrain destruction.
