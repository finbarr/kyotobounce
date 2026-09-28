# Skyway floor alignment and viewing-bay framing

27 September 2026. **Uninstalled construction assembly09**. [Review images and route plan](skyway-floor-alignment/index.html).

## Floor continuity

Central Skyway04 propagates the western landing's provisional **+0.140649 m** floor offset. Its western joint agrees exactly with bridge06. All 246 glazed screen tops stay at their previous height within float precision; all nine approach roof/arch/crown panels retain their world geometry. The floor and 545 handrail/low-rail panels follow the higher datum. The default builder still reproduces central03's GLB and native bytes.

The central corridor remains 147.687955 m long and 2.56 m wide with three 6 m viewing bays projecting 3.4 m north. These dimensions remain construction hypotheses from the operator topology and source roof geometry, not a surveyed floor. Raising the floor does not establish photographic accuracy.

Eastern bank02 meets the corridor at Y45.083488 m and the same source courtyard plane near Y29.973377 m. At the retained 30-degree construction angle, run increases to **26.171480 m**, rise15.110111 m. Each lane has 167 moving treads. The actual courtyard and onward route remain unfinished.

## Conflict found and corrected

Keeping the old bay framing after raising the floor left **40 member fragments intersecting the unchanged 2.1 m circulation volumes** (15/15/10). The initial central audit passed its vertical samples and first 18 walks, then the outer-edge start circle hit `central-roof-bay-1-tie-61` at 0.30004 m. The failed audit and targeted horizontal rays are retained.

The [2014 viewing photograph](https://www.zekkeikana.com/kyoto/shimogyoku/skyway/skyway46.jpg) shows an open viewing space beneath the outer grid. This supports revising the provisional inner lattice. It does not establish exact support sections or camera alignment.

Framing05 removes inner lattice through the full vertical opening and connects interrupted members to its boundary frames. The front frame moves 13 cm toward the glazing, from 150 mm to 20 mm inside the **unchanged** bay outline, behind the viewing guard. Its approximately 1.90 m height is outside the occupied clearance volume; side/back frames and ties bound the open interior. Floor/bay dimensions and all exterior glass/grid panels are retained. This is a geometrically checked construction hypothesis, not structural engineering validation.

- **3,155 exterior glass/grid panels unchanged**;21,537 total parent panels unchanged.
- 396 intersecting inner members become143 retained fragments, connected through36 frames and 126 ties.
- All 143 interrupted endpoints have independently verified connections to the saved meshes.
- No new member intersects the glass; minimum checked vertex-to-glass gap0.06666m.
- Zero roof-member intersections in all three unchanged circulation volumes.

## Verification

- Central/approach/bays: **36/36 walks**, 666 paired native/browser rays. Final receipt: [central-native.json](skyway-floor-alignment/central-native.json).
- Western restaurant/bridge against final assembly09:6/6 walks, 584 rays,zero unmatched hits or obstructions;four explicitly recorded shared-edge ties.
- Eastern bank:14/14 walks and 2/2 standing rides; 210 clearance locations. The first run incorrectly treated the moving comb-transition footprint as a fixed-surface probe; the corrected verifier proves the entire transition by actual walking. Its fixed/moving boundary now follows emitted deck endpoints.
- Eastern native evidence was captured on assembly08. [Spatial parity](skyway-floor-alignment/eastern-parity.json) proves every panel at X≥70m and both moving lanes/comb supports identical in assembly09. All changed bay geometry ends at X35.245m; the observed eastern walks begin at X72.977m.
- Final assembly:28,431panels,405,704triangles,24material batches,22,163,356GLBbytes. All758,462vertices and every winding/index match native geometry; maximum float conversion error0.000007124m.
- Chrome views use isolated construction lighting and an unmatched source camera. They do not establish photorealistic appearance or full-game performance.

## Installation dependency inventory

The [read-only inventory](skyway-floor-alignment/replacement-inventory.json) identifies317panels,236boxes,115beams,2legacy flights,2moving lanes,21lights and7routes (700records), plus55metadata references. The shared `skyway-circulation-floor` spans the old restaurant and access geometry. Repeated beam IDs require record index/hash and Blender geometry binding. Name matching is not spatial completeness or a deletion authorization.

Before installing: reconcile the western stairs/landing, complete the eastern courtyard and lower connection, remap inherited fixtures/signs/lights, and replace the shared floor and old route coherently. Full-station course/runtime tests and Chrome performance remain required. The full-station candidate is still inner-roof01; no reconstruction commit or deployment.

Assembly GLB SHA-256: `b6a9aa5b064d1d3a8da7eff53f0eae7c5cbc8bde9133799099b4fda1254bbdad`

Native SHA-256: `c857877f695efe9ce325dcdff8c749beb1120a493892c14213d41465b1d0b517`
