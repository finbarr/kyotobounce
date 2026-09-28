# Courtyard paving in the game

27 September 2026. [Actual-game comparisons](court-paving-integration/index.html). Local native candidate: `station-court-paving-02`; browser: `court-paving-browser-02`.

## What changed

The plain courtyard floor now distinguishes pale slabs around the sculpted seat from dark square paving beneath the dining area. The NIWA walkway remains pale. Both finishes have original color, roughness and normal maps with metre-scaled UVs. No photo pixels are used as textures.

The [JR Central photograph](https://souda-kyoto.jp/blog/01367.html), published 8 September 2025, supplies two visible boundary picks at (619,443) and (810,474) in its 816×544 image. Back-projection uses the existing registered camera and garden height of 30.807027 m. A two-pixel pick perturbation moves the line locally by up to 0.06332 m; this excludes the additional camera and floor-height uncertainty. Extending this short visible line to hidden edges is an inference. The [Rurubu / Ryota Fujii photograph](https://rurubu.jp/andmore/article/23413), published 8 June 2025, supports the pale cafe walkway and grey entrance stairs. Capture dates remain unknown.

The first candidate made the pale aisle too narrow. Six visible pale points from the Rurubu image now constrain its minimum width; the inferred hidden edge is u=40.3 in the court frame. All six points fall on the pale material in the final export. This correction remains an estimate, not a surveyed boundary.

The 1.2 m pale and 0.6 m dark tile modules, UV phase, joint widths and colors are art estimates. They are not measured construction dimensions. The six 512px maps contain original seeded tile variation, mineral grain and subtle mottling; they contain no baked shadows. Historical garden furniture and paving motifs were not introduced.

## Geometry and verification

All 34,800 native panels, physical materials, collision flags, escalators, routes and scoring-related records remain exact. The change adds two visual material definitions. The top faces of two Blender floor meshes receive the finishes; splitting the raised-garden finish boundaries adds eight source triangles without moving the occupied floor volume.

Independent export checks retain 1,892 unrelated batches' render attributes and all old-material faces outside the selected top patch. Three untextured canopy batches have harmless unused-UV storage differences from Blender resaving; their positions, normals and indices remain exact. Unused UVs are excluded only when the material has no texture input.

The independent receipt records the visible paving coverage and Float32 differences, each below the existing 0.001 m² added/removed/overlap limit. Metric UVs match within 0.00001. Export normals meet the existing 0.05-degree rule. This is an equivalence check, not a claim of survey accuracy.

The initial paving candidate passed all 28 courtyard walks, with 233 points / 466 rays, no obstruction or mismatch, and the same two verified ramp-edge hits. The final aisle correction preserves every native physics record and passes the independent visible-floor coverage check, so that walking evidence is retained rather than rerun. Browser asset build, new tool syntax and whitespace checks pass. The previous candidate's twelve-script runtime result remains relevant because physics and service code are unchanged; the full suite was not rerun for this surface-only edit.

## Cost and Chrome checks

The optimized asset adds 501,368 bytes, two batches and 19 exported triangles after coplanar processing. Six new 512px images add 8 MiB of calculated RGBA8-plus-mip storage. All 298 pre-existing image names, dimensions and pixels remain exact. This is an allocation estimate, not measured GPU memory. No lights, shadow updates or reflection captures were added.

Eight accepted fresh Chrome sessions use five seconds warmup and twenty seconds measurement with identical browser source/settings. JR uses parent–candidate–candidate–parent on AC power. Rurubu uses candidate–parent–parent–candidate on battery power. One initial Rurubu parent run switched from AC to battery during measurement; that pair was discarded and replaced with fresh battery runs. Every accepted run and pair has a consistent power source. Both candidates retain five static reflection captures.

| View | Run | Frame p95 / p99 (ms) | GPU p95 (ms) | Calls |
|---|---|---:|---:|---:|
| jr | parent 1 | 18.50 / 18.90 | 5.688 | 74 |
| jr | candidate 1 | 18.50 / 18.80 | 5.957 | 76 |
| jr | candidate 2 | 18.50 / 18.90 | 5.974 | 76 |
| jr | parent 2 | 18.40 / 18.80 | 5.680 | 74 |
| rurubu | candidate 2 | 17.60 / 17.90 | 4.509 | 58 |
| rurubu | parent 2 | 17.60 / 17.90 | 4.417 | 56 |
| rurubu | parent 1 | 17.70 / 18.00 | 5.939 | 56 |
| rurubu | candidate 1 | 17.60 / 17.80 | 4.542 | 58 |

Battery GPU timings vary substantially between the Rurubu baseline runs; do not interpret the negative paired GPU delta as a speedup. The AC-powered JR pairs show an added GPU p95 cost of 0.269–0.294 ms.

Maximum observed frame: 19.20 ms. Errors: 0; warnings: 0; hidden frames: 0; GPU disjoints: 0; skipped music steps: 0. Music remains running and unmuted. These fixed-camera checks do not replace the 1280×720 representative gameplay gate or twenty-minute audio/context soak.

## Artifact identities

- Layout: `7bd8ddef8657e327c99c8375578c32133035944a8c64454bb59511a38b4c51d9`.
- Raw GLB: `e5ffedfebf2866d79dbd22cc48e5de91da02272d5c891356b4e615a9455c7206`.
- Runtime GLB: `01d7b1c785aa19d84786b983de89fc536e10af831086011823f50f10ef37255c`.

## Visual limits and next work

The floor division and joints make the courtyard more legible, but this view does not yet pass the full visual rubric. The sculpted terrace still has a provisional uniform stair core; plants, outdoor tables, chairs and umbrellas are missing. Timber, glass and daylight need further comparison. Tile dimensions and hidden boundary continuation remain estimates.

Next, reconstruct the photographed terrace silhouette and its connection to the cafe, then add the current planting and furniture as a coherent courtyard pass. The wider goal still includes the central-hall representative bay, thirteen other registrations, both plazas and immediate street frontages, public-route completion, evening views, all-course proof and final performance/soak acceptance. No commit, push or deployment.

Gallery QA passes at 1440 and 390 pixels: four images, nineteen local links, a working before/after selector and no page errors or horizontal overflow. Both layouts were inspected. The private test services on ports 4500 and 4501 were stopped after verification.
