# Courtyard terrace, dining and planting

## Status

The bounded courtyard construction and integration pass is complete. This is part of the existing long-term reconstruction goal. It is not final visual acceptance or a published game update.

The candidate combines the sculpted terrace, a near concrete planter with white gravel and a clipped tree, the smaller tree above the pergola, and eight tables, 32 chairs and five dining umbrellas. It reuses original warm-granite textures and adds original furniture and leaf geometry; photographs are research references, not texture inputs.

## References and uncertainty

- [JR Central courtyard photograph](https://souda-kyoto.jp/blog/01367.html), published 8 September 2025; local `photos/niwa-jr-02a.jpg`. Capture date unknown. The September dining arrangement is selected.
- [Rurubu / Ryota Fujii](https://rurubu.jp/andmore/article/23413), published 8 June 2025; local `photos/niwa-rurubu-frontage.jpg`. Capture date unknown. This close view supports the fixed terrace and planter form. Its Japanese parasols and temporary promotional displays are not combined with the September arrangement.

Five terrace front polylines were back-projected at assumed stair heights using the two existing registered cameras. Hidden support closes against the registered cafe boundary. Stair count, elevations, hidden outlines, furniture dimensions and occluded placements remain estimates. The near tree's species is unidentified; a late-summer evergreen palette is used. The tree above the pergola is positioned from its JR crown at an assumed height; its hidden root is uncertain. One front table setting is moved 0.4 m south to retain the established north-stair endpoint's clearance.

## Construction evidence

- Current component: `court-life-07`, specification `court-life-spec-04`. It has 79 closed panels, including 68 colliding panels; 145,084 triangles; ten material batches; and three reused images. Seven materials are new. The 7,600 modeled leaves are decorative.
- Serialization checks all 180,738 emitted vertices and every triangle index/winding. Maximum Float32 position difference is 7.852 micrometres.
- `court-life-native-07`: all 17,284 sampled collision triangles pass against the native worker; maximum hit difference 0.125 mm; five independently checked coincident-surface ties. This proves component ray agreement, not public routes or gameplay.
- Full installation `station-court-life-04` replaces six provisional terrace panels and retains all 34,794 other native panels, all other physics records and all old material definitions. It adds 79 panels and seven materials.

## Corrections found during verification

- The initial smooth leaf rims produced zero Blender normals where front and back faces met. Separating the rim shading vertices preserves the closed leaf shape and fixes the normal fans.
- Blender's custom-normal encoding exceeded the existing 0.05-degree source-error limit on thin rods and one pebble. Original corner normals are now saved explicitly on new component meshes and read only by the opted-in browser export. The source-attribute verifier remains unchanged.
- The first route draft crossed a chair, continued past the raised garden floor, and reached an upper terrace step earlier than its expected elevation. The chair setting and route hypotheses were corrected. The seven original main paths are retained exactly; six additional access routes are revised. Final proof combines 24 unchanged passing walks from the full run with four passing terrace reruns on identical browser/native geometry.
- The browser export retriangulates a tiny cafe-threshold seam when the old terrace is removed. Diagnostic coverage difference is 0.000003166 square metres, within the existing 0.001-square-metre limit; 246 other triangles in that batch remain exact. Final export scope verification passes, retaining 1,890 unrelated batches and all 304 image bytes exactly.

## Remaining acceptance

The final export passes all 18 source materials / 459,840 vertices, 28 native walks / 580 rays, and all twelve local runtime scripts. Minimum covered headroom is 2.1766 m. Eight paired actual-game Chrome captures pass the incremental frame-time check. Review the complete courtyard in both registered views, record its remaining material/light/context gaps, then advance to the representative central hall bay and other station/plaza views. The wider 720p gameplay, twenty-minute music/context soak and all-course requirements remain open.


## Final geometry and runtime receipts

- Native/Blender: `station-court-life-04`; layout SHA `9ed317e3d57fb44d9a4dc7bd4400c8ac77b4c6c1311180e89f9e055982a27c9e`, Blend SHA `5b8c094bc77882debe1845df8624b2c0559d2371f884a044b291d2ee89453297`.
- Browser: `court-life-browser-04`; raw SHA `2fc2b60bff26ce0acfa4fde39b5bbd0ff039fb50e9be2080fa6163e80b14b3dc`, runtime SHA `590c7e1ce50aa8902ab0beda6e14a0f7fa491400170dcbee7a8955e842d44165`. Runtime size 120,691,724 bytes: +4,315,224 bytes, +145,027 triangles and +7 batches against paving02. All image pixels/dimensions and encoded image bytes are unchanged; no new texture storage.
- Routes05: `court-life-walk-proof-05.json`. `verify-court-route-evidence.mjs` requires identical final path points, geometry hashes, two passing walks with exact forward/reverse targets, and passing floor/head probes. The full run and targeted terrace receipts remain separate and linked; failed paths are not counted.
- The descent rerun removes an intermediate stopping point from a narrow tread while retaining the same continuous horizontal path. This avoids stopping while the capsule is still descending. The ray, step-height, endpoint-height and headroom tolerances are unchanged.
- `court-life-runtime-result-04.json`: all twelve runtime scripts pass in 518.5 seconds on private port 4500 with a private catalog/database and matching assets. The finale reaches eight waypoints and 5,174,538 points at full rest; rapid recall completes 64 throws. This is selected runtime coverage, not proof of all 31 authored shots.


## Chrome results and handoff

[Before/after gallery](courtyard-life/index.html). Both final actual-game images and both original photographs were visually inspected. Gallery checks at 1440 and 390 px pass: four images, 25 local links, working comparison selector, no overflow or browser errors.

Eight fresh Chrome 153 / M2 Metal sessions use five seconds warmup and twenty seconds measurement, in ABBA order per view. All use AC power consistently within every run and pair; source hashes and power settings match. Wide JR view: parent p95 18.6/18.6 ms, candidate 18.5/18.4 ms. Close Rurubu view: parent 18.6/18.5 ms, candidate 18.6/18.6 ms. Largest paired frame increase is 0.54%, within the 5% gate. GPU p95 increases 0.675–0.707 ms wide and 1.171–1.240 ms close. Maximum observed frame is 19.3 ms. No browser errors/warnings, hidden frames, disjoint/dropped/unfinished queries or skipped music steps; audio remains running and unmuted. Reflection captures stay at five. These are fixed-camera diagnostics, not the full 720p gameplay or twenty-minute soak acceptance.

The terrace, near planting and dining arrangement now read together. Major remaining gaps are material/light response, dark glazing/reflections, cafe interior detail, leaf scale/translucency/species and the uncertain above-pergola tree location. The existing late-summer approximation is not a botanical identification. No complete view is accepted as photorealistic.

Next work should advance the representative central hall bay and remaining station/plaza registrations. The wider goal still includes lower public connections, both plazas and adjacent frontages, evening, all-course proof (including the existing Skyway Trapdoor issue), full-game performance, soak and final asset/licensing delivery. No commit, push or deployment was performed.

The private candidate and parent services on ports 4500/4501 and their native workers were stopped and verified absent. Other existing services were left untouched. The primary checkout remains clean; research media and candidate binaries stay ignored.
