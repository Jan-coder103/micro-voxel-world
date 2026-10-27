# 0005 — Atomic voxel editor commands

Phase 5 uses rendering-independent VoxelDocument commands and the unchanged v1 source validator. Manual selection is a zero-based coordinate with a white preview wire box; add/remove/paint are explicit buttons. Orbit/pan gestures retain their viewer behavior. This supports interior and disconnected cells without ambiguous surface picking. Brush strokes, multiselection and raycast picking are not implemented.

Each successful command validates the full candidate before mutation. Invalid/no-op commands preserve history and dirty state; successful new edits discard redo. Palette renames update references. Used palette entries and the last occupied cell cannot be removed. Grid shrinking never crops cells silently. Resizing retains cell coordinates; physical placement follows the v1 base-centred envelope.

History is independent per asset and retains at most 64 serialized source snapshots / 8 MiB, dropping oldest steps. This bounds retained history to at most 192 MiB across 24 assets, excluding current sources/saved comparisons/transient meshing. Large sources may retain only a few history steps. Snapshots favor reliable metadata/palette round trips over a more complex delta format. No new dependencies.

JSON export marks that exact source as exported; GLB remains a derivative and never marks source saved. A browser unload guard signals unsaved documents. The browser may suppress warnings; downloads are user-managed and automatic recovery is absent. Import defaults to rejecting duplicate IDs. Explicit replacement validates first, then replaces just the matching document with a fresh clean history. This enables reopening edited fixtures while keeping accidental duplicate imports safe.

Edits remesh once per explicit command and preserve camera position. Coordinate selection only moves the helper and reports occupancy; it does not remesh. No expensive edit/mesh work runs on pointer movement. The shared source allocation budgets remain in effect; responsiveness at maximum source size is not a measured performance claim.
