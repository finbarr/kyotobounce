# Miyako Michi and the western Hachijo frontage

29 September 2026.

## Defect and acceptance

The western ASTY street ended beside an empty area beneath the railway.
Miyako Michi, its western plaza and the adjoining Hachijo forecourt were
missing. A lower Kintetsu wall crossed the space needed for the eastern rooms.

Connect ASTY through the shopping street to its western plaza, open all three
mapped public exits, and join the new forecourt to the retained terrace stair.
Every room shell must have a usable doorway. Both washroom lobbies must be
reachable from the street. Preserve the upper railway hall, match browser and
native geometry, integrate the editable source and check normal gameplay.

## Evidence and limits

- The [official floor guide](https://kyoto-miyakomichi.com/floorguide) supplies
  the bent main street, three public south exits, western fountain plaza,
  washroom locations and room groupings. Its saved 1565 × 440 image was
  inspected directly. The diagram is schematic and has no confirmed
  publication date.
- The [operator introduction](https://kyoto-miyakomichi.com/introduction)
  describes the roughly 200 m street and its changes of direction, floor and
  ceiling treatment. Its entrance, fountain and street photographs guide the
  bronze framing, dark paving, pale walls and warm shop fascias. The street
  photograph contains Autumn 2013 banners; it does not establish current
  tenants or decoration. Generic Unsplash hero backgrounds on the website
  are excluded from the station evidence.
- [Kintetsu Real Estate](https://www.kintetsu-re.co.jp/business/urban/shopping_center/)
  corroborates the approximate length, roughly 40 shops and location beneath
  the elevated railway.

Connections and room grouping follow the operator map. Widths, ceiling height,
door positions and placement are fitted to the current station. The 3.15 m
ceiling and approximately 215 m footprint are not surveyed measurements.
The dense eastern shop groups are accessible room shells; their individual
stalls, service rooms, tenant fitouts and signs remain unfinished. The mapped
small southeast stair has no confirmed onward destination and is deferred.
The western water feature has a static basin; its programmed falling-water
display remains unfinished. Photographs are reference files, not game textures.

## Construction

A continuous ground slab supplies the bent street, 31 room shells and the
western forecourt. Its northeast notch meets the existing Kintetsu ground
floor without duplicating it. Dark paving follows the street and three exits.
Shop glazing, fascias and open doorways define the room fronts; unknown rear
areas are enclosed. Sixteen ceiling fixtures use the existing pool of at most
two active lights. The fountain basin and central bronze pillar locate the
two main changes of direction.

One old Kintetsu wall is replaced with an intact upper enclosure and a shorter
lower remainder. This opens only the ground-level space needed by the eastern
rooms. The upper railway hall and its floor remain intact.

The first entry check found the retained Shinkansen pier directly in front of
the eastern washroom doorway. The doorway now sits farther south along the
same mapped frontage. Separate walks cover the full approach from the street
into both washroom lobbies, in addition to the doorway checks.

## Verification and cost

- All 47 normal-speed native walks pass, with 13,998 recorded position samples.
  They cover 31 room doorways, the full street, both washroom approaches,
  three public exits, the exterior forecourt and the retained upper railway
  hall. Through-routes are checked in both directions; endpoints are grounded
  and within 0.06 m of their intended floor height.
- All 505 added panels, 18,600 vertices and 6,200 triangles match between
  browser and native geometry. One old panel with twelve triangles is removed.
  Retained native records and encoded browser buffer bytes remain exact.
- The component adds eleven material batches and 529,744 bytes of browser
  geometry. It adds no image textures or moving hardware.
- The editable Blender scene saves and reopens with matching geometry,
  normals, materials, lights and retained object bindings.
- Fifteen Chrome views cover the street, its bends, plaza, fountain, three
  public entrances, forecourt, eastern room and both washroom approaches.
  There are no page errors. Short samples at 1440 × 900 have a 16.7 ms median
  frame interval; these are inspection samples rather than a performance soak.
- `npm run build:web`, isolated `npm run test:runtime` and
  `npm run test:v2:browser` pass. Checks cover walking, throw completion at full
  translation and spin rest, unsaved exploration results, recall during flight
  and return to the start.

## Rebuild

Against the parent manifest, run `build-miyakomichi.mjs`,
`prepare-east-transfer-base.mjs` and `web/v2/compose-component.mjs` in order.
Use one candidate directory. Point its motion-layout identity at the new
layout without changing moving hardware, and use the component's spawn.
`verify-static-replacement.mjs` checks the replacement and retained geometry.
`verify-east-transfer.mjs` walks the declared routes in the full native station;
`inspect-east-transfer-chrome.mjs` uses the generated inspection views.
`install-east-transfer.py` installs the component in the editable Blender scene,
saves and reopens it, and checks its geometry, attributes and object bindings.

After verification, replace the current full assets in place and retain only
small component files and receipts under
`.local/v2/current/components/miyakomichi/`.

The verified source and exports are integrated into the single current
station. The full candidate and its port-4426 overlay are removed; retained
component meshes, receipts and inspection captures occupy about 10 MB.
The main preview on port 4425 serves the same geometry and spawn. Its entrance
and corrected washroom approach were inspected again in Chrome after promotion.
