# Measured lossless optimization

Measured September 12, 2026 (local time), against `433bc597401637d43ec28ab3bd445f14effa724f`, using the verified `assets-v5` pack. Raw results and output hashes are in [results.json](results.json); reproduction steps are in [README.md](README.md).

## Download and storage

Sizes below are decimal MB. Network sizes use Brotli quality 6, matching the release packager, and include the three GLBs and two station metadata files.

| Metric | Original | Optimized | Change |
|---|---:|---:|---:|
| Main asset transfer | 49.426 MB | 38.440 MB | **22.2% smaller** |
| Three GLBs before HTTP compression | 185.390 MB | 67.253 MB | **63.7% smaller** |
| Stored vertices across those GLBs | 4,578,126 | 3,027,593 | **33.9% fewer duplicate records** |
| Triangles | 1,563,905 | 1,563,905 | Identical |
| Mesh primitives / draw batches | 802 | 802 | Identical |

The newly imported meshopt decoder adds 29,256 raw bytes (7,812 with gzip); this does not materially change the 22.2% asset saving. These figures are the asset payload, not the entire page including its unchanged JavaScript. The final release package also includes a small optimization receipt.

The pipeline indexes identical complete vertex tuples, preserving seams and original triangle order, then uses meshopt with **no quantization or attribute filters**. PNG textures use **lossless WebP at original dimensions** when smaller. Profiled images, other depths and formats outside the verified path are copied verbatim. Source GLBs and Blender files remain the authoring authority. See the [meshoptimizer codec documentation](https://github.com/zeux/meshoptimizer/blob/master/js/README.md) for the lossless codec API.

## Frame-rate measurements

Chrome 150, Apple M2 / ANGLE Metal, 1920×1080 drawing buffer, DPR 1, antialiasing and all existing lighting/shadow/reflection settings. Three runs per variant, four routes per run, GPU timer queries disabled. Automatic resolution reduction was disabled in both variants.

| View | Original FPS, runs 1 / 2 / 3 | Optimized FPS, runs 1 / 2 / 3 |
|---|---:|---:|
| Central hall | 48.6 / 33.9 / 23.9 | 49.8 / 39.8 / 55.7 |
| West escalators | 34.2 / 46.3 / 55.3 | 52.1 / 42.6 / 19.8 |
| Sky garden | 18.6 / 33.6 / 36.5 | 41.3 / 35.5 / 40.1 |
| East concourse | 26.9 / 46.4 / 59.5 | 60.0 / 39.6 / 49.3 |

The equally weighted average was **38.6 → 43.8 FPS**. However, the desktop had other active workloads, and run-to-run variation was large, including reversals in individual comparisons. This is promising, but **does not establish a dependable percentage FPS improvement**. The raw CPU timing likewise varies too much to isolate the benefit. The download savings and removed duplicate vertex storage are exact, independently verified wins. Repeated tests on an otherwise idle machine are needed for a strong frame-rate claim.

Static architecture now caches its world transforms after scene attachment and reflection setup. Moving escalators, robot bones, cameras and lights retain their updates. No resolution, polygon detail, texture resolution, lighting, shadow settings, effects or physics quality was reduced.

An experimental spatial split increased draw calls and made rendering slower; it was removed before this result. Runs using intrusive GPU timer queries were also excluded. Only the final uninstrumented frame-pacing runs are included in `results.json`.

## Quality and runtime checks

- Independently decoded and compared all **1,563,905 triangles**, including positions, normals, UVs, material assignments, order, node transforms and skeleton bind poses. Exact equality passed.
- Chrome decoded all eight textures at the same dimensions, including both 4096² textures: **zero changed RGBA channels**.
- Fixed-view image comparisons and visual inspection passed. Final framebuffers are **not pixel-identical**: mean absolute RGBA differences were 0.0049–0.0289 on a 0–255 channel scale, concentrated at fine edges and reflections. The underlying texture pixels and ordered triangle attributes are exact; these render differences are not a texture/geometry quality reduction.
- Full game loaded all optimized GLBs through its normal loader with no browser console errors. Course selection, replay playback and orbit were checked visually. A native local Snack Run shot scored 184,727; its interactive replay completed with both waypoints and the destination bonus.
- `npm run typecheck`, `npm test`, `npm run build:web`, `npm run assets:verify`, and the full asset comparison passed. The release packager was checked for matching browser asset hashes and absence of duplicate original GLBs.
- Native physics and the canonical collision layout are unchanged. No production test records were created.
