# East Square: footprint and public connections

27 September 2026. Research and source registration only. The integrated station remains inner-roof01; isolated Skyway assembly09 is unchanged. No new courtyard geometry has been installed.

## What the official map establishes

The current operator’s [7F page](https://www.kyoto-station-building.co.jp/floorguide/7f/) loads its diagram through JavaScript. Both [complete floor schematic](../maps/official-7f-map.svg) and [station-building schematic](../maps/official-7f-station-map.svg) are now archived with retrieval hashes in sources.json.

The diagram identifies East Square, the escalator connection to the 10F Skyway, a separate descent to 4F, a ramp beside the upper bank, the departure bell monument, station piano, an eastern corridor to lifts and toilets, and southern circulation with another escalator/lift. These are topology and feature references. NIWA is listed on the current floor page, but its footprint and fit-out cannot be determined from that listing alone.

The [official East Square photograph](../photos/square-img_eastsquare_01.jpg) and [2014 escalator photograph](../photos/zekkeikana-skyway4b.jpg) show a raised planted garden and short stairs. The broad municipal floor does not resolve these changes in level. Do not turn the source plane into a claim that the entire finished square is flat.

## Complete source selection

The final survey examines the source object beyond the full eastern extent and also checks every matching upward floor triangle in the complete object, independently of the regional output filter. Source: Kyoto City municipal station model, CC BY 4.0, SHA-256 `0df73fd383c265904711bf09e4a628d109f7792dc9e4be524d3f531666df06a1`.

- 53 connected upward triangles in `Untitled.203`, faces 13869–13921 inclusive. The normal/plane predicate finds exactly the same set globally and regionally.
- 53 distinct vertices; no coordinate welding displacement. One 47-vertex outer loop and one six-vertex hole. Every internal directed edge has an opposite partner; every boundary vertex has one continuing edge.
- Horizontal surface area: 2,043.462363 m². Outer area: 2,162.512695 m²; preserved hole: 119.050333 m². Triangle and boundary areas agree within 1e-7 m². Numerical precision is not survey accuracy.
- The full selection includes a southern hotel-side extension. Its geometric connection does not establish public access or identify every room. The official eastern lift/toilet corridor is a separate connection that the coarse floor cannot establish on its own.
- All 99 samples on the existing eastern Skyway02 arrival apron lie in selected source triangles. Maximum height difference is 0.0000924 m. This checks the previously chosen datum, not native walking or the real garden elevation.

The earlier 37-face Skyway survey was a local arrival check. Initial expanded selection01 had 51 faces because its X≤145 m regional search omitted two triangles lying farther east. A second expansion caught the omission. Final source03/registration03 use X≤175 m and the whole-object cross-check. Preserve the older files as diagnostic evidence; do not use their outline as the complete floor.

## Why the map is not a metric registration

A tentative pairing of the two northern court corners gives a uniform scale of approximately 0.1578 metres per SVG unit and the station’s small plan rotation. Under that fit, the tentative southern west-wing junction misses its source counterpart by **14.462 m**. This is a failed correspondence/scale hypothesis, not proof that either source is wrong. Map simplification, source simplification and ambiguous corner correspondence may all contribute.

The registration report records the anchors and independent check. No metric registration is accepted. Do not stretch the game floor to fit this schematic or infer ramp widths, stair risers, garden height or public room boundaries from it.

## Construction decisions and remaining evidence

1. Preserve the source outer boundary, hole and rounded southern recess as geometric references.
2. Register the raised garden and its north/west stair edges against photographs before building the finished surfaces. Keep the lower Skyway arrival, garden and southern circulation as separate level hypotheses.
3. Include the map-confirmed ramp, 4F descent, eastern lift/toilet corridor and southern escalator/lift connection in the circulation design.
4. Place the bell monument, piano, planting/seat edges, flared columns and current tenant boundaries using photographs with known orientation and dated evidence.
5. After construction, test both directions across the apron, stairs/ramp and onward routes in the isolated native worker, then integrate and run the full game gates.

[Visual comparison](east-court-registration/index.html) · [Exact source loops and apron samples](east-court-registration/registration.json) · [Source footprint diagram](east-court-registration/footprint.svg)

All photographs and operator maps remain reference-only. This survey makes no visual-fidelity, full-station runtime or performance acceptance claim.
