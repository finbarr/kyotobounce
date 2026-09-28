# Central hall: corrected floor and gate passage

The bay now has a source-derived approach footprint, a continuous gate passage and stone returns on both sides. Its isolated native checks pass. It remains uninstalled because the basement cutouts, neighboring architecture and gameplay courses still need a coordinated full-station replacement.

[Construction views and receipts](central-hall-passage/index.html) · [Earlier integration inventory](CENTRAL-HALL-INTERFACE.md)

## Corrected source interpretation

The earlier 0.2366 m floor choice was unsupported. `audit-central-hall-floor-source.mjs` inspects upward/downward horizontal triangles in municipal object `Untitled.200`, within the declared hall review bounds. The main upward-facing floor comprises 189 selected faces at Y=0.036578–0.036588 m. No qualifying horizontal face in this review is at 0.2366 m. Other horizontal levels include 0.1366 m ledges and lower surfaces; their presence does not make them a continuous public floor.

The source-floor union, clipped to the sample approach, covers 187.419 m². It excludes about 26.216 m² of the old rectangular approach, including the photographed basement-opening area. The excluded region also contains curb/edge details and must not be treated as a surveyed measurement of the basement voids alone.

The new candidate retains the playable concourse datum Y=0. The source's roughly 3.66 cm difference is an explicit local datum assumption pending stronger hall registration. No step or global building translation is inferred. A flat 95.194 m² passage extends through the source gate opening to the provisional 5.6 m return depth. Its hidden floor and onward connection remain inferred.

## Construction

Latest component: worktree `.local/station-realism/central-hall-bay-07/`, generated from `central-hall-bay-spec-03/spec.json`.

- 88 new stone return panels, with backing, continue the dark lower and pale upper gate finish.
- 222 paving slabs follow the corrected footprint, with 2 mm recessed joints.
- One native floor surface contains the connected paving and backing. The renderer retains the actual tile geometry.
- 581 closed records, 468 colliding records, 9,884 triangles and 29,652 vertices.
- Eight materials and nine original 512 px maps. GLB 2,952,640 bytes; calculated decoded RGBA+mip storage remains 12 MiB. No reference-photo pixels are used as textures. Counts are not performance measurements.

Hashes:

- Specification: `6e8e0ece48f72e7cb244de1d9bc0f18e09bd1b7923487ca15f13328178164bc8`.
- GLB: `f12f487493c4999c85e79af0dc1e153f6d108fd6fff82115e7a372c8f5389296`.
- Native panels: `24144a18702024958534f5bb080219ebbdb47fbabe1884294ff7bea127aaf6b1`.
- Source floor audit: `29c967a3cb2b6e9689e9833264de2bec00c61d88613515a45039743bf60e2ab9`.

The inspection renders still show sharp edges, distant joint aliasing, simple glazing and incomplete indirect light. They do not meet the final visual standard. Their cameras are unregistered inspection poses, not new photo acceptance views.

## Verification

`verify-central-hall-floor.py` independently reconstructs the source footprint and compares it with actual emitted native triangle caps. Backing symmetric-difference area is 1.16e-14 m²; tile area outside the footprint is zero. The backing's exposed joint surface is Y=-0.002 and tile tops are Y=0.

Serialization checks every emitted browser/native vertex, triangle and winding: maximum coordinate difference 1.035 micrometres. All 9,884 face normals pass.

`central-hall-bay-native-07/report.json` passes all 8,528 colliding triangle probes against a private compatible worker. Maximum hit difference is 5.161 micrometres, with four independently checked shared-boundary hits. The native layout contains only the component's geometry.

`central-hall-passage-walk-02/report.json` passes 12 floor-support queries, nine internal head-clearance queries, six actual capsule walks and an expected miss through a source cutout. Three lanes traverse local depth -1.5 to +4.5 m and return, at X=gate-west+0.75, X=0 and X=gate-east-0.75. Start-circle radius remains 0.25 m. Full-station routes and ball trajectories were not tested.

Two earlier failures were retained and corrected:

1. Revision05's tile clipping snapped boundary intersections a second time, creating 5.408e-6 m² outside the floor boundary. Removing that second snap fixes the actual geometry; the 1e-6 m² verifier limit is unchanged. Revision06 passes the footprint check.
2. The first native walk run completed the west lane, then rejected the center-lane start because a circle spanned separate tile surface IDs. Revision07 combines the connected floor into one surface. The native placement rules, radius and test positions are unchanged.

## Course and integration consequences

Correcting the height does not make this a drop-in replacement. A point-in-footprint check finds Balcony waypoint centers `patch-1`, `patch-2` and `patch-5` outside the source-derived floor, by 0.256, 0.427 and 0.259 m respectively from its boundary. The other two centers are inside. This is geometric evidence, not an executed course failure. The source cutout guards, curbs and descending circulation need reconstruction before reconciling the course with the complete space.

Adding the component over the existing concourse would fill the cutouts and create coincident surfaces. Installation must replace the relevant browser and native floor region together, preserve connected circulation, and then prove gameplay against the resulting geometry.

Still required: basement guards and stairs, independently registered depth landmarks, gate equipment/offices, neighboring bays, canopy bearing, 3F/4F interfaces, full-station route/course/runtime tests, actual-game visual comparisons and Chrome performance/soak checks. No new broad registration or final visual milestone passes here. The older Skyway Trapdoor failure remains open.

Current full station remains courtyard life04/browser04. No C#, service, scoring, canonical-course or production changes; no commit, push or deployment.
