# 0002 — Phase 2 provisional viewer

Accepted starting choices, 26 October 2026.

- The workshop has its own UI and renderer. The game retains the Phase 1 setup scene.
- A deliberately temporary in-memory adapter holds grid dimensions and occupied integer-coordinate colored cells. No file extension, serialization contract, material schema, or migration promise is introduced. Phase 3 will replace this adapter.
- Voxel size follows the provisional 0.1 m convention. XZ is centred; the base is Y=0; front is −Z. A metre grid, colored axes, bounds, numeric dimensions, and asymmetric fixture support inspection.
- Two fixture factories produce fresh data at startup. Created assets are session-only solid blocks, up to 16 cells per axis (4,096 instances), with a 24-asset catalog cap. The limits bound allocations and are viewer safeguards, not final asset-format constraints.
- Instanced cubes share one geometry/material per selected asset. This is a preview adapter, not hidden-face removal or greedy meshing. Internal faces and minor surface seams remain until the meshing work in Phase 4. No performance target is claimed.
- OrbitControls renders on change; there is no idle animation loop or damping. Selection frames the asset and preserves display toggles. Front/top/frame buttons recover from panning or zooming. Lighting is fixed hemisphere plus directional light for repeatable inspection.
- Asset changes dispose instance buffers, cube geometry/material, and bounds resources. Teardown also releases controls/key listeners, resize observer, grid/axes, renderer, and UI listeners. WebGL failure leaves the catalog/creation UI available with a clear renderer status.

API references: [OrbitControls](https://threejs.org/docs/pages/OrbitControls.html) and [InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html).
