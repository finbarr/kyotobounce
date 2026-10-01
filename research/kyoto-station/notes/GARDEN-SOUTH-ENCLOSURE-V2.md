# Southern rooftop outlooks and enclosure

## Evidence and repair

The [operator's roof map](https://www.kyoto-station-building.co.jp/floorguide/rf/)
shows public space extending south of the garden on both sides of a central
projecting room. The [February 2019 photographic walk](https://plaza.rakuten.co.jp/asobikokoro2/diary/201902110000/)
describes walking around to the south and looking through glazing toward the
station tracks. Its garden and art-wall photographs show concrete panels and
pale ribbed metal.

The game blocked this southern area with a glass railing. Behind it were a
coarse roof surface, projecting blocks and a sliced-open central shell.
This repair removes the obstructing rail and adds two paved outlooks connected
to the garden. The eastern outlook also joins the stair arrival. A closed
central enclosure, finished western wall and framed south-facing screens
replace the exposed shell surfaces.

The new public paving covers 290.7 m². Its texture scale and alignment continue
the existing garden floor. Dimensions follow the municipal shell and the
operator map's arrangement; they are fitted estimates. Exact screen divisions
and cladding joints are inferred. The operator currently marks the garden
closed for construction; this reconstruction keeps the requested usable route.

## Acceptance

- Walk from the garden into both southern outlooks and return.
- Walk between the stair arrival and the southern court in both directions.
- Keep the player behind both viewing screens and outside the central room.
- Inspect the new walls, outlooks and floor joins in Chrome.
- Match browser and native geometry, save and reopen the editable source,
  pass local gameplay checks, then merge into playable local main.

## Construction and verification

`build-garden-south-enclosure.mjs` replaces 29 railing panels with 269 panels
and 3,228 triangles. One bounded cut removes the old southern roof surface
from the municipal shell. The replacement closes its public boundaries.
The component adds 277,716 browser bytes in seven material batches. It reuses
the existing paving maps and adds no textures, lights or moving hardware.

`verify-garden-south-enclosure.py` independently checks the new floor area,
continuous floor connections, support beneath the full width of the walking
routes, paving UV alignment, all 21 colliding glass panes and the western
wall's backing depth. All 885 retained garden panels are unchanged.
The shared replacement verifier checks the municipal cut and exact retained
browser bytes, native records, normals and UVs.

All six native walks pass with 555 position samples; all three boundary checks
pass too. Chrome passes the same routes with 20 grounded waypoint checks and
all three boundaries, without browser errors. Seven final Chrome views
were inspected, including the corrected western backing. Textures remain at
387 and reflection captures at seven. These brief view checks are not a
sustained performance benchmark.

The browser asset build passes. Native gameplay verifies movement, a throw
from the eastern outlook reaching full translation and spin rest in 13.90
seconds, recall forfeiture and returning home.
Chrome gameplay also passes entry, movement, a complete throw, unsaved result
presentation, recall during flight and returning home. Its final result reports
zero velocity and spin on the verified candidate layout.

The saved Blender scene was reopened successfully. Added panels, retired
objects, modified municipal mesh, UVs, full-precision export normals and
retained bindings match the candidate. Existing municipal corner normals retain
their bounded Blender preview quantization; the largest angle is 0.573 degrees.

| Final asset | SHA-256 |
| --- | --- |
| Layout | `f821eff29ddb399c0b4873e3b06563a1b8efb9776ca07db761227951897f84e1` |
| Browser geometry | `a4e50719ceaf6a3edfcd9ac098e3ece42e21e4dee65a0a1fb1f623fa1fe522bc` |
| Editable scene | `f22448dc46c0965d510264e68dab711753a4a59aec1ddee9bb6b509beaadb16f` |

## Rebuild and storage

Use a single `COMPONENT` directory under `.local/` and the recorded parent:

1. `build-garden-south-enclosure.mjs PARENT COMPONENT`
2. `prepare-east-transfer-base.mjs PARENT COMPONENT/spec.json COMPONENT/station`
3. `open-isetan-ground.mjs COMPONENT/station/assets.json COMPONENT`
4. `web/v2/compose-component.mjs COMPONENT/station/assets.json COMPONENT COMPONENT/station COMPONENT/station/removal.json`
5. `finalize-east-transfer.mjs PARENT COMPONENT/station/assets.json COMPONENT`
6. `verify-static-replacement.mjs PARENT COMPONENT/station/assets.json COMPONENT COMPONENT/geometry-proof.json`
7. `verify-garden-south-enclosure.py PARENT COMPONENT/station/assets.json COMPONENT COMPONENT/floor-proof.json`
8. Native and Chrome routes, visual inspection and local gameplay.
9. Blender `install-east-transfer.py -- PARENT COMPONENT/station/assets.json COMPONENT COMPONENT/source`

Except for composition, the scripts are in `web/station/realism/`. The floor
verifier uses Shapely; the existing local package directory is selected with
`PYTHONPATH=.local/geometry-python`. Promotion replaces the current bundle in
place and removes the full temporary source and station exports. Reference
photos and generated receipts stay outside Git.

Remaining work includes the coarse planting and unfinished roof junctions
visible from the garden, plus the distant city seen beyond the outlooks.
