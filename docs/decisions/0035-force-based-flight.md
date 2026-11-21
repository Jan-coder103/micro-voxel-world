# 0035 — Replace path steering with force-based flight

21 November 2026. Jan reported unusable takeoff and requested approximate physical
equations instead of conditional altitude/speed changes. This supersedes the
fixed-wing dynamics described in decision 0034; presentation and saves are retained.

## Model

`flight/aerodynamics.ts` is independent of rendering. It uses SI units and tunable
approximate parameters for the fictional attack aircraft: mass 2000 kg, wing area
28 m², mean chord 2.2 m, pitch inertia 12000 kg·m², sea-level density 1.225 kg/m³
and maximum sea-level thrust 12000 N. These values are design choices, not measured
performance of a real aircraft. Density decays exponentially with altitude.

- Dynamic pressure q = ½ρ|v|²; lift L = q S CL(α); drag D = q S CD(α).
- α = atan2(−v·bodyUp, v·bodyForward), calculated from the actual velocity vector.
- Attached CL = 0.25 + 4.8α. Beyond ±0.28 rad, blend continuously over 0.16 rad
  into separated-flow CL = 1.1 sin(2α). CD includes 0.045 profile drag, 0.075 CL²
  induced drag, and separated-flow pressure drag. The critical angle, not a
  speed threshold, drives the stall flag.
- Lift acts perpendicular to velocity in the wing plane. Drag opposes velocity;
  thrust follows the fuselage; weight always acts downward. Body lateral flow
  adds dissipative side drag. Integrate v += F/m dt, p += v dt at 60 Hz.
- Elevator produces a dynamic-pressure-scaled pitching moment. Static stability
  restores trimmed AoA; pitch-rate damping depends on chord/speed. Direct mode
  has fixed trim; assisted mode moves the trim reference to the lift coefficient
  required for weight/bank, bounded to a safe AoA range. It changes pitching
  moment, never injects translation or changes gravity.
- Bank rotates lift, producing lateral acceleration and reduced vertical lift.
  Approximate yaw weathercock stability aligns the fuselage to the horizontal
  velocity; bank remains rate-controlled. This is a reduced-order flight model,
  not a full six-DOF rigid-body aircraft with airfoil tables, spins and rudder.

Lift/drag equations and the induced-drag relationship follow NASA's introductory
references: [lift](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/lift-equation/),
[drag](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/drag-equation/), and
[induced drag](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/induced-drag-coefficient/).
Coefficients and post-stall blending above are explicitly our approximation.

## Ground operation

Runway acceleration uses the same thrust/drag, rolling friction on remaining wheel
load, and brakes. Gear support follows the rotated hull underside. Rotation is
bounded on wheels; a near-contact angular reaction prevents further pitch from
pushing the underside into the runway while the aircraft begins rising. There is
no launch-speed switch or upward jump. Liftoff occurs when the net vertical force
becomes positive. Collision/landing, carrier deck and reward/banking systems remain
active. Braking is 10 m/s² maximum plus rolling/aerodynamic drag, scaled by upgrades.

No airborne minimum-speed clamp or throttle-set target speed remains. Maximum-speed
upgrades scale available thrust, so speed follows the force balance rather than a
hard cap. The existing world safety ceiling remains 2400 m. Helicopter and retired
headless benchmark handling are retained.

The old smoke test checked one second after rotation, missing the later failure.
Regression now includes actual 20-second airfield departures at 30/60/144 Hz,
early and delayed rotation, longer carrier climb-out, force scaling, bank/inversion,
high-speed AoA stall, zero-speed gravity, dissipative work and a complete loop of
the velocity vector. UI instructions use 32–35 m/s rotation, then easing elevator
about one second after liftoff. New real-keyboard browser check covers acceleration,
rotation and climb-out, with a small render resolution to limit load.

Human handling and hardware FPS acceptance remain separate. No new dependencies,
save changes, terrain changes or visual resources.
