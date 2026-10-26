---
name: mvw-voxel-assets
description: Create or revise correctly scaled editable voxel sources for Micro Voxel World using its v1 format and shared validator. Use for project assets, not general image creation or runtime GLB editing.
---

# Micro Voxel World asset authoring

Read [the format contract](../format.md) before authoring. Work from the repository root. Author UTF-8 `.voxel.json` sources under `assets/source/`; preserve source data when deriving future runtime files. Use `assets/source/direction-marker.voxel.json` for orientation/palette behavior and `assets/source/metre-cube.voxel.json` for physical scale. These original references are not final game art.

Choose a stable lowercase hyphenated ID, a literal display name, category, tags, and truthful provenance. Retain the ID when revising an asset; use a new ID for a distinct variant. Use 0.1 m voxels, integer grid coordinates, +Y up, −Z forward, and a pivot at the centre of the grid base. Record color in named palette entries with opaque `matte` material. Do not add unsupported fields: the validator rejects them.

Select the authoring envelope from the intended physical dimensions before generating occupancy. Divide metres by 0.1 to obtain cell counts. Source limits: 256 per axis, 32768 occupied cells, 64 palette entries, and 8 MiB UTF-8. A large empty envelope does not authorize filling the whole volume. Split structures beyond these limits into useful modules; do not silently change voxel scale.

Use these starting scale ranges unless the request calls for a specific size:

| Category | Approximate physical scale | Voxel counts |
| --- | --- | --- |
| Person reference | 1.7–1.9 m tall | 17–19 high |
| Tree | 4–12 m tall | 40–120 high |
| Small building module | 4–20 m wide, 3–12 m high | 40–200 wide, 30–120 high |
| Attack aircraft reference | 12–20 m long, 12–20 m span | 120–200 long/wide |

These are authoring proportions, not a committed aircraft roster or collision model. For sparse forms, explicitly occupy the silhouette/surfaces within the declared envelope and leave air absent. A one-cell 0.1 m cube is a complete minimal valid example:

```json
{
  "schemaVersion": 1,
  "id": "scale-chip",
  "name": "Scale chip",
  "category": "reference",
  "units": "metres",
  "voxelSize": 0.1,
  "size": [1, 1, 1],
  "pivot": "base-center",
  "orientation": { "up": "+Y", "front": "-Z" },
  "palette": [{ "id": "body", "color": "#77a898", "material": "matte" }],
  "cells": [{ "position": [0, 0, 0], "palette": "body" }],
  "tags": ["scale-reference"],
  "provenance": "Original MVW scale reference."
}
```

Explicit cells are the sole geometry authority. To make shapes, generate bounded cell arrays, filter for occupancy, and set palette references; do not store executable operations or a second recipe alongside the cells. The shared `createBlock` helper can emit a solid block up to 16³ cells. For larger sparse envelopes, create the cells directly within the source limits.

Run `npm run assets:validate -- assets/source/your-asset.voxel.json` and resolve every field error before previewing. Run `npm run check` before committing source/pipeline changes. In the workshop, import the source, check front and top views, frame it, and compare displayed metre bounds with the intended object size. Export the selected source to keep a browser-created asset. Reopen after reloading to inspect an exported session asset; built-in fixture IDs already exist in every session. For runtime derivatives, read [the mesh pipeline](../mesh-pipeline.md). Use the workshop’s Export runtime GLB button or `npm run assets:export -- assets/source/your-asset.voxel.json`. Generated GLBs are ignored and regenerated after switching machines; keep the editable source committed. Never edit a GLB as the authoring source.
