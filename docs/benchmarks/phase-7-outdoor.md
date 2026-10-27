# Phase 7 outdoor rendering baseline

Measured 27 October 2026. This is a fixed-scene development baseline, not a gameplay or reference-device performance target.

Reproduce with Node 24: `npm run build`, then `npm run test:browser -- tests/browser/outdoor.spec.ts`. The test saves High/Low/bounds screenshots under ignored `test-results/` and `render-baseline.json` in its test output directory. The report records Chromium version, renderer identity, viewport/backbuffer, quality, calls, triangles, geometries, textures, CPU submission median, scene construction time and sample count. No network or external assets are needed.

The fixed overview shows a 64 × 64 m heightfield, 51 placed source assets in five instance batches, a sixth instance batch for lane markings, three road/track surfaces and one metre test cube. No pooled pulses or collision overlays are active during preset measurements. Both presets use the same geometry and fog. At device pixel ratio 1 their backbuffers match; higher-DPI devices have different pixel caps.

## Recorded sample

Environment: Linux, Node 24.22.1, Playwright Chromium 156.0.8078.4, ANGLE/Vulkan SwiftShader software renderer. Browser viewport 1280 × 720; canvas backbuffer 1150 × 380, device pixel ratio 1. This software backend is not the user's hardware GPU and is unsuitable for a gameplay FPS target.

| Preset | Calls | Triangles including shadows | Geometries | Textures | CPU submit median | Samples |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| High | 17 | 440,152 | 11 | 3 | 1.30 ms | 32 |
| Low | 11 | 248,050 | 11 | 3 | 0.30 ms | 33 |

CPU scene construction in this run: 310.8 ms, excluding source bundle parsing and first-frame shader/GPU setup. High submits about 77% more triangles for the extra shadow work. After first displaying bounds, geometry count reaches 62; repeated toggles preserve that count.

Agent inspected the High, Low and no-fog bounds captures. High has visible building/tree contact shadows; Low removes them after shader refresh. Bounds enclose the placed sources, and the distant trees are clearer without fog. This is agent visual inspection plus automated interaction, not user verification.

The live CPU median times only `renderer.render` over up to 120 frames, with at least 30 samples before recording a preset. It excludes scene construction, simulation and browser scheduling. JavaScript submission can complete before GPU work, so these numbers must not be converted into FPS. Browser test concurrency and renderer backend affect timings. Structural counts are the useful initial regression baseline.

Shadow targets remain resident after switching from High to Low to support reuse; disabling shadows reduces render work without promising immediate texture-memory reclamation. Showing collision bounds uploads 51 helper geometries on first display; further toggles reuse the same allocations. Scene teardown releases all owned resources.

See the [rendering decision](../decisions/0007-outdoor-rendering.md) for scale, lighting/AO evaluation, collision limitations and ownership. Future optimization should compare this same scene, camera, backbuffer and quality before changing source/detail policies. Current sources are bundled and synchronously meshed once on scene entry; the game bundle is approximately 2.78 MB minified / 211 kB gzip, alongside the shared Three.js chunk. There is no streaming or LOD claim.
