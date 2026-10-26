# Phase 4 — Reference meshing measurements

Measured on 26 October 2026 with Node 24.21.0, Windows x64, Intel Core i5-8265U @ 1.60 GHz as reported by Node. Command: `npm run assets:benchmark`. Mesh version 1; sources are the checked-in reference JSON files.

| Asset | Occupied voxels | Original cube triangles | After hidden-face removal | Greedy quads | Final triangles | Triangle reduction |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Direction marker | 158 | 1,896 | 580 | 23 | 46 | 97.57% |
| Metre cube | 1,000 | 12,000 | 1,200 | 6 | 12 | 99.90% |

One run after a warm-up, nine samples per source:

| Asset | Median CPU validation + meshing | Maximum of nine samples | GLB size from `npm run assets:export` |
| --- | ---: | ---: | ---: |
| Direction marker | 0.904 ms | 1.523 ms | 5,284 bytes |
| Metre cube | 3.782 ms | 4.606 ms | 2,568 bytes |

The counts are deterministic and asserted by tests. Timings vary with host load/JIT and include validation/cloning and surface extraction/merging; they exclude file I/O, BufferGeometry construction, GLB serialization, GPU upload/rendering, and gameplay. These small fixtures establish geometry reduction, not a supported world size, crowd count, frame rate, or hardware performance target. Re-run the command on the desktop for a local timing comparison; there is no timing threshold in regression tests.

Automated checks additionally cover a 4,096-cell disconnected checker fixture producing 98,304 vertices with 32-bit indices, every nonempty 2³ occupancy pattern, and rendered before/after/GLB comparisons for the two references plus adjacent differently colored cells. The 32,768-cell source cap remains a safety limit rather than a rendering budget.
