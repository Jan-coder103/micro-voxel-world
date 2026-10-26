# 0001 — Phase 1 foundation

Accepted starting decisions, 26 October 2026; revise with measured evidence.

- Desktop Windows/Linux/macOS browsers with keyboard/mouse and WebGL 2. Initial validation is Chromium via Playwright on the development host. Chrome/Edge and Firefox are intended targets; Safari and hardware coverage remain unverified. Mobile is outside the initial baseline.
- Node 24 LTS, npm lockfile, TypeScript strict mode, Three.js WebGLRenderer, Vite multipage build. No framework is needed for the setup screens. ESLint, Vitest, and Playwright cover code quality, scene construction, and real-browser startup.
- Physical units: 1 world unit = 1 metre; +Y up; ground XZ plane; future asset facing -Z, +X right. Provisional base asset voxel = 0.1 metre, giving a 1.8 m person approximately 18 voxels high. Phase 3 must validate detail/size limits before defining an asset schema. Terrain sampling resolution is a separate future decision.
- Setup fixture: one 1 m cube with its base at Y=0, on a 20 m grid with 1 m spacing. Static render on startup/resize; no game loop or simulation architecture until Phase 6.
- Pixel ratio capped at 2. Setup makes no FPS, horde-count, streaming, or reference-GPU performance claim. The host GPU/reference gameplay device has not been established; record it before performance acceptance in later phases.
- Shared preview code owns and disposes its geometry, materials, renderer, and resize observer. Tool/game share the fixture, not authoritative game state.

Primary tooling references: https://vite.dev/guide/ and https://threejs.org/manual/pages/installation.html.
