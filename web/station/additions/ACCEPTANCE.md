# Station additions acceptance

All 22 packages in the [accepted checklist](../../../docs/STATION-DETAIL-BACKLOG.md) are implemented. Current asset pack: **assets-v6**. Canonical visual/native layout: `232b331fe5f7543bf8b228774e15c6228fffb5ee389c2a538029665827e19cc8`.

## What passed

- 5,276 generated objects, 162,848 generated triangles, 3,074 physical solids and 137 sign faces. The authoring check compared every generated solid with its visible Blender bounds to 0.1 mm numerical tolerance.
- 20 of 20 actual native capsule walks, 430 floor-support samples and no route-clearance failures. This includes the public passage, West Square balcony and both promenade connections.
- 12 of 12 native ball-contact checks: shelves, counters, stairs, doors, passage wall, curved wall, play structure, guard, Skyway base and forecourt column.
- All 30 current courses: 60 of 60 repeated authored solutions collected every waypoint and each retained destination at full translating/spinning rest. 26 of 35 neighboring throws also full-cleared; every neighbor reached physical rest. Exact solutions establish feasibility, not broad human tolerance.
- The full campaign ran first. Three moved finish zones then received repeated native proofs. A comparison of the captured catalogs confirmed that the other 27 course definitions were unchanged between those runs.
- Isolated service integration passed reconnect recovery, authoritative/live/final score parity, progression, overlapping waypoints, required-waypoint ranking, replay sharing/cache concurrency, 2× playback and the native throw-based level designer.
- Type checking, unit tests, station-wayfinding registration, material integration and the complete lossless asset check passed. The latter compared every ordered triangle attribute, material, transform and bind pose with the delivery asset.
- 44 current inspection views were reviewed with opposing angles. The playable game showed the new NIWA frontage, readable required-waypoint markers and working Day/Evening control. No browser or shader errors were observed.

Seven current courses have adjusted target surfaces, radii or finish positions for the new architecture: First Bank, Lost and Found, Exact Change, Pillar Carom, Glass Pinball, Underpass Uppercut and Concourse Cruiser. Their launch inputs are unchanged. The underpass route now uses an actual column–ceiling–floor sequence; no collision surface or destination was bypassed to manufacture a pass.

## Rendering and download measurement

Chrome 150 on Apple M2, 1280 × 720, DPR 1, fixed buffer, unchanged texture resolution. Two baseline runs and three final runs used the same four camera routes. No build, native proof or second game renderer ran during the measurements. GPU queries were disabled; CPU render/submission time is not isolated GPU execution time. Local startup time is not an internet loading benchmark.

| Fixed view | Before FPS, both runs | After FPS, all three runs | Mean draw calls, before → after |
| --- | --- | --- | --- |
| central-hall | 58.5, 60.0 | 60.0, 30.5, 60.0 | 311 → 418 |
| west-escalators | 38.1, 58.5 | 60.0, 43.8, 60.0 | 381 → 434 |
| sky-garden | 53.3, 53.3 | 59.7, 60.0, 58.8 | 835 → 1038 |
| east-concourse | 51.0, 55.5 | 60.0, 60.0, 60.0 | 234 → 320 |

The second final run had a pronounced hall/west hitch whose cause was not isolated. All results are retained; these short measurements do not establish stutter-free play on every device. The fixed west benchmark pose is partly occluded, so separate standing-height views establish architectural acceptance.

The final garden runs were 58.8–60.0 FPS versus 53.3 FPS before. Opaque additions use larger spatial batches; transparent surfaces retain fine bins. This reduced the initial candidate from 1,073 to **859 export batches**, preserving all **1,598,441 station triangles**, normals and UVs. The source GLB is 193,912,928 bytes; its lossless delivery GLB is 71,269,752 bytes.

The five measured asset resources totaled **38,439,540 → 41,371,274 Brotli-encoded bytes** (+2,931,734 bytes, +7.6%). This is the asset payload, not all page traffic. The increase buys the added architecture; no simplification or texture downscaling was used to hide it. Signs use three bounded atlas pages and the evening installations use three static batches with time uniforms. The practical light pool remains two shadowless lights.

## Review and reproduction

[README.md](README.md) describes source registration, authoring and proof commands. [Current cameras](../../../docs/STATION-AUDIT-VIEWS.json) retain the named anchors and source URLs. The generated local review at `artifacts/station-additions/index.html` pairs six operator photos with approach/reverse renders, includes matched before/after views and provides the compact native/campaign/render receipts. Research images are linked to their official hosts; they are excluded from Git and the asset pack.

Source maps are schematic, some photo dates are unknown, and store interiors and installation artwork are original interpretations. This is not a surveyed or photorealistically exact station replica. This batch does not deploy production.
