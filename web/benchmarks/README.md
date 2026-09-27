# Lossless delivery and rendering benchmark

From an installed checkout (`npm ci` and `npm run assets:fetch`):

```sh
npm run build:web
node web/tests/lossless-assets.mjs --full
npm run benchmark:render -- 4350 433bc597401637d43ec28ab3bd445f14effa724f
```

The final argument selects the baseline Git revision. The server extracts its browser modules into ignored `.local/baseline/`; it does not keep source snapshots in the repository. It serves only on localhost. Do not run builds or another game renderer during a measurement.

Open these pages in the same browser, one at a time, click **Run benchmark**, and keep the tab visible until completion:

- `http://127.0.0.1:4350/?variant=baseline&height=1080`
- `http://127.0.0.1:4350/?variant=optimized&height=1080`

Omit `height` for 1280×720. Use repeated, alternating runs rather than quoting the fastest result. Both variants use the current pinned original asset pack; the optimized one loads the build's lossless derivatives and caches static world transforms. If changing authored geometry, use a separate comparison with matched art sources.

The harness uses the game's actual station materials, lighting, reflection captures, shadow settings, escalators, robot rig, contact shadow and camera collision. It holds the drawing buffer and DPR fixed, with no adaptive resolution. Four camera routes run for two warmup seconds and four measured seconds each. It records requestAnimationFrame intervals, update/render CPU cost, draw calls, triangle counts, resource sizes and fixed-view RGBA captures under `.local/benchmark/`. This measures rendering; it does not measure network gameplay or every UI effect. Local startup includes shader compilation and server compression, so it is not a representative internet-load timing.

GPU timer queries are **off** by default: they severely perturbed frame pacing on the test machine. `&gpu` is available for separate diagnostic runs; do not mix those FPS results with ordinary runs.

Open `http://127.0.0.1:4350/bench/textures.html` to compare every embedded texture after actual Chrome ImageBitmap decoding, using the same decoding options as Three.js. The full asset test independently decodes geometry using Three's bundled meshopt decoder and compares every ordered triangle's attributes, materials, node transforms and bind poses.

See [RESULTS.md](RESULTS.md) and [results.json](results.json) for the measured result and its limits.

## Coplanar edge regression

Run `npm run benchmark:render -- 4350 HEAD` and open
`http://127.0.0.1:4350/bench/edge-stability.html`. The wall and floor presets
reproduce the ticket-hall cladding seam and 0.1 mm tactile base respectively.
Toggle **Stable depth layers** to compare the actual material fix at the same
camera position; **Small camera sweep** checks the moving, fully lit surfaces.

**Measure 21 angles** uses a diagnostic mask to isolate the target on the current station mesh.
At each angle it compares the fully lit target against a reference with only the
competing backing omitted. No geometry is displaced. It reports pixels where
the backing changes a target pixel by more than 12/255 in any RGB channel; per-angle counts are in the report
element's `data-results`. The skyway preset is for visual inspection only.

Chrome on macOS, 1470 × 786 drawing buffer, September 13, 2026: wall failures
ranged from 0 to 19,983 pixels before the fix and were zero at all 21 angles
afterwards. Floor failures ranged from 0 to 41 and were also zero afterwards.
These are depth-coverage checks, not an image-quality or whole-station FPS claim.
The fully lit floor comparison additionally shows the distant strip base staying
continuous instead of breaking up between its physical raised ribs.

## Reset and delayed physics

Run an isolated game with `npm run dev -- 4386` and the local instrumentation
proxy with `node web/benchmarks/gameplay-server.mjs 4388 4386 current`. Open
`http://127.0.0.1:4388`, enter a name, then click **Check abandoned throw messages**.
It captures a real throw, recalls it, starts another charge, and delivers the
old state, session, resume and trajectory directly to the game's message handler.
The new charge and camera must stay unchanged; releasing the new throw must
still enable ball following. Results are saved in `.local/gameplay-benchmark/`.

`npm test` also exercises the local throw lifecycle without timing: holding and
charging reject flight, reset revokes the attempt and reconnect permission,
and both release-before-acknowledgement and explicit reconnect remain valid.
The renderer checks this ownership independently of its buffered physics phase.
Interpolation is cleared on reset and never spans different attempt IDs.

## Gameplay and music stability

See [STABILITY.md](STABILITY.md) for the September 26 investigation, measured
results, and commands for `stability.mjs` and `audio-stability.mjs`. The gameplay
runner records normal frame pacing, optional CPU profiles and Chrome traces;
the audio runner compares beat timing under controlled JavaScript stalls.

## Full-source optimization comparisons

`stability.mjs` now serves a complete, immutable browser-source variant through
an ephemeral loopback proxy to the isolated native service. `KYOTO_BENCH_REF`
selects a Git revision; omitting it snapshots the working browser files,
including new unignored modules. The source receipt records each file hash,
dependencies and pinned assets. Dependency/asset-manifest mismatches are rejected.
The proxy forwards local WebSocket traffic to the selected local backend.

With the local service on port 4391, capture real native motion once:

```sh
KYOTO_BENCH_REF=14091f0 KYOTO_BENCH_CAPTURE=1 node web/benchmarks/stability.mjs native-fixture
```

The ignored fixture records native snapshots and rendered camera poses for aim,
walking, orbiting, flight and fast-forward. It contains no guest credential.
Capture timings include instrumentation and are not acceptance measurements.

Compare both complete source sets using those same poses:

```sh
KYOTO_BENCH_REF=14091f0 KYOTO_BENCH_FIXTURE=.local/stability/native-fixture.json node web/benchmarks/stability.mjs pair-1-baseline --views
KYOTO_BENCH_FIXTURE=.local/stability/native-fixture.json node web/benchmarks/stability.mjs pair-1-candidate --views
```

Run five pairs, reversing the order between pairs. Each scenario warms up for
10 seconds and measures for 30 seconds. The short captured paths repeat; loop
boundaries reset presentation effects in both variants. This isolates browser
rendering and UI cost and is supplemented by live native gameplay below. The
fixture runner deliberately disconnects its live session; its zero buffer counts
must not be used as evidence of live transport or authoritative physics health.

`--views` adds hall, escalator, garden and concourse views and saves 3D canvas
captures. `KYOTO_BENCH_STAGE_MS` and `KYOTO_BENCH_WARMUP_MS` support shorter
exploratory runs; retain the default durations for acceptance. `--profile` and
`--trace` are attribution runs, separate from ordinary pacing measurements.
`KYOTO_BENCH_DOM=1` counts DOM mutations and is also diagnostic only.

A live soak uses real input, native throws, recalls, saved-shot replays, seeking
and speed changes, with bounded one-minute sample windows:

```sh
KYOTO_BENCH_REF=14091f0 KYOTO_BENCH_SOAK_MINUTES=20 node web/benchmarks/stability.mjs soak-baseline
KYOTO_BENCH_SOAK_MINUTES=20 node web/benchmarks/stability.mjs soak-candidate
```

Inspect action counters to confirm that the intended interactions occurred.
All outputs remain under ignored `.local/stability/`; publish compact summaries
and source/fixture hashes with the result report. See the
[optimization plan](../../docs/PERFORMANCE-OPTIMIZATION-PLAN.md) for targets and
required correctness checks.

`--stall-trace` uses a 32 MiB rolling Chrome trace and stops a live soak after
its first measured frame gap over 100 ms. Use at most two runs with
`KYOTO_BENCH_SOAK_MINUTES=10` for this investigation. Traced results are
attribution evidence, not acceptance pacing measurements. Garbage collection
and retained-heap/listener snapshots occur outside the timed soak windows.

```sh
# Actual station query equivalence, day/evening pixels and live browser controls.
node web/benchmarks/optimization-checks.mjs

# Repeat the portable escalator assertions against the installed station assets.
node web/tests/escalator-visibility.mjs --station

# Native riding, camera turns and course changes; then isolated CPU update cost.
node web/benchmarks/escalator-check.mjs

# Preserve the shipped audio scheduling regression with the current baseline.
node web/benchmarks/audio-stability.mjs 14091f0

# Rebuild the compact receipt after the named runs in the result report exist.
node web/benchmarks/summarize-optimization.mjs
```

The escalator check finishes with a CPU-only comparison inside Chrome, with
rendering stopped. It measures pose calculation and buffer dirty marks, not GPU
upload time or whole-game FPS.

The visual check also exercises a 1470 × 786 Retina-size viewport with ordinary
adaptive resolution, reduced motion, a 390 × 844 mobile-size layout and the
optional debug panel. These checks do not claim performance on a physical phone.
For the secondary CPU check, run the same fixture commands with
`KYOTO_BENCH_CPU=4` and labels `stress-baseline` / `stress-candidate`, without
`--views`. For DOM diagnostics, use `KYOTO_BENCH_DOM=1` and
`KYOTO_BENCH_STAGE_MS=10000` with labels `dom-baseline` / `dom-candidate`.
Keep the default 10-second warmup. These instrumented runs do not replace the
five ordinary comparison pairs.

The summary verifies identical browser sources, harnesses and fixture hashes
across all five pairs and retains every measured run. See
[OPTIMIZATION-RESULTS.md](OPTIMIZATION-RESULTS.md) for the outcome and limits.
