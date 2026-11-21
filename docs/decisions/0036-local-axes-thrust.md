# 0036 — Aircraft-local rotation and stronger thrust

21 November 2026. Jan reported that elevator pull in a bank rotated the nose toward
the world sky instead of into the bank, and requested 2–3 times more thrust.

The force-based translation in 0035 is retained. Its attitude integration was
incorrect: adding directly to Euler pitch applies a world-relative elevation
change, while the wing/elevator moment must rotate about the current body-right
axis. `flight/attitude.ts` now applies finite Rodrigues rotations to the aircraft
basis: elevator about body right, aileron about body forward, and weathercock yaw
about body up. It returns the nearest equivalent continuous Euler representation
for existing rendering, weapons and collision consumers. This permits vertical
loops, full local rolls and inverted pull without a world-up control shortcut.
No rendering library or persistent quaternion dependency is introduced.

Yaw stabilization now uses body sideslip instead of horizontal world-velocity
bearing; it no longer fights elevator heading changes during a bank. Automatic
bank recovery acts through body roll. On wheels pitch/steering remain constrained
by ground contact, and near-runway pitch reaction only applies with level wings.
Airborne rates and physical force equations are otherwise retained. This remains
a reduced-order aircraft model, not a full rigid-body angular-momentum solver.

Base thrust increases 12000 → 30000 N (2.5×), with existing throttle, engine and
speed-upgrade scaling. Lift, drag, mass, pitch inertia and gravity do not change.
30 kN is a requested balance parameter for the fictional aircraft. Higher maximum
speed and vertical performance are natural consequences of the force balance.
No saves, assets, aircraft geometry or streaming budgets change.

Regressions directly test the body wing axis at banks 0, ±40°, ±90° and 180°,
knife-edge sideways and inverted downward pull, local roll/yaw, repeated pole
crossings and compound rotations. Flight-level tests verify knife-edge pull and
mirrored tighter turns at 30/60/144 Hz. Force tests verify 2.5× thrust, idle/half
throttle and engine upgrades without changed lift or drag. Existing departure,
carrier, stall, loop, collision and browser checks remain relevant.

Old tests waiting a fixed 7.5 seconds before rotating were invalid after increasing
thrust: the aircraft already generated sufficient lift by then. They now rotate
at a measured 33 m/s, matching the manual. The no-launch-jump check measures the
ground/liftoff interval rather than penalizing later high-powered climb. Render
interpolation checks bound its one-tick velocity lag using actual acceleration.
Direct mode does not freeze Euler bank when body pitch/yaw changes orientation.
Human handling acceptance and physical-GPU/sustained high-speed travel checks
remain open under the retained heat restriction.
