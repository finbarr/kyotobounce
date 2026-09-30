# Granvia ground entrance connection

## Confirmed defect and scope

The playable ground hotel entrance is a closed glass panel backed by a solid wall.
The adjacent lift is a fixed door prop. Neither connects to the existing 2F
receiving lobby. Chrome inspection and the canonical collision layout confirm
both defects. Two walls of the ground east–west passage also cross the route
behind the entrance.

This increment connects the ground entrance to the 2F lobby with a stair,
paired operating escalators and a working lift. It opens the ground passage
crossing and upper receiving doors while retaining the M3F bridge connection,
theatre approach and existing public circulation.

Acceptance: walk from the forecourt through the entrance and up/down the stair;
ride both escalators and the lift into the existing lobby; retain the bridge,
theatre and ground passage routes. Check full-layout clearance and protected
edges, matching browser/collision/editable geometry, real Chrome controls and the
native play loop. Commit and merge only after those checks pass.

## Evidence

- [Official floor guide](https://jrwest-hotels.jp/granvia-kyoto/floor/): 1F main
  entrance and vehicle drop-off, 2F reception and lobby.
- [1F map](https://jrwest-hotels.jp/granvia-kyoto/floor/images/img_floor_1.jpg):
  opposed theatre/hotel approaches, broad stair, paired escalators and hotel lift.
- [2F map](https://jrwest-hotels.jp/granvia-kyoto/floor/images/img_floor_2.jpg):
  the main entrance joins the lobby beside the lift, with the ground drop-off
  connection at its other end and a separate M3F stair.
- [Official access guide](https://jrwest-hotels.jp/granvia-kyoto/access/):
  confirms the 1F–2F lift route for wheelchair users and separate Central Gate
  and north–south passage approaches.

The map's north arrow points down; the main entrance is on the east side of the
lobby. Dimensions and registration must be fitted to the current model. These
diagrams do not establish construction measurements, escalator operating
directions, or exact finishes. Saved reference images are private research,
not game textures.

## Candidate construction

Reuse the retained 2F floor at Y5.5 and the ground concourse at Y0. The lift
replaces the northern fixed door prop and receives an upper passage into the
existing lobby approach. The stairs and escalators arrive farther south on the
lobby's east edge, beneath the retained M3F circulation. Preserve structural
columns; verify headroom against the actual sloped stair and theatre surfaces.

Room fitouts, additional hotel floors, the complete
vehicle approach and parking ramps remain outside this connection increment.


## Construction and reproduction

The 5.5 m rise uses 32 treads with a 0.171875 m rise and 0.30 m going.
The two operating escalators reuse the existing eastern lower bank's chain and
casing geometry, rotated toward the lobby. Their fitted operating directions
are opposite. The lift uses the existing two-stop mechanism with its entrance
turned toward the forecourt, a protected shaft and an upper corridor into the
retained M3F stair landing.

The component replaces eight fixed entrance/lift props and two receiving walls.
It adds 189 static panels, 22,044 triangles, two moving chains, one lift and seven
fixtures served by the existing light pool. The concourse receives three bounded
pit openings; two granite passage walls receive doorways. Existing textures and
texture coordinates are preserved through those cuts.

Reproduce in a single private candidate folder, using the pinned parent manifest:

1. Blender `extract-granvia-entrance.py PARENT COMPONENT` records exact source
   faces for retirement and the two doorway cuts.
2. `build-granvia-entrance.mjs PARENT COMPONENT` writes static and motion geometry.
3. `prepare-porta-west-base.mjs PARENT COMPONENT COMPONENT/station` retires the
   declared old faces. Run `cut-central-lift-floor.mjs` on its manifest with each
   generated `pit-0.json` through `pit-2.json`, saving each floor-cut receipt.
4. `open-granvia-passage.mjs COMPONENT/station/assets.json COMPONENT` cuts both
   textured walls. Update the removal receipt's `preparedLayoutSha256` to this
   layout and `retainedBufferBytesExact` from `inheritedBufferBytesUnchanged`.
5. `web/v2/compose-component.mjs` appends the static component in the same station
   folder with that removal receipt. `integrate-granvia-entrance.mjs PARENT
   COMPONENT/station/assets.json COMPONENT` binds the moving chains and lift.
6. `verify-static-replacement.mjs` and `verify-granvia-entrance-headroom.py` check
   export correspondence, opening areas and clearance. `verify-east-transfer.mjs`
   exercises the declared native routes and both landing barriers.
7. `walk-granvia-entrance-chrome.mjs`, the generated `views.json`, and the existing
   component lift/escalator checks exercise the complete candidate in Chrome.
8. Blender `install-east-transfer.py PARENT CANDIDATE COMPONENT COMPONENT/source`
   installs and reopens all changed static geometry and moving hardware.

Scripts without an explicit directory are in `web/station/realism/`. Promotion
replaces the current source, static exports and motion-detail manifest in place.
The prior hardware GLB stays compatible; the two new chains use the shared
moving-step renderer and the new comb positions. Original research remains
private, and full candidate copies are removed after promotion.


## Delivery checks

- Twenty native route walks pass, covering both directions of the main stair,
  all escalator approaches, both lift approaches, the ground passage, M3F stair
  and theatre approach. Both exposed upper-landing edges block a walking player.
- Both escalators carry an idle rider in their declared direction. The lift
  passes five native checks: entry, doorway sensing, grounded travel, closed
  doors over an empty shaft, recall and return travel.
- Seven ordinary Chrome keyboard routes pass. Chrome also verifies both moving
  tread chains, the lift's rendered arrival positions and return ride.
- The 32 treads have 2.1 m headroom across a 2.4 m clear walking width. A total of
  720 volumes check the stairs, moving lanes, adjoining routes and lift travel
  against the surrounding static panels, boxes, beams and generated flights.
- Independent checks confirm matching opening areas, original texture coordinates,
  normals and component geometry. Blender saves and reopens the scene with all
  retained bindings, 140 animated escalator steps and eighteen lift parts.
- `npm run build:web`, native gameplay and the Chrome gameplay smoke test pass,
  including walking, full translation/spin rest, recall forfeiture and home. The
  smoke test uses the explicit Levels shortcut because Chrome can consume Escape
  when releasing pointer lock.
- Nine final Chrome views have no page errors or growing texture/reflection
  counts. Short 1440×900 samples show 16.7 ms median and 16.8 ms p99 frame intervals;
  this is a local observation, not a sustained performance benchmark.
- Static station export growth is 1,961,100 bytes. The current editable source,
  collision layout, static export and motion metadata replace their predecessors
  in place. The full candidate copy is removed after validation.
