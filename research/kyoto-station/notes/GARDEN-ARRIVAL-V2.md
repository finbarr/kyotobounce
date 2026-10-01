# Open garden arrival and low lawn rails

## Evidence and defect

The [operator's garden photographs](https://www.kyoto-station-building.co.jp/service/square/)
show low yellow tubular rails beside the lawn and an open paved approach.
The [February 2019 photographic walk](https://plaza.rakuten.co.jp/asobikokoro2/diary/201902110000/)
provides closer views of these rails and their pale square footings at the
garden entrance. Reference URLs and the two downloaded photographs are kept
with the private component receipt.

The game had two provisional horizontal screens across the approach, with
posts 2.7 m high. Their collision blocked entry across most of that paving.
This replacement removes all 18 screen objects and places two 0.58 m high
rails at the southern ends of the existing lawn strips. Both side approaches
and the central garden entrance are now open. The outer rooftop guards,
stairs, benches, planting and paving remain in place.

Rail height, tube diameter and post spacing are fitted estimates, not surveyed
dimensions. The references support the low rail treatment; the retained garden
layout still needs refinement. The reconstruction keeps the garden usable
despite the construction closure listed on the operator's current page.

## Acceptance and construction

- Walk both newly cleared entries in both directions and cross the paved
  arrival from west to east and back.
- Verify that each low rail blocks the player at the lawn boundary while the
  arrival paths remain open.
- Inspect the stair approach, both entrances and both rail assemblies in Chrome.
- Match visual and native geometry, verify the saved editable scene, pass
  local gameplay checks, and merge into local main.

`web/station/realism/build-garden-arrival.mjs` retires 18 panels and 216
triangles and adds 38 panels and 3,144 triangles. The 24-sided rails and posts
have closed end caps; the pale footings and small fixing heads complete the
assembly. Fixing heads are noncolliding. Three material batches append
266,680 bytes without adding textures, lights or moving hardware. The western
end footing is inset to clear the retained planter at that lawn corner.

## Verification

The six native routes pass with 576 position samples. Both low rails stop
the player while maintaining floor support. A separate geometry check confirms
all six new footings are clear of the retained western planter row.
Chrome passes the same six routes with 16 grounded waypoint checks and both
lawn rail boundaries, without browser errors.

The browser asset build passes. Native gameplay verifies movement, a throw
settling fully after 13.90 seconds, recall forfeiture and returning home.
Chrome also passes entry, movement, a full throw, result presentation, recall
during flight and returning home. Both checks use the final candidate layout;
the result has zero translation and spin and remains an unsaved exploration
result.

Independent comparison verifies matching browser and native geometry and
unchanged retained layout records, encoded browser bytes and moving hardware.
The saved Blender scene was reopened; all 38 new panels, the 18 retirements,
normals and retained bindings match the final export.

Six final Chrome views were inspected. The western footing is now clear of
the planter. Texture count remains 387 and reflection captures remain seven.
Short view samples have a 16.7 ms median and p95 of 16.7–16.8 ms; these are
local observations, not a sustained benchmark.

| Final asset | SHA-256 |
| --- | --- |
| Layout | `c819471edc55b943da4a9560d7ba6ac8b783aebfaca385759c6048a1ef4ccd17` |
| Browser geometry | `5aaec6568253485a6108f077f5057066d8a2f090b1c90cc38efdc1c248336896` |
| Editable scene | `25ac2d2e1545bd9b5400c123268edc464003379ddd24e07e759a7a3d0fcc1213` |

## Rebuild

Use a single `COMPONENT` directory under `.local/`:

1. `build-garden-arrival.mjs PARENT COMPONENT`
2. `prepare-east-transfer-base.mjs PARENT COMPONENT/spec.json COMPONENT/station`
3. `web/v2/compose-component.mjs COMPONENT/station/assets.json COMPONENT COMPONENT/station COMPONENT/station/removal.json`
4. `finalize-east-transfer.mjs PARENT COMPONENT/station/assets.json COMPONENT`
5. `verify-static-replacement.mjs PARENT COMPONENT/station/assets.json COMPONENT COMPONENT/geometry-proof.json`
6. Native and Chrome routes, visual inspection and local gameplay.
7. Blender `install-east-transfer.py -- PARENT COMPONENT/station/assets.json COMPONENT COMPONENT/source`

Except for composition, the scripts are in `web/station/realism/`. The current
bundle receives the completed candidate in place; full temporary exports are
removed. Research images and generated assets remain outside Git.

The coarse southern roof enclosure remains visible when looking back from
the garden; inspect its open shell faces and projecting edges next. The
western row of triangular planting, lawn and seating arrangement also need
further work.
