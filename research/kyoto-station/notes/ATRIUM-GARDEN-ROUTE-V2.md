# Atrium to rooftop garden connection

30 September 2026. The user’s main priority is the atrium and its reachable public spaces, especially walking up to the gardens. This increment repairs the connection from the top of the Grand Stairway into the rooftop garden.

## Delivered connection

The corrected upper landing now joins a westward flight into the rooftop garden. The 28 steps have a 0.310 m tread and approximately 0.189 m rise. A fitted 2.75 m² floor infill closes the missing approach at the corrected landing height. The old stair and its opening are replaced; the new well has guards on its three exposed sides and opens into the garden at the west end.

The route follows the operator's RF schematic. Its dimensions fit the retained model and are not surveyed measurements. The façade remains intact; two bounded slab cuts clear the new opening. Existing garden furniture and planting are retained for the next refinement.

### Verification

- Four native walks pass: the short connection and the complete Muromachi Square–garden route, each in both directions (1,867 movement samples).
- The same four routes pass with Chrome keyboard controls (500 checked waypoints). All three approaches to the stair well are blocked by the guards.
- Independent geometry checks confirm the floor infill, all 28 risers, 2.1 m headroom along the tested route, and matching browser/collision geometry. The 42 retired objects are absent from the editable source. A separate browser check rejects remnants of their guards.
- Four final Chrome views were inspected: the lower approach, garden arrival, court and filled former stair opening. The views have stable texture and reflection-capture counts and no page errors.
- Native gameplay, Chrome walking/throws/recall/home and `npm run build:web` pass. Free throws finish only after translation and spin stop. Existing escalators and lifts retain their exact geometry and definitions.

The editable Blender scene and matching playable assets are integrated in `.local/v2/current/`. The build starts beside the garden stairs at http://127.0.0.1:4425. Receipts and small component files are in `.local/v2/current/components/garden-access/`; the temporary full source, station export and preview overlay are removed after promotion.

Next, inspect and complete the garden's public path, northern viewing promenade and onward connections. Refine paving, planting, seating and signs from the existing operator photographs. The neighboring shell and garden finishes remain provisional.

## Defects confirmed before the repair

Inspected six real Chrome views of the atrium approach, upper landing, garden stair, garden court and western roof. Two independent native walks reproduce defects on layout `ce61c4797cc57c882aa9b62aba12f821c2c2081a73d4ff798da072ad64e46c50`:

1. **The direct approach loses its floor.** Walking from the southern passenger lane’s upper endpoint towards the garden stair drops the player to Y48.742 near X−149.269/Z−21.780, below the expected Y49.194 landing. Trace the retained landing boundary and fill the actual missing connection.
2. **The garden stair intersects the façade.** Starting independently on its existing apron, the player climbs several steps and stops near X−155.957/Y51.365/Z−28.219. Chrome shows the glass wall crossing the flight. Nearby collision records include `west-south-panel-45-25-5-0`, `west-south-panel-45-26-5-0` and `west-south-substrate-5-6`; these identify the area to inspect, not a blanket removal list.
3. **The apron retains an obsolete height.** `k008-landing14-width-extension` is at Y49.585964; the corrected Grand Stairway finishes at Y49.193700. Their 0.392264 m difference leaves a discontinuous approach. The existing garden arrival is at Y54.498245.

The earlier [Grand Stairway audit](GRAND-STAIR-CIRCULATION-V2.md) covers the fourteen main flights. This inspection extends attention beyond its upper endpoint. The two failed probes do not establish every possible route through the surrounding floor.

The rooftop court already contains paving, planting, seating and lights. Its architectural placement and finishes remain provisional. The view farther west also exposes coarse municipal roof geometry; complete the public garden path before adding distant detail.

## References inspected

- The operator’s [RF guide](https://www.kyoto-station-building.co.jp/floorguide/rf/) and its [roof plan](https://www.kyoto-station-building.co.jp/app/themes/kyoto-station-building/floorguide/img/map/img_map_rf.svg) show the garden beside the upper Grand Stairway, a short final flight, and the northern promenade. Use the schematic to establish connections; its pixel dimensions are not survey measurements.
- The operator’s [square guide](https://www.kyoto-station-building.co.jp/service/square/) describes the rooftop reached from the Grand Stairway. Its saved garden photographs show the planted court, benches and coloured light standards. Existing copies are in `research/kyoto-station/photos/square-img_oozorahiroba_01.jpg` through `_04.jpg`.
- A [firsthand February 2019 walk](https://plaza.rakuten.co.jp/asobikokoro2/diary/201902110000/) documents the 11F arrival, final garden stairs and route towards the Skyway. Its [upper-stair photograph](https://image.space.rakuten.co.jp/d/strg/ctrl/9/aa262e3d8ca07d39cc6305cf354ea9a441d69e15.77.2.9.2.jpeg) provides historical architectural context; current fixtures require the operator’s newer photographs.

Private plan, photograph, screenshots and failed native receipts are under `.local/v2/current/components/atrium-garden-audit/`. No full station copy was created for this audit.

## Connection acceptance

Refit the upper landing, final garden stair and garden entrance as one continuous public connection. Check the flight’s alignment against the RF plan and retained floor boundaries before choosing façade openings. Preserve the established garden level and useful existing furnishings where they fit.

- A continuous supported walk runs from Muromachi Square through the Grand Stairway into the garden, and back down.
- The final approach, risers and landings join without a height jump; the walking route has clear headroom and guarded exposed edges.
- Real Chrome walks verify the final connection in both directions and show the garden arrival clearly.
- Matching visible geometry, native collision and editable source are integrated into the same local bundle. Gameplay and the browser build still pass.
- Commit and merge this connection before proceeding to garden paths, viewing areas, wayfinding and nearby Skyway links.

## Reproduce the defects

```sh
node web/station/realism/prepare-garden-route-audit.mjs \
  web/v2/assets.json .local/v2/candidate/atrium-garden-route
KYOTO_FAST=1 KYOTO_ROUTE_FILTER='Upper Grand' \
  node web/station/realism/verify-east-transfer.mjs \
  .local/v2/current/station/station-layout.json \
  .local/v2/candidate/atrium-garden-route \
  .local/v2/candidate/atrium-garden-route/native-baseline
KYOTO_FAST=1 KYOTO_ROUTE_FILTER='Existing garden' \
  node web/station/realism/verify-east-transfer.mjs \
  .local/v2/current/station/station-layout.json \
  .local/v2/candidate/atrium-garden-route \
  .local/v2/candidate/atrium-garden-route/stair-baseline
```

Both probes failed on the recorded parent geometry. They document the original defects; the new builder declares the repaired route checks.
