# Gameplay stability investigation — September 26, 2026

## What the measurements establish

Two browser issues are confirmed: delayed audio scheduling permanently stretches the music's beat grid, and the score HUD forces layout inside the animation loop. Both have local fixes. Intermittent larger frame-delivery stalls also occurred; these tests do **not** establish that every reported pause is resolved.

The investigation used this laptop: Apple M2, 8 CPU cores, 24 GiB RAM, Chrome 153.0.8010.53, ANGLE Metal. The game ran against a separate local service on port 4391 with its own SQLite database and native-worker log. The existing compatible physics worker was reused. No production game connections or records were created.

Baseline source: `91cf960`. Browser timings used a visible 1440 × 900 viewport, fixed DPR 1, existing graphics settings, and one game renderer at a time. Fixes are in `arcade-audio.js` and `arcade-feedback.js`. Raw traces, CPU profiles, screenshots and samples are saved in ignored `.local/stability/`.

## 1. Music slows down when JavaScript runs late

**Cause:** the old scheduler assigned `next = scoreTime() + .04 * rate` after an overrun. Every late callback moved the remaining score later. It scheduled only 150 ms ahead, with a 60 ms polling interval.

A separate Chrome benchmark ran the actual Web Audio scheduler for 12 seconds per case. It blocked JavaScript once per second and recorded the scheduled beat times against `AudioContext.currentTime`.

| Main-thread stall | Old effective tempo | Fixed tempo | Old accumulated drift | Fixed drift |
| --- | ---: | ---: | ---: | ---: |
| 250 ms once/second | 105.11 BPM | 112.00 BPM | 738 ms | <0.001 ms |
| 500 ms once/second | 90.22 BPM | 112.00 BPM | 2,328 ms | <0.001 ms |

The fix preserves the original beat grid, queues 500 ms ahead, and checks every 25 ms. When an interruption exceeds the queue, expired beats are skipped in bounded work. The 250 ms browser run skipped zero beats; the 500 ms run skipped one. Very long freezes can still create an audible gap, but no longer slow down the rest of the song. Two deterministic percussion buffers are now reused instead of allocated and filled on every note.

The regression test covers repeated 250 ms stalls at 112 and 224 BPM, ten-second overruns, future-only recovery, existing cue retiming and mute behavior. These are scheduling measurements, not an audio-output waveform or device-driver underrun measurement.

## 2. The score HUD forces layout during a frame

**Cause:** `arcadeFeedback.update()` queried `getAnimations()` after UI mutations on every frame. Chrome's trace recorded a 40.78 ms synchronous style/layout update. The CPU stress profile also sampled `getAnimations()` for 234 ms across the shot interval.

The fix retains the `Animation` returned by `animate()`, updates its playback rate directly, and releases it when finished or reset.

| Matched trace measurement | Baseline | Fixed |
| --- | ---: | ---: |
| Maximum synchronous style/layout update | 40.78 ms | 0.56 ms |
| Maximum game update/pose cost during flight | 46.1 ms | 4.8 ms |
| Flight frame interval, p95 | 17.3 ms | 17.6 ms |
| Largest flight frame interval | 50.0 ms | 34.3 ms |

This removes forced work from the game loop. It does **not** eliminate all layout: total layout time across the traced interval was about 181 ms before and 179 ms after, with an ordinary layout event still reaching 39 ms. Most frames were already near 60 FPS, so this is evidence of a specific spike reduction, not a broad FPS percentage claim.

## 3. Larger stalls remain partly unexplained

In the first unprofiled baseline run:

- Aim, walking and orbiting were approximately 60 FPS, with p95 intervals of 17.2–17.5 ms.
- A 12-second shot had five frames over 50 ms and a worst interval of **883 ms**, despite a 17.3 ms p95. Average FPS alone concealed the severity.
- The shot was already buffered, with zero playback underruns and zero reconnects. Local server snapshots generally arrived every 33 ms; server-side gaps stayed around 35–36 ms in the inspected windows.
- The long-frame records for the largest delays contained no long JavaScript attribution. That narrows the question to frame delivery/browser/graphics/system scheduling, but does not prove a GPU bottleneck.
- A later baseline trace reached 50 ms maximum, so the 883 ms event did not reproduce reliably and cannot be claimed as fixed.

The regular game still submits roughly 300–700 draw calls and about 1–1.4 million triangles across these views. At 4× synthetic CPU slowdown, aim/walk/orbit averaged about 56 FPS and flight about 52 FPS. CPU profiles put scene traversal/draw submission, station raycasts (including matrix inversions), and escalator updates ahead of most game logic. The render timer measures CPU submission time, not GPU execution. The fixed 4× run still averaged 53–56 FPS before throwing, 48.9 FPS in flight and 45.7 FPS at 2× playback; it retained zero audio skips and zero shot-buffer underruns. This stress comparison does not show an overall FPS gain, and confirms that the small fixes leave substantial rendering work.

## Best practices applied and next priorities

1. **Use the audio clock and schedule ahead.** Browser timers can run late while previously scheduled Web Audio continues. Preserve musical phase during recovery. [Web Audio scheduling guidance](https://web.dev/articles/audio-scheduling).
2. **Keep synchronous layout out of the frame loop.** Retain animation handles and group UI reads before writes. A follow-up can update unchanged HUD text only when its displayed value changes. [Chrome's layout guidance](https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing).
3. **Track outliers alongside FPS.** Record p95/p99, worst gaps, long animation frames, visibility, audio misses, and shot-buffer health. A 60 FPS median can coexist with a near-second freeze. [Long Animation Frames](https://developer.chrome.com/docs/web-platform/long-animation-frames).
4. **Reduce measured CPU and GPU work separately.** First prototype spatial filtering/caching for static station raycasts and avoid updating offscreen escalators. Then benchmark spatially bounded draw batching. Preserve collision/art agreement and compare the same views and drawing-buffer sizes. [MDN WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices).
5. **Capture the intermittent long pause before a larger rendering rewrite.** Repeat longer sessions on this laptop with GPU/compositor tracing, record foreground visibility and machine contention, and separate cold first-use stalls from repeated-shot behavior. Keep instrumented traces separate from ordinary pacing runs. [Chrome performance tools](https://developer.chrome.com/docs/devtools/performance/reference).

The short local tests do not establish production network latency, multi-player server capacity, long-session memory behavior, or reliable GPU timing. The laptop had other applications running; none were stopped. This investigation does not justify a server upgrade.

## Reproduce

Prepare assets and dependencies in an isolated checkout. Set `KYOTO_WORKER_EXECUTABLE` to a compatible local binary, then start the service:

```sh
npm run dev -- 4391
```

In a second terminal, run each measurement separately:

```sh
# Compare the two changed browser modules with the baseline revision.
KYOTO_BENCH_REF=91cf960 node web/benchmarks/stability.mjs baseline
node web/benchmarks/stability.mjs fixed

# Attribution runs; keep these separate from ordinary pacing comparisons.
KYOTO_BENCH_REF=91cf960 node web/benchmarks/stability.mjs baseline-trace --trace
node web/benchmarks/stability.mjs fixed-trace --trace
KYOTO_BENCH_CPU=4 node web/benchmarks/stability.mjs fixed-cpu4 --profile

# Actual Web Audio timing with controlled stalls; no game connection.
node web/benchmarks/audio-stability.mjs 91cf960
```

`KYOTO_TEST_ORIGIN` may select another loopback service. `CHROME_PATH` selects the browser executable. Keep the browser visible and avoid overlapping renderers/builds. The baseline overlay is valid for these two module changes; comparing unrelated historical game revisions requires matching complete checkouts. Gameplay uses real native physics with fixed-duration controls, so small trajectory differences between runs remain possible. All benchmark hooks are injected locally by Playwright.

A compact measured-results file accompanies this report. Full traces are intentionally excluded from Git.

## Validation

- `npm run typecheck`, `npm test`, `npm run build:web`, and `git diff --check` passed.
- Actual Chrome gameplay exercised movement, orbit, a native throw, waypoint collection, score effects, recall and 2× playback without page errors. Screenshots were inspected.
- The 4× flight profile reduced sampled `getAnimations()` time from 234 ms to 1.3 ms; remaining event-driven calls still exist.
- The real audio benchmark and deterministic overrun tests passed.
- Production was not deployed. The service and native simulation code were not modified.
