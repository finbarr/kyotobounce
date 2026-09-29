# Eastern underground railway and transfer connection

29 September 2026. Connect the conventional platforms through the eastern paid underpass to the Shinkansen concourse and Underground East gate.

## Evidence and corrected topology

The [JR West station plans](https://eki.jr-odekake.net/premises?id=0610116), dated 31 January 2026, and [JR Central's Kyoto map](https://railway.jr-central.co.jp/station-guide/shinkansen/kyoto/map.html) were checked again. The saved JR West PDF was rendered and both its isometric and floor-plan pages inspected; the saved JR Central map was also inspected. They show the eastern JR crossing **below** the conventional platforms. Earlier notes calling the missing crossing a bridge were incorrect.

The paid passage connects the conventional platforms and the Underground East gate. At its southern end, stairs rise toward the eastern Shinkansen transfer gate. The neighboring north–south public subway passage remains a separate route. These sources establish connections and relative levels, not surveyed coordinates or dimensions.

## Construction and acceptance

- Connect platforms 0, 2–3, 4–5, 6–7, 8–9 and 10 to the paid underground passage. Cut matching openings in platform slabs and underlying ground; retain walkable platform bypasses and support the canopies around the openings.
- Connect the passage to the eastern Shinkansen concourse through two stair flights and one open transfer-gate lane, retaining the Hachijo East public lobby and upper stair bypass.
- Open an Underground East gate into the public subway passage.
- Move the fitted Porta stair/ramp junction 14 m north, clearing the paid underpass while keeping its mall and public-passage connections intact.
- Verify all affected routes in the complete native station, matching browser/collision geometry, an editable Blender source and actual Chrome views. Integrate and commit only after these checks pass.

The fitted underground floor is Y−6.2 m. Each conventional-platform stair has 36 risers, a middle landing and a 0.32 m going; the width is 3.6 m except the 2.4 m platform-10 stair. The southern transfer climbs to the existing Y3.675 m Shinkansen floor in 58 risers with a middle landing. Walls, guardrails, canopy supports, gates, ceiling lights and original bilingual direction signs establish the connected interior. New lights share the existing two-light pool.

Floor heights, route alignment, dimensions, construction details, finishes and gate equipment remain provisional fits. Moving escalators, lifts and detailed railway furnishings remain unfinished. Research imagery is not used as a game texture.

## Rebuild and verification

Run `prepare-east-transfer.py` with Shapely, then `prepare-east-transfer-base.mjs`, `build-east-transfer.mjs` and `web/v2/compose-component.mjs` against the saved parent manifest. `finalize-east-transfer.mjs` verifies that escalators and their supports are unchanged, rebinds their metadata and sets the underpass entry. Preparation removes an exact multiset of browser triangles: the earlier Porta junction had two coincident end faces, so multiplicity is checked rather than assuming every triangle key is unique.

`verify-east-transfer-geometry.mjs` checks retained records and exact new triangle correspondence. `verify-east-transfer.mjs` walks the platform stairs and bypasses, full underpass, transfer stair, gates, Porta routes and retained Hachijo connections. `inspect-east-transfer-chrome.mjs` checks real camera positions, resource stability and visible views. `install-east-transfer.py` saves and reopens the integrated editable source.

### Verified result

- All 38 current native walks pass, with 12,929 recorded position samples. These include both directions through six platform stairs and their bypasses, the full underpass, the transfer stair and gates, both Porta approaches, the upper concourse bypass and the retained Hachijo ground lobby. Endpoints must be grounded and within 0.06 m of their floor height. The upper bypass goes around the new stair enclosure's north end; an earlier straight test path crossed its wall and is excluded from the passing route set.
- Matching-export verification covers 992 panels, 12,232 triangles and 36,696 vertices. Eighty-six retired panels account for 1,088 removed browser triangles, giving a net increase of 11,144 triangles. Retained native geometry and encoded browser data are unchanged.
- The final sign supports and paid-side exit label do not change collision. An exact comparison of collision panels, boxes, beams, flights, escalators, materials and lights validates earlier walks against the final layout.
- Seventeen Chrome views passed with correct camera positions, no page errors and stable texture/reflection counts. Final views confirm the supported signs and visible paid-side exit label. Short 1440×900 samples have a 16.7 ms median and about 16.8 ms p99; these are not a sustained performance or audio test.
- Chrome gameplay passes walking, a full throw, result presentation, recall during flight, menus and home. `npm run build:web` passes. After promotion, `npm run test:runtime` passes on the main local preview: grounded spawn, 1.35 m walk, full translation/spin rest in 13.92 s, recall and home. No native controller, scoring or service change is required.
- The editable Blender source saves and reopens with matching geometry, normals, UVs, material/light values and retained object bindings. Fourteen metres of junction relocation preserves the original Porta materials, signs, slope and level connections.

The browser geometry grows by 2,379,744 bytes, including replacement index buffers, across 23 component material batches. Eleven old emitters are retired and 32 are installed, including nine relocated Porta emitters. They share the existing two-light pool.

The final source layout is `3a8a9811f2cf19d32f263a337ba9122a4cfb71b6c2bdd5edf17d6844d23a9703`; browser geometry is `b67935295a84917fb068d3f253fc640178d42f0ad0aa9d8e79fd234bdc5bb184`. The Blender source is `05152d2b687b39b5fda7c4208f2cb5566c20ec57cc9bc050322ed04c924a6ce3`. The local launcher gives the entry overlay its own layout hash.

Private receipts are retained under `.local/v2/current/components/east-transfer/`. Current assets were replaced in place. Temporary full-station candidates and the stopped candidate overlay were removed after the main launch check. Lifts, moving escalators, remaining subway gate halls and the onward plaza Porta B1 connection remain on the defect list.
