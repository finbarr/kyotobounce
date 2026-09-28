# NIWA timber profile, hard faces and granite — component08

27 September 2026. [Before/after gallery](niwa-frontage-detail/index.html). This is isolated construction progress; no final visual milestone or full-game performance acceptance is claimed.

## Architectural change

Both registered photographs visibly show a band of openings between the pergola's horizontal timber rails, divided by short upright blocks. Component06 closed that band with stacked timber. Component08 lowers the nominal lower rail to Y34.32–34.52, retains the upper rail at Y34.725–34.945, and inserts short blocks in the resulting 0.205 m gap. Cross-members now project to local u46.35. A rear upper rail and blocks provide a provisional coherent support arrangement.

This is a correction to the visible construction pattern. The sections, exact depth and heights remain hypotheses. The local exploratory two-camera roof-line fit was **rejected**: nominally related edges produced incompatible depths, and one edge reached the fitting bound. See [the retained values](niwa-frontage-detail/rejected-roof-lines.json). Neither camera nor source geometry was moved to accommodate those picks.

The planter, paving levels, stair count and routes retain the preceding candidate's hypotheses. The glazing layout is unchanged, apart from its corrected normals. Door arrangement, cafe interior and detailed timber joinery remain unfinished.

## Shading correction

The generic slab construction shared vertices across perpendicular faces, so averaging normals rounded the shading on rectangular steps, planter surfaces and thin glass. An independent emitted-triangle check finds 640 affected triangles in component06. The construction helper now has an explicit `flatNormals` option, enabled for this component. It duplicates face vertices before generating normals, while keeping browser/native triangle geometry identical.

All 2,332 current triangle normals pass: minimum normal/face dot product0.9999999706, maximum normal-length error2.95e−8. The helper's default remains unchanged: rebuilding the old06 builder with the updated helper reproduces its GLB and native collision bytes exactly. Existing components are not silently regenerated with different shading.

## Original stone material

`original-granite.mjs` generates deterministic, periodic mineral grains, roughness and normal maps. The NIWA stone material uses0.6m planar coordinates and nominal3mm paving joints across treads, risers, landing, planter rim and stone pier. Palette, finish and module remain art assumptions to refine against photographs; no photographic pixels are used as textures. The wood maps remain byte-identical.

Six512×512 maps now have an8MiB decoded RGBA8-with-mips estimate, up4MiB. Component08 is1,482,012bytes (1.41MiB),191closed parts,6,996vertices,2,332triangles and eight materials/draw calls. Versus06: +43parts,+516triangles,+1,020,584bytes; vertex duplication accounts for the hard-face shading. These are inventory changes, not measured whole-game timing.

## Physics, serialization and repeat evidence

- Candidate07's fresh native audit passes2,332/2,332 sampled triangle hits, maximum point error0.00001628976m. Candidate08 changes only granite UVs/maps/material settings. [Applicability receipt](niwa-frontage-detail/native-applicability.json) proves all24 emitted position/normal/index buffers, material assignments and native collision bytes are identical between07 and08; the07 ray result therefore applies to08 geometry.
- Candidate08 fresh normal-speed walking passes4/4 traversals, both flights both directions. All40rays at20sample points agree, no ties/mismatches/obstructions; minimum sampled covered headroom2.719999695m. These tests cover only the outside NIWA entrance.
- Serialization preserves all6,996vertices,2,332triangles and winding, maximum coordinate error0.00000735747m. Material verification preserves eight materials,4,416UVvertices and allsix embedded images.
- Independent08 repeat reproduces GLB/native bytes. Old06 default compatibility control reproduces its preceding bytes. Browser asset build, syntax and diff checks pass.
- Both final08 renders use exact joint01 camera poses and unchanged viewer lighting. Desktop/mobile gallery QA checks6images, controls and local links with no overflow or page errors; screenshots visually inspected.

## Current artifacts

Maintained tools: `build-niwa-frontage.mjs`, `component-mesh.mjs`, `original-granite.mjs`, and `verify-flat-component-normals.mjs`, under `web/station/realism/` in the reconstruction worktree.

- Component `.local/station-realism/niwa-frontage-08/`.
- Assembly `.local/station-realism/niwa-entrance-assembly-08/`.
- GLB SHA-256`a8c278d7e1bf877d971b9ff087819ff5a87d0feefeac0ab93db4d690aac66a74`.
- Native SHA-256`7804c20c48b1ffbd4dbef530be177e2674ba4d7cfa30c1be8cae959b77027b43`.
- Assembly SHA-256`b131d4f20e8d9746c6ec422227702f9ce9fdf102dbea31d07f8ac41446c2a261`.

## Next

Join the lower walkway and raised entrance to court03/seat03 with explicit level interfaces, and finish the outstanding public connections before replacing the old full-station slab. Refine remaining glazing/door/interior construction and stone edges as part of the complete courtyard. Full station inner-roof01, furnishedcourt03 and overall Skyway09 remain unchanged; SkywayTrapdoor, thirteen remaining source-camera target areas and the final material/light/exterior/runtime/performance gates remain open. All temporary workers and browsers stopped. No commit, push or deployment.
