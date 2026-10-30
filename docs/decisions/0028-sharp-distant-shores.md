# Crisp distant shoreline coverage

30 October 2026. Jan reported blurred distant water/land boundaries after the
raised-water correction; the screenshot contrasts a sharp nearby shoreline with
washed-out distant banks.

## Cause and change

Frontier's horizon underlay uses 16 m central and 128 m outer sampling. Its vertex
colors were interpolated directly from blue water to land, spreading a mixed
blue/green/beige band across large triangles. Nearby streamed triangles are small,
so their equivalent transition appeared sharper. This is separate from the
water-height discontinuities corrected by decision 0027.

The shared Frontier terrain material now derives a binary water classification
at each original vertex, interpolates coverage, and reconstructs the dry palette
by subtracting the water contribution before normalization. Threshold coverage
with derivative-based pixel antialiasing, then apply the original blue water or
the recovered dry palette. Thus neither water nor bank keeps the broad mixed-color
band. Ground grain uses the same sharp coverage. Material program cache version
is incremented. Reuse existing colors and one float varying; no new geometry,
textures, draw calls, terrain samples or streaming work. The same material serves
both near chunks and distant fallback; origin rebasing continues to anchor grain.

Terrain/water elevations, collision, saves and legacy/lab materials are unchanged.
The distant mesh still has coarse silhouettes; this corrects color-edge sharpness,
not the geometric resolution of the horizon. Distance haze remains intentional.

## Verification

All 259 unit tests passed serially outside the sandbox. Build/types/lint pass.
Two mostly paused player smoke checks passed, including actual shader compilation,
all LOD residency, settings and cleanup. A new one-frame browser pixel regression
bundles the real material into a test-only fixture with existing Vite and compares
its result with unmodified interpolated vertex colors over a 2048 m quad. The
reference has over 100 intermediate-color pixels across the sampled row; the
corrected material has at most two, and the water interior retains its palette.
The first fixture attempt mishandled Vite's output array; corrected the harness
and reran that test successfully (2.5 s overall, 1.1 s test). The fixture is not
part of the production build. No dependencies added.

Inspected `test-results/distant-shoreline-reference.png` and
`distant-shoreline-sharp.png`: the wide smudge is replaced by a crisp boundary.
No heavy flight/browser load suite under the retained heat restriction. Hardware
FPS and Jan's visual acceptance remain open; this is not a device FPS claim.
