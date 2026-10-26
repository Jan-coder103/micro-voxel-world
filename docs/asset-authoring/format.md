# Voxel source format v1

The shared implementation in `src/assets/voxel-source.ts` is the validation authority. The workshop and `npm run assets:validate` use it. `voxel-source.schema.json` supplies structural constraints for JSON-aware authoring tools; the shared validator additionally checks unique coordinates, grid bounds, and palette references.

Files use UTF-8 JSON (an optional Windows UTF-8 BOM is accepted on import) and the `.voxel.json` suffix. `schemaVersion: 1` is mandatory. Versions other than 1, missing fields, and unknown fields are rejected with a field path. There is no implicit conversion or migration from the Phase 2 adapter. Export validates, preserves all source values and array order, and writes formatted JSON with a trailing newline. Whitespace in the original file is not preserved. No derived mesh is stored in the source.

| Field | Rule |
| --- | --- |
| `id` | Stable identity, 1–64 lowercase letters/digits/hyphens, starting with a letter. Retain across edits; give variants distinct IDs. |
| `name` | Nonblank display text, at most 48 characters. Rendered literally. |
| `category` | `reference`, `prop`, `vegetation`, `building`, `aircraft`, or `character`. |
| `units`, `voxelSize` | Exactly `metres` and `0.1`. One world unit is one metre. |
| `size` | Exactly three integer dimensions `[X,Y,Z]`, each 1–256 cells. These define the authoring envelope; padding is allowed. |
| `pivot`, `orientation` | Exactly `base-center`, and `{ "up": "+Y", "front": "-Z" }`. |
| `palette` | 1–64 entries `{id,color,material}` with unique IDs following the asset ID rule, six-digit `#RRGGBB` sRGB colors, and `material: "matte"`. |
| `cells` | 1–32768 occupied cells `{position:[x,y,z],palette:id}`. Integer, unique, nonnegative coordinates strictly below `size`. Empty positions are air. |
| `tags` | Up to 16 distinct tags following the ID rule; `[]` is valid. |
| `provenance` | Nonblank text up to 256 characters documenting authorship and asset origin/rights. |

The file budget is 8 MiB (UTF-8 bytes), checked before parsing in the browser and CLI. The grid can span 25.6 m per axis, but the occupied-cell cap applies separately: a full 256³ volume is unsupported. At the maximum cell count, even the longest palette references fit the formatted export budget. Sources are sparse for editable data, but the current viewer still renders one instance per occupied voxel. Limits are safety budgets, not performance measurements.

Placement of a cell centre is `((x+0.5)*0.1 - width/2, (y+0.5)*0.1, (z+0.5)*0.1 - depth/2)` metres, where width/depth come from the declared grid size. The declared bounds are `[-width/2,0,-depth/2]` to `[width/2,height,depth/2]`. There are no per-asset rotations or arbitrary pivots in v1. The marker's gold end faces −Z; red/coral marks +X. The metre cube occupies a 1 m cube at the base centre.

Only opaque matte material is supported: roughness 0.9, metalness 0, no transparency or emission. Unsupported materials fail before rendering. Palette entries may remain unused to preserve authoring intent. Future material support requires an explicit format/renderer decision.

Geometry authority is **explicit sparse occupancy**. The block helper `src/assets/create-block.ts` fills a rectangular region and emits cells with a palette reference. Agents may generate bounded arrays with loops or filter/paint those arrays, then validate. Operations, scripts, expressions, procedural recipes, baked occupancy alternatives, sockets, collision proxies, and export configuration are not serialized fields in v1. This avoids competing geometry authorities and execution of imported operations. Manual tools/undo belong to Phase 5; meshing/GLB export belong to Phase 4.

The workshop block creator remains limited to 1–16 per axis, with a 24-asset session cap including the two fixtures. Import validates before catalog mutation and selects the new source. A duplicate asset ID is rejected, even if its contents match; reload to reopen an export whose ID is already in the catalog, or give a distinct variant a new ID. The two built-in fixture IDs are always reserved by their presence. Export is a browser download; reopening uses the file input. Downloads preserve stable IDs. There is no automatic disk or browser-storage persistence. Import failures retain the current selection and preview; file names and source display names never become HTML.

Run `npm run assets:validate` for all committed references, or `npm run assets:validate -- path/to/asset.voxel.json` for one or more sources. Any failure returns nonzero. `npm test` checks validator/round-trip/placement behavior, and `npm run check` also runs browser downloads, reopening, and earlier viewer regressions.

Use [the authoring skill](mvw-voxel-assets/SKILL.md) when creating assets. Committed references live in `assets/source/`; generated runtime derivatives will live in `assets/generated/` after Phase 4.
