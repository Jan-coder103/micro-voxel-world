# Micro Voxel World — Game Development Plan

> **Working title:** Micro Voxel World  
> **Document version:** 1.0 — 26 October 2026  
> **Purpose:** Long-term game design, technical direction, development rules, and implementation roadmap.  
> **Primary source:** Jan's `Micro Voxel World (1).pdf`, a one-page concept board.  
> **Status:** Planning document. No implementation, benchmark, test result, or completed phase is implied.

## Contents

1. [How to use this plan](#1-how-to-use-this-plan)
2. [Game concept and goals](#2-game-concept-and-goals)
3. [Scope and milestone boundaries](#3-scope-and-milestone-boundaries)
4. [Player experience and game loop](#4-player-experience-and-game-loop)
5. [Environment, atmosphere, and visual direction](#5-environment-atmosphere-and-visual-direction)
6. [World and map design](#6-world-and-map-design)
7. [Aircraft, camera, and controls](#7-aircraft-camera-and-controls)
8. [Weapons, explosions, and feedback](#8-weapons-explosions-and-feedback)
9. [Zombies and horde simulation](#9-zombies-and-horde-simulation)
10. [Missions, progression, and persistence](#10-missions-progression-and-persistence)
11. [Voxel asset workflow and editor](#11-voxel-asset-workflow-and-editor)
12. [Technical architecture](#12-technical-architecture)
13. [Rendering, streaming, and optimization](#13-rendering-streaming-and-optimization)
14. [Interface, audio, and accessibility](#14-interface-audio-and-accessibility)
15. [Development rules and agent guidelines](#15-development-rules-and-agent-guidelines)
16. [Testing and acceptance](#16-testing-and-acceptance)
17. [Twenty-phase implementation roadmap](#17-twenty-phase-implementation-roadmap)
18. [Risks and decision register](#18-risks-and-decision-register)
19. [Future suggestions](#19-future-suggestions)
20. [Source coverage and reference notes](#20-source-coverage-and-reference-notes)

## 1. How to use this plan

This is the proposed `plan.md` for the project repository. It consolidates the source concept and expands the missing practical details so a developer or coding agent can act on it.

Three labels distinguish design authority:

- **Source requirement:** Explicitly present in Jan's PDF. Preserve it unless Jan changes it.
- **Proposal:** A practical design or implementation addition made for this plan. It is a starting point, not an already approved requirement.
- **Open decision:** Not settled by the source. Resolve it at the relevant milestone and record the result.

Sections explicitly marked as proposals are provisional throughout that section. Unlabelled implementation details that extend beyond the PDF are recommendations, not additional source requirements. Phase titles and order preserve the original 20-phase roadmap; their detailed tasks and acceptance criteria are expanded proposals.

Use this document for intended behavior and long-term direction. Record actual progress, failures, skipped work, and verification in `tracker.md`. Record the latest stopping point in `handoff.md`. Do not turn this plan into a session log.

## 2. Game concept and goals

### 2.1 Short description

**Source requirement:** A fast-paced, action-packed game set in a massive procedurally generated micro-voxel world, visually inspired by *Teardown*. The player pilots heavily armed aircraft, including A-10 Warthog-style attack aircraft and attack helicopters, and unleashes firepower against enormous zombie hordes across cities, forests, and abandoned landscapes.

The focus is satisfying explosive combat, massive enemy counts, responsive movement, and a beautiful open world. Buildings and terrain are static: the voxel appearance does **not** imply a destructible voxel simulation.

### 2.2 Player fantasy

**Proposal:** Give the player the feeling of commanding overwhelming aerial firepower while making target selection, approach angle, timing, and positioning matter. A good attack run has a clear sequence: spot a horde, line up, fire, observe the result, pull away, and choose the next approach.

The world should feel large and worth flying through. Micro-voxel detail should reward low passes; silhouettes, terrain composition, and atmosphere should remain attractive at altitude.

### 2.3 Design pillars

| Pillar | Practical implication |
| --- | --- |
| Satisfying air-to-ground combat | Flight, aiming, impacts, sound, and visible enemy reactions work together. |
| Enormous hordes | Crowd density is central; use simulation LOD rather than fully detailed logic for every enemy. |
| Beautiful procedural world | Terrain, settlements, lighting, vegetation, and landmarks form a coherent landscape. |
| Consistent micro-voxel style | Small, consistently sized source voxels; optimized runtime geometry. |
| Responsive movement | Controls prioritize predictable input response and enjoyable combat. |
| Scalable technology | Streaming, LOD, batching, memory ownership, and profiling are architectural concerns from the beginning. |

### 2.4 Definition of success

**Proposal:** A successful first playable build lets a player fly, identify a crowd, attack it, receive convincing feedback, finish a simple objective, leave the area, and return without cleared enemies reappearing. It demonstrates this loop at a measured performance level on a declared reference device.

A finished release adds reliable large-world traversal, varied aircraft and missions, coherent progression, robust saves, accessibility settings, and stable performance under representative combat load.

## 3. Scope and milestone boundaries

### 3.1 Core source scope

- Browser-oriented TypeScript and Three.js project with Git and a modular game architecture.
- Browser-based voxel asset viewer, standardized editable asset format, and complete voxel editor.
- Optimized voxel-to-mesh conversion and GLB export.
- Static micro-voxel terrain, buildings, roads, vegetation, and detailed environments.
- Procedural terrain, biomes, water features, settlements, cities, and infrastructure.
- Chunk streaming, four visual LOD tiers, and high-speed travel optimization.
- Aircraft flight, reusable weapons, explosions, zombies, and scalable horde simulation.
- Aircraft variety, customization, missions, progression, effects, sound, UI, testing, and release.
- Reconstruction from a deterministic seed plus saved changes, including persisted enemy clearance.

### 3.2 Proposed first combat prototype: Phase 12

Use one aircraft, one main weapon, one explosion-capable weapon or test action, a small streamed test region, simple zombie models, and a single clear objective. Include enough visual feedback and sound to judge the combat, even though final polish is Phase 19.

Do not require full procedural cities, extensive progression, every biome, or a complete aircraft roster to evaluate this prototype. Phase 12 proves the combat and measures whether the central technical approach is viable.

### 3.3 Proposed later vertical slice

After the necessary later systems are available, combine a representative terrain region, one convincing settlement, persistent hordes, a complete mission-and-return loop, and representative visual/audio quality. It should demonstrate the intended final experience within limited content.

The combat prototype and this vertical slice are different milestones; neither should be described as a completed full game.

### 3.4 Explicit exclusions and deferred assumptions

**Source requirement:** No terrain or building destruction.

**Proposed exclusions for the initial scope:** Multiplayer, on-foot combat, survival crafting, farming, fully explorable interiors, physically simulated rubble, realistic flight certification-level simulation, and an unlimited persistent entity simulation.

The PDF mentions interior furniture and loot. Preserve that idea in world planning, but defer detailed implementation until its purpose in an aircraft-focused game is established. Decorative interiors visible through windows are much cheaper than an on-foot looting system.

**Open decisions:** Single-player as the initial mode; desktop browsers as the initial target; distribution method; supported devices; business model; final world extent. These are planning assumptions, not source commitments.

## 4. Player experience and game loop

**Proposal throughout this section.** The PDF specifies combat focus and later missions/progression but does not define a complete gameplay loop.

### 4.1 Moment-to-moment loop

1. Fly through the world and locate a horde or mission target.
2. Read the target's position, density, direction, and surrounding terrain.
3. Set up an attack run or helicopter firing position.
4. Fire, manage the weapon, and adjust aim using immediate feedback.
5. Observe enemy losses and objective progress.
6. Reposition, avoid a collision, and make the next tactical choice.

A straight-line firing pass should already be enjoyable before progression systems are added.

### 4.2 Sortie loop

1. Select an aircraft and available loadout at a base or preparation screen.
2. Choose an objective or patrol region.
3. Travel to the target, engaging optional opportunities along the way.
4. Complete the objective while managing the chosen resource constraints.
5. Return, extract, or end the sortie through an explicitly defined flow.
6. Save world changes and receive results or progression rewards.

Fuel, ammunition, repairs, heat, and rearming are candidate constraints. Prototype a small subset; do not automatically implement all of them.

### 4.3 Long-term loop

Clear threatened regions, improve mission results, unlock meaningful aircraft/loadout options, and explore new terrain and settlements. Persistent changes make the world feel affected by the player's actions even though geometry remains intact.

### 4.4 The key gameplay problem: why do ground zombies matter to an aircraft?

The source does not define how zombies threaten aircraft. They may be entertaining targets without being direct aerial opponents, but then objectives must provide pressure.

Recommended first solution: hordes advance toward a protected ground location, and the player must reduce them before too many arrive. This creates route planning, prioritization, and repeated attack runs without inventing flying zombies or a new enemy faction.

Other possible pressure sources are limited ammunition, several simultaneous approaches, time-sensitive rescue zones, dangerous low-altitude terrain, and the player's own collision risk. Direct aircraft attackers are a later design option, not a requirement.

Do not balance difficulty by silently respawning cleared populations or making weapons feel weak.

### 4.5 Failure and recovery

Prototype aircraft damage and collision consequences. Decide whether failure restarts the sortie, returns the player to base with a penalty, or restores a checkpoint. Mission failure, aircraft loss, and persistent world changes need explicit rules so retries neither duplicate rewards nor erase valid progress accidentally.

## 5. Environment, atmosphere, and visual direction

### 5.1 Visual identity

**Source requirement:** Very small, consistently sized voxels, detailed environments authored as voxel volumes, optimized object meshes, strong lighting and shadows, material effects, ambient occlusion, global illumination, fog, atmosphere, and depth of field.

The core distinction is between **authoring representation** and **runtime representation**. Assets can originate as dense voxel data while rendering as optimized geometry. Do not create an independent runtime object for every tiny voxel.

### 5.2 Interpreting the references

| Reference | Useful qualities | What it does not establish |
| --- | --- | --- |
| Farm/diorama image | Dense small-scale vegetation, coherent buildings and roads, warm lighting, soft shadows, miniature-world impression | Farming, seasons, currency, stamina, that camera angle, or its exact HUD |
| Snowy abandoned city | Atmospheric haze, layered urban silhouettes, derelict structures, strong color grading, isolation and scale | Mandatory snow biome, on-foot gameplay, or copied architecture |
| Wide voxel landscape | Terraced terrain, distant silhouettes, connected waterways, large sightlines, clouds and atmospheric depth | Exact voxel size, world dimensions, or a specific terrain algorithm |
| Interior reference within the PDF | Light entering a furnished space, voxel material detail, visual density | A mandatory interior exploration or loot mechanic |
| Forest reference within the PDF | Repeated voxel vegetation, foliage density, recognizable trunks and crowns | A particular tree species or a requirement to render each leaf independently |

### 5.3 Proposed art rules

- Fix a world-scale convention and asset palette early. Aircraft, roads, doors, trees, and people must agree on scale.
- Use several coherent material families rather than a unique expensive material for every color.
- Favor silhouettes and controlled detail; dense noise should not hide zombies or navigation hazards.
- Use terrain, vegetation, and architecture to identify regions from the air.
- Keep fog and grading atmospheric without obscuring target readability.
- Make depth of field adjustable and restrained during combat. The miniature reference is useful, but a blurred target is a gameplay problem.
- Explosions may leave temporary decals, smoke, or cosmetic scorch marks without changing terrain geometry.

Global illumination is a desired visual result, not a commitment to a particular real-time technique. Evaluate affordable approximations, probes, baked asset lighting, and ambient lighting before adopting a costly solution.

## 6. World and map design

### 6.1 World concept

**Source requirement:** A massive procedurally generated open world containing forests, mountains, plains, rivers, coastlines, ocean, lakes, settlements, cities, industrial areas, military bases, airports, and harbors. Terrain uses a heightmap, with more advanced layered noise, biome maps, elevation systems, erosion-inspired shaping, and deterministic seeds in Phase 13.

**Open decision:** A large finite seeded map versus an expandable seeded world. Streaming alone does not answer this question. Do not promise an infinite world until coordinate precision, generation, saves, and content variety have been validated.

### 6.2 Proposed spatial structure

| Region type | Terrain and composition | Gameplay purpose |
| --- | --- | --- |
| Plains | Open fields, scattered vegetation, low hills | First combat tests, readable hordes, forgiving attack runs |
| Forests | Tree clusters, clearings, tracks | Partial occlusion, environmental variety, target discovery |
| Mountains | Ridgelines, valleys, terraces | Navigation challenge, strong silhouettes, constrained approaches |
| Rivers and lakes | Connected drainage, shore transitions, bridges | Natural routes, landmarks, chokepoints |
| Coast and ocean | Beaches, cliffs, islands where appropriate | Large-scale orientation and harbor settings |
| Rural settlements | Small roads, houses, fields, service buildings | Compact encounters and transitions into cities |
| Cities | Connected streets, districts, varying building heights | Dense hordes, layered sightlines, mission concentration |
| Industrial regions | Warehouses, yards, tanks, service roads | Distinct landmarks and concentrated objectives |
| Military bases and airports | Runways, aprons, hangars, perimeter routes | Aircraft context, possible bases and rearm locations |
| Harbors | Shore infrastructure, docks, warehouses | Coastal identity and focused encounters |

These are world-generation targets across development, not requirements for the first prototype map.

### 6.3 Proposed generation pipeline

1. Read the world seed, generator version, and configuration.
2. Generate large-scale elevation, land/water distribution, and regional fields.
3. Derive biomes and region types.
4. Establish rivers, lakes, coasts, and major traversal constraints.
5. Place settlement centers, infrastructure landmarks, and road connections.
6. Generate districts, plots, buildings, and structures from placement rules.
7. Add vegetation, small props, and approved interior dressing.
8. Generate navigation/collision representations appropriate to the region.
9. Create enemy population descriptors and encounter seeds.
10. Apply persisted changes before presenting the region as gameplay-ready.

The PDF's world-generation order is preserved here, with persistence and cross-boundary constraints added for implementation clarity.

### 6.4 Continuity and determinism

- Sample global fields using world coordinates so neighboring chunks agree at their edges.
- Resolve large features such as roads and rivers at a regional level or with boundary-aware rules; independent random chunk generation must not cut them off.
- Give generated structures, encounter groups, and persistent objectives stable identities.
- Derive subsystem random streams from the world seed and stable identifiers. Loading order must not change the world.
- Record generator versions in saves; decide explicitly how old saves behave after generation changes.
- Do not equate deterministic generation with guaranteed bit-identical gameplay across all browsers and hardware.

### 6.5 Terrain representation

**Proposal:** Start with a heightfield whose rendered surface is quantized into voxel-like steps, then mesh and stream that surface. This fits the source's heightmap direction and avoids allocating the entire world as dense micro-voxel volumes.

A heightfield cannot naturally represent arbitrary caves and overhangs. Use separate static meshes for such landmarks if later needed; general volumetric terrain is outside the initial plan.

## 7. Aircraft, camera, and controls

### 7.1 Flight direction

**Source requirement:** Responsive aircraft movement, fast combat, and a dedicated phase for flight mechanics and controls. Both attack aircraft and attack helicopters belong to the wider aircraft vision.

**Proposal:** Begin with approachable arcade flight and optional assistance. A fixed-wing aircraft should retain forward-motion identity; a helicopter should offer hover and low-speed positioning. Share input abstraction, damage, weapon mounts, and configuration while allowing separate flight models.

Choose one aircraft for Phase 9. Selecting an A-10-style fixed-wing aircraft first tests high-speed streaming early; selecting a helicopter first makes aiming and local iteration easier. Record the choice before implementation.

### 7.2 Proposed camera

Use a third-person chase camera for the first build. Add adjustable distance, sensitivity, inversion, and a recenter action. Keep camera smoothing independent from input response and do not let cinematic shake override aim readability.

A cockpit view, tactical camera, or top-down view is optional later. The camera used in the farm reference is not a source requirement.

### 7.3 Proposed desktop control baseline

All bindings are provisional and should be remappable. Finalize pitch direction and mouse behavior through flight testing.

| Action | Fixed-wing proposal | Helicopter proposal |
| --- | --- | --- |
| Pitch | W / S | W / S |
| Roll | A / D | A / D |
| Yaw | mouse left/right | mouse left/right |
| Throttle / collective | Shift increase, Ctrl decrease | Shift rise, Ctrl descend |
| Main weapon | Left mouse button | Left mouse button |
| Secondary weapon | Right mouse button | Right mouse button |
| Select weapon | Number keys or mouse wheel | Number keys or mouse wheel |
| free look | Mouse with an explicit held modifier | Same |
| Recenter camera | C | C |
| Map | M | M |
| Pause / settings | Esc | Esc |
| Interact / rearm | F when a valid interaction exists | Same |

Mouse aim, mouse flight, and free look cannot all control the same axis simultaneously. Implement explicit presets and show which mode is active. Avoid browser shortcut conflicts where possible; handle focus loss, pointer capture loss, and menu transitions cleanly.

### 7.4 Flight acceptance

A player can consistently take control, turn, adjust speed or altitude, aim, recover after a pass, and understand a collision or failure. Test controls at varying frame rates. Define whether takeoff/landing is simulated, assisted, or initially replaced by a spawn/end-sortie flow.

## 8. Weapons, explosions, and feedback

### 8.1 Reusable weapon system

**Source requirement:** Reusable weapons including miniguns and autocannons, plus explosions and satisfying hit feedback.

**Proposal:** Define weapons as data plus a small number of reusable behavior types. Configuration includes fire rate, spread, damage, range, muzzle origin, ammunition or heat if used, projectile behavior, audio, and effect identifiers. Avoid aircraft-specific combat code scattered through rendering and input.

Prototype one rapid-fire weapon and one explosive action. Additional rockets, bombs, and missiles are later options rather than original requirements.

### 8.2 Hit detection and damage

- Use swept segments/rays or another continuous test for fast projectiles; a projectile must not skip targets between frames.
- Query a spatial structure rather than every enemy for every shot.
- Resolve authoritative damage independently of tracer, particle, and sound presentation.
- Apply explosion damage once per affected target, using an explicit radius and falloff rule.
- Decide whether buildings block shots and blast damage; keep those rules consistent and testable.
- Define how attacks affect medium/far simulation groups before allowing weapons to reach them.

Tracer count and particle count may be reduced under load without silently reducing real weapon damage.

### 8.3 Feedback layers

Combine muzzle flash, tracer or projectile readability, impact effects, hit reactions, crowd knockdown/death where supported, sound, and restrained camera response. Use large readable explosions, but cap smoke, particles, lights, and corpse counts.

**Source requirement:** Static environment. Explosions kill or affect enemies and produce effects; they do not carve terrain or collapse buildings. Temporary debris effects are cosmetic and must be pooled or short-lived.

## 9. Zombies and horde simulation

### 9.1 Population goals

**Source requirement:** Enormous hordes, cheap boids-style behavior, horde simulation, and different simulation costs by distance.

The source does not specify an enemy count. Define visible agents, individually simulated agents, and total represented population separately. A claim of a huge horde is meaningless if its rendering, behavior, and combat correctness are not measured.

### 9.2 Required simulation tiers

| Tier | Source direction | Proposed implementation boundary |
| --- | --- | --- |
| Near | Detailed agents, collision, hit reactions | Individual gameplay entities, frequent local steering, damage and reactions |
| Medium | Simplified agents, cheap movement, batched and lower-frequency updates | Reduced update rate, simplified avoidance and animation, batched queries |
| Far | Grouped and as cheap as possible | Regional/group descriptors, coarse motion and population accounting |

Simulation LOD and visual LOD are separate decisions. Distance alone is insufficient: enemies targeted by a weapon or threatening an objective may need accurate state even when far from the player.

### 9.3 Proposed movement model

Use a horde destination or coarse navigation field, local separation, simple obstacle avoidance, and terrain grounding. Avoid computing a full independent long-range path for every zombie every frame.

Boids-like separation does not solve walls, bridges, inaccessible slopes, or city navigation. Add coarse navigable connectivity and local obstacle handling appropriate to the map.

### 9.4 Population conservation and transitions

When a group becomes individual agents, preserve its population and stable state. When agents return to a group, carry back surviving counts and relevant progress. Do not duplicate kills, resurrect dead members, or lose population when crossing a chunk or tier boundary.

Use hysteresis to avoid rapid tier switching. Upgrade groups before an attack needs precise hit resolution, or define and test an aggregate damage model. Never let an enemy become immune because it is rendered in a cheaper tier.

### 9.5 Persistence and spawning

**Source requirement:** A cleared region must remain cleared after unloading and regeneration.

**Proposal:** Store sparse changes to generated encounter populations using stable group IDs, surviving counts, and cleared flags as appropriate. Partial clearance must persist too. Define exactly what constitutes a region or encounter being cleared.

Any later migration or repopulation mechanic must be an explicit, visible gameplay rule. Streaming must never be the cause of respawn.

## 10. Missions, progression, and persistence

**Proposal except for the source requirements identified below.**

### 10.1 Mission framework

**Source requirement:** Missions, a gameplay loop, and progression in Phase 18.

Start with a data-driven objective state machine: available, active, succeeded, failed, and resolved/rewarded. Track stable mission IDs and reward state to prevent duplicate payouts on reload.

Candidate missions:

| Mission | Objective | Design role |
| --- | --- | --- |
| Clear a region | Eliminate a defined horde population | Simple combat and persistence proof |
| Defend a location | Stop hordes reaching a protected area | Makes ground enemies relevant to the aircraft |
| Intercept a horde | Reduce a moving population before arrival | Tests travel, tracking, and prioritization |
| Multi-site response | Handle several pressure points | Tests route choice and resource management |

Implement one before adding variants. Escort, rescue, and specialized targets are future candidates if they fit the game.

### 10.2 Progression and customization

Reward completed objectives with access to useful aircraft/loadout choices. Currency, experience, research, or unlock tokens remain open choices. Avoid adding several overlapping progression systems before one provides a clear reason to continue playing.

Customization should create tradeoffs such as coverage versus precision, ammunition versus handling, or speed versus hovering capability. Cosmetic customization can remain independent.

### 10.3 Save model

**Source requirement:** Reconstruct unloaded chunks from their seed and reapply changes.

Recommended save contents:

- Save schema version, world seed, generator version, and relevant world configuration.
- Player progression, unlocked equipment, selected loadout, and settings where appropriate.
- Mission states, completion/reward flags, and objective identifiers.
- Sparse regional changes: cleared encounters, surviving population state, consumed persistent loot if implemented.
- Aircraft/player location and sortie state only if mid-sortie saving is supported.

Do not save every generated voxel or unchanged object. Do not rely on transient array indices as permanent identities. Handle interrupted writes, storage errors, missing versions, and migrations explicitly. Browser-local persistence, export/import backup, and cloud saves are separate choices; cloud storage is not assumed.

## 11. Voxel asset workflow and editor

### 11.1 Asset pipeline

**Source requirement:** Generate voxel assets, preprocess them into optimized object meshes, retain editable source files, and export consistent GLB assets.

Recommended flow:

`Editable voxel source → validation → mesh conversion → LOD generation → runtime export → catalog/preview`

The ideal of one optimized mesh per object means avoiding per-voxel runtime objects. It does not require one giant mesh for an entire city, nor merging surfaces whose materials or transparency require separate batches.

### 11.2 Standardized source format

**Source requirement:** Describe voxel resolution, dimensions, material, color, and geometry operations. Provide a `skill.md` that tells AI agents how to create valid assets with consistent dimensions and sizes.

Recommended format fields:

| Field group | Contents |
| --- | --- |
| Identity | Stable asset ID, name, schema version, category |
| Scale | World units, voxel size, integer grid dimensions |
| Placement | Origin, pivot, orientation, optional attachment sockets |
| Palette | Color and material references, opacity/emission where supported |
| Geometry | Voxel occupancy or documented operations producing it |
| Metadata | Bounds, tags, collision proxy references, provenance |
| Export configuration | LOD settings, mesh options, format version |

Select one authoritative editable representation. If both geometry operations and baked occupancy are stored, define which is authoritative and how they are synchronized. Reject invalid dimensions, unsupported material references, and unbounded operations before meshing.

### 11.3 Viewer and editor

The viewer includes orbit controls, lighting, a grid, basic asset management, and initial asset creation. The full editor adds manual voxel editing, palette editing, undo/redo, editable source import/export, and consistent GLB export.

Recommended editing tools: add/remove/paint voxels, selection, simple shape operations, and size/bounds inspection. Add tools according to asset-production needs rather than building a general-purpose modeling suite.

Undo/redo must cover meaningful edits without storing an excessive full volume after every pointer movement. Export should not mutate or replace the editable source unexpectedly.

### 11.4 Meshing

**Source requirement:** Remove hidden faces, apply greedy meshing, combine compatible surfaces, and create efficient Three.js `BufferGeometry` and GLB output.

Recommended constraints:

- Merge only compatible faces: orientation, material, color, transparency, and any baked lighting/AO assumptions must remain correct.
- Generate correct winding, normals, bounds, and indices.
- Keep opaque and transparent geometry under an explicit batching policy.
- Produce simple collision proxies separately from detailed render geometry.
- Reuse exported geometry for repeated trees, props, and buildings where feasible.
- Cache derived exports using source/configuration versions or hashes.

A single solid cube and a multicolor adjacent-voxel asset are useful correctness fixtures. Validate appearance as well as triangle count.

### 11.5 Agent asset-authoring guidance

The asset `skill.md` should specify units, voxel resolution policy, grid limits, origins, pivots, facing direction, naming, palette rules, supported geometry operations, validation/export commands, and examples of valid assets. Include expected scale ranges for people, trees, buildings, and aircraft after the scale decision is made.

Agents should create editable source and derive runtime exports through the shared pipeline. Hand-editing a generated GLB should not become the normal workflow.

## 12. Technical architecture

### 12.1 Foundation

**Source requirement:** TypeScript, Three.js, modular systems, fixed-timestep simulation, resource management, and object pooling.

**Proposal:** Use a browser game with separate editor and game entry points sharing asset, meshing, and schema packages. Choose a build tool, test runner, and browser baseline in Phase 1; this plan does not require specific package versions or a particular renderer backend.

### 12.2 Suggested module boundaries

| Module | Responsibility |
| --- | --- |
| Core | Clock, fixed-step loop, configuration, IDs, lifecycle |
| Input | Device bindings and abstract gameplay actions |
| Aircraft | Flight model, aircraft state, mounts, damage |
| Combat | Weapon behavior, projectiles, hits, explosions |
| AI | Horde state, navigation, steering, simulation LOD |
| World | Seeds, terrain fields, regions, structures, population descriptors |
| Streaming | Chunk lifecycle, priorities, worker jobs, integration queues |
| Rendering | Scene representation, visual LOD, instancing, effects, lighting |
| Assets | Editable schemas, catalog, meshing, export, validation |
| Persistence | Save schema, world deltas, loading, migrations |
| Missions | Objectives, success/failure, rewards, progression |
| UI and audio | Presentation, settings, accessibility, sound scheduling |
| Diagnostics | Performance overlays, scenario controls, benchmark capture |

Keep authoritative gameplay state independent from Three.js objects. Rendering observes simulation state; deleting a visible mesh must not delete a persistent horde's logical existence.

### 12.3 Simulation timing

Run simulation with a fixed step and interpolate visual motion where useful. A 60 Hz base step is a proposed starting point, not a requirement for every AI subsystem. Lower-frequency horde updates can be scheduled separately.

Cap catch-up work and handle background-tab pauses explicitly. Do not run an unbounded backlog of simulation steps after the player returns. Fixed timing alone does not guarantee stable integration or identical cross-device results.

### 12.4 Heavy work and ownership

Use workers for suitable CPU-heavy generation and meshing tasks. Define serialized job inputs, cancellation, and output ownership. Keep GPU integration and uploads budgeted rather than integrating every completed chunk in one frame.

Use generation/job tokens so stale results cannot attach after a chunk is unloaded or requested for a different state. Dispose obsolete buffers and GPU resources. Pool hot-path objects such as projectiles and effects; use compact storage for crowds when profiling justifies it.

### 12.5 Suggested repository organization

```text
agent.md
plan.md
tracker.md
handoff.md
src/
  core/
  input/
  aircraft/
  combat/
  ai/
  world/
  streaming/
  rendering/
  assets/
  persistence/
  missions/
  ui/
  audio/
tools/
  voxel-editor/
assets/
  source/
  generated/
docs/
  asset-authoring/
  decisions/
tests/
  fixtures/
  scenarios/
```

This is a structural proposal. Keep build outputs, caches, and source assets under an explicit version-control policy rather than committing generated files indiscriminately.

## 13. Rendering, streaming, and optimization

### 13.1 Four required visual LOD tiers

| Tier | Source definition | Suggested use |
| --- | --- | --- |
| LOD 0 | Detailed micro voxels | Close terrain and assets where detail is visible |
| LOD 1 | Simplified voxel meshes | Nearby/mid-distance scenery |
| LOD 2 | Low-detail buildings and terrain | Distant region structure |
| LOD 3 | Terrain LOD and simplified silhouettes | Horizon and coarse world continuity |

Tune thresholds using projected size, altitude, view direction, and performance measurements. Use hysteresis and appropriate transitions to prevent flicker or distracting popping. Preserve silhouettes before preserving tiny surface details.

### 13.2 Chunk lifecycle

**Source requirement:** Stream chunks around the moving player, unload distant areas, and reconstruct them from seed plus saved changes on return.

Recommended states:

`Unloaded → Requested → Generating → CPU-ready → Integrating → Active → Evicting → Unloaded`

Persist meaningful changes before discarding their authoritative state. Distinguish visible data, collision-ready data, and mission/population data; they may need different residency ranges.

Chunk boundaries must not create terrain cracks, broken roads, missing collisions, duplicate enemies, or forgotten clearance.

### 13.3 High-speed flight

**Source direction:** Optimize streaming for fast aircraft, consider stronger LOD at higher speed, and preload in the direction of travel.

Recommended look-ahead model:

`preload distance = aircraft speed × measured preparation latency + safety margin`

Preparation latency includes generation, transfer, integration, and collision readiness, not just worker execution. Use conservative measured latency rather than an optimistic average.

Maintain a surrounding safety ring as well as a forward corridor; players can turn, slow, climb, and reverse direction. Prioritize collision safety and coarse coverage before high-detail appearance. Speed-biased LOD must not make terrain disappear or make targets impossible to read.

If detail is late, retain a coarse representation. Define a safe response if collision data is late; invisible terrain is not an acceptable normal flight condition.

### 13.4 World precision

**Proposal:** Keep persistent world coordinates separate from local render coordinates. Evaluate origin rebasing or regional coordinates as world scale grows. Test high-speed motion and collision far from the initial origin before expanding the world extent.

### 13.5 Rendering budget rules

- Use instancing for repeated compatible vegetation, props, buildings, and crowd visuals.
- Use frustum culling and appropriate regional bounds.
- Limit shadow distance and shadow-casting detail according to gameplay need.
- Avoid a permanent dynamic light for every projectile or explosion.
- Control transparent smoke and particle overdraw.
- Limit active corpses and cosmetic debris independently from persisted kill counts.
- Dispose unloaded geometry, materials, textures, render targets, and temporary CPU buffers according to ownership.
- Profile draw calls, triangles, main-thread time, worker time, upload spikes, and memory together.

Do not pursue fewer draw calls by combining the entire world into one uncullable object.

### 13.6 Provisional performance goals

**Proposal; not measured and not a hardware guarantee.** Use 60 FPS at 1080p as an initial desktop aspiration, corresponding to about 16.7 ms per frame. Choose and record reference hardware, browser, graphics settings, and resolution before making an acceptance claim.

Measure these scenarios separately:

| Scenario | Main concern |
| --- | --- |
| Low pass through a forest | Vegetation, shadows, collision |
| City approach from altitude | LOD transitions, draw calls, visibility |
| Repeated dense-horde attack | AI, hit queries, particles, audio |
| Maximum-speed traversal | Generation latency, uploads, readiness |
| Abrupt turn into a cold region | Scheduling and safety-ring behavior |
| Long travel and return | Memory retention and persistence correctness |

Use staged crowd loads such as 100, 1,000, and then larger populations as diagnostic steps, not promised supported counts. Record p50/p95/p99 frame times, visible and simulated enemy counts, load settings, generation readiness, and memory trends. Declare supported limits only after measurement.

## 14. Interface, audio, and accessibility

**Proposal throughout this section, expanding the source's sound/UI/game-feel phase.**

### 14.1 Essential interface

Show aircraft condition, speed/altitude where useful, selected weapon, ammunition/heat if implemented, aiming information, mission objective, and progress. Provide clear mission success/failure and a settings/pause flow.

Add a map or navigation overlay when world size makes it useful. A performance/debug overlay belongs in development builds. Do not import the farming screenshot's date, seasons, money, stamina, or hotbar without a gameplay reason.

### 14.2 Audio

Build layers for engine/rotor, weapon firing, impacts, explosions, UI, and environment. Use distance attenuation and voice limits. A thousand enemies or impacts must not imply a thousand simultaneous audio voices.

Make the weapon's rhythm, hit response, and aircraft state audible. Add early representative audio before Phase 19; Phase 19 completes and polishes it.

### 14.3 Accessibility and comfort

Provide remappable controls, sensitivity/inversion, separate audio levels, readable HUD scaling, high-contrast target indicators, and settings for camera shake, motion blur, depth of field, and intense flashes. Avoid relying only on color to communicate objective state or danger.

## 15. Development rules and agent guidelines

### 15.1 Repository documents

**Source requirement:** Keep a small agent entry document and separate planning, progress, and handoff documents.

| File | Purpose | Maintenance rule |
| --- | --- | --- |
| `agent.md` | Short project/goal summary and routing instructions for other documents | Keep concise; tell agents what to read before work |
| `plan.md` | Full game plan, all phases, and substeps | Update intended design, not daily progress |
| `tracker.md` | Current progress, skips, problems, revision needs, verification | Detail active work; compress completed history |
| `handoff.md` | What the last agent did and where work stopped | Update at the end of each work session |
| Asset `skill.md` | How agents create valid, consistently scaled voxel assets | Update alongside format or pipeline changes |

**Proposal:** If the coding environment discovers `AGENTS.md` automatically, add a short pointer to `agent.md` rather than maintaining two divergent instruction sets. Filename casing matters on some systems.

### 15.2 Required agent workflow

1. Read `agent.md` first.
2. Read this plan, current `tracker.md`, and latest `handoff.md` as directed.
3. Inspect the relevant implementation and asset guidance before editing.
4. Identify the requested feature, intended phase, dependencies, and acceptance criteria.
5. Implement a coherent change without silently expanding scope.
6. **Source requirement:** Write a test for every feature and rerun all earlier tests to detect regressions.
7. Iterate until the feature works and tests pass; report any checks that could not be run.
8. Update `tracker.md` with actual status and `handoff.md` with the stopping point.
9. **Source requirement:** Commit the implemented, tested work to Git.

For visual or interaction features, add a meaningful automated check where feasible and perform a documented manual check. Do not label a screenshot alone as proof that simulation or persistence is correct.

### 15.3 Agent behavior rules

- Preserve the source pillars: static world, aircraft combat, large hordes, voxel style, and scalability.
- Treat proposals in this plan as provisional; record material design decisions rather than presenting them as Jan's original instructions.
- Keep changes modular; avoid unrelated refactors while implementing a feature.
- Keep existing user work and assets intact.
- Validate asset units and formats before adding content.
- Make performance changes in response to reproducible evidence.
- Do not hide failing checks, delete tests to manufacture success, or claim unperformed verification.
- Do not add libraries or architecture layers without a concrete need and documented tradeoff.
- Do not implement speculative multiplayer, destruction, or on-foot systems as background work.
- If blocked, finish independent authorized work and leave a precise blocker and next action.

### 15.4 Progress and handoff conventions

Suggested statuses: `not started`, `in progress`, `implemented`, `automated checks passed`, `awaiting user verification`, `verified by user`, `blocked`, and `deferred`.

Do not mark user verification unless Jan actually verified the result. If Phases 1–7 are complete, the tracker can summarize them in one entry with their true verification status. Keep detailed notes for active or unresolved work instead of retaining every solved debugging step.

A handoff should include the current phase, last completed change, relevant files, test commands/results, known limitations, unresolved decisions, and the next concrete task. Mention the commit if one was created. Keep it short enough to read at the next session's start.

### 15.5 Definition of done

A feature is done when its intended behavior works, new tests and the existing suite pass, relevant manual checks are documented, new resource lifetimes are handled, performance implications are checked where relevant, progress/handoff documents are current, and the work is committed. User verification remains a separate status when needed.

## 16. Testing and acceptance

### 16.1 Test layers

| Layer | Important coverage |
| --- | --- |
| Unit | Seed derivation, voxel operations, meshing, weapon timing, damage falloff, mission transitions |
| Integration | Asset source-to-export, chunk lifecycle, worker cancellation, horde tier transitions, save/load |
| Browser interaction | Editor create/edit/undo/export, input focus, game startup, settings |
| Visual/manual | Voxel scale, lighting, aircraft feel, aiming readability, LOD transitions |
| Performance | Dense combat, high-speed streaming, long travel, memory behavior |

Feature work follows the PDF's requirement to add tests and rerun earlier tests. Keep representative test fixtures small; reserve heavy stress scenarios for documented benchmark runs.

### 16.2 Critical invariants

- Same seed, generator version, and configuration reproduce the same base-world descriptors.
- Neighboring chunks agree at shared boundaries.
- Unloading and reloading never resurrect cleared enemies.
- Partial population changes survive tier transitions and save/load.
- Hits and explosions apply damage exactly as intended, including at chunk/tier boundaries.
- Editor undo/redo restores the correct editable state.
- Exported asset scale, pivot, color/material mapping, and appearance are consistent.
- Stale worker results cannot attach to unloaded or superseded chunks.
- Repeated traversal does not create uncontrolled memory growth.
- Pause, focus loss, and frame-rate variation do not cause explosive simulation catch-up.

### 16.3 Milestone evidence

Each phase exit should record a reproducible scenario, automated check results, relevant manual observations, and unresolved limitations in the tracker. A phase is not complete solely because its folders or interfaces exist.

## 17. Twenty-phase implementation roadmap

The original phase order is retained. Work within a phase may overlap with prerequisite investigation, but dependency changes must be recorded. Do not claim completion of a later phase simply because a placeholder exists.

### Phase 1 — Project setup

**Source scope:** Project, Git, folders, TypeScript, Three.js, and foundational setup.

**Tasks:** Create runnable game/tool entry points, build and test commands, lint/type checks, repository conventions, and the four coordination documents. Record browser/device assumptions and choose the initial scale convention.

**Exit:** A clean checkout can install dependencies, run a minimal scene, build, and execute the initial checks. Setup instructions and Git state are clear.

### Phase 2 — Browser-based voxel asset viewer

**Source scope:** Orbit controls, lighting, grid, basic asset management, and initial asset creation.

**Tasks:** Load a small fixture, inspect it from multiple angles, show scale/bounds, list/select assets, and create a minimal asset. Use a temporary adapter or minimal schema rather than freezing the full format prematurely.

**Exit:** A user can create/select/view a simple asset with predictable orientation and lighting. Viewer behavior has automated smoke coverage and manual verification.

### Phase 3 — Standardized voxel data format and authoring guidance

**Source scope:** Voxel resolution, dimensions, material, color, geometry operations, and an agent-facing `skill.md` describing asset creation and scale.

**Tasks:** Define a versioned schema, validator, import/export behavior, units/pivot conventions, and small reference assets. Migrate the viewer from provisional data.

**Exit:** Valid sources round-trip without loss; invalid inputs fail clearly; an agent can follow the guide to create a correctly scaled asset without undocumented assumptions.

### Phase 4 — Optimized voxel-to-mesh conversion

**Source scope:** Hidden-face removal, greedy meshing, compatible-surface merging, Three.js `BufferGeometry`, and GLB export.

**Tasks:** Implement the meshing pipeline, material grouping, normals/bounds, and export validation. Measure geometry reduction on representative fixtures and plan reusable LOD derivatives.

**Exit:** Fixtures render correctly before/after conversion, exported GLBs retain intended scale and appearance, and hidden geometry is removed without merging incompatible faces.

### Phase 5 — Complete voxel asset editor

**Source scope:** Manual voxel editing, palette editing, undo/redo, editable source files, and consistent GLB export.

**Tasks:** Add editing commands, selection as needed, reliable file handling, dirty-state feedback, and source/export distinction. Keep expensive work off immediate pointer paths where necessary.

**Exit:** A user can create, edit, undo/redo, save, reopen, and export representative assets. Tests cover edit history and persistence of editable source.

### Phase 6 — Game engine architecture

**Source scope:** Modular systems, rendering, Three.js, fixed timestep, resource management, and pooling.

**Tasks:** Establish game state ownership, input abstraction, lifecycle/disposal, a fixed-step loop, diagnostics, and initial pooled effects/projectiles. Share asset packages with the editor.

**Exit:** A minimal game scene can start, pause, resume, and reset cleanly. Timing and cleanup checks pass without introducing unnecessary engine complexity.

### Phase 7 — Micro-voxel terrain and environment rendering

**Source scope:** Voxel-style surfaces, buildings, roads, vegetation, instancing, lighting, and shadows.

**Tasks:** Assemble a small representative outdoor scene, establish consistent scale and materials, add basic collision proxies, and evaluate lighting/fog/AO quality options.

**Exit:** The scene communicates the intended voxel style, repeated assets use appropriate batching, and initial rendering measurements establish a baseline.

### Phase 8 — Chunks, LOD, and world streaming

**Source scope:** Chunk system, LOD, streaming, unloading, and reconstruction.

**Tasks:** Implement chunk lifecycle and four visual tiers with simple generated terrain. Add seed-based regeneration and a basic persistent-delta path. Use a moving test camera before aircraft exist.

**Exit:** Traversal and return do not create cracks, duplicate objects, forgotten deltas, or uncontrolled resource growth. Cancellation and stale-job handling are tested.

### Phase 9 — Aircraft flight mechanics and controls

**Source scope:** Aircraft movement and controls.

**Tasks:** Select the first aircraft, implement its flight behavior, chase camera, bindings, collision response, and a simple recovery/reset flow. Test assisted versus direct controls as needed.

**Exit:** A player can control altitude/speed, turn, line up a low pass, and recover consistently. High-speed movement exposes streaming limitations clearly in diagnostics.

### Phase 10 — Reusable weapons and explosions

**Source scope:** Miniguns, autocannons, reusable weapon architecture, and explosions.

**Tasks:** Implement weapon definitions, firing cadence, hit queries, projectile/tracer separation, damage targets, pooled effects, and representative audio. Prototype an explosive action without environment destruction.

**Exit:** Test targets take consistent damage across frame rates, fast shots do not tunnel, blast damage is applied correctly, and sustained firing has bounded effect/resource usage.

### Phase 11 — Zombies and scalable horde simulation

**Source scope:** Zombie models, cheap boids, horde behavior, and simulation LOD.

**Tasks:** Add basic agents, grouping, coarse navigation, near/medium/far updates, hit reactions, and population transitions. Integrate weapon damage and persistent clearance.

**Exit:** Hordes move coherently, react to attacks, avoid obvious obstacles in the test scene, and preserve population across LOD changes, streaming, and reload.

### Phase 12 — First complete combat prototype and stress test

**Source scope:** Complete combat prototype and stress testing.

**Tasks:** Combine flight, weapons, hordes, streaming, minimal HUD/audio, and one objective. Run reproducible crowd and sustained-fire scenarios. Gather player feedback on approach, aiming, feedback, and recovery.

**Exit:** One end-to-end combat objective is playable and enjoyable enough to justify expansion. Record actual supported loads, frame-time behavior, major bottlenecks, and any design revisions.

**Milestone gate:** Resolve foundational flight/combat/streaming problems before building large amounts of content. A reasonable optional investigation earlier in the roadmap is a disposable primitive flight-and-shooting spike; it does not replace the source's asset-tool phases or count as the complete prototype.

**27 October 2026 — Jan’s decision:** Defer the Phase 12 player-feedback and physical-GPU acceptance gates until later playtesting. Proceed with Phase 13; these checks remain outstanding and are not considered passed.

### Phase 13 — Advanced procedural terrain generation

**Source scope:** Layered noise, biome maps, elevation, erosion-inspired shaping, deterministic seeds, forests, mountains, plains, rivers, coastlines, ocean, lakes, and settlements.

**Tasks:** Expand regional generation, connect water/terrain features across chunks, distribute vegetation, and add reproducible seed fixtures. Use erosion-inspired shaping without assuming an expensive full physical erosion simulation.

**Exit:** Multiple seeds produce coherent terrain and biome variation; shared boundaries and major water features remain consistent; the result supports aircraft traversal.

### Phase 14 — Procedural cities and buildings

**Source scope:** Rule-based roads, settlements, cities, industrial areas, military bases, airports, and harbors.

**Tasks:** Add regional road/plot rules, building kits, infrastructure placement, collision/navigation integration, and landmark constraints. Decide the practical role of interior furniture and loot before expanding them.

**Exit:** Generated settlements have connected roads, plausible placement, readable districts/landmarks, and no major invalid overlaps. Repeated buildings share geometry where possible.

### Phase 15 — Procedural regional zombie populations

**Source scope:** Populate regions with procedurally generated zombie hordes.

**Tasks:** Drive population size/distribution from region descriptors, place groups in valid terrain, initialize persistent encounter IDs, and handle streaming/mission interactions.

**Exit:** Seeded hordes appear in appropriate locations, no duplicate spawning occurs across boundaries, and cleared or partially cleared populations remain consistent on return.

### Phase 16 — Large-world and high-speed optimization

**Source scope:** Chunk generation, asset instancing, GPU memory usage, draw calls, zombie simulation, terrain LOD, and high-speed streaming.

**Tasks:** Profile representative travel/combat scenarios; tune look-ahead, worker queues, upload budgets, LOD thresholds, shadow/effect limits, and precision strategy. Record quality-tier tradeoffs.

**Exit:** Maximum-speed travel and dense combat meet a declared measured target on reference hardware, or the supported limits are explicitly adjusted. Long travel and return remain stable.

Optimization starts earlier; this phase validates the integrated large-world system rather than introducing the first performance work.

**Reference target selected by Jan, 28 October 2026:** Pixel 10a with a Google Tensor chip, 720p render resolution at 60 FPS. This is an acceptance target, not a measured result. Validate maximum-speed regional travel, dense combat and sustained return/resource behavior on the actual phone. Record browser/version, actual drawing-buffer dimensions, quality settings and thermal/run conditions with results. Phone controls and the measurement protocol still need to be established; current desktop keyboard/mouse tests do not establish mobile usability.

### Phase 17 — Aircraft variety and customization

**Source scope:** Additional aircraft and customization.

**Tasks:** Introduce the second aircraft class where feasible, separate fixed-wing and helicopter behavior, support configurable mounts/loadouts, and tune handling/combat roles.

**Exit:** Aircraft choices produce meaningful differences while sharing appropriate systems. Switching aircraft or loadouts does not break controls, saves, camera, or weapon attachment logic.

### Phase 18 — Missions, gameplay loop, and progression

**Source scope:** Missions, gameplay loop, and progression.

**Tasks:** Turn prototype objectives into a mission framework, add sortie selection/results, establish rearm/return behavior, choose rewards/unlocks, and persist progression reliably.

**Exit:** A player can prepare, undertake, finish/fail, and repeat a sortie with meaningful progression and correct save/reward behavior. At least one mission type provides pressure appropriate to an aircraft fighting ground hordes.

Selected implementation policy (28 October 2026): Clearpass unlocks Relief Watch supply-post defense; first-completion service stars/ranks are global to this browser/origin. Mid-sortie reload restarts a ready attempt while retaining casualties and earned stars. See [mission/progression decisions](docs/decisions/0019-missions-progression.md) for failure, rearm, reward durability and scope. User balance and hardware verification remain separate.

### Phase 19 — Visual effects, sound, UI, and game feel

**Source scope:** Explosions, weapon effects, smoke, fog, camera shake, audio, UI, and overall polish.

**Tasks:** Complete feedback layers, refine grading/atmosphere, improve HUD readability, add comfort settings, and tune sound/effect budgets using real combat scenarios.

**Exit:** Targets, hits, danger, and objectives are readable; effects are satisfying under load; settings let players reduce disruptive motion and visual intensity.

### Phase 20 — Final optimization, testing, and release

**Source scope:** Performance optimization, testing, and release.

**Tasks:** Freeze the intended release scope, run regression and representative browser/device checks, validate saves and migrations, verify clean-build instructions, review asset attribution/licenses, and resolve release-blocking defects.

**Exit:** The release candidate meets documented gameplay and performance criteria, known limitations are stated, no critical persistence defects remain, and the delivery method is reproducible. Publishing or deployment is a separate authorized action when release is requested.

## 18. Risks and decision register

### 18.1 Main risks

| Risk | Why it matters | Planned response |
| --- | --- | --- |
| Asset tools consume the project before combat is validated | A strong editor cannot prove the game is fun | Keep early tools focused; use the Phase 12 gate and an optional tiny early flight spike |
| Zombies are harmless to an aircraft | Combat may lack meaningful decisions | Prototype ground-defense pressure before adding enemy types |
| Micro-voxel detail overwhelms rendering | Surface detail, draw calls, and shadows can dominate cost | Offline meshing, instancing, four visual tiers, bounded effects |
| Aircraft outrun streaming | Missing terrain or collision breaks play | Measured directional preloading plus a surrounding safety ring |
| Crowd LOD corrupts combat state | Duplication or resurrection invalidates progress | Stable IDs, population conservation, transition and persistence tests |
| Procedural geography lacks coherence | Roads, rivers, and cities can feel arbitrary or disconnected | Regional rules and cross-boundary fixtures |
| World/save versions drift | Regenerated geometry and stored changes may disagree | Versioned descriptors and an explicit compatibility policy |
| Visual references pull in unrelated mechanics | Farming/on-foot systems would expand scope considerably | Use the references for art qualities; require explicit design decisions for new mechanics |
| Lighting and effects hide the action | Attractive screenshots may be hard to play | Evaluate clarity during real attacks and provide quality/comfort settings |

### 18.2 Decisions to resolve at the relevant milestone

| Decision | Recommended starting point | Resolve by |
| --- | --- | --- |
| Initial platform/device baseline | Desktop browser, keyboard/mouse, declared reference device | Phase 1 |
| World units and voxel scale | Consistent physical scale, one documented base asset voxel policy | Phase 3 |
| Initial renderer/backend and tooling | Small proven setup, feature needs first | Phases 1–6 |
| First aircraft and flight assistance | One approachable aircraft with explicit control presets | Phase 9 |
| Takeoff/landing and recovery | Minimal clear flow before full aviation detail | Phases 9–12 |
| Primary objective and player pressure | Defend a ground location from a moving horde | Phase 12 |
| Measured crowd and performance targets | Reference scenarios and counts, not marketing promises | Phase 12, revalidate Phase 16 |
| Finite versus expandable world | Large finite seeded region until expansion is justified | Phase 13 |
| Interior furniture and loot | Decorative or deferred until connected to the air-combat loop | Phase 14 |
| Mid-sortie save and failure persistence | Reload restarts ready; casualties/stars durable, attempt state transient (decision 0019) | Selected Phase 18 |
| Rewards and customization economy | First-completion stars unlock Relief Watch; no spending (decision 0019) | Selected Phase 18 |
| Distribution, support policy, monetization | Undecided | Before Phase 20 release planning |

These decisions do not block writing or using the plan. They block only the implementation choices that depend on them.

## 19. Future suggestions

**Optional ideas; outside the committed source roadmap unless selected.**

1. **Replayable seeded challenges:** Share a seed and objective configuration for comparable sorties. Add replay infrastructure only if it has a concrete player benefit.
2. **World configuration presets:** Tune terrain, city density, and horde distribution without changing the core generator.
3. **Additional mission pressure:** Rescue/escort zones, multiple threatened settlements, or moving objectives, using existing systems first.
4. **Weather and time-of-day variation:** Extend atmosphere while preserving target visibility and performance. Seasons are not implied by the farm reference.
5. **More aircraft and weapon roles:** Expand only when handling and tactical differences justify the asset and balance cost.
6. **Asset packs and controlled modding:** Build on the documented voxel source format and validation pipeline.
7. **Controller support:** Add device-specific bindings and assistance after the primary controls are stable.
8. **Photo mode:** Make use of the visual world without imposing cinematic blur during combat.
9. **Migration/repopulation:** Potential late-game activity, provided it is a visible, explicit rule that respects persistent clearance.

Treat multiplayer, general destruction, on-foot exploration, and full interior looting as separate major scope decisions. Each would affect architecture, content, testing, and the core game loop substantially.

## 20. Source coverage and reference notes

### 20.1 Source inventory

- **Primary design source:** `Micro Voxel World (1).pdf` — Jan's concept, asset approach, world generation notes, optimization ideas, agent workflow, and original 20 phases.
- **Attached farm/diorama reference:** `RDT_20261026_0928265659161682560805671.jpg` — visible Reddit attribution: `r/aigamedev`, `u/Zeune42`.
- **Attached abandoned-city reference:** `RDT_20261026_0926578390579151138029772.jpg` — visible Reddit attribution: `r/IndieGaming`, `u/EmpireCrafters`.
- **Attached wide-landscape reference:** `RDT_20261026_0927554390441512350950562.jpg` — no creator attribution established here.
- **Additional images embedded in the PDF:** Furnished interior and voxel forest references, used only as visual direction.

References are described in text so this Markdown file remains useful without a particular image-folder layout. The document does not copy image assets into the project or establish rights to reuse them in a released game. Inspiration should inform original content.

### 20.2 Coverage map

| PDF topic | Expanded in this plan |
| --- | --- |
| Fast aircraft combat, enormous hordes, beautiful open world | Sections 2–4, 7–9 |
| Static world; small consistent voxels; optimized object meshes | Sections 3, 5, 11–13 |
| Heightmap, biomes, roads/rivers, structures, interiors/loot, enemy spawns | Sections 6, 9–11; Phases 13–15 |
| Responsive movement and satisfying weapons/hit feedback | Sections 7–8, 14 |
| AO, GI, fog, atmosphere, shadows, material effects, depth of field | Sections 5, 13–14 |
| Chunk unload/regenerate and saved changes/no clearance respawn | Sections 9–10, 12–13, 16 |
| Four visual LOD tiers | Section 13 |
| Near/medium/far zombie optimization | Section 9 |
| Speed-sensitive LOD and directional preloading | Section 13 |
| Agent entry point, plan/tracker/handoff, per-feature tests/regression/commit | Section 15 |
| All twenty original development phases | Section 17, same order |

### 20.3 Maintenance note

Update this plan when intended design or phase dependencies change. Update `tracker.md` when implementation status changes. Update `handoff.md` when a work session ends. Promote a proposal to an accepted project decision only when it has actually been selected, and preserve the distinction between measured results and future targets.
