# Isetan second-floor public entrance

## Defect and acceptance

The north–south passage has a solid wall where the official directions show
Isetan's 2F entrance. Behind it, old façade and foundation surfaces cross an
unusable void. Open the glazed frontage into a continuous receiving floor with
an entrance aisle, cross aisles, cosmetics counters and an information desk.

Finish when ordinary native and Chrome walks pass through the entrance, around
the aisle loop and between the store and existing central-lift landing. Check
headroom, matching browser/collision geometry and saved editable source. Preserve
the connected ground/basement floors and the upper Grand Stairway.

## Evidence and limits

- [Station operator directions](https://www.kyoto-station-building.co.jp/directions/)
  identify the 2F entrance from the north–south passage.
- The operator's entrance photograph shows glazed doors and transoms, dark
  surrounds and a continuous public corridor. Saved reference:
  `photos/isetan-2f-passage-entrance.jpg`.
- [Isetan's 2F plan](https://www.mistore.jp/store/kyoto/shops/floor2.html), saved as
  `maps/isetan-2f-2026.png`, shows a receiving aisle, cosmetics islands,
  information desk, fragrance area, boutiques and internal circulation. North
  is to the right; the entrance is along the bottom edge. The station operator's
  2F diagram confirms the orientation.

The hall is fitted to the existing model; its dimensions and counter positions
are approximations. This increment provides access through the public passage
and existing central lift. Internal store stairs, escalators, store lifts,
remaining western rooms and branded fitouts remain unfinished.

## Construction and reproduction

The fitted floor spans X−123..−69, Z−28..16 at Y7.35. Its ceiling underside is
Y10.95, below the retained upper stair landing. The passage entrance has a clear 5 m opening with parked glass leaves,
fixed glazed panels, transoms and a header. Counter islands leave continuous
receiving, perimeter and cross aisles.

One original passage wall and 86 façade pieces are replaced. Bounded cuts in
147 further façade and foundation panels clear the room while retaining
the ground ceiling and all upper stair paths. The added component contains 175
closed panels, 2,100 triangles and fifteen fixtures served by the existing light
pool. The exporter removes fragments that collapse at float32 precision.

Reproduce in one private candidate folder:

1. Blender `extract-isetan-second.py PARENT COMPONENT` pins the exact source.
2. `build-isetan-second.mjs PARENT COMPONENT` builds the room and route definitions.
3. `prepare-porta-west-base.mjs PARENT COMPONENT COMPONENT/station` removes the
   declared old surfaces using their source faces.
4. `open-isetan-ground.mjs COMPONENT/station/assets.json COMPONENT` cuts the
   declared volumes, preserving authored façade normals.
5. `web/v2/compose-component.mjs` appends the room in the same station folder,
   with its `removal.json` receipt. Set the manifest spawn from the build report.
6. `verify-static-replacement.mjs`, `verify-isetan-second-headroom.py`, native
   `verify-east-transfer.mjs`, Chrome `walk-isetan-second-chrome.mjs` and the
   generated `views.json` check the full candidate station.
7. Blender `install-east-transfer.py` saves and reopens the editable source.

Scripts without explicit directories are in `web/station/realism/`. Inspect the
candidate on isolated port 4426, then replace the current local exports after
validation and remove the full candidate copies. Research imagery stays private.

Use `KYOTO_PREFLIGHT=1` first to check all native route entries. The full native
route run can use `KYOTO_FAST=1` to exercise the game's running input; the Chrome
routes use ordinary walking. Both speeds retain the same grounding and height
checks. The upper landing and southern stair approach are included explicitly.

## Delivery checks

- Fourteen native routes pass with running input and 3,602 position samples,
  plus a fixed-glass barrier check. Six Chrome keyboard walks pass, including
  the hall loop, information desk, central lift approach, retained ground stair
  and upper landing.
- 926 clearance volumes prove 2.1 m headroom along the new public routes. The
  hall ceiling remains below the retained upper landing, and its stair approach
  passes native traversal in both directions.
- Browser/collision correspondence, original façade attributes, and Blender
  save/reopen checks pass. The retained moving hardware stays unchanged.
- `npm run build:web`, native gameplay and Chrome gameplay pass for walking,
  full translation/spin rest, recall, menu and home.
- Seven Chrome views have no page errors or growing texture/reflection counts.
  The 840 short frame samples have a 16.7 ms median and 16.8 ms p99 at 1440×900;
  this is a local observation, not a sustained performance benchmark.
- Net static geometry growth is 1,835,624 bytes. Promotion replaces the current
  source and exports in place and removes the full candidate and test overlay.

The receiving hall remains an architectural shell. Internal 1F–2F circulation
is the next Isetan connection; decorative fitouts remain deferred.
