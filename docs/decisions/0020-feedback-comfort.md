# Phase 19 — Combat feedback, sound and comfort

Jan requested continuation on 28 October 2026. This implements a bounded feedback/
comfort pass. Subjective effects/sound quality, player comfort, and Phase 16's
Pixel 10a / 720p / 60 FPS target remain unverified. No release or deployment.

## Presentation and authority

Clearpass adds simulation-timed hit/kill confirmations, a low-altitude warning
(below 20 m AGL for fixed wing / 24 m for helicopter), and a post-critical warning
below 30% integrity. Post integrity also has a labeled meter. Text and opaque HUD
plates make objectives, flight, danger and weapon state readable without relying
only on color. Help text collapses into a controls/rules disclosure. Mission and
equipment controls fit narrow viewports; this is layout coverage, not touch input.

Feedback observes authoritative shot/hit/kill/blast totals, not effect-slot success.
Hit marks last 18 ticks, kill confirmation 28; pause freezes their simulation age.
Reset/rearm/world changes clear feedback, and metric rebasing cannot replay old
hits. An optional deterministic recoil offset lasts up to 12 ticks, bounded to
0.18 m horizontally / 0.108 m vertically. Shake defaults off, is zero on pause,
and is undone after each rendered frame so it cannot bias chase-camera tracking.
It never changes aircraft pose, muzzle rays, hit queries, mission state or saves.

Explosions now use the shared low-poly sphere and a translucent warm glow; reduced
mode uses an outline. A separate fixed 16-puff smoke pool reuses that sphere and
one material. Puffs rise for 1.2 simulation seconds, never allocate per blast, and
freeze/clear on pause/reset respectively. Overflow drops smoke only. The existing
128 cosmetic-effect slots in Combat remain; sixteen additional presentation
meshes are not sixteen additional combat effects. The adapter still owns only
two geometries and disposes shared materials/geometries once. No bloom pass,
textures, dynamic lights, extra shadow passes or terrain destruction were added.
Clearpass uses ACES tone mapping at exposure 1.05 and optional distance fog.

## Comfort controls

`/play/` provides Full / Reduced / Off effects, flashes, smoke, camera shake, HUD
contrast, distance fog and master volume. Full honors smoke/flash toggles. Reduced
suppresses smoke, muzzle/impact flashes and target flinch/color flashes; it uses
thin tracers and outline blasts. Off hides all effect meshes and smoke; enemies,
text/hit confirmations, sound and all authoritative combat remain. Effects modes
override smoke/flash preferences while reduced/off. Flashes off also selects an
outline instead of filled blast glow and disables zombie hurt flashes/flinch.

At startup, prefers-reduced-motion selects Reduced with smoke/flashes/shake off;
otherwise Full starts with smoke/flashes on and shake off. Contrast and fog default
on; volume defaults to 65%. Sound always starts muted and requires Enable sound.
These are explicit session controls, not new persistent preferences. They survive
world changes within the page, not reload. No campaign/population formats or keys
changed. Settings changes pause and clear input/audio. Natural flight/camera motion
is not removed by disabling optional shake.

## Sound and load budgets

Synthesized hit, clear, warning and mission cues join the existing three weapon
sounds. All share the existing eight-voice cap and master gain. Zero volume stops
voices and prevents new voice allocation; volume validation is atomic. Playback,
context creation or resume failures report optional audio failure while gameplay
continues. Pause/focus loss stops voices. Automatic mission completion stops weapon
voices, then lets its one-shot cue finish rather than stopping it every paused
frame. No recorded/third-party audio or new assets/dependencies were introduced.
Physical-device listening and subjective sound balance remain outstanding.

Shared combat views in development labs get bounded default visuals; comfort UI,
contrast/tone mapping, camera recoil and gameplay cue wiring are in Clearpass.
Isolated benchmarks force default Full visuals and shake off, independent of OS
motion preference, and remain muted. Their reports include comfort settings and
smoke capacity/drop counts. Previous benchmark timings are historical: this revision
has different shading/effects. rAF intervals are whole-frame observations; the
existing CPU subsection timers are not exhaustive and omit some DOM/audio/feedback
work. None of these are physical-GPU frame times.

Automated checks cover real full/reduced/off sortie damage/save equivalence,
no-cosmetic hit feedback, feedback reset/rebase and tick lifetimes, smoke saturation
(24 blasts -> 16 active / 8 dropped), reuse/disposal, and audio cap/volume/failure.
Browser cases exercise real shell hits with effects off, smoke/pause/recovery,
post integrity/contrast, actual low-altitude warning visibility, muted/zero-volume
behavior and 390 px layout without horizontal overflow. Existing crowd/fire
benchmarks exercise integrated presentation under load; GPU/comfort acceptance
still requires the declared device and user feedback.

[Recorded load snapshots](../benchmarks/phase-19-feedback.json) retain Full-mode
crowd/fire reports from this verification before the final readout/counter fixes.
They observed 862–864 active individuals, up to seven simultaneous combat effects,
36–43 geometries and two outstanding payloads. Sound was muted; minigun fire emits
no blast smoke, so those runs do not exercise the full smoke/audio capacities.
Software-rendered rAF medians were 83.3–100 ms, not GPU or Pixel performance.
The 16-smoke/eight-voice saturation checks are separate unit tests. Real shell
browser checks validate smoke spawn/freeze/reset, not sixteen-puff GPU throughput.
Final audio dispatch uses only positive shot deltas so rearm cannot emit a ghost
shot. Volume uses a plain readout and slider aria-valuetext, preserving a single
mission status region for accessible mission/failure announcements.
