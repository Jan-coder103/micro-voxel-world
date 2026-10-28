# Flight orbit, altitude shadow and presentation — 28 October 2026

Requested by Jan as a handling/presentation follow-up, without advancing Phase 20.

Hold C while the scene has focus and move the mouse over it to orbit the aircraft.
The camera keeps world up, clamps elevation, and eases back behind the aircraft
on release or focus loss. Angular smoothing preserves orbit distance during fast
half-turns and returns by the shortest route after a full revolution. C has no flight/weapon action. Orbit also works while
ready/paused; isolated benchmarks disable it. No mouse button is required.
The same controller serves root, combat, flight, regional and weapons views.

The jitter investigation found a 60 Hz aircraft pose rendered directly alongside
a separately smoothed world-space chase camera and an unsmoothed look target.
At higher display rates the aircraft held still then jumped while the camera
continued moving. Flight now samples the previous/current fixed-step poses using
the remaining accumulator (one tick of presentation latency). Camera and shadow
use that same pose. Chase smooths relative offsets rather than lagging world
translation, eliminating relative bobbing in straight flight at mixed frame rates.
Simulation, collision, weapon origins, mission checks and save coordinates still
use authoritative state. Pause/crash/recover/aircraft changes use the current pose.
This addresses a reproducible presentation issue, not dropped frames or hardware
performance; low-FPS stalls still depend on the rendering device.

A reusable 16×16 grid and generated 32×32 alpha texture draw a soft dark oval
straight beneath the displayed aircraft. Vertices sample ground/water height and
follow heading, with a smaller helicopter footprint. Opacity does not fade with altitude; the ground cue can leave the chase camera's field of view at height and is visible when looking down with orbit.
It remains enabled at Low quality and with sunlight shadows off. Depth testing
keeps occluding structures in front; this is a ground cue, not a roof projection.
Updates skip unchanged position/heading/sampler and dispose the mesh/material/
texture on teardown. The resource budget increases by exactly one geometry and
one small texture per aircraft scene (combat <=67, flight <=57, weapons <=59).
A CPU-only regional update probe recorded p95 0.28 ms across 200 warmed samples
([method and limits](../benchmarks/flight-shadow-cpu.json)); this excludes rendering
and does not establish integrated FPS or physical-device performance.

Settings → Flying mode selects Assisted (auto-level on release) or Direct (hold
attitude) independently of Assisted aim and Return assist. Default is Assisted.
The choice lasts for the page session, including recovery, aircraft/mission and
world changes, and returns to Assisted on reload. Labs retain Flight assistance.
