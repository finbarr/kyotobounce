# Southern subway rooms and serving kiosks

29 September 2026.

## Defect and acceptance

The playable Central 2 and South concourses had bare paid-core walls where the
operator map shows five shops and a station office. Central 1 also lacked its
two serving kiosks. Two southern room footprints extended beyond the existing
floor and ceiling.

Build those room envelopes with usable public entrances or counter bays,
complete their floors and ceilings, and preserve the gate lanes, South lift,
JR approach and continuous southern public aisle. The staff office stays
closed with a recognizable door and window. Verify native walking, complete
floor coverage, actual Chrome views, editable source and normal gameplay.

## Evidence and construction limits

The saved Kotochika floor map and city K11 diagram were inspected directly.
The [operator guide](https://kotochika.kyoto/kyoto/) locates shops 10–11 at
Central 2, shops 12–14 around South, the office between the cores, and kiosks
15–16 on the two sides of Central 1. The
[current shop page](https://kotochika.kyoto/kyoto/shop.html), checked today,
supplies photographs of AYANOKOJI, Hyozaemon, Atelier Haruka and Krispy Kreme.
Four small reference images are saved and registered in `sources.json`.
They guide pale framing, green shopfront accents, glazed openings and the
recessed serving counter. The page supplies no café photograph; its finishes
remain provisional. Publication dates for the photographs are not supplied.

The plans establish relationships, not surveyed dimensions. Room depths,
door positions and their fit around the retained cores remain provisional.
The two Central 2 rooms flank the existing gate opening. South's rooms fit
around its stair enclosure and lift, with the café beyond the paid end wall.
Tenant interiors, merchandise, precise partitions and final signs remain
unfinished. Reference photographs are not shipped as textures.

## Construction and checks

- Five shop envelopes, two serving kiosks and one closed staff office add
  114 panels and 2,480 triangles. Four old perimeter panels (48 triangles)
  are replaced with boundaries around the expanded rooms.
- Two floor strips add 207 square meters, with matching ceiling strips.
  They meet existing slab edges without overlapping them. Retained floor
  and ceiling material properties continue across the joins.
- All 114 panels and 7,440 vertices match between native and browser
  geometry. Retained native records and browser buffer bytes remain exact.
- Floor coverage passes at 2,624 sampled points across all eight room
  footprints, including their boundaries.
- Every shop and kiosk entry passes in native physics. The counter and
  closed staff-office boundary both prevent entry into their working areas.
- All 25 route walks pass, with 6,561 position samples, including the full
  eastern public aisle, both
  Central 1 kiosk aisles, both gate approaches, the South lift approach,
  the new floor joins and the retained JR gate route. Connecting routes pass
  in both directions, with grounded endpoints within 0.06 m of floor height.
- The South platform lift passes five checks covering lower entry, doorway
  sensing, grounded travel and upper exit, closed empty-shaft doors and a
  called round trip. Moving hardware is retained exactly.
- The component adds nine material batches and 214,592 bytes of browser
  geometry. Eight fixtures use the existing pool of at most two active lights.
  No image textures or new moving hardware are added.
- Thirteen Chrome views pass with no page errors or growing texture/reflection
  allocations. Short 1440 × 900 samples have a 16.7 ms median and 16.8 ms p99
  frame interval; this is not a performance soak. The floor and ceiling joins
  were inspected again after matching their finishes.
- An exact collision/motion identity check binds the native walks and lift
  checks to the final finish correction. The floor coverage checker also
  passes against the thirteen rooms from the previous delivery.
- The Blender scene saves and reopens with matching geometry, normals,
  materials, lights and retained bindings. `npm run build:web`, isolated
  `npm run test:runtime` and `npm run test:v2:browser` pass, including full
  translation/spin rest, recall and return home.

## Rebuild and delivery

Run `build-subway-south-rooms.mjs`, `prepare-east-transfer-base.mjs` and
`web/v2/compose-component.mjs` against the parent manifest. Bind the candidate
motion metadata to the new layout and use the component spawn.
`verify-static-replacement.mjs` checks replacement scope;
`verify-subway-public-room-floors.mjs` checks each room's actual native floor.
`verify-east-transfer.mjs` walks the component routes and tests its closed
boundaries. `verify-component-lifts.mjs` checks the retained South lift.
`inspect-east-transfer-chrome.mjs` uses the generated inspection views.
`install-east-transfer.py` saves and reopens the integrated Blender scene.

The verified source and exports replace the existing current asset paths.
Compact component meshes, receipts and inspection captures remain under
`.local/v2/current/components/subway-south-rooms/` (about 6 MB). The full
candidate and its port-4426 preview overlay are removed.
Local main on port 4425 serves the verified geometry and spawn. The counter,
café floor and eastern kiosk were inspected again in Chrome after promotion.
