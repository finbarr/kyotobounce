# Western garden entrance and 11F connection

## Evidence and scope

The western rooftop promenade ends at the Isetan entrance. The store's
[rooftop guide](https://www.mistore.jp/store/kyoto/column_list_all/column08.html)
identifies the white stair immediately beyond the 11F central escalators as
the internal route to the garden. The station operator's
[11F plan](https://www.kyoto-station-building.co.jp/floorguide/11f/?tenant=isetan)
shows this stair at the west end, connecting to the restaurant aisle and the
upper Grand Stairway. Its
[original SVG](https://www.kyoto-station-building.co.jp/app/themes/kyoto-station-building/floorguide/img/map/img_map_11f_isetan.svg)
is saved with the private component evidence.

A [February 2019 photographic walk](https://plaza.rakuten.co.jp/asobikokoro2/diary/201902110000/)
shows the straight pale stair, dark tread nosings, glass guards, tall light
walls and western glazing overlooking the heliport. These dated photographs
support the architectural form; they do not establish current tenant signs.

## Implementation

- Replace the seven end-guard pieces with an open roof doorway and glazed
  western landing. The heliport remains outside the public route.
- Descend 28 steps to the 11F receiving hall, then follow the restaurant aisle
  east to a side landing beside the upper Grand Stairway.
- Fill the missing floor under the garden, subtracting existing floor coverage
  to avoid overlapping surfaces. Retain the outdoor garden stair, promenade,
  garden furnishings and all moving hardware.
- Fit bounded openings through the coarse municipal building shell. Visual
  and native collision surfaces use the same new meshes.

The floor plan establishes the route topology. Dimensions and the hall's
registration fit the retained model and are approximations. Restaurant
interiors, accurate shopfronts and the central escalator bank descending from
11F are unfinished. This increment provides a usable public connection.

Source tools: `prepare-garden-store-entry.py`, `build-garden-store-entry.mjs`
and `verify-garden-store-entry.py` in `web/station/realism/`. Generated media,
the editable source and verification receipts stay in `.local/v2/`.

## Verification

The 131.2 m route passes in both directions in the native worker and in Chrome
using keyboard controls. Native checks also confirm both atrium landing guards
and the western roof glazing block passage. All 28 treads and 352 sampled
approach volumes provide 2.1 m headroom. Floor coverage, retained garden
geometry, visual/collision correspondence and the saved Blender source pass.

Five final Chrome views were inspected. Their short frame samples show
16.7–16.8 ms at the 95th percentile; this is a local spot check, not a soak test.
The component adds seven material batches and about 196 KB of browser geometry.
`npm run build:web`, isolated native gameplay and Chrome gameplay pass,
including walking, full translation/spin rest, recall and home.
