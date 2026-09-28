# NIWA: second camera and joint frontage study

27 September 2026. Progress on camera registration and construction dimensions; no game geometry, court height or collision changed. [Interactive comparison](niwa-frontage-registration/index.html).

## Second source camera

The [Rurubu photograph](https://rurubu.jp/andmore/article/23413) is credited to Ryota Fujii; article published 8 June 2025, capture date unknown. Six equipment-box roof vertices and one tower-edge line fit the camera. Four hotel-window centres are withheld. Those checks are recovered from exact UV triangles of the municipal GLB; the original 4096 × 2048 atlas is coarse, so they are not survey coordinates.

- Source-only camera: renderer position(117.428945,33.736101,−13.117699), vertical FOV54.018118°, roll0.717473°;1200×800, no crop/warp.
- Source-point RMS2.32482px, maximum4.13018px; withheld maximum13.09099px. All pass the existing2%-of-width threshold(24px).
- `verify-photo-anchor-source.mjs` independently checks six source vertices and four UV-derived world points against the declared GLB and photo hashes. All10 agree exactly. It verifies provenance, not visual identity or survey accuracy.
- 100 pick-perturbation trials put cameraY p05–p95 at33.431–34.004m and FOV53.294–54.662°. These intervals exclude source-model, crop and lens errors.
- Early six-corner seeds were not accepted. Enlarged inspection corrected two initial freehand ridge picks; their earlier results remain in the local working directory.

This is an additional camera for the existing East Square target, not a third completed target view. The overall plan still has two target areas with source-camera registrations and thirteen pending.

## Two-view construction measurements

`triangulate-niwa-frontage.py` uses both source-only cameras, eight manually paired features and positive-depth ray intersections. Ray gaps reach0.2024m. The rigid planter fit estimates1.5759 ×1.5204 ×1.1983m, but has up to7.14px residual and a partly obscured foot check. These measurements support a shape study, not an exact datum.

`fit-niwa-stereo.py` jointly refines both cameras and the unknown dimensions of a vertical rectangular planter. Four shared corners constrain the fit; every original source check plus the fifth planter corner stays withheld. The vertical rectangular form is an explicit geometric assumption. Neither camera predecessor is overwritten.

- Total squared normalized residual falls73.8757→34.8556. The fit contains21 parameters and uses original-image pixels divided by2 consistently for fitted landmarks, tower lines and shared corners.
- Joint JR camera: position(111.438695,32.362589,−11.044468), FOV70.618479°, roll−0.058415°. Joint Rurubu camera: position(117.422211,33.357827,−13.199178), FOV53.389798°, roll0.399229°.
- All withheld source checks pass: JR maximum3.3181 original-image px(4.9771 at the1224px render); Rurubu maximum9.5243px. Fitted shared corners are within3.4394px; partly occluded foot check is within2.1044px.
- Planter centre local(u45.353757,v17.672420), rotation0.611191°, depth1.581252m,width1.499397m,topY32.000281m,baseY30.807027m,height1.193254m.
- Front-left planter top ray gap improves0.2024→0.0317m; front-right0.1636→0.00373m. Rear-left top gets worse0.0429→0.0948m, and the unfit glazing top0.0202→0.1385m. These disagreements are retained rather than treated as successful triangulation.
- Tentative nearby post and glazing foot heights are31.6267m and31.5688m, respectively. They suggest an entrance roughly0.8m above the lower walkway. Correspondence and paving uncertainty still prevent accepting a riser count or tread run.

## Construction implication

The planter base is0.28635m below the current provisional gardenY31.093377. The photographs distinguish the lower walkway from the cafe landing, so one flat plane should not be forced through both. Retain the current court/seat candidate until the lower walkway, planter, entrance landing and steps are rebuilt together and checked in both photographs and native traversal. The fitted planter dimensions are suitable for a provisional detailed component; cap thickness, planting well and concealed surfaces still need explicit assumptions.

Next: build the durable frontage and its entrance profile from this joint candidate, checking roof/post correspondences separately. A tentative roof-line study used ambiguous edges and is not a construction constraint. No changes to the entire courtyard datum should be inferred from that study.

## Validation and scope

Both source and joint camera overlays were rendered in Chrome from the exact saved poses. Joint measurements repeat byte-for-byte; tool syntax and Git diff checks pass. The comparison gallery and overlays are checked at desktop and mobile sizes. Camera checks are evidence for registration, not final photorealism, current game behavior or performance acceptance. Full station inner-roof01, furnishedcourt03 and all final goal gates remain unchanged/open.
