# Courtyard return and service walls: installed candidate

27 September 2026. Local adjacent-wall component04 / full station02 / browser03. Geometry and runtime verification pass; final visual and full-game performance acceptance remain open. [Open the actual-game comparison gallery](court-adjacent-integration/index.html).

## What changed

Seven bounded surfaces now replace the blurred municipal wall textures: the perpendicular hotel return, foreground tiled tower, front and side of the vent enclosure, two dark service walls and the upper glass return. The component adds four observed recessed windows, eight inferred vent slots, panel joints and small fasteners. It uses the fixed JR Central and Rurubu cameras from the existing registration study. No new photographic sources were downloaded in this integration.

The [construction study](COURT-ADJACENT-WALLS.md) records the source faces and uncertainty. Four window centres support the return-wall placement; dimensions, hidden rows, panel spacing, vent internals, tile scale and material response remain estimates. Municipal model planarity is not survey accuracy. The research library remains 208 entries / 193 downloaded source files.

## Native installation and preservation

`install-court-adjacent.py` starts from immutable hotel-court03. It clips the seven patch boundaries in two municipal source records, keeps 33,323 other panels and all other native records unchanged, and adds 1,010 panels: 714 colliding and 296 decorative. Six material definitions are reused; only three new service materials are added.

The independent Shapely scope check passes. Maximum outside-coverage difference is 0.000021607 m² per source record and patch, below the unchanged 0.001 m² limit; maximum remaining coverage inside a removed patch is 0.000018371 m². Component positions differ by at most 7.831 micrometres after Float32 storage.

The first installation revealed three tiny clipping fragments. One collapsed after Float32 storage and is now rejected by testing area at the stored coordinates. Two valid fragments remain, with areas 6.567e-9 and 4.932e-9 m². The scope verifier explicitly proves that each lies on an eligible original source face near a cut boundary. Every unaffected original triangle remains. These numerical boundary exceptions are recorded, rather than described as exact preservation.

## Export correction

The six reused materials contain vertices from both the older hotel facade and the new adjoining walls. Material verification now combines both original components and requires identical effective material definitions for shared names. This avoids treating the older facade as unexplained new geometry.

That combined check exposed eleven genuine attribute errors: eight UV values on small clipped caps and three quantized normals. The exporter now has an explicit material-prefix option. It evaluates attributes at the actual stored cut positions and restores the authored corner normals/UVs after Blender export. A byte-level check allows only those selected attribute bytes to change; position, topology, materials and other groups stay unchanged. Ordinary exports keep their existing behavior when no prefix is supplied.

The unchanged independent verifier now passes all twelve named materials and 73,434 vertex occurrences: maximum UV error 0.000001916, normal angle 0.034292 degrees and source-surface distance 9.501 micrometres. Limits remain 0.05 degrees and 10 micrometres; UV tolerances are unchanged. Three focused regression tests cover stored-position interpolation, byte-scope preservation and rejection of unexplained changes.

## Runtime verification

All 43 installed-front probes pass: four recessed windows, eight vent recesses and 31 opaque panels across six patches. Maximum browser/native position difference is 0.012279 mm. Vent samples pass above the decorative vanes. Two glass bands with noncolliding face detail are outside this installed-front test; the earlier component audit covers their physical backing. The probe initially needed a harness correction because generated window panels are not listed as construction-spec parts; no candidate geometry changed.

All 28 normal-speed courtyard walks pass, covering 233 points / 466 rays with zero obstructions, mismatches or failed spawns. Two documented shared-ramp edges remain; minimum covered clearance is 2.72 m. All twelve runtime scripts pass across the initial run and resumed tail. The first five scripts and three HTTP campaign routes passed before the standalone finale check stopped because the test process lacked `KYOTO_WORKER_EXECUTABLE`. The resumed seven scripts used the explicit compatible executable, candidate layout and private data path. They include the exact-input eight-waypoint finale, replay sharing, fast-forward, level design and 64 rapid-recall throws. Both logs are retained; this was not one uninterrupted green suite. The private catalog changes only its layout reference and keeps all 31 course identities and routes. The selected runtime suite does not prove every course; the earlier Skyway Trapdoor failure remains open.

## Asset cost

| Full scene | Parent hotel03 | Adjacent browser03 | Change |
|---|---:|---:|---:|
| Triangles | 2,007,202 | 2,019,944 | +12,742 |
| Material batches | 1,885 | 1,888 | +3 |
| Materials | 471 | 474 | +3 |
| Images | 298 | 298 | 0 |
| Optimized bytes | 115,308,888 | 115,694,628 | +385,740 |
| Estimated decoded RGBA + mipmaps | 875.542 MiB | 875.542 MiB | 0 |

The image estimate is not measured GPU allocation. No new real-time lights were added. All 298 image names, dimensions and decoded pixel hashes match the parent exactly. Full 720p gameplay and the twenty-minute music/context soak remain separate gates.

## Paired Chrome inspection

Two parent/candidate pairs ran per registered camera in parent–candidate–candidate–parent order, after all runtime work finished. Each run used five seconds of warmup and twenty seconds of measurement, with its own fresh Chrome process and the matching native service. Browser source receipts and power settings are identical across all eight captures: Chrome 153.0.8010.53, Apple M2 / Metal, AC power, low-power mode off. Existing unrelated local services were left running throughout.

| Camera | Drawing buffer | Parent frame p95 / p99 | New frame p95 / p99 | Parent GPU p95 | New GPU p95 | Calls, old → new |
|---|---|---|---|---|---|---|
| JR | 1224 × 816 | 18.4–18.5 / 18.7–18.8 ms | 18.4–18.5 / 18.7–18.8 ms | 5.420–5.424 ms | 5.647–5.663 ms | 65 → 68 |
| Rurubu | 1200 × 800 | 18.5–18.6 / 18.8–18.9 ms | 18.5–18.6 / 18.9 ms | 4.191–4.208 ms | 4.446–4.458 ms | 48 → 51 |

Paired frame-p95 changes are +0.54%, −0.54%, 0% and 0%. These runs show no frame-p95 regression above 5%. GPU p95 increases by 0.227–0.267 ms: roughly 4.2–4.4% in JR and 5.7–6.4% in Rurubu. The detail therefore has a measurable rendering cost despite stable frame pacing in these views. Across all eight measured windows, the longest frame is 19.5 ms. There are no browser errors/warnings, hidden frames, GPU disjoints/dropped queries or skipped music steps. These fixed-view observations do not establish the full gameplay or soak gates.

Both new game images, the photographic references and the gallery screenshots were visually inspected. The return windows, vent openings and wall joints are now legible instead of blurred source imagery. Glass remains too uniformly dark, the tile grid is too prominent on the foreground tower, and the broad ground/facade areas and cafe setting are incomplete. No final shape/surface/light/completeness view is accepted.

The gallery passes at 1440 and 390 px: four images, twenty local links, working before/after selection, no overflow or page errors. `npm run build:web`, changed-tool syntax, export regression tests and diff checks pass. All temporary capture, gallery, native-probe and candidate-server processes from this integration are stopped. Pre-existing local services remain untouched.

## Exact candidate

- Full native/Blender directory: `station-court-adjacent-02`; layout SHA `1a404a092ad65a31e54a185227e8db3f7a888912fe6aaa417f5ae5561a6ad536`; Blender SHA `457f82e3672b1bd2e5f22104cd3b03357411e68dfba3a460eaab493e2b57a2ad`.
- Browser directory: `court-adjacent-browser-03`; raw SHA `92c1d1500d41f869a826e23cfd520635d5e2a7bee4452aaefb9f03d34c23caf7`; optimized SHA `4d3e6701a040c593fd98d50c8f2bbe4ce10153254876878927dee87ff9772efb`.
- Component04 native SHA `ac02bdd7717e5b1e46bebe461ec104387ff954b9ffb4e113054261cd6425e378`; GLB SHA `1d4681811056bb0cb7f6f37ba1f5fe49720cda1f1ddabc89af7b782f7cc54c74`.

All generated binaries remain under the isolated worktree's `.local/station-realism/`. No C#, authoritative service or scoring change, commit, push or deployment is part of this integration.

## Remaining work

Glass and daylight response need further reference-led work. The lower-right frontage, cafe interface, terrace shape, plants, furniture and paving remain incomplete. Thirteen camera registrations, the representative hall bay, both plazas and street frontages, public-route work, evening appearance, full campaign proof and final performance gates remain open. This is a bounded construction checkpoint in the active long-term goal.
