# Western garden planting

## Evidence and change

The [operator's photographs](https://www.kyoto-station-building.co.jp/service/square/)
show low small-leaf planting, varied green and bronze foliage, and yellow
ribbed planters with dark rims. A [firsthand garden photograph](https://kyoto-rys.com/facility/skygarden/)
also shows rounded shrubs beside the benches. These references guide the
plant forms and finishes; they do not establish species or survey every bed.

This pass replaces the western row's tall dark triangular placeholders with
36 low shrubs containing 5,040 individual leaves. The 18 planters retain their
footprints and receive hollow walls, recessed soil, fitted metal rims and
vertical ribs. Bamboo, lawn, seating and the public walking floor remain
unchanged.

Acceptance is a visibly leafy western row, clear paths along it and around
both ends, matching collision for the planter walls and soil, and working
walking, throwing and recall in the local game.

## Construction and checks

`build-garden-west-planting.mjs` retires 36 panels and 3,816 triangles and adds
184 panels and 78,264 triangles in ten material batches. Leaves, twigs and
planter ribs are noncolliding details; planter walls, rims and soil have native
collision. The component adds 6,582,904 browser bytes and no textures or lights.

The replacement verifier checks exact retained browser bytes and native
records, new visible/colliding geometry, and unchanged moving hardware.
Foliage bounds checks cover all 18 beds: shrubs sit at soil level, extend no
more than 12 cm beyond the existing footprint and stay below 1.13 m above the
garden floor.

Five Chrome views were inspected from the garden, path, arrival and beside a
planter. Their short 120-frame samples had a 95th percentile of 16.7 ms, with
387 textures and seven reflection captures throughout. This is a local visual
check, not a sustained performance benchmark. The final soil collision change
preserves the exact inspected browser GLB.

The final collision layout passes four native walks with 1,001 position samples
and the planter-face boundary check. Chrome passes the same routes with ten
grounded waypoint checks and the boundary, without browser errors. All 18 soil
surfaces pass native placement at the visible height and support a grounded
player within the walker's documented 25 mm capsule skin.

The browser asset build passes. The saved Blender scene was reopened and its
geometry, UVs, export normals, retired objects and retained bindings match the
candidate. Source verification reports zero preview-normal discrepancy.
Native gameplay passes the ordinary spawn, movement, a throw beside the planters
reaching full translation and spin rest in 13.91 seconds, recall forfeiture and
returning home.
Chrome gameplay passes entry, movement, a complete throw, unsaved result
presentation, recall during flight and home, with zero final velocity and spin
on the verified candidate layout.

| Final asset | SHA-256 |
| --- | --- |
| Layout | `00e96f51070b7fd78fa0693b9c85e0f6f9cffe7d920bbb530c3d8dcb1b26c0db` |
| Browser geometry | `9ae3d28b0b2dcfc822e6db963195a310fa8bd252c1b239db765ec5f2a0905878` |
| Editable scene | `38173cb77e02db4f50ddeacfbde4994d246f701dae5d1e0b403e975d2e2daa86` |

## Rebuild and storage

Use one `COMPONENT` directory under `.local/` and the recorded parent:

1. `build-garden-west-planting.mjs PARENT COMPONENT`
2. `prepare-east-transfer-base.mjs PARENT COMPONENT/spec.json COMPONENT/station`
3. `web/v2/compose-component.mjs COMPONENT/station/assets.json COMPONENT COMPONENT/station COMPONENT/station/removal.json`
4. `finalize-east-transfer.mjs PARENT COMPONENT/station/assets.json COMPONENT`
5. `verify-static-replacement.mjs PARENT COMPONENT/station/assets.json COMPONENT COMPONENT/geometry-proof.json`
6. Native and Chrome routes, planter-soil support, visual inspection and gameplay.
7. Blender `install-east-transfer.py -- PARENT COMPONENT/station/assets.json COMPONENT COMPONENT/source`

Except for composition, the scripts are in `web/station/realism/`. Promotion
replaces the current source and exports in place. Superseded full exports and
the temporary preview overlay are removed; photographs and receipts remain
outside Git.

The exact planting arrangement is still an approximation. Bamboo leaf forms,
the central low planting beds and seating need further work from photographs.
