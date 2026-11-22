# 0050 — Mobile flight controls

Requested 22 November 2026. Mobile user agents and touch devices with a coarse
primary pointer receive a thumb control deck. Desktop keyboard controls remain
available. Portrait orientation shows a nonblocking landscape suggestion in both
the hangar and flight view, updating with orientation changes.

The right joystick maps down/up to pull/push and sideways to bank. Radial
clamping bounds diagonals; an 8% axis dead zone suppresses small offsets. Pointer
capture permits drags beyond the pad; up, cancel and lost capture center it.
The left vertical slider chooses a held throttle setting through the existing
rate-limited flight input. Zero keeps the existing runway/carrier brake command
active. An explicit auto-shoot toggle defaults off and uses existing weapon/aim
behavior. No changes to simulation, weapons, save schema or terrain generation.

Controls hide while paused, in the hangar or crashed. Pause, window blur, hidden
document and crash clear steering, throttle target and auto-shoot. Resuming keeps
the aircraft's actual power setting, reflected in the slider. Touching the deck
does not trigger the flight canvas's focus-loss pause. Events, media-query
listeners and elements are released during mount disposal. No frame timers or
new dependencies. Small landscape layouts move instruments away from the thumbs
and retain touch-sized menu/launch targets.

Validation: bounded axes/throttle unit checks; mobile browser regression covers
power response, two simultaneous touch pointers, cancellation, auto-shoot,
pause/blur resets and portrait/landscape transitions. Desktop regression and
production entry-point checks are retained. Real phone playtesting and physical
GPU performance acceptance remain outstanding.
