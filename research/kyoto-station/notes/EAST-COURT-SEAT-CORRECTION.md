# East Square: foreground seat correction

27 September 2026. [Matched before/after and photograph overlay](east-court-seat-correction/index.html).

## What changed

The foreground seat now appears in the photographed position and scale. It replaces two arbitrary component placements with one seat supported by the registered reference. Five closed parts provide the recessed support, projecting base, main seat, left-hand step and smaller backrest. The source camera and surrounding municipal geometry remain fixed.

The earlier uniform bench shape could not explain the photographed tiers. A separate fit of seven visible backrest corners gives a 2.20 × 0.708 m backrest, 0.797 m above the assumed terrace plane, with 3.23 original-image pixels RMS error. The visible platform/base outlines are back-projected at assumed elevations. These outline picks are construction inputs, not independent validation.

The apparent precision of generated coordinates is not a survey claim. The garden is still provisionally Y31.093377 m; the main seat top is assumed 0.44 m above it, base 0.17 m, recessed support 0.08 m and left step 0.62 m. Hidden backing is inferred to support the upper parts. Additional registered photographs must verify the reverse side, depths and remaining benches. The primary reference is [JR Central’s September 2025 NIWA article](https://souda-kyoto.jp/blog/01367.html); its exact capture date is unknown.

The five parts contain 420 triangles with 6 mm bevels. The previous original granite maps, UV scale and material are reused exactly. Three 512 × 512 maps retain the same hashes and estimated 4 MiB decoded allocation. No reference pixels enter game textures.

## Geometry and native verification

- All 420 seat probes agree between emitted browser geometry and the native physics worker; maximum point difference 0.000026173 m. All five meshes have closed oriented edges and positive volume; minimum closed volume 0.073061 m³.
- All seat vertices remain above and within the provisional garden footprint. All 113 parent courtyard/escalator panels, moving lanes and comb supports are unchanged.
- The photographed placement intersects the previous straight u35 walking test. Its failed clearance report is retained. Those old passing walks were not reused as proof of this new arrangement.
- The u35 route retains the same stair start and garden destination, using the open north and west sides of the bench. Six other route definitions stay unchanged. All 14 fresh normal-speed native walks pass, including both directions around the new bench.
- All 248 browser/native route rays agree, with two explicitly recorded coincident-edge ties and no route obstructions. No covered-headroom minimum is claimed because these test paths have no overhead hit in the isolated assembly.
- Composed serialization verifies 80,070 vertices and all 53,336 triangle indices/winding, maximum coordinate error 0.000004256 m. All 1,260 seat UV vertices, embedded image bytes and material bindings survive composition.
- An independent rebuild reproduces the new GLB/native bytes. The builder’s original default still reproduces the earlier seat01 GLB/native bytes. Browser asset validation, modified-tool syntax and diff checks pass.

Gallery QA passes in Chrome at 1440 and 390 px: comparison controls, four images and eleven local evidence links, with no overflow or page errors. Desktop rendering was visually inspected.

## Cost and limits

The furnished03 eastern assembly contains 118 panels, 53,336 triangles and eight materials in a 3,440,452-byte GLB. Compared with furnished01, it adds 220 triangles and 23,768 GLB bytes while reusing the texture set. This is an asset-cost comparison, not a full-game performance measurement.

The matched Chrome source-context captures use identical camera, viewport and exposure. The new assembly remains separate from the full station. The old East Square slab, incomplete NIWA frontage, surfaces, lighting and contact shadows still prevent final visual acceptance. No C# or service changes, full-station runtime result, commit, push or deployment are claimed.

## Next

Use further terrace views to validate the inferred bench depths and locate the other seats. Reconstruct the timber NIWA frontage and its raised entrance, then complete the remaining public level connections. Resolve the retained slab during coordinated installation. Keep the full station, both plazas, surrounding frontages and final Chrome/runtime gates in scope.
