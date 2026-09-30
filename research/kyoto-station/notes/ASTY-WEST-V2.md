# Western ASTY street and public stair

29 September 2026. Connected western street and interior public stair.

## Defect and acceptance

The Hachijo foyer ended at a glazed western wall at X28. The floor strip
west of it, between Z-181 and -174, was missing. The upper public passage also
had a solid wall where the western ASTY stair should connect beside Kintetsu.
The existing external terrace stairs provided a forecourt route, but there was
no covered shopping street or internal stair connection.

Build the western street, its enclosing room bays and forecourt openings, then
connect its western end to the upper public passage with an enclosed stair.
Acceptance requires native walking through the full street, every room entrance,
both directions of the new stair, forecourt exits and the retained terrace
stairs. Inspect the result in Chrome, prove browser/native correspondence and
integrate the same geometry into the editable scene before committing to main.

## Evidence and limits

- The [operator's western floor map](https://www.asty-kyoto.co.jp/asty_kyoto/assets/floor_guide/img/1f_west.jpg)
  shows ASTY ROAD, northern shops and service bays, three southern shop islands,
  public exit gaps and the stair beside the western entrance.
- The [operator's overall map](https://www.asty-kyoto.co.jp/asty_kyoto/assets/floor_guide/img/zentai.jpg)
  places that stair north of the Kintetsu gate, connecting to ASTY SQUARE and the
  north–south public passage. Both maps were visually inspected.
- The [photographed walking route](https://kyoto-station.info/archives/115),
  updated 1 March 2026, shows the descent beside Kintetsu and the ground-floor
  ASTY entrance. Two photographs guide pale tile, open shop fronts, metal trim,
  panel ceilings and the entrance fascia. Their capture dates are unconfirmed;
  the image URLs contain a September 2023 upload directory.

The plans establish connections, not a metric survey. Stair position, 3.675 m
rise, dimensions and room footprints are fitted to the retained hall and
Kintetsu structure. The western ground corridor uses the space between those
structures. Room bays are architectural shells; exact tenant interiors, working
escalators and other ground-floor shopping streets remain unfinished. Research
images remain local references and are not used as game textures.

## Delivered structure

The foyer's western glazed wall opens into a continuous street with seven
northern rooms, eight southern rooms, a western entrance and three exits
between the southern shop islands. A covered ground corridor leads to the
upper public passage through 22 steps, a middle landing and a clear lower
turn. The new opening sits between the retained upper-hall columns. Both
external terrace stairs and the Kintetsu paid area remain available.

Chrome inspection caught an unnecessary ceiling slab projecting over the
lower landing; it was removed before the final checks. The high stairwell
roof now covers that landing without the low shelf.

The first western-island exit test turned east before clearing a shop's back
wall. Its route now continues to Z-188 before turning, passing between the shop
back and the existing terrace stair. This corrected the test path; component
geometry and native panel hashes did not change. Previously passed routes are
reused only when both the complete layout hash and all route points match.

## Geometry and runtime checks

- All 31 normal-speed native walks pass, with 9,183 recorded position samples:
  fifteen room doorway loops, the full street and new stair in both directions,
  all four forecourt connections and both retained terrace stairs in both
  directions. Endpoints remain grounded and meet the floor-height checks.
- Ten obsolete panels and 120 browser triangles are retired. All 369 new
  panels, 13,284 vertices and 4,428 triangles match between the native layout
  and browser geometry, including face normals. Retained native records and
  browser buffer bytes are unchanged.
- Net increase: 4,308 triangles and eight material batches. Composition adds
  378,356 bytes. Sixteen fixtures use the existing two-light pool; there
  are no new textures, reflection captures or moving hardware.
- The Blender source saves and reopens with the same geometry, UVs, normals
  and retained bindings.
- Native and Chrome gameplay checks pass: entry, walking, throwing until
  translation and spin both stop, result presentation, recall and home.
  `npm run build:web` passes.
- Thirteen final Chrome views cover the full street, foyer join, room bays,
  stair and both landings, ground-corridor turn, forecourt exits and terrace
  stairs. There are no page errors or texture/capture growth. Short frame
  samples have a 33.3 ms median while adaptive resolution falls from 0.85
  to 0.65. A separate empty Chrome page also records a 33.3 ms median, so this
  session's frame cadence does not isolate scene cost. The restarted local
  main passes entry with matching served assets and the intended spawn.
  This is not a performance soak or evidence of sustained full-resolution
  60 fps.

Pale fascias show banded shading in Chrome. Its cause is unconfirmed and is
recorded for a later rendering pass. Room fitouts, working escalators, the
remaining southern frontage and Miyako Michi remain unfinished.

The existing adaptive-resolution logic reacts to total frame intervals and
reduces resolution at a 30 Hz browser cadence. A later performance pass should
separate browser scheduling limits from rendering cost before reducing quality.

## Rebuild and delivery

`build-asty-west.mjs` builds the original component and route definitions.
Use `prepare-east-transfer-base.mjs` and `web/v2/compose-component.mjs` with the
parent manifest. `verify-static-replacement.mjs`, `verify-east-transfer.mjs`
and `inspect-east-transfer-chrome.mjs` check geometry, routes and Chrome views.
`install-east-transfer.py` integrates the verified component into the
editable scene and checks it after reopening.

Private receipts are retained in `.local/v2/current/components/asty-west/`.
The playable assets replace the existing current station in place; their
hashes are pinned in `web/v2/assets.json`. Research images stay outside Git.
