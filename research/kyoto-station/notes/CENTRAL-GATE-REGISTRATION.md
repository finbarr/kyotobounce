# Central gate: new references and registration limits

28 September 2026. [Reference gallery and diagnostic receipts](central-gate-registration/index.html).

## What the new sources establish

The architectural portal, ticket barriers, overhead bridge and platform interface must be reconstructed as separate connected features. The [2022 photograph by Mister0124](https://commons.wikimedia.org/wiki/File:JR_West_Ky%C5%8Dto_Station_JR_Line_Central_Gate.jpg) and [2020 photograph by 円周率３パーセント](https://commons.wikimedia.org/wiki/File:Kyoto_Station_20200229-16.jpg) show these relationships clearly. Both are CC BY-SA 4.0; attribution is preserved in the source register. They are historical references, not a current equipment census or game textures.

The [city accessibility diagram](https://kyoto-universal.jp/traffics/template/kyoto_station.html) places the barrier line south of the central well, with ticket machines/office to the east and accessible facilities to the west. It is undated, on a historical guide, and schematic. It cannot establish metric depth. The JR West map dated 31 January 2026 returned HTTP 403; it is catalogued as unavailable, not downloaded or inspected.

### Missing or provisional construction details

- Curved bridge soffit and its panel seams, with upper glazing and rail.
- Stone banding, circular jamb recesses and the square grille pattern outside the portal.
- Suspended departure-board rail, support rods, small cameras and downlights.
- Stainless gate housings, black lids, blue reader surrounds, flap paddles and the wider accessible lane.
- Tactile paving approaching the lanes and adjoining office/machine thresholds.
- Correct transition into the paid platform area, visible beyond the barriers.

The July 2026 hall photograph supplies more recent broad architectural context. Temporary posters, exact gate count, light colour and display content in 2020/2022 require current confirmation. Night-time green casts are not measured material colours.

## Camera checks and rejection

The previous camera used six upper fit landmarks and two withheld upper checks. Four additional, independently picked corners of the west facade grille group span Y=6.1066–7.3066m in the unchanged municipal mesh. The source coordinates are exact vertex lookups; feature identity and the coarse mesh remain uncertain.

With the previous camera frozen, errors are 19.68, 18.95, 24.40 and 23.78 pixels at 1200px width. One narrowly misses the unchanged 24px limit. Manual pick uncertainty is 4px; this does not establish a structural geometry error.

A separate diagnostic fit adds the two upper grille corners and holds out their lower corners, retaining both original withheld pier bases. It passes residuals (fit RMS 7.30px, maximum withheld 21.13px), but moves the inferred camera from (-28.9811,6.6425,-9.2024) to (-30.6784,5.7449,-10.4557). The opaque source object `BuildingInstallation.1452` then blocks 11 of 12 landmarks, only 1.8–2.2m from the candidate camera. **This camera is rejected for construction.** The earlier fit remains unchanged and is not newly accepted at floor level.

All 12 declared source landmarks match the original municipal vertices exactly. Python/Three projections agree to below 6e-13px. Those numerical checks do not cure the visibility failure. No geometry, camera bounds, source materials or residual tolerances were altered to force a pass.

## Next construction step

Use the dated frontal photos to specify gate hardware and the bridge/soffit assembly, while registering a second architectural view with independently visible lower and depth landmarks. Resolve the camera/source obstruction before inferring metric barrier depth. Keep the existing 16.999m source portal width distinct from the provisional 5.6m return depth and the old equipment roughly 22m behind the source frontage. Neither the exploratory floor picks nor the rejected camera justify moving that equipment.

The private full station remains candidate05; gate/upper bay remains excluded. All seven unresolved courses, B2 and the broader station/exterior/material/light/performance acceptance remain open. No game deployment or geometry change was made in this study.
