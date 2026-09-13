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
