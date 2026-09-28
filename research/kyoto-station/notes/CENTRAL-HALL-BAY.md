# Central hall: geometry before finishes

27 September 2026. This is a research and registration diagnostic. No reconstruction candidate, collision surface, course, material, lighting or service changed. The long-term goal remains active. [Interactive comparison](central-hall-bay/index.html).

## Finding

The existing hall's inferred architectural proportions differ substantially from the recovered city mesh. Resolve that disagreement before adding photorealistic finishes.

| Quantity | Municipal source | Current hall |
|---|---:|---:|
| Front plane, renderer Z at X=0 | 5.331321 m | 21.200423 m |
| Gate opening, X interval | −7.076169 to 9.922836 m | −8 to 25 m |
| Gate opening, horizontal width | 16.999005 m | 33 m |
| Gate head, Y | 10.714659 m | 13 m |
| Upper glazing top / current window head | 26.210268 m | 32.2 m |
| Corbel root / current front wall top | 28.810678 m | 34.6 m |

These are **differences between model layers, not surveyed measurements**. The last two rows compare related model datums; exact photographed feature correspondence remains unresolved. The source gate wall slopes slightly in plan, Z/X = −0.01665995. Its front-plane difference at X=0 is 15.869102 m. The current native Z was converted to renderer Z once; this is not a sign-conversion error.

The current layout explicitly labels its facade plane, pitch, recesses and floor schedule as inferred. Its `southConcourseFacade` metadata says entrance/third-view/floor correspondence and canopy bearing remain unresolved. The new discrepancy audit lists 1,076 boxes and one panel with the `south-concourse-` prefix; this is an initial affected-layer list, not an exhaustive dependency or course inventory.

[Exact source vertices and layout comparison](central-hall-bay/bay-discrepancy.json). Source: Kyoto City's `Untitled.200` mesh, CC BY 4.0. Source agreement alone does not prove built dimensions.

## New references and inspection

Four public photographs were collected with their original URLs, parent page, dates, rights notes and hashes in `sources.json`. The library now has **216 entries and 201 verified downloaded files**.

- [Central gate and upper bays](../photos/hall-2019-south-gates.jpg): main representative area, 480×640. Pale stone, rose jambs, recessed glass, grilles, soffit grid/lights, green-toned gate wall and public floor openings are visible.
- [West escalator view](../photos/hall-2019-west-escalator.jpg): gate/wall relationship, glazing around floor openings, paving, escalator approach and wayfinding.
- [Hotel/theatre frontage](../photos/hall-2019-hotel-frontage.jpg): close guardrail, metal/glass junctions, tiled floor and shop/door depth.
- [Eastward roof and bell monument](../photos/hall-2019-north-return.jpg): roof and suspended bridge silhouette. The original working filename “north-return” was an incorrect orientation guess; catalogue title and inspection notes now identify the eastward view. The historical filename remains only to preserve the collected file link.

All four images were individually inspected. [The photographer's article](https://plaza.rakuten.co.jp/asobikokoro2/diary/201902120000/) was published 12 February 2019 and says the concourse sequence mixes photographs from 5 and 9 February. Do not assign one exact date to an individual photograph. Historical tenant signs, advertising, temporary lights and furniture require a current reference before implementation. No photo pixels become game textures.

The [structural engineer's project page](https://www.kanebako-se.co.jp/works/view/240) was checked directly. It states a 1.44 m basic atrium grid and 100 mm square steel tubes. This independently corroborates nominal pitch previously treated as an authoring assumption. It does not establish grid phase, exact end joints or member wall thickness. Its overall atrium figures are approximate. Kanebako 590, 591, 592 and 593 were individually inspected during this study; 590 remains the unregistered broad hall acceptance reference.

## Camera diagnostics — neither accepted

The representative portrait is a supplementary bay study; it does not replace the broad `central-hall` reference in the fifteen-view manifest.

1. **Fit 01:** eight fitted and six withheld source vertices. Fit RMS 4.2948 px; maximum fitted error 6.1753 px; maximum withheld error 9.3158 px. Numerically inside the original 2%-width threshold of 9.60 px. However, the camera lies outside the north facade. All 14 exact anchor rays hit nearer geometry before the wall. The full source render is obstructed. Rejected.
2. **Fit 02:** retain the same observations and enforce the interior-side requirement Z≥−20, approximately one metre inside the observed north facade near Z−21.26. The bound is active; it is a topological constraint, not a measured camera coordinate. Fit RMS 4.6394 px; maximum fitted error 7.0863 px; maximum withheld error 10.0958 px. All 14 anchors are visible, but one withheld point exceeds 9.60 px. Rejected as an accepted registration.

The constrained pose is `(19.179881, 5.690998, −20.0)`, vertical FOV 59.400476°, roll −1.324569°. It is suitable only for a labeled diagnostic comparison. Nearly coplanar anchors, uncertain lower pier-edge identity, unknown crop/lens and coarse city geometry limit the solution. Enlarged photo crops were inspected; their ambiguous lower-band/railing boundaries should be resolved with clearer or opposing imagery before redefining landmarks. Do not move observations solely to make an error pass.

The exact source-coordinate audit verifies all fourteen vertex IDs without coordinate changes. The new visibility audit preserves source face indices with an indirect BVH, respects material sidedness and conservatively reports all rendered faces as occluders. It does not simulate alpha textures or transmission. Python-fit and independent Three.js projections agree within 1.82×10⁻¹³ px. This is numerical consistency, not physical accuracy.

The visibility checker correctly separates two real cases: 14/14 blocked in fit 01, 0/14 blocked in fit 02. It records residual and visibility results separately. No acceptance tolerance was relaxed.

## Representative-area scope and missing details

Use the central gate opening and one adjoining upper bay as the construction proof area, extending to the public hall and forecourt. Its final world boundary waits for registration.

1. **Large forms first:** gate width/head, wall plane, front and recessed slab levels, real canopy-bearing location, deep side returns and the connection behind the public hall. Existing oversized/offset geometry prevents a faithful match.
2. **Stone:** pale cladding course joints, differentiated rose/dark stone, inset grilles, sills and returns. Avoid putting all of these on one flat photo surface.
3. **Glass/metal:** mullion depth and rhythm, rail brackets, upper guardrails, window reveals, reflective surroundings and visible room depth. The city source has blurred image finishes; it is not a close-up material target.
4. **Soffit and light:** ceiling grid, recessed luminaires and credible indoor/outdoor contrast. The gate's green appearance is illumination/exposure evidence, not a direct paint RGB measurement.
5. **Ground/public access:** glazed floor openings, paving joints, tactile paths, railings, gate/threshold edges and continuous approach to the forecourt.
6. **Current fixtures:** verify retailer names, signs, ticket interfaces and service equipment with recent operator references or walkthrough playback. Keep historical photographic detail distinct from current use.

This turn's source/candidate renders use the static inspection viewer with its own environment and sun. They do not prove game lighting, gameplay, Chrome timing or a final visual milestone.

## Next bounded construction step

Resolve the gate-wall plane and opening against a second independent photograph and published sections; check the ambiguous pier datums. Accept a camera only when both residual and visibility checks pass and the overlay makes architectural sense. Then prepare one source-registered bay with original materials, document the interfaces to the gate/roof/forecourt, and inventory affected course/physics surfaces before installation. Preserve the current courtyard work. Do not restart courtyard embellishments or run a whole-station replacement from a single weak fit.

The latest full station remains courtyard life04 / browser04. Thirteen of the fifteen acceptance views remain unregistered; no final visual view passes all categories. Full gameplay performance, twenty-minute music/context stability, all-course proof and the rest of the station/plaza scope remain open. No commit, push or deployment.

## Reproduction

From `/Users/finbarr/.codex/worktrees/performance-audit/kyoto`:

```sh
node web/station/realism/audit-central-hall-bay.mjs .local/station-realism/station-shell/municipal-station.glb .local/station-realism/station-court-life-04/station-layout.json .local/station-realism/central-hall-registration-01/bay-discrepancy.json
node web/station/realism/verify-photo-anchor-source.mjs .local/station-realism/central-hall-registration-01/south-gates-correspondences-02.json .local/station-realism/central-hall-registration-01/source-proof-02.json
node web/station/realism/audit-photo-visibility.mjs .local/station-realism/central-hall-registration-01/south-gates-fit-02/fit.json .local/station-realism/central-hall-registration-01/visibility-02.json
```

`fit-photo.py` uses the stored correspondences and a Python environment with NumPy/SciPy. `project-source.mjs` uses the saved camera against the exact source or browser GLB. `research/kyoto-station/scripts/build-central-hall-study.py` copies the evidence into this ignored research gallery. Both rejected diagnostic receipts are retained.
