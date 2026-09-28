# Courtyard hotel facade: registration and construction

27 September 2026. Local component06 and visual preview05. [Open comparisons](hotel-court-facade/index.html).

The subsequent [full-station integration](HOTEL-COURT-INTEGRATION.md) supersedes this visual-only preview. The study below preserves its original evidence and limits.

## Result and scope

The hotel wall above NIWA now has an isolated architectural replacement: 39 recessed windows, narrow frames and sills, ceramic cladding with fine joints, and an upper glass band. Two registered viewpoints show the component in the complete browser scene. This is a visual-only preview. The authoritative full-station candidate remains context05; its native layout and Blender file were not changed.

The references are the existing [JR Central photograph](https://souda-kyoto.jp/blog/01367.html), published September 2025, and [Rurubu / Ryota Fujii photograph](https://rurubu.jp/andmore/article/23413), published June 2025. Capture dates are unknown. The source wall comes from the previously registered Kyoto City municipal mesh. No new source downloads or catalogue entries were added; counts remain 208 entries / 193 downloaded source files.

## Registration

Both joint01 cameras remain fixed. The facade plane is `z = -0.016326607055705978 x + 19.624434637802853` in renderer metres. It derives from municipal wall vertices. Eight original source faces supply the patch boundary. The bounded region is x112.95–165.88, y36.32–58.94, intersected with their actual polygons. Departures of the municipal surface from the chosen plane are bounded by 65 mm; these are not survey dimensions.

The fitted centres distinguish two observed window groups:

| Group | Fitted observations | Withheld observations | Fit RMS | Withheld RMS | Worst withheld |
|---|---:|---:|---:|---:|---:|
| Narrow | 12 | 23 | 2.776 px | 2.881 px | 5.445 px |
| Wide | 4 | 12 | 1.425 px | 2.188 px | 4.125 px |

All pixels are original photograph pixels: JR816×544 and Rurubu1200×800. The two image scales differ; these are not a pooled metric accuracy estimate. Window widths/heights, 140 mm recess, 100 mm ceramic tiles, 4 mm large panel joints and glass grid spacing are photographic estimates. Hidden lower rows extrapolate the observed spacing. Centre checks do not validate those dimensions or satisfy the final appearance rubric.

`fit-hotel-court-facade.py` writes the explicit fit and observations. `prepare-hotel-court-facade.py` intersects the actual boundary with openings and panel regions. Redundant collinear points simplify by at most 10 nanometres. Early whole-wall triangulation with 39 holes failed the closed-mesh check; partitioning backing by panel cells resolved it. No mesh-check tolerance was relaxed.

## Geometry and materials

Component06 contains 796 closed panels / 11,496 triangles / 34,488 emitted vertices / nine material batches. Of these, 240 small glass/transom panels are decorative; 556 panels contribute to collision. The physical material labels are explicitly `facade` or `glass`.

Four original deterministic 512² maps supply ceramic color variants, normal and roughness. Their decoded RGBA+mip estimate is 5.333 MiB. Photographs supplied architectural observations, not texture pixels. A first preview's arbitrary checkerboard cladding was rejected; the final finish is largely uniform with a localized warm band. Upper-glass color variation was reduced at the same time. Believable reflected surroundings and final cladding tones still require the actual game lighting pass.

Final component size is 1,335,600 bytes. GLB SHA `1831dc3c796aa618e17a4646e7e9482f72f2e779aaa8b86086e998747e56f086`; native panels SHA `c158f15bc30eb92ec92512cb693a50254ed976ef1415615ed0ea215211ff0f34`.

## Verification

- Serialization matches every vertex, index and triangle winding. Maximum Float32 position error is 7.460 micrometres.
- All 11,496 emitted face normals are flat; minimum face/normal dot is 0.9999999703.
- Texture assembly preserves all 34,488 UV vertices, four image hashes and effective material settings.
- A repeat build reproduces final GLB and native bytes. Component06's GLB is byte-identical to05; the final correction affects only native physical material labels, so preview05 and its normal/texture receipts apply exactly to06.
- `npm run build:web` passes. No C# or service changes.

The first native run03 passes 8,608 component ray checks, with no mismatches and maximum position error 0.1251 mm. The fresh final06 run also passes all 8,608 samples with the same maximum error and zero mismatches or shared-boundary exceptions. Its input native hash matches component06. These isolated ray tests do not prove full-station routes or course compatibility.

## Preview boundary

`preview-hotel-court-facade.mjs` creates a separate full-browser preview. It clips fourteen original municipal triangles in two batches, removing 1,196.966137048 m² of projected area, matching the source patch area. The untouched native candidate is not swapped into this visual asset. Preview SHA `a98241c44e2c808cc7cee1240e4d5c5e9182982c7fd1c72e9ee630ad88846b59`.

The photographs, before and after views use identical camera parameters. The before and after renders also use identical static lighting. They are not actual-game performance captures. Coarse perpendicular walls, equipment boxes and the foreground tower remain visible, as do the incomplete plants, furniture and terrace forms. The right edge of the constructed patch still needs a proper facade continuation.

The final comparison gallery passes Chrome checks at1440 and390px: four images, sixteen local links, working before/after selection, no horizontal overflow or page errors. Both layouts were visually inspected. Temporary renderers, native workers and QA servers are stopped.

## Next work

Install the same wall replacement in the Blender/native candidate with an independent scope proof, then rerun the full courtyard traversals and actual-game visual inspection. Reconstruct the hotel return, tower and equipment enclosure surfaces to remove the next prominent texture artifacts. Keep the thirteen other target registrations, representative central-hall bay, both plazas/frontages, vegetation/evening and final runtime/performance gates open. No completion or deployment is implied by this component.
