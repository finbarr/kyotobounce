# Kyoto Bounce browser optimization results

Status: bounded optimization and verification completed September 26, 2026 (local time). Component-level gains are verified; the CPU and regression targets are not established for the combined candidate. See target accounting below.

Baseline: `14091f0e4cecb9882165f516cdf5f38bd9f61cc2`, including the previously shipped music-clock and HUD layout fixes. This pass follows [the optimization plan](../../docs/PERFORMANCE-OPTIMIZATION-PLAN.md). Service code, native physics, scoring rules and authored assets are unchanged.

## Changes retained

- HUD helpers compare existing text, visibility, attributes and styles before writing. Stable element references and number formatters are reused. The optional debug panel no longer constructs its report when disabled. `window.kyotoState` retains its existing cadence because browser tests and diagnostics consume it.
- Aim and contact-shadow queries use a static hierarchy of mesh bounds, then call the existing mesh/BVH raycasts. Hit ordering, layer filtering, custom raycast exclusions and supporting-surface selection are preserved. The index can be invalidated and new station roots get their own index.
- Escalator lanes outside the final camera frustum skip pose calculation and instance uploads. Visible lanes still use the absolute station clock. Treads do not cast the frozen architecture shadow, and reflection capture excludes mutable objects. Initialization can still update every lane.

## Method and limits

The primary comparison uses the same captured native snapshots and camera poses for aim, walking, orbiting, flight and 2× flight. The short paths repeat during each 30-second sample, following 10 seconds of warmup. Hall, escalator, garden and concourse views use the same durations. Five baseline/candidate pairs alternate which variant runs first. Only one game renderer runs at a time; builds and other tests are kept outside those measurements.

Each run serves a complete frozen browser-source variant through a real loopback HTTP/WebSocket proxy. Its receipt hashes every browser source, the asset manifest, dependency lockfile, canonical layout, optimization manifest, fixture and harness. The source-ref option rejects mismatched asset/dependency manifests. Both variants use the same installed Chrome, 1440 × 900 viewport, DPR 1, materials, lighting and texture quality. GPU timer queries are disabled. Power state and leading concurrent processes are recorded; other applications are not closed. Each run uses a fresh automated Chrome profile and an isolated local physics service. The user's regular Chrome extensions, existing tab workload and production network conditions are not reproduced by this comparison.

The full callback measurement wraps the entire `animate()` call, including work after rendering. It includes the same fixture and measurement hooks in both variants. It is elapsed main-thread callback time, including any driver waiting, rather than total process CPU use or GPU execution time. The fixture applies recorded state inside the frame; live network delivery is checked separately in the soaks. The escalator update now runs after the camera is finalized, so part of its cost moves from the old `pose` timer to `shadows`; compare full callback duration rather than interpreting that category change as a speedup.

Fixture playback deliberately disconnects its live session. Its buffer counters cannot validate native transport. Separate baseline and candidate 20-minute live soaks exercise native throws, recalls, walking, camera orbit, saved replays, seeking and speed changes. Frame collection continues between the one-minute result drains. Heap/DOM snapshots after forced garbage collection occur outside the timed windows. Startup timing uses a new browser context against a local service with warm filesystem/server caches; it is not an internet download measurement.

The baseline soak began on battery (78%) and the laptop was connected to AC in its final minute (66%); the comparison pairs began after charging was established. The power journal is retained in the compact receipt. Power changed back to battery between 03:48:25 and 03:49:25 UTC during `pair-4-candidate`; a 03:51 workload snapshot also shows increased browser/compositor activity. That run is preserved, with sample-window timestamps to identify the affected intervals. The five-pair CPU and regression estimates are therefore marked unmeasurable under controlled conditions, alongside their observed target misses. The two soaks therefore cannot establish a causal reduction in rare stalls across equivalent power conditions.

Two unfinished setup runs are excluded by name: `soak-baseline-pre-continuous` predates continuous sampling between minute drains, and `pair-1-baseline-pre-visibility` predates explicit focus/visibility event receipts. Both remain in ignored local evidence. All five final pairs use the same harness and source hashes. Completed acceptance runs are retained even when slow.

The two capped stall traces are attribution runs, separate from acceptance pacing. Each uses a 32 MiB rolling trace and ends at its first measured gap over 100 ms or after ten minutes. A missing JavaScript attribution does not establish a GPU cause. [Chrome's Long Animation Frames guidance](https://developer.chrome.com/docs/web-platform/long-animation-frames) describes both the attribution scope and its limitations.

## Focused evidence

The real-station query check compares 1,200 fixed aim/downward-support rays against recursive raycasting: 779 hit, all choose the same mesh, and the maximum hit-position difference is zero. The new broad phase examines 11.05 of 859 meshes per ray on average. Across five batches, median time for all 1,200 queries falls from 211.1 ms to 19.0 ms (91.0%). These are diagnostic synchronous query measurements, not frame-rate results.

The unit regression covers 3,000 transformed/layered/BVH queries, finite ranges, invalidation and stacked supporting surfaces. The escalator regression covers all 20 installed station lanes (`--station`), every tread corner, hidden intervals, camera return, large times, rewind, reversed speeds and wraparound. Resumed instance matrices and tread sizes match continuous updates exactly. The default unit run uses 20 portable lanes so CI does not require the optional art pack.

Fixed camera images cover four station views in daylight and evening. The native motion and the evening artwork's independent shader clock are pinned for these image comparisons only. Six captures match exactly; the other two each differ in one color channel by 1/255. The test rejects any difference over one 8-bit level or over 100 differing channels. No visual asset derivative was introduced.

## Rejected rendering experiments

1. A hierarchy of spatially bounded static groups pruned scene traversal. It removed only a few draw calls and did not consistently improve full callback cost. Removed.
2. Skipping Three.js's matrix-update traversal through already-frozen architecture changed p95 callback time by only about 0.1–0.2 ms in the exploratory runs, with no consistent improvement. Removed.

Both experiments preserved the four fixed daylight images. Their short exploratory runs are not included in the five-pair acceptance comparison. No geometry merge, resolution reduction or visual-quality reduction is counted as an optimization. This follows the measurement-first approach in [MDN's WebGL guidance](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices); fewer draw calls alone are insufficient.

## Correctness checks completed

- Typecheck, the unit suite, browser build and `git diff --check` pass on the retained changes.
- All isolated runtime scripts pass: level entry, tutorial, open starts, connection recovery, scoring, campaign, overlapping/completed waypoints, replay sharing, playback rates, designer and rapid recall. One initial campaign invocation lacked the explicit shared worker path; the remaining tests were rerun with the compatible worker selected. The original failure is preserved in the local logs.
- The native checks verify full translation/spin rest, live/final/replay score agreement, forged-score rejection, unchanged trajectories at 1×/2×, and 64 rapid throw/recall sequences without stale results.
- Real Chrome controls verify walking, charging, flight, 2×, recall, a displayed final score equal to the saved native result, replay seek/resume, and the enabled debug panel. The ordinary 1470 × 786 Retina-size view retains adaptive resolution. Reduced motion and the 390 × 844 mobile-size layout pass, with no page errors. This is not a physical-phone performance claim.

The HUD work follows [Chrome's layout guidance](https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing): avoid unnecessary DOM mutation and synchronous layout in a frame. The existing animation-handle fix is retained.

## Acceptance results

### Completed paired timings

These are medians of five runs, with the minimum and maximum run p95 in brackets. Negative reduction means a slower candidate. Pair 4 spans a power change, so the all-run table is descriptive rather than a controlled estimate of the code change. All original observations are retained.

| Scenario | Baseline callback p95, ms [range] | Candidate callback p95, ms [range] | Observed reduction | Baseline frame p95 / p99, ms | Candidate frame p95 / p99, ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| aim | 4.6 [4.5–4.6] | 4.3 [4.3–4.4] | 6.5% | 18.0 / 18.5 | 18.3 / 18.6 |
| walk | 4.4 [4.4–5.1] | 4.2 [4.1–4.2] | 4.5% | 18.1 / 18.5 | 18.2 / 18.5 |
| orbit | 4.6 [4.6–5.0] | 4.5 [4.4–4.6] | 2.2% | 18.1 / 18.6 | 18.3 / 18.6 |
| flight | 4.7 [4.6–4.9] | 4.3 [4.3–4.4] | 8.5% | 18.2 / 18.6 | 18.3 / 18.6 |
| fast-forward | 4.9 [4.9–5.2] | 4.5 [4.5–4.6] | 8.2% | 18.2 / 18.6 | 18.2 / 18.6 |
| hall | 4.3 [4.2–4.4] | 4.8 [3.9–4.9] | -11.6% | 18.1 / 18.6 | 18.2 / 18.6 |
| escalators | 4.3 [4.1–4.3] | 4.6 [3.9–4.7] | -7.0% | 18.1 / 18.6 | 18.2 / 18.6 |
| garden | 5.4 [5.3–5.6] | 5.2 [5.1–7.2] | 3.7% | 18.1 / 18.5 | 18.2 / 18.6 |
| concourse | 4.1 [3.9–4.1] | 4.8 [3.9–4.9] | -17.1% | 18.1 / 18.6 | 18.2 / 18.6 |

The first three pairs ran on AC throughout. Their separate medians are below; this smaller subgroup does not replace the planned five-pair estimate. Matching power does not guarantee an identical background workload.

| Scenario | Baseline callback p95, ms [range] | Candidate callback p95, ms [range] | Observed reduction | Baseline frame p95 / p99, ms | Candidate frame p95 / p99, ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| aim | 4.5 [4.5–4.6] | 4.3 [4.3–4.4] | 4.4% | 18.1 / 18.5 | 18.3 / 18.6 |
| walk | 4.4 [4.4–4.4] | 4.2 [4.2–4.2] | 4.5% | 18.1 / 18.5 | 18.2 / 18.5 |
| orbit | 4.6 [4.6–4.6] | 4.5 [4.5–4.5] | 2.2% | 18.1 / 18.6 | 18.2 / 18.6 |
| flight | 4.7 [4.6–4.7] | 4.3 [4.3–4.4] | 8.5% | 18.2 / 18.6 | 18.3 / 18.6 |
| fast-forward | 4.9 [4.9–4.9] | 4.5 [4.5–4.5] | 8.2% | 18.2 / 18.6 | 18.2 / 18.6 |
| hall | 4.4 [4.3–4.4] | 4.8 [4.8–4.9] | -9.1% | 18.1 / 18.6 | 18.2 / 18.6 |
| escalators | 4.3 [4.3–4.3] | 4.7 [4.6–4.7] | -9.3% | 18.1 / 18.6 | 18.2 / 18.6 |
| garden | 5.3 [5.3–5.4] | 5.2 [5.1–5.2] | 1.9% | 18.1 / 18.5 | 18.2 / 18.6 |
| concourse | 4.1 [4.1–4.1] | 4.8 [4.8–4.9] | -17.1% | 18.2 / 18.6 | 18.2 / 18.6 |

The normal pacing thresholds are met in these observed medians. No gameplay scenario reaches a 20% callback reduction in the five-run medians. The concourse callback regression also repeats in all three AC pairs. The complete controlled comparison is limited by the fourth pair’s power interruption.

### 4× CPU diagnostic

One run per variant, with the same captured motion and default warmup/measurement durations. Both began on battery. This is a secondary Chrome throttle experiment, not a measured slower physical device.

| Scenario | Callback p95 before → after, ms | Frame p95 before → after, ms | Mean FPS before → after |
| --- | ---: | ---: | ---: |
| aim | 14.0 → 13.5 | 17.5 → 17.5 | 59.9 → 60.0 |
| walk | 14.3 → 16.9 | 17.6 → 17.6 | 59.9 → 59.3 |
| orbit | 15.8 → 19.6 | 17.6 → 17.6 | 59.1 → 57.9 |
| flight | 19.9 → 18.5 | 33.4 → 32.5 | 53.3 → 56.7 |
| fast-forward | 22.3 → 17.7 | 34.0 → 33.1 | 43.1 → 55.6 |

Fast-forward callback time improves by 20.6%, but walking and orbiting worsen by 18.2% and 24.1%. Flight improves modestly. These mixed single-run results do not establish a uniform gain under CPU contention. All five raw summaries and environmental receipts are retained.

### HUD mutation diagnostic

A separate MutationObserver run measures each scenario for ten seconds after ten seconds of warmup. These instrumented timings are excluded from the primary pacing comparison. The counts include the full game DOM, so remaining activity includes animation and UI work outside the changed helpers.

| Scenario | Mutations before → after | Mutations/frame before → after | Reduction per frame |
| --- | ---: | ---: | ---: |
| aim | 21331 → 3921 | 35.6 → 6.5 | 81.6% |
| walk | 22316 → 5100 | 37.1 → 8.5 | 77.1% |
| orbit | 22558 → 5148 | 37.6 → 8.6 | 77.2% |
| flight | 28842 → 4940 | 48.0 → 8.2 | 82.8% |
| fast-forward | 28918 → 5605 | 48.2 → 9.3 | 80.6% |

### Live sessions, resources and audio

Each variant completed a visible 20-minute local gameplay session with ten saved shots, ten issued and returned recalls, ten replay starts, ten seeks and forty playback-rate changes. Walking covered 29.94 m before and 30.12 m after. Both recorded zero unexpected reconnects, shot-buffer underruns, skipped music steps, context losses or browser errors. The renderer retained 1,094 geometries and 40 textures throughout both sessions.

| Measure | Baseline | Candidate |
| --- | ---: | ---: |
| Frames over 50 ms | 1 | 2 |
| Maximum frame interval | 50.3 ms | 50.1 ms |
| Frames over 200 ms | 0 | 0 |
| Retained JS heap after GC, start → end | 21,874,788 → 23,449,448 bytes | 21,787,328 → 23,362,372 bytes |
| DOM nodes after GC, start → end | 919 → 1,014 | 947 → 993 |
| Event listeners after GC, start → end | 183 → 191 | 192 → 192 |

The retained-heap increases are almost identical (about 1.575 MB). Array-buffer backing storage declines slightly in both. Repeated gameplay creates legitimate retained UI/replay state; these two endpoint samples do not prove a leak or a leak fix. Three focus/visibility listeners were added to the candidate soak harness after the baseline soak, so the listener baselines differ. Repeated course-cycle resource checks are reported separately below.

Controlled audio checks inject both 250 ms and 500 ms JavaScript stalls into actual Web Audio scheduling. Both the baseline and candidate retain 112 BPM, with maximum beat-grid drift of about 6.25 × 10⁻¹² ms and zero skipped steps in these cases. This preserves the previously shipped fix; audio production code is unchanged in this batch.

### Capped stall investigation

Both ten-minute attribution runs completed without triggering their >100 ms stop condition. Their maximum recorded frame gaps were 51.0 ms before and 66.6 ms after. The largest main-thread events in the trace summaries are the deliberate garbage collections after measurement (26.3 and 27.2 ms), so they are excluded from gameplay attribution. The candidate trace also contains GPU-thread waits around 19–22 ms, but these alone do not establish the cause of a frame gap. No repeatable cause or remedy for the historical 883 ms pause was established within the two-attempt cap.

The concourse callback regression remains unexplained. Inspection found that static transforms were already frozen and their dirty flags were cleared normally; it did not establish a redundant matrix update as the cause. No speculative renderer change was retained to mask this result.

### First use versus warmed play

Startup uses a fresh Chrome context against the already running local service. Navigation-to-ready took 2.987 s before and 2.806 s after; the game-reported startup timer was 2.382 s and 1.688 s. These are single observations with warm server/filesystem caches, not evidence of an internet-loading speedup.

The first two measured minutes include the first gameplay cycle. The remaining roughly eighteen minutes repeat the workload:

| Variant / interval | Frame p95 / p99, ms | Callback p95, ms | Maximum frame, ms | Frames >50 ms |
| --- | ---: | ---: | ---: | ---: |
| baseline / first two minutes | 17.3 / 17.6 | 5.2 | 50.0 | 0 |
| baseline / remaining play | 17.3 / 17.6 | 5.2 | 50.3 | 1 |
| candidate / first two minutes | 18.1 / 18.6 | 4.2 | 50.0 | 0 |
| candidate / remaining play | 17.4 / 17.7 | 4.5 | 50.1 | 2 |

The baseline recorded 20.103 visible minutes and the candidate 20.100. Both meet the absolute long-session threshold. Their power/workload differences prevent a causal claim about rare-stall improvement. No hidden intervals were discarded.

### Escalator updates and course changes

The native robot rose from 0.613 m to 1.682 m while standing on the escalator, then to 3.081 m through the camera turns. All five visible tread samples matched continuous-update instance matrices exactly. Two cycles between the tutorial and first atrium course preserved the displayed course name and returned to 1,088 geometries / 39 textures each time. These counts differ from the soaks because this check does not create shot/replay resources.

The keyboard traversal ignores physical mouse motion in the harness and records focus/pointer-lock state. Walking and arrow-key camera turns still use the normal input handlers. Earlier setup failures are preserved locally: startup timing, an obsolete approach route, physical mouse interference, the tutorial’s no-overview behavior, and a relative diagnostic import after course navigation. Only test setup changed while resolving them.

A separate diagnostic in the same Chrome compares five alternating batches of 1,000 escalator updates per fixed view, after 200 warmup updates. Rendering is stopped for these measurements. Buffer dirty marks count the two attributes per updated lane; they do not measure GPU upload time.

| View | CPU ms/update before → after | Reduction | Candidate updated / skipped lanes | Dirty marks/update before → after |
| --- | ---: | ---: | ---: | ---: |
| hall | 0.1801 → 0.0133 | 92.6% | 2 / 18 | 40 → 4 |
| escalators | 0.1799 → 0.0648 | 64.0% | 8 / 12 | 40 → 16 |
| garden | 0.1797 → 0.1874 | -4.3% | 20 / 0 | 40 → 40 |
| concourse | 0.1794 → 0.0003 | 99.8% | 0 / 20 | 40 → 0 |

The garden view includes all twenty conservative lane bounds, so culling adds about 0.008 ms/update there. Savings in the other views are clear at subsystem scale but do not overcome every whole-frame regression.

### Target accounting

| Target | Status | Evidence / limit |
| --- | --- | --- |
| Normal foreground pacing | Passed | All nine scenario medians meet p95 ≤18.5 ms and p99 ≤33.4 ms. All 90 measured windows have zero >50 ms intervals. |
| CPU headroom | Unmeasurable under the planned controlled conditions; observed target missed | No gameplay median reaches 20%; observed reductions are 2.2–8.5%. Pair 4 crosses a power change. |
| Regression tolerance | Unmeasurable for the complete controlled comparison; observed target missed | Concourse callback p95 rises 0.7 ms (17.1%), repeated in all three AC pairs. |
| Long-session pacing | Passed in this observation | 2 frames >50 ms over 20.100 visible minutes (0.100/min); max 50.1 ms; none >200 ms. |
| Playback and audio | Passed | Zero live underruns/reconnects; controlled beat-grid drift <0.001 ms and zero skipped beats at 250 ms. |
| CPU stress | Passed: diagnostic completed | Mixed results: fast-forward improves; walking and orbiting regress. This is not a uniform speedup. |
| Presentation and correctness | Passed in the checks performed | Unit/build/native/browser checks, query equivalence, day/evening pixels, riding/course cycles and adaptive/mobile layouts pass. |

## Conclusion

This bounded pass establishes substantially less HUD mutation, fewer station-ray candidates, cheaper hidden-escalator updates and modest gameplay callback gains. It does **not** establish a general 20% CPU improvement or a fix for the historical 883 ms stall. The combined candidate also has a repeatable concourse regression and mixed CPU-throttled results. These measurements and correctness checks were completed locally before publication.

Both allowed rendering variants and both capped stall traces are complete. Further work should separately isolate the whole-frame render regression under steady power and background load before making a broad performance claim or releasing this combined candidate.


## Reproduction

See [README.md](README.md) for setup, fixture capture, complete-source comparisons, browser checks, soaks and audio timing. Raw samples, screenshots, profiles, traces and local gameplay records stay under ignored `.local/`; compact receipts are in [optimization-results.json](optimization-results.json).

The native executable used for this pass has SHA-256 `58a92c047c5ae8fcef5ef89c3190677c48bdb8b47dfa107358f9dcc7e4e474f6`. It is explicitly selected with `KYOTO_WORKER_EXECUTABLE`; this browser-only pass does not rebuild or change it. The isolated service uses port 4391 and `.local/4391/data`.
