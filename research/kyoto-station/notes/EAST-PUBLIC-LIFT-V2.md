# Eastern public lift and receiving routes

## Evidence and scope

The [operator's 1F](https://www.kyoto-station-building.co.jp/floorguide/1f/),
[2F](https://www.kyoto-station-building.co.jp/floorguide/2f/) and
[7F](https://www.kyoto-station-building.co.jp/floorguide/7f/) diagrams locate
an eastern public lift beside the theatre and the East Square gallery.
The [visitor lift guide](https://kyoto-rys.com/facility/elevator/)
identifies its public stops as 1F, 2F Kyoto Theatre and 7F East Square.
It is separate from the hotel lift bank.

The candidate adds one operating car, protected landing doors at all three
stops, a forecourt entrance, a receiving corridor connected to the existing
theatre foyer, and an opening in the gallery lobby. These destinations are
research-backed. Shaft dimensions, exact passage alignment and finishes fit
the current model; they are not surveyed architectural plans. The existing
theatre and restaurant fitouts remain provisional.

The forecourt entrance follows the shallow recess and bronze-toned surround
in the visitor photograph. The source texture is retained around a bounded
opening. Floors, ceilings, shaft walls and receiving routes share browser
and native geometry. Lighting uses the existing bounded light pool.

## Private reference photographs

Retrieved 2026-10-01. Reference pixels are not shipped in the game or Git.

- [Entrance photograph](https://kyoto-rys.com/facility/elevator/26.jpg):
  `research/kyoto-station/photos/rys-east-public-lift.jpg`,
  SHA-256 `b9bcee181b8e64d76bb21364881f60d4433da43fae591e9bbb21bcf7de82ed8c`.
- [Entrance overview](https://kyoto-rys.com/facility/elevator/453.jpg):
  `research/kyoto-station/photos/rys-east-public-lift-overview.jpg`,
  SHA-256 `1bacc1f37ee21b0edd9ed79d28ed3c5754477b84fb2c236298910245d4786d26`.

## Acceptance

- Walk between each landing and its forecourt, theatre or gallery approach.
- Ride to each stop and step out onto supported floors.
- Keep every landing closed while its car is elsewhere or moving.
- Preserve the other lifts and escalators, native scoring and shot-rest rules.
- Inspect the rendered entrances and passages in Chrome; confirm source,
  browser and collision geometry match before merging into local main.

## Verification

- Six native walks cover the forecourt entrance, theatre foyer and gallery
  in both directions. Three Chrome keyboard walks cover the same approaches.
- Six native lift trips cover every stop in both directions. The worker
  rejects an invalid destination; an empty middle landing remains closed
  until its called car arrives.
- Chrome passes 22 lift checks, including all three exits, floor-picker
  keyboard controls, door closure during travel, grounded arrival and
  isolation from another player's private lift state.
- Nine clearance volumes cover the full car path, every doorway, the ground
  approach and both theatre corridor legs, against panels and rotated boxes.
- Six rendered views were inspected. No browser errors were reported.
- Source verification reopens the saved Blender scene and checks geometry,
  UVs, full-precision export normals, bindings and all 20 moving lift parts.
  One entrance-cut corner has a measured 0.269-degree difference in Blender's
  packed viewport normal; its export vector remains exact.
- `npm run build:web` and Chrome gameplay pass, including the normal spawn,
  movement, a complete throw, recall during flight and return home. The home
  test now waits for the Levels control to enable after recall.
- Native gameplay passes from the normal spawn, then throws from the new
  theatre landing. Translation and spin stop after 7.96 seconds, exploration
  saves no score, and recalling a moving ball forfeits the attempt.

The forecourt paving slopes about 6 percent at the entrance. It supports
walking but rejects a flat authored starting disk, so the entrance test
starts on the interior threshold, walks outside and then enters again.
The entrance floor meets the retained paving without flattening it.

## Rebuild

Use the parent manifest identified in the private receipt, then run:

1. `build-east-public-lift.mjs PARENT COMPONENT`
2. Blender `extract-east-public-lift.py -- PARENT COMPONENT`
3. `prepare-east-transfer-base.mjs PARENT COMPONENT/spec.json COMPONENT/station`
4. `open-isetan-ground.mjs COMPONENT/station/assets.json COMPONENT`
5. `web/v2/compose-component.mjs COMPONENT/station/assets.json COMPONENT COMPONENT/station COMPONENT/station/removal.json`
6. `integrate-east-public-lift.mjs PARENT COMPONENT/station/assets.json COMPONENT`
7. `verify-static-replacement.mjs` and `verify-east-public-lift-clearance.py`
8. Native routes, lift trips, Chrome routes and lift controls; inspect the rendered views.
9. Blender `install-east-transfer.py -- PARENT COMPONENT/station/assets.json COMPONENT COMPONENT/source`

Builder and verification scripts live under `web/station/realism/` except
`web/tests/lift-stops-browser.mjs`. Set `KYOTO_TEST_LIFT_START` to
`{"x":174,"y":0,"z":13.65}` for the latter: it places an authored start on the
landing without changing the normal game spawn.

The component adds 114 static panels / 1,372 triangles, one car and 16 light
fixtures using the existing lighting pool. The prior 14 lifts and 48
escalators retain their records. Private evidence is kept under
`.local/v2/current/components/east-public-lift/`; complete candidate exports
are removed after promotion.
