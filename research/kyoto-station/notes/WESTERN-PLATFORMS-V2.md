# Western platforms 30–34 and the ground concourse

29 September 2026.

## Defect and acceptance

The western approach from platform 0 ended at a tall wall. The municipal
building shell occupied the lower space needed for the bay platforms, and
platforms 30–34 and their terminating tracks were missing.

Open the approach beneath the retained upper building and connect every
platform face to a common ground concourse. Check both directions of each
entrance, all three full platform aisles, the platform 0 approach and the
cross-concourse route. Keep browser, native collision and editable geometry
consistent. Inspect the connected station in Chrome and verify core gameplay.

## Evidence and modeling limits

- The [JR West station plan](https://eki.jr-odekake.net/premises?id=0610116)
  is dated 31 January 2026; both saved PDF pages were visually inspected.
  It establishes the ground-level connection from platform 0 and the grouping
  of 30/31, 32/33 and the narrow alighting platform 34.
- [Kyoto City Tourism Association guidance](https://plus.kyoto.travel/entry/traffic-advice),
  updated 18 March 2026, supplies a schematic map and a photograph of the
  covered approach. The map shows three platform strips and four track paths;
  platform 34 shares the northern track with platform 33. The photograph shows
  dark paving, large columns and high windows along the approach.
- [Mister0124's photograph of platforms 30/31](https://commons.wikimedia.org/wiki/File:JR_West_Ky%C5%8Dto_Station_JR_Line_Platform_30%E3%83%BB31.jpg),
  captured 10 December 2022, shows the island beneath the building, with open
  tracks on either side and large columns. It is licensed CC BY-SA 4.0.
- The registered municipal building and canopy footprints constrain placement.
  The external canopy over 30/31 is retained.

The maps establish connections, not surveyed dimensions. Platform lengths,
track endpoints, column spacing and the 6.5 m ceiling are fitted to the current
model. The approach is ground level; no connecting stair is invented. Track
switches, trains, final signs, tenant interiors and detailed finishes remain
unfinished. Research images are local references, not game textures.

## Structure

Three platform strips meet a common concourse around four buffered track ends.
Each passenger edge has coping and tactile paving. Separate guards protect
the track heads while leaving the platform entrances open. The track beds have
rails and sleepers; the outside 32/33 section receives its missing canopy.
Columns, beams, platform numbers and 23 fixtures complete the structural pass.
The fixtures use the existing pool of at most two active lights.

Four selected shell panels are clipped below Y6.5 and south of Z-4.8. Their
upper and northern faces retain their texture coordinates and normals. A new
ceiling and northern wall close the cut edges. Fourteen old platform-0 panels
are replaced so that its floor and canopy stop correctly beside track 30.

One buried original face had already been split into six browser triangles.
The opening tool preserves those exported fragments and makes the editable
and collision records agree with them. Its containment tolerance is 30
micrometres, accounting for float32 coordinates; the six fragments retain
more than 99.9% of the original face area.

## Verification

- The replacement contains 208 panels and 19,228 triangles in eight material
  batches. Fourteen panels with 348 triangles are retired. Four retained shell
  records are selectively rebuilt; all other native records remain exact.
- The shell check compares 4,771 replacement triangles with browser geometry,
  including winding, UVs and normals. It verifies 4,690 wholly retained shell
  faces and 2,659,111 other browser faces, preserving the original encoded
  buffer bytes and material definitions.
- The editable Blender scene saves and reopens with matching geometry,
  attributes, materials, lights and retained object bindings.
- Eleven Chrome views cover the approach, concourse, platform entries, aisles,
  track heads and external canopies, with no page errors and stable texture and
  reflection-capture counts. The short samples retain the previously observed
  33.3 ms browser cadence. After promotion, the two main-build inspection views
  show 16.7 ms with unchanged assets. These are short checks under changing
  laptop conditions, not a controlled benchmark or a performance soak.
- `npm run build:web`, isolated `npm run test:runtime` and
  `npm run test:v2:browser` pass. Checks include walking, full translation and
  spin rest, free results, recall during flight and return to the start.

All 22 normal-speed native walks pass, with 18,002 recorded position samples.
The checks cover every platform face, all three full aisles in both directions,
the opened platform 0 approach, the cross-concourse route and the retained
floor beside the track notch. All endpoints remain grounded. Private receipts live
under `.local/v2/current/components/western-platforms/` after delivery.

Two initial Chrome captures were blank although geometry and camera rays were
clear. Both views were rechecked in a fresh Chrome session and inspected
successfully; their initial blank captures are not accepted as visual evidence.
The cause of the transient blank captures is unconfirmed.

## Rebuild

Against the parent manifest, run these in order:

1. `build-western-platforms.mjs` creates the component and removal specification.
2. `prepare-east-transfer-base.mjs` removes the fourteen exact old panels.
3. `open-western-platform-shell.mjs` opens the four selected shell panels.
4. `web/v2/compose-component.mjs` appends the component into the same candidate.
5. Point the candidate motion-layout identity at the new layout without changing
   moving hardware, and use the component's concourse spawn.
6. `verify-static-replacement.mjs`, including `verify-western-platform-shell.mjs`,
   checks scope, unchanged geometry and matching positions, UVs and normals.
7. `verify-east-transfer.mjs` walks the declared routes in the native worker;
   `inspect-east-transfer-chrome.mjs` uses the component's views for inspection.
8. `install-east-transfer.py` installs the same changes in the editable scene,
   saves and reopens it, then verifies the object bindings and attributes.

Use one candidate, promote its verified full assets to the current station,
and retain only small component files and receipts after promotion.

The verified assets are integrated into the single current station. The
editable source and exported station replace their previous versions; the
full candidate and its port-4426 overlay are removed. The remaining component
receipts, reference renders and diagnostic files occupy about 18 MB. The main
preview serves the same geometry and spawn on port 4425.
