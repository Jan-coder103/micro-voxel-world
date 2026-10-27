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

The file budget is 8 MiB (UTF-8 bytes), checked before parsing in the browser and CLI. The grid can span 25.6 m per axis, but the occupied-cell cap applies separately: a full 256³ volume is unsupported. At the maximum cell count, even the longest palette references fit the formatted export budget. Sources are sparse editable data; Phase 4 now derives optimized greedy surface meshes for the viewer. Limits are safety budgets, not performance measurements.

Placement of a cell centre is `((x+0.5)*0.1 - width/2, (y+0.5)*0.1, (z+0.5)*0.1 - depth/2)` metres, where width/depth come from the declared grid size. The declared bounds are `[-width/2,0,-depth/2]` to `[width/2,height,depth/2]`. There are no per-asset rotations or arbitrary pivots in v1. The marker's gold end faces −Z; red/coral marks +X. The metre cube occupies a 1 m cube at the base centre.

Only opaque matte material is supported: roughness 0.9, metalness 0, no transparency or emission. Unsupported materials fail before rendering. Palette entries may remain unused to preserve authoring intent. Future material support requires an explicit format/renderer decision.

Geometry authority is **explicit sparse occupancy**. The block helper `src/assets/create-block.ts` fills a rectangular region and emits cells with a palette reference. Agents may generate bounded arrays with loops or filter/paint those arrays, then validate. Operations, scripts, expressions, procedural recipes, baked occupancy alternatives, sockets, collision proxies, and export configuration are not serialized fields in v1. This avoids competing geometry authorities and execution of imported operations. Phase 5 adds validated cell/palette/property commands and bounded undo/redo; meshing and GLB export are implemented by the separate Phase 4 derivative pipeline.

The workshop block creator remains limited to 1–16 per axis, with a 24-asset session cap including the two fixtures. Import validates before catalog mutation and selects the new source. A duplicate asset ID is rejected by default, even if its contents match. Explicitly enable replacement to reopen the same source ID (including edited fixtures); successful import replaces only that document and discards its edits/history. Invalid replacement retains all current data. Give distinct variants new IDs. The two built-in fixture IDs are always reserved by their presence. Export is a browser download; reopening uses the file input. Downloads preserve stable IDs. There is no automatic disk or browser-storage persistence. Import failures retain the current selection and preview; file names and source display names never become HTML.

Run `npm run assets:validate` for all committed references, or `npm run assets:validate -- path/to/asset.voxel.json` for one or more sources. Any failure returns nonzero. `npm test` checks validator/round-trip/placement behavior, and `npm run check` also runs browser downloads, reopening, and earlier viewer regressions.

Use [the authoring skill](mvw-voxel-assets/SKILL.md) when creating assets. Committed references live in `assets/source/`; generated runtime GLBs live in `assets/generated/` and are ignored/rebuilt locally. See [the mesh pipeline](mesh-pipeline.md) for export commands and ownership.


Phase 5 manual editing uses zero-based coordinate selection with a preview wire box. Add/remove/paint operations, palette add/update/remove, and name/grid changes are atomic validated commands. Removing the final cell, shrinking across occupied cells, deleting a used palette entry, duplicate IDs and invalid references are rejected. Palette renaming updates all cell references. Resizing retains integer coordinates, so the base-centred world placement is recalculated for the new envelope. Undo/redo is per document, capped at 64 serialized snapshots / 8 MiB total; oldest history is discarded as needed. A new successful edit discards redo. History, selection and dirty flags are not source fields. JSON export establishes the current saved comparison; GLB export does not. Created sources begin dirty, imported sources and fixtures begin clean. Browser unload warnings are best-effort protection, not persistence.
