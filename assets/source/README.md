# Source assets

All sources are original editable VoxelSource v1 JSON with 0.1 m cells, +Y up, −Z front and a base-centred pivot. `direction-marker.voxel.json` and `metre-cube.voxel.json` remain the two default workshop fixtures.

## First reference kit

These five static assets establish scale and silhouettes for the coming engine/environment/flight phases. They are reference artwork, with no rig, animation, collision proxy or gameplay behavior. They share muted earth/slate colors, pale markings and warm warning accents. Each source records original authorship/provenance; no third-party model or texture was used.

| Source | Dimensions X × Y × Z | Occupied cells | Greedy triangles | Details |
| --- | --- | ---: | ---: | --- |
| `ref-zombie.voxel.json` | 0.9 × 1.8 × 0.7 m | 442 | 198 | Green face/hands, pale eyes, worn coat, separated legs, boots; face points −Z. |
| `ref-attack-aircraft.voxel.json` | 17.4 × 4.8 × 16.4 m | 30,262 | 2,470 | Original A-10-style silhouette: broad wings, tapered nose/cannon, matte canopy, twin raised nacelles, twin fins, hardpoints and fixed landing gear. |
| `ref-field-tree.voxel.json` | 4 × 6 × 4 m | 23,312 | 5,240 | Grounded trunk, connected branches, rounded/lobed stepped canopy and three broad foliage tones. |
| `ref-utility-building.voxel.json` | 8 × 4 × 6 m | 20,550 | 286 | Hollow static shell, foundation band, front door/windows, side windows, flat roof/parapet and roof plant. |
| `ref-road-landing-pad.voxel.json` | 12 × 0.1 × 16 m | 17,600 | 1,288 | Eight-metre approach road joined to a twelve-metre apron, lane/edge lines, yellow ring and white H. |

Dimensions describe the declared envelope, including padding. All occupancy is connected by shared cell faces and reaches ground level. Aircraft fuselage/nacelles and the building are sparse shells to stay under the 32,768-cell budget. Windows and canopy use opaque matte colors under v1; they are not transparent glass. The apron is a ground/orientation reference and possible later helicopter pad, not a fixed-wing runway or a prescribed aircraft spawn location. Its ring is approximately 9 m across.

## Second reference kit

Five complementary static environment assets use the same scale, facing and palette families:

| Source | Dimensions X × Y × Z | Occupied cells | Greedy triangles | Details |
| --- | --- | ---: | ---: | --- |
| `ref-pine-tree.voxel.json` | 4 × 8 × 4 m | 20,500 | 7,628 | Four overlapping tapered foliage tiers, exposed trunk, deep green needles and broad highlights. |
| `ref-derelict-car.voxel.json` | 2 × 1.5 × 4.4 m | 5,712 | 412 | Grounded tires/hubs, stepped cabin, matte windows, headlights/tail lamps, bumpers and rust patches; nose faces −Z. |
| `ref-streetlight.voxel.json` | 1 × 6.5 × 2.4 m | 674 | 94 | Concrete plinth, slim metal pole, forward arm, lamp housing and pale underside lens. |
| `ref-road-barrier.voxel.json` | 3 × 1 × 0.8 m | 1,620 | 160 | Tapered concrete profile, wide base and yellow/dark diagonal markings on both broad faces. |
| `ref-small-warehouse.voxel.json` | 10 × 5 × 8 m | 31,446 | 662 | Hollow industrial shell with connected stepped gable roof, shutter/slats, service door, side windows and warning jambs. |

The streetlight has no actual light source or emission, and the car is a static prop with no driving/animation. The pine’s 7,628 triangles are a detailed reference, pending later vegetation LOD/instancing work. No collision, interior gameplay or performance claim is included. All five have connected occupancy reaching ground level. The warehouse uses a sparse shell close to the occupied-cell budget; additions must continue respecting the validator.

## Third reference kit

Five more original static landmarks and props extend the town, industrial and military set:

| Source | Dimensions X × Y × Z | Occupied cells | Greedy triangles | Details |
| --- | --- | ---: | ---: | --- |
| `ref-water-tower.voxel.json` | 6 × 11 × 6 m | 20,748 | 4,894 | Four grounded legs, diagonal braces, inspection ladder/platform, cylindrical tank with dark bands and a tapered roof. |
| `ref-shipping-container.voxel.json` | 2.5 × 2.6 × 6.1 m | 8,236 | 494 | Hollow painted shell, corrugated sides, rusty corner posts, paired door locking bars and pale label plate. |
| `ref-bus-shelter.voxel.json` | 5 × 2.8 × 2 m | 5,446 | 254 | Concrete slab, metal frame, flat canopy, matte back panels, supported wooden bench and sign panel. |
| `ref-fuel-tank.voxel.json` | 4.8 × 4 × 7 m | 14,996 | 1,732 | Horizontal cylindrical shell, paired concrete saddles, retaining bands, fill neck, front pipe and yellow warning plate. |
| `ref-watchtower.voxel.json` | 4.6 × 9 × 4.6 m | 12,751 | 1,624 | Grounded corner posts, diagonal braces, elevated cabin, wraparound matte windows, ladder, platform and roof mast. |

All five are connected grounded voxel shapes under the existing limits. Closed containers/tanks and elevated structures are static sparse reference geometry; ladders, doors, tanks and windows have no interaction or collision logic. Tank labels/signs are original color blocks rather than text decals. Windows remain opaque matte under v1. Rounded tanks use stepped surfaces; no LOD generation or new gameplay system is included.

## Open and edit

1. Run `npm run dev` and open `/tools/voxel-editor/`.
2. Use **Import voxel JSON** to open any of these fifteen reference files. They are available as source files rather than being bundled into the default two-fixture catalog.
3. Check Frame asset, Front −Z and Top +Y; use the displayed metre dimensions to compare scale.
4. Edit with the existing cell/palette controls, then **Export selected source** to keep the revision. Explicit replacement allows reopening the same ID in the session.
5. Export GLB from the workshop or run `npm run assets:export`. Local derivatives are `assets/generated/<source-id>.glb`; keep JSON as the editing authority.

See `docs/asset-authoring/format.md` and `docs/asset-authoring/mvw-voxel-assets/SKILL.md`. Run `npm run assets:validate` and `npm run check` before committing source changes. Generated GLBs remain ignored and are regenerated after switching machines. These assets do not establish final art quality, crowd performance or an aircraft flight model.
