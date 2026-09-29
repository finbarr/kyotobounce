# Porta East: connected public aisles

29 September 2026. Open the blocked end of West North Street and extend the public hall beside the subway North gate into the missing East Porta area.

## Evidence and construction

Page 1 of the saved [Porta floor guide](https://www.porta.co.jp/common/pdf/floor/shopguide_jp.pdf), printed 2026.5.29, and the [station B1 diagram](https://www.kyoto-station-building.co.jp/floorguide/b1/) place the west and east malls on opposite sides of the subway/Kotochika area. The [operator's navigation guide](https://www.porta.co.jp/navigation) documents a public west-to-east route. Its [east-area photograph](https://www.porta.co.jp/common/img/navigation/img_c_b2fe_06.jpg) guides the pale framed shopfronts, dark floor bands, recessed ceiling grilles and hanging directions. These saved references were visually inspected; their images remain research-only.

Two blocking walls are replaced with fitted openings: 5.6 m at West North Street and 8.5 m at the public hall's north end. A level cross-corridor runs north of the paid concourse and joins two East Porta aisles, three cross-passages and enclosed shop rooms with usable entrances. The retained street stair and North gate remain connected. A 168 m² strip of the existing deck supplies part of the corridor floor without a duplicate slab.

The East area occupies X192–237 m and Z25.2–65 m at Y−6.2 m, with 3.4 m clear height. Dimensions, exact alignment, shop divisions and finishes are fitted approximations; the operator diagrams establish circulation, not surveyed measurements. Additional street exits, onward lifts, Kotochika fitout and tenant-specific interiors remain unfinished.

## Verification and cost

- Twelve normal-speed native walks pass with 6,014 position samples: both directions along the public connection, West North Street approach, East aisle loop, two shop entrances and retained North gate. Starts and ends remain grounded at the intended level.
- Sixty boundary-push samples confirm that the public corridor stays outside the paid hall. The player stops at Z49.465 m against the corridor wall.
- All 426 added panels, 15,336 vertices and 5,112 triangles match between browser and native exports, including normals and sign UVs. Only the two specified walls and their 24 browser triangles are removed. Retained native records and browser buffer bytes remain unchanged.
- Independent floor coverage checks find no duplicate slab area, verify both wall openings, and confirm clearance beside the existing street staircase.
- Ten actual Chrome views pass with no page errors. Texture count remains 367 and reflection captures remain seven after first-use uploads. Short overlapping frame samples are about 16.7 ms median and 16.8 ms p99; this is not a sustained performance benchmark.
- Native and Chrome gameplay pass, including walking, full translation/spin rest, recall and home. `npm run build:web` passes. The saved Blender scene reopens with matching geometry, UVs, normals, materials, lights and retained bindings.
- Net growth: 5,088 triangles and 536,972 browser bytes. Eleven static material batches and nineteen light emitters use the existing pool of at most two active lights.

## Rebuild and delivery

Run `prepare-porta-east.mjs`, then `prepare-east-transfer-base.mjs` to remove the exact old walls. Build with `build-porta-east.mjs`, compose with `web/v2/compose-component.mjs`, and finalize the matching motion metadata with `finalize-east-transfer.mjs`. Use `verify-porta-east-openings.py`, `verify-east-transfer-geometry.mjs` and `verify-east-transfer.mjs` for floor coverage, export correspondence and complete-station walking. Chrome inspection uses `porta-east-views.json`.

`install-east-transfer.py` integrates the component into the existing editable scene. Its saved source hash is `39c5433eaba10694b34093cdc570cefd2427e1ae822dd4d014fc55d58bba79ac`. Current asset identities are pinned in `web/v2/assets.json`; private verification and delivery receipts live under `.local/v2/current/components/porta-east/`. The local entry moves to X195, Y−6.2, Z52 at the East Porta arrival.

After promotion, the main local runtime passes a 1.37 m walk, full translation/spin rest at 8.57 s, free result, recall and home. The current assets were replaced in place; 1,266,608,123 bytes of superseded generated scenes, layouts and the stopped candidate overlay were removed. The source texture directory and small receipts remain.
