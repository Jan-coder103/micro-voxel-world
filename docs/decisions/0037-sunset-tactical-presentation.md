# 0037 — Sunset tactical presentation

Accepted scope: Jan requested the game look closer to the attached sunset jet / giant-monster combat screenshot on 21 November 2026. Use its amber atmosphere, silhouetted cloud banks and green aviation symbology as visual direction for Frontier.

The player sky uses an amber/brown gradient and lower sun. Sky, directional light,
cloud vertex shading and glare share `SUN_DIRECTION`. The 72 clouds use low-poly
ellipsoids grouped into banks, with dark undersides and warm directional edges.
Their shared geometry/material are released on disposal. Forest boxes retain their
separate geometry. Cloud cost rises from 864 to 7,200 triangles, still one instanced
draw and no new textures, lights or render targets. No hardware performance claim.

Flight instruments use green monospace symbology, an animated heading tape,
open target diamonds, a red lock box and a heading-up radar. Radar shows the selected
recovery base and nearest horde/mutant within a true 2.5 km radius; out-of-range
contacts are omitted. Health and reward displays use actual existing state.
No invented waves, ammunition limits, new monster species or combat rules.

The voxel aircraft, terrain, enemy assets, flight physics, saves and streaming
remain the existing systems. This is a presentation slice, not completion of the
open physical-GPU, handling or human visual acceptance gates.
