# Frontier countryside, navy, mutants and progression — 30 October 2026

Jan authorized the feature sequence in docs/frontier-expansion-plan.md. This
expands Frontier; legacy flight/combat labs retain their gameplay and saves.

## Countryside and roads

Farm parcels now share six-metre margins. Seeded diagonal subdivisions produce
triangles, trapezoids and clipped corners sharing a single flat plateau. Small
38–68 × 30–62 m flower plots add pink, purple and yellow palettes. Flat plateaus
feather over 2.5 m, leaving grass between neighbors without overlapping blends.
The 117 × 13 RGBA float atlas is 24,336 bytes; three descriptor reads select each
fragment's precise polygon, crop and planting direction. No field draw calls or
meshes are added. Canonical tree exclusion and authoritative field heights remain
shared with collision. The descriptor cache retains its 512-block cap.

Frontier roads now have independent 512 m tiles (25 residents) extending roughly
1–1.5 km instead of waiting for the 32 m terrain stream. One tile builds per async
12 ms turn; existing tiles survive movement and are disposed when out of range.
Road geometry follows the authoritative terrain at <=8 m spacing. Rural streets,
connections and driveways use dirt; farm-edge access lanes also use dirt. Water
and home infrastructure are excluded. Frontier workers omit duplicate near-road
surfaces; other labs retain their existing worker roads. Baked road batches own
geometry and share one material, adding up to 25 culled road draw calls. Road
collision remains terrain collision; these are static surfaces, not traffic.

## Ocean and landing bases

NavalWorld deterministically generates sparse fleets on 8192 m cells (38% candidate
chance, further restricted to ocean). Each group has 5–8 battleships and a carrier.
Full ship footprints are checked before procedural fleet acceptance. One known
fleet west/southwest of home ensures an accessible carrier base for every seed.
Ships are static original block silhouettes, built from shared box descriptions;
no external artwork, downloaded models or new asset dependencies are used.

Carriers have long marked flight decks, island towers, deck aircraft and hulls;
battleships have superstructures, masts and paired triple-gun turrets. The view
uses one 4096-part instance batch and the existing cube geometry. Gameplay queries
read the same hull/superstructure descriptions independently of rendering. Decks
are ground surfaces so they support the normal touchdown logic without the deck
slab being misclassified as an obstacle. Painted lines and parked aircraft are
cosmetic. Island towers and ship hulls are solid.

Flight gains an optional spatial runway query. Home and carrier strips share
alignment, wing-level, descent/speed, manual braking, one-second full-stop banking,
hangar purchases, takeoff and ten-second crash recovery. Landing sets the current
base; banking respawns on that strip. Crash recovery returns to the latest landed
base. Reload starts at home. The hangar destination selector changes navigation
only, never teleports the aircraft. All known/current/selected bases stay selectable.
There is no fuel or ammunition resupply distinction: current weapons are unlimited
at all bases, matching the existing airfield loop.

## Mutants

Brutes are 24 m tall with 3500 HP, $600 and 900 XP. Colossi are 125 m tall with
24000 HP, $4000 and 6000 XP. Sparse seeded dry-ground spawns are augmented by one
known nearby colossus. Original block silhouettes share rendering/collision parts;
colossi add dorsal spines and heavy tails. The view uses one bounded 1024-part
instance batch, the shared cube and one material. Mutants never attack or pursue
the player. Their living bodies are physical obstacles and disappear on death.

Weapon queries combine normal hordes with mutant targets. Body hit spheres avoid
hitting an enormous empty bounding sphere; explosions measure distance to mutant
skin so large bodies can be damaged by shells. The target's single health pool
and one kill callback prevent per-limb duplicate rewards. Boss payouts enter the
same unbanked run as normal kills: land/stop at any base to keep them; crashes lose
them. Persistent damage/death uses a separate seed-specific record bounded to
2048 entries / 192 KiB; invalid saves retain original bytes and run session-only.
Near-mutant markers show health, scaled money and XP. The bodies are static;
attack animations and enemy attacks are outside this request.

## Skills, equipment and saves

The hangar has separate service, pilot-skill and equipment-shop panels. Existing
three five-level cash upgrades remain. Eighteen three-rank prerequisite skills
form Flight, Gunnery and Operations branches, costing one point per rank. Each
300 lifetime banked XP grants one point. Eighteen permanent equipment unlocks span
engine, weapon, airframe and utility slots, with purchase chains and explicit
buy/equip/unequip controls. One item per slot prevents stacking the whole shop.
Effects change actual acceleration, braking, handling, maximum speed, damage,
fire rate, weapon/aim range, blast radius, mutant damage or money/XP rewards.
Cards state costs, effects, dependencies, ranks, ownership and equipment state;
all purchases/training/loadout changes require a safely landed hangar. Settings
remain accessible while paused in flight. Hidden hangar cards update only when
menu/progress state changes, not every animation frame.

Pilot v2 migrates valid v1 money, lifetime XP and the three upgrade levels. The
legacy record remains untouched; new records use a separate key. Parsing and
migration are atomic, corrupt bytes are preserved, and quota/storage failures keep
the session playable. Existing campaign and legacy population keys are untouched.
Regional field/settlement layouts can regenerate as terrain changes; no existing
population record is silently deleted or reset.

## Validation boundaries

Unit checks exercise generation, field shape/flatness, distant road ownership,
carrier landing/banking/takeoff/recovery, ship solidity/ocean placement, mutant
hits/blasts/persistence/rewards/collision, skill prerequisites and save migration.
Short actual-shader static captures and paused hangar checks cover rendering,
shopping, navigation and narrow layouts. Existing CPU heat restrictions exclude
heavy sustained browser/flight/load runs. Physical GPU performance, full travel
profiling, flight balance and human visual acceptance remain open.

Final validation: 275 unit tests pass across all 37 files in a serial run; lint,
strict types and production build pass. Seven focused browser cases pass in
58.5 seconds. The agent inspected all three scene captures and desktop/narrow
hangar captures. Preview servers were stopped by Playwright; user server untouched.
