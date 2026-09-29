# Interior connections: current defects and repairs

28 September 2026. The user's priority is usable interior architecture and the missing railway/south side. This replaces the shop-detail queue.

## East 4F–7F staircase

**Reproduced defect:** the retained `east-4f-7f` flight ended at Y34.62 m, while the current source-derived East Square floor is approximately Y29.973 m. Its old alignment missed the six-vertex stair opening. In the complete native station, the player stopped at `[80.446922, 27.879538, -8.518473]` against the courtyard slab. This was an actual failed walk, not just a stale route annotation.

The repair replaces the old flight and walking proxy with 52 steps in two flights, a middle landing, a lower connection to the retained 4F terrace, handrails and guards around the courtyard opening. The final tread fits the oblique edge of the existing floor. The courtyard floor supplies the upper landing without a duplicate slab. Old route records for the removed flight and nonexistent lower escalators are retired.

The [operator's 7F diagram](https://www.kyoto-station-building.co.jp/floorguide/7f/) establishes a separate connection to 4F. The saved municipal courtyard geometry supplies the opening and arrival height. The 2.4 m width, 0.182177 m rise, 0.30 m going and intermediate landing are fitted construction dimensions, not as-built measurements. See [the source registration](EAST-COURT-REGISTRATION.md). Adjacent escalators and lower-floor enclosures remain unfinished.

### Checks

- Normal-speed native walking passes from the retained 4F terrace into East Square and back: 1,205 recorded position samples, including both approaches, both flights and the intermediate landing. Both endpoints finish within 0.06 m of their intended floor height.
- Exactly 2,088 obsolete authored staircase triangles are removed from the browser export. The corresponding flight and player proxy are retired from the native layout and editable source.
- All 208 added panels, 7,488 vertices and 2,496 triangles have matching browser/native geometry; flat normals match geometric face normals. Net increase: 408 triangles and three material batches.
- Unrelated native geometry and the retained browser buffer bytes are unchanged.
- The saved Blender scene reopens with the new geometry and valid retained panel/flight bindings.
- Five views inspected in actual Chrome, including the lower approach and courtyard arrival, with no page errors. Core native walking, throw, complete translation/spin rest, recall and home checks pass. Chrome gameplay check is recorded in the component delivery receipt.

Private receipts are retained under `.local/v2/current/components/east-access/`. Asset hashes are pinned in `web/v2/assets.json`. Large generated exports are replaced in place; research images remain outside Git.

### Rebuild tools

Use `extract-east-court-stair.py` with the parent asset manifest to extract the obsolete source triangles. Then run `prepare-east-court-access.mjs`, `build-east-court-access.mjs`, and `web/v2/compose-component.mjs` in order. `verify-east-access-geometry.mjs` checks replacement scope; `verify-east-court-access.mjs` exercises the complete native station. `install-east-court-access.py` integrates the verified result into the editable scene. These are one-time replacement tools and assert the expected parent geometry.

## Lower east route audit

The retained ground-to-4F route passes at normal walking speed in both directions: 967 outward samples and 964 return samples. Its final floor heights are within 0.06 m of the route endpoints. The test starts at X18.4 on the ground floor; the earlier X17.8 placement straddled a floor seam and was rejected by the start-circle validator. That rejected placement was not a broken staircase.

Five Chrome views cover the ground approach, intermediate landings and 4F arrival. This route needs no blocking-geometry repair from this audit. Its enclosures and finishes can be refined after missing connections. The recorded walk labels came from the reused east-court harness; the actual route points and endpoints identify this as ground-to-4F.

## Central Gate bridge: western connection

The western end of the retained M3F glazed bridge stopped at X−7.876 with no connection to the public passage. It now joins a 2.3 m wide enclosed corridor, a turning landing and thirteen stairs down from Y9.589 to the retained passage floor at Y7.35. The entrance comes around the north end of the passage, beside the existing Heart-in shop gallery. The gallery and shop geometry remain intact, and the new entrance slab ends at the existing gallery floor rather than overlapping it.

The saved [Granvia operator floor guide](https://jrwest-hotels.jp/granvia-kyoto/floor/) establishes the west-end connection to the north–south passage and the M3F level change. The saved bridge-entry photograph guides the opaque warm walls, dark floor and pale ceiling. Neither source supplies surveyed dimensions: corridor length, the entrance jog, 0.172264 m stair rise, 0.30 m going, finishes and fixtures are provisional fits to the current model. The eastern hotel-lobby connection remains unfinished.

### Checks and cost

- Four normal-speed native walks pass: public passage to bridge and back, and public passage to the retained shop and back. The test records 2,376 position samples and checks both endpoint floor heights.
- All 57 added panels, 2,100 vertices and 700 triangles match between the browser and native exports. Existing native geometry, materials and encoded browser geometry remain unchanged.
- Five added material batches and about 63 KB of browser geometry. Eleven ceiling fixtures use the existing pool of at most two active lights.
- The editable Blender scene saves and reopens with matching geometry, normals, materials and eleven distinct light emitters. The core native play loop and Chrome controls pass, including full translation/spin rest, recall and home. `npm run build:web` passes.
- Seven actual Chrome views cover the entrance, shop, stair, turning landing, corridor and both views of the bridge join, with no page errors. Short 1440×900 frame samples have a 16.7 ms median and approximately 16.8 ms p99; this is not a long performance soak.

Rebuild with `build-gate-west-access.mjs`, then `web/v2/compose-component.mjs` against the parent manifest. `verify-gate-west-geometry.mjs` checks added geometry and retained data. `verify-gate-west-access.mjs` walks both connections in the complete native station. `install-gate-west-access.py` adds the verified component to the editable scene and validates it after reopening. Private receipts live under `.local/v2/current/components/gate-west-access/` after delivery.

## Ordered remaining defects

1. **Central Gate bridge, eastern end:** connect the bridge to the hotel-lobby route shown in the operator's map. Preserve the distinct M3F and 2F levels and verify the complete connection both ways.
2. **North–south free passage:** the northern connection now reaches the bridge and shop gallery, but the older corridor's south termination and relationship to the eventual platforms still need an end-to-end audit.
3. **Railway and Hachijo side:** the rear overview shows the station building over a largely empty railway-side area. Conventional platforms/tracks, connecting paid concourses, the Shinkansen/Kintetsu relationships and the south building/forecourt require substantial construction. Use the saved [JR West schematic](https://www.jr-odekake.net/station/img/premises/0610116.pdf) and operator maps for topology, and photographs for structure.
4. **Interior enclosures:** inspect remaining stairs, floor openings and abrupt hall ends through actual walking routes. Refine visible enclosures after each route is usable.

Finish one connection, verify it in the complete station, integrate the editable source and playable bundle, then commit and merge before starting another. Small decorative work remains deferred.
