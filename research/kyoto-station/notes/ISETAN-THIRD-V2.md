# Isetan third-floor connection

## Defect and acceptance

The western 3F landing faces a sealed store frontage. Behind it, separated
floor plates and old facade/foundation geometry leave no usable receiving hall.
The northern internal stair ends at 2F.

Connect the landing to a continuous hall and extend the northern stair to 3F.
Finish when native and Chrome walks pass through the entrance, across the floor
joins, around the hall and up/down the new stair. Preserve the lower store stair,
its 2F arrival and the upper public stair approach. Check 2.1 m headroom, matching
visual/collision geometry and the saved editable source before local delivery.

## Evidence and limits

- The [station operator's 3F map](https://www.kyoto-station-building.co.jp/floorguide/3f/)
  shows the western Isetan floor and separate southern restaurant area. Saved
  reference: `maps/floor-3f.svg`.
- Its [Isetan layer](https://www.kyoto-station-building.co.jp/app/themes/kyoto-station-building/floorguide/img/map/img_map_3f_isetan.svg)
  shows an eastern entrance, connected aisles, a northern stair core and lifts.
  North is up. Saved reference: `maps/floor-3f-isetan.svg`.
- [Isetan's current floor guide](https://www.mistore.jp/store/kyoto/shops/floor3.html)
  identifies shoes, bags, accessories, boutiques and Kirei Terrace on 3F. Its
  separate PNG floor plan timed out; the station operator's diagram supplies the
  circulation evidence used here.

The construction is fitted to the current model, not measured from a survey.
Only the receiving hall and northern stair are addressed. Store escalators,
upper lift stops, further western rooms and branded fitouts remain unfinished.
The low display blocks establish clear aisles; they are not surveyed counters.

## Construction

Use the retained landing's Y11.528693 datum and preserve both original 3F floor
plates. Fill only the missing floor area inside X−123..−69, Z−28..16, leaving
the northern stairwell open. Cut crossing facade and foundation surfaces only
inside the fitted room volume. The room steps back to X−76 beside the public approach stair, with its entrance
at the clear southern landing (Z−24). Its L-shaped ceiling has an underside at
Y14.34 and stays outside that stair. The northern ceiling is below the retained
Grand Stairway and escalator structure.

The new internal stair uses 24 treads, 0.3 m going and approximately 0.1741 m
rise. Its shorter flights fit over the existing 1F–2F flights. A guarded middle
landing, protected floor opening and north aisle join the existing circulation.

Reproduction uses `prepare-isetan-third.py` with the local geometry Python
packages, Blender `extract-isetan-third.py`, `build-isetan-third.mjs`, then the
existing `prepare-porta-west-base.mjs`, `open-isetan-ground.mjs` and
`web/v2/compose-component.mjs` tools. All geometry is built in one candidate.
Use the existing static-replacement, stair-headroom, native-route and Chrome
route checks before Blender `install-east-transfer.py` and in-place promotion.

## Verification

- Sixteen native routes pass with 3,587 position samples and a stairwell barrier
  check. Seven Chrome keyboard routes pass with 53 waypoints, including the new
  stair in both directions, entrance, aisle loop, cross aisle and retained stairs.
- The floor check verifies continuous joins without duplicate top faces and
  preserves all three original floor/landing panels exactly. The stair check
  verifies 2.1 m headroom in 1,141 volumes across 138 new and retained treads and
  the selected approach routes. Oblique public stair bounds are resolved against
  their contour footprints; the public stair remains traversable.
- The component adds 111 closed panels / 1,412 triangles, removes 93 obstructing
  surfaces and makes bounded cuts in 102 further panels. Browser/collision
  correspondence and Blender save/reopen checks pass, including corner normals,
  sign UVs and retained bindings. Moving hardware remains unchanged.
- `npm run build:web` and native gameplay pass, including full translation/spin
  rest, recall forfeiture and home. Chrome gameplay also passes walking, throwing,
  rest, recall, menu and home.
- Five Chrome views have no page errors. The 600 short frame samples have a
  16.7 ms median and 16.8 ms p99 at 1440×900; texture count stays at 375 and
  reflection captures at seven. This is a local observation, not a sustained
  performance benchmark.
- Net static geometry growth is 2,153,436 bytes. Delivery replaces the current
  bundle in place and removes the full candidate exports and isolated overlay.

The next structural connection is the store's 4F receiving level, to be checked
against the existing Muromachi/Grand Stairway routes before further construction.
The 3F hall remains a fitted architectural shell.
