# Skyway evidence and western bridge construction

## New source inspection

The current [official 10F floor plan](../maps/floor-10f.svg), discovered through the operator's actual map loader, shows the diagonal western bridge joining a straight corridor, three northern viewing bays, and paired escalators at the eastern end. It is a schematic: its horizontal and vertical drawing scales must not be treated as surveyed coordinates.

[ZauCats' dated 24 July 2014 walk](https://www.zekkeikana.com/kyoto/shimogyoku/skyway/skyway41.html) supplies twelve inspected photographs. The [western bridge](../photos/zekkeikana-skyway42.jpg) has an arched glazed enclosure, repeated portal ribs, a dark floor, low rails on the north side, and an opaque south base with handrail. The [central corridor](../photos/zekkeikana-skyway45.jpg) has a different enclosure: glass screens within the main truss, low wall, grilles and metal rails. The [viewing bay](../photos/zekkeikana-skyway46.jpg) reaches the sloping outer glazing and has information panels. The [eastern descent](../photos/zekkeikana-skyway4b.jpg) has paired escalators and overlooks East Square. Three photographs in the sequence zoom in on Kyoto Tower; those are useful exterior details, not corridor measurements. Historical shops and planting are not evidence of present tenancy or landscape.

The photographer's text quotes a different route length from the current station operator. Neither total determines the local endpoints. The operator plan and dated images corroborate topology and visible construction; they do not resolve the central corridor's metric location or eastern landing datum.

## Western bridge component 04

The existing municipal-source registration supplies a 29.429086 m bridge footprint, approximately 3.073467 m wide, with a floor around local Y 44.9426 m and a coarse 3 m floor-to-top envelope. Source faces 9/10 are the floor; 3225–3228 are the side enclosure; 10522/10523 are the flat top. An oriented-footprint audit confirms these eight faces without selecting adjacent station geometry.

A new standalone component follows those anchors and replaces the coarse box appearance with continuous arched ribs and curved glazing. It includes side glass, north rails, opaque south panels, handrails and a closed deck. Its 23 bays, .55 m arch rise,80 mm frame,24 mm glass and other small sections are explicitly provisional authoring choices. The published 100 mm canopy tube size is not assumed to specify the separate bridge enclosure. Member placement, seals, joints, surface response and the registered photograph camera still need refinement.

- 419 closed native panels, including 69 glass panels and 303 frame members; 16,684 browser triangles in four materials.
- Exported coordinate/winding check: maximum float conversion error .000004240 m; all closed shells have positive volume.
- 185 component-only native/browser ray probes pass, including samples across the curved panes; maximum hit error .000015418 m.
- 42 floor/head-clearance pairs and six actual native capsule walks pass across centre and two side lanes. No station connection is implied by this isolated test.
- With the full current station present, 183/185 rays hit the expected component surface. Two are intercepted by `canopy-glazing-west-016-20` and `canopy-glazing-west-013-22`, at differences .1220 m and .1185 m. The failure receipt is retained. Correct the old canopy during coordinated integration.
- Source-context and walking-height component views were inspected in Chrome. They are construction views, not actual-game images or registered photo comparisons. Pale inspection lighting and unfinished materials do not meet the final visual rubric.
- `npm run build:web` passes. No playable candidate assets, course catalog, service logic or native code changed in this step, so prior full-station gameplay results remain parent evidence rather than new acceptance for this uninstalled component.

See the [construction gallery and receipts](west-skyway-construction/index.html). The active playable candidate remains `station-east-clearance-01`; the new bridge is `west-skyway-04`. Next: finish central/eastern route registration, then rebuild roof, bridge and source-facade interfaces together and rerun full gameplay/performance checks. The full long-term goal remains active.
