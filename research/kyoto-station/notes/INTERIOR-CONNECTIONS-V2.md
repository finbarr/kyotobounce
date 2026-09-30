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

The saved [Granvia operator floor guide](https://jrwest-hotels.jp/granvia-kyoto/floor/) establishes the west-end connection to the north–south passage and the M3F level change. The saved bridge-entry photograph guides the opaque warm walls, dark floor and pale ceiling. Neither source supplies surveyed dimensions: corridor length, the entrance jog, 0.172264 m stair rise, 0.30 m going, finishes and fixtures are provisional fits to the current model. The eastern hotel-lobby connection is covered below.

### Checks and cost

- Four normal-speed native walks pass: public passage to bridge and back, and public passage to the retained shop and back. The test records 2,376 position samples and checks both endpoint floor heights.
- All 57 added panels, 2,100 vertices and 700 triangles match between the browser and native exports. Existing native geometry, materials and encoded browser geometry remain unchanged.
- Five added material batches and about 63 KB of browser geometry. Eleven ceiling fixtures use the existing pool of at most two active lights.
- The editable Blender scene saves and reopens with matching geometry, normals, materials and eleven distinct light emitters. The core native play loop and Chrome controls pass, including full translation/spin rest, recall and home. `npm run build:web` passes.
- Seven actual Chrome views cover the entrance, shop, stair, turning landing, corridor and both views of the bridge join, with no page errors. Short 1440×900 frame samples have a 16.7 ms median and approximately 16.8 ms p99; this is not a long performance soak.

Rebuild with `build-gate-west-access.mjs`, then `web/v2/compose-component.mjs` against the parent manifest. `verify-gate-west-geometry.mjs` checks added geometry and retained data. `verify-gate-west-access.mjs` walks both connections in the complete native station. `install-gate-west-access.py` adds the verified component to the editable scene and validates it after reopening. Private receipts live under `.local/v2/current/components/gate-west-access/` after delivery.

## Central Gate bridge: eastern connection

The eastern bridge end stopped at X10.723 without a route into the hotel side. It now connects through a 2.3 m wide enclosed corridor, a turning landing and 24 stairs from M3F at Y9.589 to the retained 2F floor at Y5.5. The lower landing joins the hotel receiving room and the existing theatre approach. A solid 6.8 × 19.55 m placeholder has been replaced with perimeter walls and a doorway, exposing the existing room floor and ceiling.

The first complete walk reached the lobby but stopped against its sealed north-facing glass bay. That bay and its raised base are now replaced with a level entrance. The nearby supporting column and public-landing guard remain; the route passes around them and reaches the public stair landing.

Pages 2–3 of the saved [Granvia floor plans](https://jrwest-hotels.jp/granvia-kyoto/files/pdf/floormap.pdf) show the M3F corridor, northward descent and 2F receiving lobby. The saved station 2F map establishes the public landing and adjacent theatre. These establish connections, not surveyed construction dimensions. The corridor alignment, room boundaries, 0.170393 m rise, 0.30 m going and finishes are provisional fits. Hotel counters, shops, lifts and detailed lobby finishes remain unfinished.

### Checks and cost

- Four normal-speed native walks pass: bridge to public landing and back, then a loop through the opened room in both directions. All 3,146 position samples meet the floor-height checks; endpoint floor heights are within 0.06 m.
- Three old native panels and their 115 clipped browser triangles are retired. All 82 added panels, 2,952 vertices and 984 triangles match between native and browser exports. Retained native records and browser buffer bytes remain unchanged.
- Net browser increase: 869 triangles, four material batches and 88,264 bytes. Fourteen added fixtures use at most two active lights.
- The editable Blender scene saves and reopens with matching geometry, normals, materials, lights and retained object bindings. Native and Chrome gameplay checks pass, including full translation/spin rest, recall and home. `npm run build:web` passes.
- Eight actual Chrome views cover the bridge join, turning landing, stairs, room and public entrance with no page errors. Short 1440×900 samples record a 16.7 ms median and approximately 16.8 ms p99. These are short checks, not a performance soak.

Rebuild in order with `prepare-gate-east-access.mjs`, `build-gate-east-access.mjs` and `web/v2/compose-component.mjs` against the parent manifest. The preparation tool checks material, boundary planes and clipped-face coverage before removing the old surfaces. `verify-gate-east-geometry.mjs` checks replacement scope and geometry correspondence; `verify-gate-east-access.mjs` walks the routes in the complete native station. `install-gate-east-access.py` integrates the verified component into the editable scene. Private receipts live under `.local/v2/current/components/gate-east-access/` after delivery.

## Ordered remaining defects

The [north–south passage repair](PUBLIC-PASSAGE-SOUTH-V2.md) replaces the misplaced early exit with a longer railway crossing, intermediate descent, lower public hall and southern ground connections. The [conventional railway pass](CONVENTIONAL-RAILWAY-V2.md) opens the JR West gate and adds the paid concourse, five platform stairs, tracks and roofs. The [platform 0 repair](PLATFORM-ZERO-V2.md) adds its missing stair, aligns the north rear floor with track 0 and removes the artificial room behind Central Gate. The [southern gate fronts](SOUTHERN-GATES-V2.md) add both operator entrances and public ticket recesses. The [Shinkansen connection](SHINKANSEN-V2.md) now opens its central gate to the paid concourse and two stair routes to elevated islands 11–12 and 13–14, with four tracks, deck and canopies. The [Kintetsu terminal](KINTETSU-TERMINAL-V2.md) now connects its gate to all four platform strips and terminating tracks, and removes the conflicting western JR10 extension.

The [central transfer connection](CENTRAL-TRANSFER-V2.md) joins the JR bridge to the Shinkansen paid concourse through two stair flights and an open gate lane, with the original conventional-platform access retained.

The [Hachijo ground entrance](HACHIJO-ENTRANCE-V2.md) now links the public terrace stair landing to the paid Shinkansen concourse through the forecourt, foyer, gate and an actual stair opening.

The [Hachijo East entrance](HACHIJO-EAST-V2.md) adds a public hall with connections through the Shinkansen gate and stairs and through the JR gate to platform 10.

The [eastern railway underpass](EAST-TRANSFER-V2.md) connects all six conventional-platform areas to the eastern Shinkansen transfer stair and Underground East gate. Its route is below the tracks; the Porta link moves north to keep public and paid circulation separate.

The [Porta plaza B1 connection](PORTA-PLAZA-V2.md) now opens the public subway hall and the B2 north cross-passage into a connected two-aisle loop, with a fitted stair between the retained floor levels. It covers the first part of the west area; the rest of the plaza mall remains unfinished.

The [Hachijo Street crossing](HACHIJO-CROSSING-V2.md) extends the South subway lobby route under the road to both street lifts, the sunken garden and its stair. It corrects the northern lift's provisional indoor placement using operator photographs, with the retained stair, JR bypass and ticket machines still accessible.

The [Porta west public lift](PORTA-WEST-LIFT-V2.md) connects the western cross-passage to the station forecourt. The fitted upper threshold follows the original paving slope; both shopping streets and the B2 stair approach remain available.

The [central elevator and western receiving halls](CENTRAL-LIFT-V2.md) now connect parking B3, Porta B2, both B1 aisles, the ground concourse and the upper north–south passage. The shaft is protected at every floor; fourteen native route walks and all five Chrome rides/exits pass. Parking ramps and further Isetan/Granvia connections remain unfinished.

The [western Porta loop and forecourt stair](PORTA-WEST-V2.md) replace the old sealed stair room at the wrong level with a complete descent to the mall. Both shopping streets connect around the missing western block, with the earlier lift and B2 stair approach retained.

The [Isetan basement connections](ISETAN-BASEMENT-V2.md) now open B1 and both B2 entrances into usable food-hall loops, with an internal stair and access to the central elevator.

The [retained Porta pavilion stair](PORTA-PAVILION-V2.md) connects the forecourt to North Street through two stair lanes and a middle landing. The surrounding shop bays are rebuilt, and the existing exterior is preserved. Its exact numbered street exit remains unconfirmed.

The [connected subway reconstruction](SUBWAY-REBUILD-V2.md) replaces the misplaced gate halls with four connected stair cores, one shared island, three street stairs, two platform lifts and the Exit 5 street lift. Its public routes join the retained Porta floors, JR gate and Hachijo lobby. Northern placement follows the registered city plan; southern dimensions remain fitted and documented. The complete station, editable source, 46 route walks and moving hardware checks are integrated into the local playable build.

The [Hachijo ASTY street](HACHIJO-ASTY-V2.md) opens the missing covered connection between the main and eastern entrance halls, with its eastern bend, thirteen room shells and three forecourt exits. Both rail entrances remain accessible. Tenant interiors remain unfinished.

The [western ASTY street and public stair](ASTY-WEST-V2.md) open the main foyer's western end into a covered street, fifteen room shells and forecourt exits. The interior stair joins the upper public passage beside Kintetsu, with both external terrace stairs retained.

The [western platforms 30–34](WESTERN-PLATFORMS-V2.md) now connect to platform 0 through a ground concourse. The blocked western wall and coarse lower building shell are opened beneath the retained upper façade. Three platform strips and four terminating tracks follow the operator plan.

The [Miyako Michi street and western forecourt](MIYAKOMICHI-V2.md) now connect the ASTY western portal to the fountain plaza, 31 room shells, both washroom lobbies and three public Hachijo exits. The forecourt reaches the retained terrace stair, and the railway hall above remains accessible.

The [subway public rooms](SUBWAY-PUBLIC-ROOMS-V2.md) correct the North shopping island, move the Central 1 café to its mapped head position, separate the grocery and bakery, and add the missing washroom approach. All thirteen room envelopes have usable entrances and sampled floor coverage. Tenant fitouts and sanitary fixtures remain unfinished.

The [southern subway rooms](SUBWAY-SOUTH-ROOMS-V2.md) add shops 10–14, the station office and Central 1's two serving kiosks. New floor and ceiling strips complete the room footprints. Public entrances, counter bays and the continuous aisle remain separate from the gate and lift approaches.

The [Miyako Yume Terrace reconstruction](HACHIJO-TERRACE-V2.md) replaces the provisional southern deck with the city-plan terrace, four stairs, three working lifts and an eastern walkway. Its [four terrace escalators](HACHIJO-ESCALATORS-V2.md) now provide paired up/down connections at both ends, with ground circulation beneath the deck retained.

1. **Southern building and public spaces:** reconcile the two original station-side escalators with the ASTY frontage and complete their receiving connections, then the bus/pickup canopies, street edges and remaining upper frontage. Resolve the small Miyako Michi southeast stair's destination before constructing it.
2. **Remaining interior connections:** inspect the unfinished Isetan and Granvia upper-floor links and parking access recorded in the basement and central-lift notes; repair concrete missing connections before room decoration.
3. **Railway refinement:** improve fitted track alignment, platform enclosures and further building connections after the missing public routes.

Later rendering finding: pale ASTY fascias show banded shading. Investigate the cause after the missing structural routes; geometry correspondence alone does not explain it.

Later performance finding: Chrome's empty-page cadence was 30 Hz during the western ASTY delivery, and the current frame-interval rule still reduced resolution. Distinguish browser scheduling limits from scene cost in a focused performance pass.

Finish one connection, verify it in the complete station, integrate the editable source and playable bundle, then commit and merge before starting another. Small decorative work remains deferred.

## Hachijo Street crossing

The [public crossing](HACHIJO-CROSSING-V2.md) now continues from the subway South lobby beneath Hachijo Street into an open-air garden with a usable street stair, southern lift and Avanti receiving lobby. The northern lift moves out to the station frontage, as shown by the operator's photographed route; its old indoor shaft openings are restored. Both lower portals have retaining headers and guards above them. The full Avanti building, shopping floor and bus terminal remain in the queue.

## Isetan basement entrances and internal stair

The [Isetan repair](ISETAN-BASEMENT-V2.md) removes the sealed western B1/B2 walls, opens both B2 entrances from the Porta aisles, and adds connected food-hall loops and a guarded B1–B2 stair. Ten native routes, two Chrome keyboard routes, matching source/exports and stair headroom checks pass. Store fitouts, further lifts/escalators and connections to other Isetan floors remain unfinished.
