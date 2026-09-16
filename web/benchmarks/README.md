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
