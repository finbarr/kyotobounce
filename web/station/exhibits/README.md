# K029 station exhibits

Three original independent prop layers: closed Diapason-style grand, Yamaha-style upright, and a simplified Kyoto Station architectural miniature in a framed glass cabinet. Physical props only. The operator marked the west instrument unavailable when inspected on 2026-09-08.

`spec.json` preserves reference URLs and inferred dimensions/placements. Operator and 2019 visitor enclosure photographs were inspected: dark low cabinet, short adjustable feet, pale display deck, clear panes, dark top rails and intermediate mullions. Photographs are research only, never textures. The miniature is original architectural massing (central valley, stepped west terraces, east hotel wing, central opening, canopy and skybridge); it does not reproduce a third-party LEGO model.

Proposed east niches occupy the south boundary and leave a conservative central exclusion for K027. They are not surveyed coordinates or coordinator-approved combined transforms. The west niche sits east of the existing K025 shop/gallery. Floor samples are generated from existing collision triangles, not floor bounding boxes.

All generated binaries/evidence go under `.local/station-detail/`. Canonical layouts, exporters, archived bundles and release manifests stay untouched. A candidate-specific harness loads the normal full game with matching candidate geometry for review.

Reproduce from repository root (Blender 5.2.1 LTS):

```sh
node web/station/exhibits/anchors.mjs emit
blender -b -t 2 --python web/station/exhibits/build.py
node web/station/exhibits/prepare-preview.mjs
web/station/exhibits/preview.sh
```

The preview assembles a scratch app from copies/symlinks and binds only port 4285. Its layer loader is confined to that scratch app. Start it after stopping any previous task-local process on that port. The database is namespaced by candidate layout hash. Do not register this candidate in the production archive registry.

Checks, with the candidate preview running:

```sh
npm run build:web
node web/tests/station-exhibits-geometry.mjs
node web/tests/station-exhibits-runtime.mjs
node web/tests/station-exhibits-faces.mjs
KYOTO_TEST_ORIGIN=http://127.0.0.1:4285 KYOTO_TEST_OUTPUT=.local/station-detail/scoring-runtime.json npm run test:runtime
node web/tests/station-exhibits-browser.mjs candidate
node web/tests/station-exhibits-browser.mjs inspection
```

The browser harness uses the normal game's scene, materials, lighting and UI, with explicit inspection camera poses and render-on-request to avoid overwhelming Linux SwiftShader. The baseline mode requires the original layout service. Inspection mode hides control overlays for leg closeups and produces a pose-stepped camera sequence; its frame cadence is not a gameplay performance measurement. Runtime probes use the actual service/native worker. Contact shots recall/forfeit after observation; the separate scoring suite proves full translation **and** spin rest and replay/live score parity.

Coordinate conversion is Blender `(x,z,y)` from native `(x,y,z)`; GLTF's Y-up conversion yields browser `(x,y,-z)`. Native triangle winding is reversed after the reflection. Material batching can retriangulate coplanar quads; geometry verification checks vertices and triangle interiors against the visible surfaces within 0.2 mm.

Integration: retain the three `k029-*` layer namespaces and all collision IDs. Load the separate GLBs into the station scene with their exported transforms, preserve their materials, and append the collision proposal to a **new** combined layout. Add bounds-tree support for camera clearance. Apply any coordinator-approved transform equally to visual and collision geometry, recheck core/door/gallery routes and rerun native evidence. The distributed source uses no research-image pixels, imported models, textures, audio or playable claims.
