# Phase 6 — Minimal engine architecture

Simulation owns lifecycle, position, fixed ticks and a preallocated 16-entry cosmetic pulse pool. It imports no DOM or Three.js. A 60 Hz accumulator accepts at most eight ticks per frame; excess elapsed time is discarded and reported instead of allowing unbounded catchup. Pause discards partial accumulated time. Reset returns to ready, clears timing/input/effects, and retains pool allocations.

The browser adapter owns animation scheduling, viewport input, focus/visibility handling and renderer resources. Hidden tabs and window blur pause explicitly; resume is user initiated and begins with a fresh timestamp. WASD/arrows move a bounded test cube at 3 m/s; Space emits one-second cosmetic pulses at a fixed cadence. These are engine exercises, not flight or weapons. No speculative entity framework, physics or dependencies were added.

The scene consumes the same validated source/greedy-mesh package as the workshop for its direction marker. Mesh geometry/materials, shared pulse resources, setup resources, ResizeObserver, input/listeners and animation scheduling have explicit disposal. Disposal is idempotent. Rendering is direct from current simulation state; interpolation is deferred until actual moving gameplay needs it. Diagnostics are development UI; no reference-device performance target has been claimed.
