# Kyoto Bounce performance optimization plan

Date: September 26, 2026. Status: bounded pass completed; see [results and unmet targets](../web/benchmarks/OPTIMIZATION-RESULTS.md). The original targets below are retained for comparison.

## Objective

Make gameplay consistently smoother in Chrome on this laptop by reducing frame spikes and the work required for each frame, while preserving the game's appearance, controls, music timing and authoritative physics.

The browser already uses Three.js. This is a bounded optimization of that implementation. Start from commit `14091f0e4cecb9882165f516cdf5f38bd9f61cc2`, which includes the shipped audio-clock and forced-layout fixes, or a newer baseline whose intervening changes are recorded before measurements begin.

## Evidence and open questions

The [September 26 investigation](../web/benchmarks/STABILITY.md) measured Chrome on an Apple M2 with 24 GiB RAM, using a visible 1440 × 900 viewport at DPR 1:

- Ordinary frames were often near 60 FPS, but one shot contained an 883 ms frame gap. Its physics trajectory was buffered, with no playback underruns. The cause of that gap remains unconfirmed.
- Views submitted roughly 300–700 draw calls and 1–1.4 million triangles. CPU profiles highlighted scene traversal, station raycasts and escalator updates.
- The first fixes removed permanent music slowdown after scheduling stalls and a synchronous HUD layout spike. They did not demonstrate a general FPS improvement under CPU stress.
- The [earlier rendering experiment](../web/benchmarks/RESULTS.md) found that a spatial split increased draw calls and slowed rendering. GPU timer queries also disturbed frame pacing on this machine.

Source inspection adds three useful constraints: mesh BVHs and cached static transforms already exist; camera collision already caches mesh inverses and bounds; escalators already use instancing. Improve the remaining work around these mechanisms rather than introducing duplicates.

## Scope and working setup

Use the existing performance worktree if it is free and current; otherwise follow `AGENTS.md` to prepare an isolated worktree and `codex/` branch. Run one benchmark renderer at a time. Give every local service its own port, database and worker log. Reuse a compatible native worker explicitly while browser-only changes are being tested.

The implementation covers browser rendering, frame-loop work and the local benchmark harness. Keep current station geometry, materials, texture quality, lighting and effects during the primary comparison. Keep the normal adaptive-resolution behavior for a separate real-use check; freeze resolution for measured comparisons.

Preserve these invariants throughout:

- Server scores remain authoritative; shot completion requires both translation and spin to stop; recall forfeits.
- Visible contact surfaces match the canonical station layout, including moving escalator treads.
- Aim, camera collision, replay seeking, 1×/2× playback and musical phase keep their current behavior.
- Benchmark data and diagnostic allocation must be bounded; full traces and local records stay in ignored directories.

A physics-engine replacement, renderer migration, server upgrade, geometry redesign and production load test are outside this pass. Deliver code and measured results for review. The earlier deployment request covered the already-shipped fixes; publication of this new batch is a separate release step.

## 1. Establish a trustworthy comparison

**Files:** `web/benchmarks/stability.mjs`, `web/benchmarks/server.mjs`, benchmark documentation and narrowly scoped local instrumentation.

1. Extend comparisons to use complete baseline and candidate browser asset sets, recording commit IDs, dirty-file hashes and the pinned asset pack. The current `KYOTO_BENCH_REF` overlay replaces only audio and feedback modules; it cannot validate changes to the renderer or other modules.
2. Use the existing fixed camera routes for deterministic rendering comparisons. Add a locally captured native trajectory and fixed playback times for repeatable shot views, alongside real gameplay tests. Record the course, inputs, trajectory hash and camera path. Native shot timing alone is not deterministic enough for a rendering A/B comparison.
3. Measure aim, walking, orbiting, normal flight and 2× flight. Include hall, escalator, garden and concourse views; inspect both day and evening appearance.
4. Run five alternating baseline/candidate pairs, reversing which variant runs first between pairs. Use at least 10 seconds of warmup and 30 seconds per measured scenario. Record Chrome version, display refresh, viewport, drawing-buffer size, power state and significant concurrent workloads. Keep other applications consistent and avoid simultaneous builds.
5. Record frame intervals (p50/p95/p99/max), counts over 33.4/50/100/200 ms, full frame-callback CPU duration, subsystem CPU duration, draw calls, triangles, audio misses, playback underruns, reconnects, visibility and WebGL errors. Include work after `renderer.render()` in the full callback measurement; the existing subsystem timers omit some tail work.
6. Separate unprofiled pacing runs from CPU/GPU/compositor attribution traces. Keep GPU timer queries disabled in acceptance runs. Report CPU submission time as CPU time, not GPU execution time.

Use bounded samples and aggregate counters for long sessions. Long Animation Frame records help identify scripts and forced layout, but missing attribution does not establish a GPU bottleneck. [Chrome guidance](https://developer.chrome.com/docs/web-platform/long-animation-frames).

**Exit:** a repeatable baseline, a working complete-source comparison and a table showing measurement variability before optimization starts.

## 2. Reduce repeated HUD and diagnostic work

**Files:** `web/public/game.js`, `web/public/arcade-feedback.js`, and any directly implicated UI helpers.

- Cache stable element references and reusable formatters where the profile shows repeated work.
- Assign text, classes, styles and attributes only when their displayed value changes. Keep score interpolation and animated effects at their required cadence.
- Read layout before DOM mutations where a read is necessary. Preserve the retained animation handles introduced in the first fix. [Layout guidance](https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing).
- Profile `window.kyotoState` construction, temporary vectors, copied frame arrays and diagnostic object creation. Reduce production diagnostic cadence or allocation only after identifying consumers and retaining their contracts; detailed benchmark capture can remain opt-in locally.
- Reuse scratch objects in measured hot paths. Avoid a broad cleanup of unrelated allocations.

**Keep the change when:** repeated HUD mutations or diagnostic allocations fall substantially and full callback/layout cost improves beyond measured noise, with score, power, status and accessibility behavior intact.

## 3. Reduce station query work

**Files:** `web/public/aim-reticle.js`, `web/public/station-look.js`, `web/public/camera-obstacles.js`, and a small shared static-query helper if justified.

- Inventory query time and candidate counts separately for aim, contact shadows and camera clearance.
- For the reticle and downward contact-shadow rays, precompute static mesh bounds and transforms once, select nearby/intersecting candidates first, then use the existing mesh BVHs.
- Preserve nearest-hit ordering and contact-shadow surface-normal filtering. A nearer rejected surface must not hide a valid supporting surface farther down the ray.
- Invalidate caches on station replacement or relevant transform changes. Reuse results only when query inputs truly remain valid; moving players and camera transitions must remain responsive.
- Improve camera collision only if profiling still shows material cost after its existing bounds/inverse caching. Preserve its swept-volume and two-sided surface checks.

**Verification:** compare old and new query results on fixed rays and camera sweeps near floors, stairs, rails, walls, edges and stacked surfaces. Require equivalent hit/miss and surface selection, hit positions within 1 mm and no newly permitted camera penetration. Add focused regression tests for any new query algorithm.

**Keep the change when:** query CPU time and candidate counts fall in affected views without incorrect reticles, floating shadows or camera clipping.

## 4. Update escalators only when needed

**Files:** `web/public/escalators.js`, `web/public/game.js`.

- Use conservative bounds for each complete escalator lane to skip visual pose calculation and instance-buffer uploads when the lane cannot contribute to the current rendered view or another active render pass.
- Calculate resumed tread poses from the existing absolute station clock. Never accumulate missed animation steps or pause the authoritative escalator simulation.
- Update visibility against the final camera pose, and refresh poses before newly visible lanes render. Account for reflection capture and any shadow pass that actually uses the lane.
- Retain conservative bounds across all tread poses and handle replay seek, camera teleport, level reset, tab resume and 2× playback.

**Verification:** compare tread transforms at fixed station times with continuous updates versus skipped intervals, including negative speeds and path wraparound; inspect rapid camera turns and riding an escalator.

**Keep the change when:** hidden-lane updates/uploads decrease and measured update cost improves, with no stale frame or phase jump when a lane reappears.

## 5. Prototype one targeted rendering improvement

**Files:** the station construction or material module identified by the updated profile, plus its benchmark checks.

After the CPU changes, select the largest remaining rendering cost. Choose one candidate with evidence behind it: batch compatible static meshes within sensible spatial bounds, improve culling of a costly decorative group, or remove a demonstrated redundant render pass. Compare the same routes and pixels. Batching trades fewer draw calls against coarser culling, so call count alone is insufficient evidence. [WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices).

Preserve material boundaries, transparency order, depth offsets, shadows, reflection assignments and collision/query mappings. Do not merge the entire station indiscriminately. Keep authored assets intact and follow `docs/ASSETS.md` if generated asset derivatives are necessary.

Try at most two measured variants for this step. Retain a variant only if total frame cost improves and no representative route regresses beyond the tolerance below. If neither wins, remove the experiment and record the result. Lower resolution or visual detail does not count as meeting this plan's primary performance target.

## 6. Investigate long stalls and verify the combined result

Start this investigation during baseline collection and repeat it on the final candidate:

- Run a 20-minute visible gameplay session for each variant, with repeated shots, recalls, orbiting, replay use and 1×/2× transitions. Measure cold first-use behavior separately from warmed play. Exercise the laptop's ordinary window size and adaptive resolution in an additional real-use check.
- Correlate large frame gaps with main-thread work, GC, style/layout, shader compilation, uploads, GPU/compositor activity, playback-buffer health and server snapshot timing. Use a separate traced reproduction rather than keeping a heavy trace running during acceptance measurements.
- Spend at most two additional 10-minute traced attempts reproducing an unexplained large stall. If a repeatable browser cause emerges, implement one focused remedy and remeasure it. If the cause remains ambiguous, preserve the evidence and say so.
- Check heap, renderer resource counts and event/listener lifetimes over repeated course/replay cycles. Investigate sustained growth with allocation evidence; a noisy heap sample alone is not proof of a leak.

### Performance targets

These are proposed acceptance targets for this laptop, not performance claims. Report every target as passed, missed or unmeasurable.

| Area | Target |
| --- | --- |
| Normal foreground pacing | Each representative warm scenario has median run p95 ≤18.5 ms and p99 ≤33.4 ms at 1440 × 900, DPR 1 and a 60 Hz presentation target. If the actual refresh differs, record it and adapt the frame budget before comparisons. |
| CPU headroom | At least 20% lower p95 full callback CPU time in at least three of the five scenarios, using the median of five runs per variant and the same workload. |
| Regression tolerance | No repeatable worsening of scenario p95 CPU cost or frame interval exceeding the larger of 5% and 0.5 ms. Publish all runs and their spread. |
| Long-session pacing | At most one frame interval over 50 ms per visible minute, and zero unexplained intervals over 200 ms during the final 20-minute warmed session. Publish raw counts and the full maximum even when a target is missed. |
| Playback and audio | Zero unexpected reconnects or shot-buffer underruns in local acceptance runs; preserve the existing audio regression results, including <0.001 ms beat-grid drift and zero missed beats in the controlled 250 ms stall case. Longer injected stalls may skip expired beats without shifting the musical grid. |
| CPU stress | Repeat at 4× CPU slowdown as a secondary headroom check; show before/after results and any regression. This is a diagnostic workload, not a claim about a slower physical device. |
| Presentation and correctness | No new console/WebGL errors, missing geometry, visible popping, shadow errors, reticle errors, camera clipping, score discrepancies or stale HUD states. |

Record tab-hidden intervals and external interruptions separately. Do not silently discard slow foreground samples. An unexplained pause remains a missed stability target even if other metrics improve; failure to reproduce the historical 883 ms pause does not prove it fixed.

### Verification and delivery

1. Run `npm run typecheck`, `npm test`, `npm run build:web` and `git diff --check` on the combined changes. Add focused tests for new query, cache or animation-skipping behavior rather than timing-sensitive unit assertions.
2. Play the local build in real Chrome: walk, aim, charge, release, follow the ball, collect waypoints, recall, finish a shot, replay/seek and toggle 2×. Check escalators, camera collisions, day/evening lighting, reduced motion and a mobile-size layout.
3. Run relevant isolated runtime checks for the affected gameplay paths. If service, physics or protocol changes become necessary, follow the full runtime/rebuild requirements in `AGENTS.md` before claiming them verified.
4. Save screenshots at fixed camera poses and animation times. Inspect motion as well as stills. Use exact decoded-asset checks if asset derivatives change.
5. Write `web/benchmarks/OPTIMIZATION-RESULTS.md` and a compact structured result file with baseline/candidate hashes, reproduction commands, all run summaries, retained and rejected experiments, target status and remaining uncertainty. Keep raw traces and production/private data out of Git.

Stop this bounded pass after the listed experiments, capped stall investigation and final verification. Call it a successful performance optimization only for gains established by the measurements; list unmet targets explicitly and leave further architectural work as a separate proposal. Do not extend the work into historical project checklists.

## Goal sentence

Implement `docs/PERFORMANCE-OPTIMIZATION-PLAN.md` to reduce Kyoto Bounce's gameplay frame stalls and CPU cost in Chrome on this laptop, preserve its visuals and authoritative gameplay, and deliver verified improvements with reproducible before-and-after benchmarks and an explicit report of any unmet targets.
