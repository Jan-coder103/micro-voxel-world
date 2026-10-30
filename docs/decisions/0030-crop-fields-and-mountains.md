# Crop fields and larger mountains — 30 October 2026

Jan requested flat rectangular fields inspired by the supplied aerial landscape,
plus bigger, slightly more common mountains. This is static scenery, with no
farming mechanics or imported imagery.

Regional generation now partitions seeded 384 m farm blocks into four staggered
rectangles with varied widths, lengths, crop colors and planting directions.
Suitable dry lowland parcels have at most 8 m sampled natural relief; their
interiors flatten to the center height. An 8 m smooth headland joins natural land,
with 18 m grassy access strips between parcels. Home infrastructure is excluded.
Canonical near/far trees and tree collision omit cultivated interiors. Settlements
continue to generate against the shared terrain; structures cover the fields and
road palettes suppress crop shading. Legacy generator-v1 worlds are unchanged.

Frontier's shared terrain/underlay material reads a nearest-filtered 26 × 13 RGBA
float descriptor texture (5,408 bytes). Two lookups locate each fragment's actual
parcel and crop. Pixel-filtered boundaries and planting rows preserve definition
at all four LODs without crop meshes, draw calls or workers. The atlas updates
only on 384 m block crossings, covers the existing horizon, follows world-origin
rebasing, and is disposed with the scene. CPU field descriptors use a bounded
512-block cache. Natural vertex colors remain underneath, avoiding coarse vertex
color halos around rectangles. Other regional labs receive the flattened terrain;
the detailed crop surface presentation belongs to Frontier.

Mountain ridge amplitude rises from 125 to 170 m and wavelength from 240 to 320 m.
Foothills start at z=300 rather than 450 and blend over 600 rather than 550 m,
increasing mountainous coverage modestly while retaining the coast and waterways.
The conservative global land ceiling rises from 190 to 235 m, below the unchanged
250 m aircraft altitude limit. Local collision intervals include the actual range
of field blend weights, retaining cheap near-ground hierarchy queries. Frontier's
terrain/obstacle broad-phase ceilings use the updated constant.

Regional terrain/content can regenerate under existing seeds and saves; this does
not reset or migrate player progress/casualties. Tests establish determinism,
flatness, crop variety, vegetation exclusion, mixed-LOD continuity and conservative
collision bounds. Render checks compare crop-enabled/disabled pixels using the
actual shader and inspect the landscape, forest and shoreline. Physical-GPU FPS
and human visual acceptance remain open; heavy browser/load tests remain excluded
under the existing CPU heat restriction.
