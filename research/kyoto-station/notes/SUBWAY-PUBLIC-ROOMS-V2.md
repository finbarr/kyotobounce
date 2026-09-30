# Subway public rooms and washroom approach

29 September 2026.

## Defect and acceptance

The North concourse represented five shopping-island bays as three rooms.
Central 1 combined the grocery and bakery in one room, placed the café beside
the gate instead of at its head, and omitted the public washroom approach.

Correct those room groupings, give every room a usable entrance, and connect
the washroom lobby from the eastern public aisle. Preserve the surrounding
cross-aisles, gate lanes, lift approaches and Porta connection. Check complete
floor coverage, native walking, Chrome views, gameplay and editable source.

## Evidence and limits

The [operator's Kotochika guide](https://kotochika.kyoto/kyoto/) and its saved
`maps/kotochika-kyoto-2026.pdf` establish the room groupings. North points left
on the map. Shops 2–4 line the western side of the North island; 6 and 5 face
east. Shop 1 occupies the northern head. Central 1 has café 9 at its head and
grocery 7 and bakery 8 on the eastern side, beside the washroom approach.
The saved [city K11 plan](https://www2.city.kyoto.lg.jp/kotsu/tikadia/img/map/sta/pdf/k11map.pdf)
supplies the surrounding gate, lift and public-route relationships.

Both PDFs were rendered and inspected directly. The filename's 2026 suffix
does not date the Kotochika drawing: its embedded metadata identifies a
September 2024 revision. The live operator guide and shop list were checked
on 29 September 2026. Existing operator photographs of Seijo Ishii and Ogawa
Coffee guide the broad open fronts, timber plinths and café's violet framing.
Photographs remain references, not game textures.

These diagrams are schematic. Room dimensions, exact doorway positions and
internal washroom partitions are fitted to the retained concourse. The rooms
are accessible shells; tenant interiors, sanitary fixtures, exact stall layout
and final signage remain unfinished. The English washroom labels are original
temporary wayfinding. Southern shops 10–14 and small kiosks 15–16 remain for
a separate structural pass.

## Construction

The replacement retires 38 coarse panels and six old light emitters. Thirteen
room envelopes include nine shop rooms, three washroom rooms and their public
lobby. Collinear shared walls are merged. The retained paid-core end walls
close the backs of the attached head shops and the northern island bays.
No floor, stair, gate, lift or escalator is replaced.

The head shop leaves a cross-aisle around the North core. Separate eastern
grocery and bakery fronts face the Central 1 aisle. A route around the bakery
reaches the washroom lobby and all three room entrances. Thirteen fixtures
use the existing pool of at most two active lights.

An entry test initially rejected a start circle on the Central 1 lift's
4 mm floor seam. The approach check now starts on the main floor, clear of
that seam. This was a placement constraint, not a walking obstruction.
Chrome inspection also caught mirrored washroom labels. Their text basis now
faces outward independently of wall-edge ordering.

## Verification and cost

- All 37 native walks pass, with 8,660 recorded position samples: thirteen
  doorway loops and twenty-four connecting route legs. They cover the North
  cross-aisle and island loop, Central 1 café and eastern shops, every washroom
  approach, both gate cores, both lift approaches and the retained Porta route.
  Connecting routes pass in both directions; endpoints are grounded and within
  0.06 m of their intended floor height.
- All thirteen room footprints have floor coverage at 4,580 sampled points,
  including their boundaries, checked against actual native floor triangles.
- All 131 new panels, 11,808 vertices and 3,936 triangles match between browser
  and native geometry. The 38 retired panels account for 456 old triangles.
  Retained native geometry and encoded browser buffers remain exact.
- The component adds seven material batches and 336,648 bytes of browser
  geometry, with no image textures or new moving hardware.
- Eleven views were inspected in actual Chrome with no page errors or growing
  texture/reflection allocations. Short 1440 × 900 samples have a 16.7 ms median
  and 16.8 ms p99 frame interval; this is not a performance soak.
- The label correction preserves every collision-enabled panel, box, beam,
  flight, lift, escalator and preview spawn. An exact identity check binds the
  earlier doorway walks to the final layout.
- The editable Blender scene saves and reopens with matching geometry,
  normals, materials, lights and retained object bindings.
- `npm run build:web`, isolated `npm run test:runtime` and
  `npm run test:v2:browser` pass. Gameplay checks cover walking, full translation
  and spin rest, unsaved exploration results, recall during flight and home.

## Rebuild and storage

Against the parent manifest, run `build-subway-public-rooms.mjs`,
`prepare-east-transfer-base.mjs` and `web/v2/compose-component.mjs` in order.
Use the component spawn and bind the candidate motion metadata to the new
layout. `verify-static-replacement.mjs` checks the changed and retained
geometry; `verify-subway-public-room-floors.mjs` checks floor coverage.
`verify-east-transfer.mjs` walks the declared routes in the full station.
`inspect-east-transfer-chrome.mjs` uses the generated inspection views.
`install-east-transfer.py` integrates the component into the editable Blender
scene, saves it, reopens it and checks geometry and retained object bindings.

The verified source and exports are integrated into the existing current asset
paths. Compact component files, receipts and inspection captures remain under
`.local/v2/current/components/subway-public-rooms/` (about 6 MB). The full
candidate and its port-4426 preview overlay are removed. Local main on port
4425 serves the same geometry and spawn; its North shopfronts and washroom
lobby were inspected again in Chrome after promotion.
