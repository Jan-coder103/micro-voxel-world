# 0048 — Restore image quality and investigate missed frame deadlines

Jan requested restoration of resolution and MSAA after profile(4) showed little
pacing improvement. Restore antialias:true, the 1.5 DPR cap and default 100% scale.
Auto remains an optional setting. Retain the 896² sun depth maps.

## Evidence

Compare supplied profile(3) and profile(4), each a 600-frame rolling capture:

| Metric | (3) | (4) |
| --- | ---: | ---: |
| Drawing buffer | 1919 × 965 | 1440 × 724 |
| Frame interval mean / p95 | 27.62 / 42 ms | 28.49 / 49 ms |
| CPU callback mean / p95 | 8.16 / 14 ms | 12.39 / 22 ms |
| CPU render submission mean | 5.16 ms | 7.49 ms |
| Outside callback mean | 19.22 ms | 15.63 ms |
| Settlement update maximum | 3 ms | 72 ms |
| Static shadow rebuilds | 108 | 108 |

These are different moving views, not a controlled benchmark. Fewer pixels did
not coincide with improved pacing; that does not exclude a GPU bottleneck. GPU
timing is unsupported in both Firefox captures. Callback p95 exceeds the 16.67 ms
60 Hz budget in (4). Mean pacing is ~35 FPS, not evidence of a fixed 30 FPS cap.
The rAF scheduler requests every continuous frame; no 30 Hz limiter exists there.
Simulation uses fixed ticks but renders on each scheduled callback.

Forest generation and road building execute on main-thread setTimeout callbacks,
outside the former CPU frame total. Worker execution is also outside it but runs
off-thread. CPU/GPU overlap; the interval gap cannot be called GPU execution.
The detailed profiler itself hooks draw/GL calls and numerous functions. Its
measured observer cost is only a lower bound, not a correction factor.

## Changes

Add a Detailed timings checkbox to F8. Unchecking resets the capture, restores
all detailed draw/GL/function/shadow hooks and disables GPU query work. Stage
marks and pacing remain, allowing lightweight vs detailed comparison in a fixed
warmed view. This still includes panel reporting/layout and is not profiler-off.
Record captureMode, context attributes (including actual MSAA), exposed WebGL
backend/vendor, scale, DPR and shadow resolution. Backend queries occur once on
opening; browsers may mask them. Software rendering cannot be inferred from
unsupported GPU timing alone.

Time forest and road timer jobs only while capture is enabled. Export a separate
bounded backgroundCpu history, one sample per continuous interval, excluding idle
wakeups. These jobs are already part of outside-callback time; never add them to
it. Samples are separate populations and should not be subtracted as paired data.
Sinks restore on mode changes/close/disposal. Worker computation remains untimed.

Remove the preceding 150 ms forest-shadow throttle: it permits stale shadow depth
and broke the existing immediate-invalidation regression. Keep legitimate static
cache invalidation immediate. The previous changes did not implement the earlier
proposed spatial forest partition or independent color/shadow instance groups.

## Next device measurement

In the same warmed stationary view, export detailed and lightweight captures,
then compare with F8 closed using Firefox Performance. Look for timer jobs,
layout/paint, GC, compositor/driver delays and a masked/software WebGL backend.
For flight-only stutters also capture travel across settlement boundaries: the
72 ms settlement spike warrants a separate incremental-update investigation.
No root cause or 60 FPS improvement is established by this capture or local
software-renderer checks.
