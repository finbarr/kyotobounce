# Folded courtyard facade installed in the station

27 September 2026. [Actual-game comparisons](court-folded-integration/index.html). Current local native candidate: `station-court-folded-01`; browser: `court-folded-browser-01`. The broad reconstruction goal remains active.

## Result

The folded reflective lower facade, rounded dark return, pale upper cladding, plinth and coping now share the same geometry in Blender, the native station and browser export. The [construction study](COURT-FOLDED-FRONTAGE.md) records the 2019/2025 source photographs, source anchors and inferred panel dimensions. The new component stays within the bounded courtyard scope. The library remains 212 entries and 197 downloaded source files.

The initial actual-game capture exposed the central hall reflected in courtyard mirrors. A new 512-pixel cubemap captures the courtyard once at renderer (110,32,1). It is assigned only to the four new reflective material families and preserves their authored palette/roughness. The old three interior probes and north exterior probe remain. The capture excludes balls, targets, avatars and mutable practical lights. This is a static cubemap approximation; it has no exact mirror parallax or dynamic reflections. The current dark reflection and unfinished surrounding architecture still fall short of the photo target.

The new probe adds 24 MiB of calculated PMREM render-target storage. Exported image texture dimensions and pixels remain unchanged. The cubemap is generated locally, adds no download, and does not update per frame. Capture receipts verify the count stays at five across the measured views; the parent stays at four. Disposal releases the targets and clears the new material references.

## Geometry and runtime evidence

- Independent scope check retains all 34,334 other native panels, other records and old material definitions. One municipal panel loses exactly 36 triangles / 195.375091 m²; all 611 nonpatch triangles in that record remain. All 18 planar coverage checks have zero outside/remaining error. Six new material definitions and 465 panels are installed.
- All 90,669 checked retained component vertices pass material, UV and normal validation. Maximum normal angle is 0.034292 degrees; maximum interpolated point distance is 9.501 micrometres. Acceptance thresholds unchanged.
- All 243 new cladding, glass and plinth front probes pass against the full native/browser scene; maximum difference 0.01233 mm. Backing/coping/decorative trim have the preceding component evidence.
- All 28 courtyard walks pass, with 233 sampled points / 466 rays, no obstructions, mismatches or spawn failures, and two independently verified shared-edge hits. Minimum sampled covered clearance is 2.72 m.
- All twelve scripts in `npm run test:runtime` pass against the isolated matching layout/catalog/database. This suite covers selected campaign routes and the finale, not every one of the 31 authored shots. The earlier Skyway Trapdoor authored-shot failure remains open.
- `npm run build:web`, new tool syntax and `git diff --check` pass. No C# or service changes; no worker rebuild.

## Asset and frame costs

Full raw GLB: 264,611,440 bytes; optimized: 115,875,132 bytes. Relative to adjacent03: +180,504 bytes, +5,709 triangles and +6 batches. The complete export has 2,025,653 triangles and 1,894 batches; visible draw calls are much lower. All 298 exported image names, dimensions and pixel hashes are unchanged. The 875.542 MiB decoded RGBA/mipmap figure is an image-dimension estimate, not measured GPU allocation; add the separate reflection target estimate above.

Eight fresh Chrome runs, parent–candidate–candidate–parent for each registered view, five seconds warmup and twenty seconds measurement. JR uses 1224×816 and Rurubu 1200×800, with identical browser source/settings. These are fixed-camera diagnostics; the 1280×720 full-game gate and twenty-minute music/context soak remain open.

| View | Run | Frame p95 / p99 (ms) | GPU p95 (ms) | Draw calls |
|---|---|---:|---:|---:|
| jr | parent 1 | 18.50 / 18.80 | 5.654 | 68 |
| jr | candidate 1 | 18.50 / 18.80 | 5.696 | 74 |
| jr | candidate 2 | 18.50 / 18.80 | 5.656 | 74 |
| jr | parent 2 | 18.50 / 18.80 | 5.647 | 68 |
| rurubu | parent 1 | 18.40 / 18.70 | 4.415 | 51 |
| rurubu | candidate 1 | 18.60 / 18.90 | 4.406 | 56 |
| rurubu | candidate 2 | 18.50 / 18.80 | 4.406 | 56 |
| rurubu | parent 2 | 18.40 / 18.70 | 4.391 | 51 |

See [paired summary](court-folded-integration/summary.json) for per-pair changes and all errors/warnings, hidden frames and GPU-query status. Do not interpret these short view checks as full gameplay acceptance.

## Artifact identities

- Layout: `d8919dd015757175069c7243611e37d913f03c2392524c5ebf14fa85cbcc9037`.
- Blender: `6ac3d40759226e961d581fcabcb3fad6941e6ca42ff335c2f318d433eea3a6ba`.
- Raw GLB: `1f647c7a48610ebf1280da1b66baf6e291fc8155d8d116e9829e58741a92a99d`.
- Runtime GLB: `fccb3234b317346eff5ab76c879cd7ef9c6c1652a83eab4f76a88514a5b65425`.

Full receipts are linked in the gallery. These remain local research outputs; no commit, push or deployment.

## Next work

Complete the courtyard terrace/paving, planting, furniture and cafe connections from current references. Refine the glass, cladding and daylight against the registered photographs. The central-hall representative bay, thirteen remaining registrations, remaining public routes, overall Skyway integration, both plazas/street frontages, evening views, complete course proof and final performance/soak gates remain open.

Gallery checks pass at 1440/390 pixels: six images, twenty-four local links, a working comparison control, no overflow or page errors. Both layouts were inspected. This pass’s private services on ports4500/4501 were stopped after verification.
