# Phase 17 — Aircraft roles and session loadouts

Collision-clearance policy below is historical; [decision 0023](0023-fitted-aircraft-collision.md) supersedes it with fitted hulls.

Jan requested the next phase on 28 October 2026 after selecting Pixel 10a / 720p /
60 FPS as the still-unverified Phase 16 target. Proceeding with Phase 17 does not
close that hardware gate or the deferred Phase 12 player-feedback gate.

## Aircraft and shared authority

Clearpass and the flight/weapons labs offer the existing fixed-wing aircraft and
Kestrel, an original block-built helicopter silhouette. The fixed-wing default
retains 30–100 m/s speed, pitch/bank steering and throttle. Both share the 60 Hz
accumulator, focus pause, authoritative swept terrain/building collision, combat,
population persistence and chase camera. No new assets, dependencies or save schema.
The helicopter model is code-native prototype geometry, not a workshop-editable
voxel source or a claim of finished aircraft art.

Kestrel hovers at neutral, yaws with A/D, tilts forward/back with W/S and climbs/
descends at up to 12 m/s with E/Q. Releasing lift holds altitude. Horizontal speed
converges toward tilt-dependent thrust within ±55 m/s; Assisted levels tilt and
brakes toward hover, Direct holds tilt. It has no aerodynamic rotor simulation,
strafe, autorotation, landing or ground interactions. The fixed-wing role is fast
passes; the helicopter trades speed for stationary aiming and reversals.
Helicopter lab clearance/building envelope is a conservative 8 m, validated against
model vertices; Clearpass retains its existing 9 m obstacle envelope and a more
conservative 14 m terrain clearance for the helicopter. Altitude cap remains 250 m.
Stationary hover uses a normalized vertical zero-range overlap query so it cannot
ignore a building containing the aircraft;
vertical and reverse movement use the same 0.25 m sweep as forward movement.

## Equipment and transitions

Multirole equips all three existing weapons; Precision equips minigun/autocannon;
Siege equips autocannon/shell. Nose, port and starboard mounts change the muzzle
origin and visible barrel location, transformed through pitch/yaw/roll. Weapon
keys 1/2/3 keep their established meanings and ignore unequipped weapons. Changing
loadout chooses its first allowed weapon if needed. Clearpass independently checks
equipment when firing; existing cooldowns remain when changing loadout or mount.
Weapons keep their established damage/rate/range; no rewards, unlocks, ammo economy
or weapon stat upgrades are introduced ahead of Phase 18.

Configuration is session-only and is not stored in population saves. World-seed
changes in Clearpass keep equipment but load a separate population. Reload uses
the default fixed-wing/Multirole/nose configuration while retaining saved casualties.

Equipment changes pause, clear held input and stop sound. Aircraft changes reset
the aircraft/attempt to a ready approach, cancel return assist and invalidate the
flyover requirement while preserving durable casualties. In the labs they keep
combat counters/cooldowns; Clearpass starts a new attempt with reset counters as
with recovery. Loadout/mount changes retain flight position, attempt progress and
cooldowns. Recovery keeps selected equipment. Helicopter return assist steers/yaws
and translates physically toward base; it cannot teleport to victory.

Both airframes reuse their geometry across switches and release owned resources
on teardown. Rotor animation follows simulation ticks, freezing on pause. Existing
isolated benchmark routes remain fixed-wing with Multirole/nose for comparability;
new controls are disabled in benchmark mode. Prior profiles are historical, not
measurements of this revision. No Pixel FPS, touch usability, balance or player
satisfaction result is claimed. Touch controls remain outstanding.
