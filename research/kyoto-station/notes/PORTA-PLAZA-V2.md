# Porta plaza B1: subway and B2 public connection

29 September 2026. Open the missing public route west of the subway North gate and connect it to the existing station-side B2 mall.

## Evidence and construction

Page 1 of the saved [Porta operator floor guide](https://www.porta.co.jp/common/pdf/floor/shopguide_jp.pdf) shows the west area's North Street, South Street and cross-passages beside the subway North gate. Page 2 shows the separate B2 South area and its onward connection. The [station's B1 diagram](https://www.kyoto-station-building.co.jp/floorguide/b1/) distinguishes plaza B1 from the station-building B1 rooms. All three saved pages and the B1 SVG were visually inspected for this increment. These are circulation diagrams, not dimensioned construction drawings.

Two photographs from the [operator's navigation guide](https://www.porta.co.jp/navigation) show the west-area arrival and route toward the east area. They guide the pale floor, dark transverse stone bands, framed glazed shopfronts, recessed ceiling grilles and hanging directions. The photographs are recorded in `sources.json` and remain reference-only; their pixels are not included in the game.

The new construction opens the subway hall's west return wall and the B2 north wall at its existing X16–20 m cross-passage. Two plaza B1 aisles and three cross-passages form a connected public loop. Fifteen stairs rise from the retained B2 floor at Y−8.713583 m to the subway/plaza floor at Y−6.2 m. The stair has a complete upper landing, lower threshold, side walls, handrails and guards around the floor opening. The lower ceiling stays outside the rising stair. The remaining B2 perimeter wall is preserved.

The new floor covers X12–137 m and Z25.2–61 m, with a short jog into the existing subway hall and a cutout around the stair. Clear height is 3.4 m. Shop rooms enclose the public aisles and have usable openings. The initial visual check caught two columns in the cross-passage walking lines; they were moved beside the shop edges before final route verification. Tactile strips sit above the decorative floor bands to avoid overlapping surfaces flickering.

This completes the first connected part of the west area. The farther west shops, the east area, additional street entrances, lifts and Kotochika fitout remain unfinished. Dimensions, elevations, the stair count, shop divisions, finishes and fixture positions are fitted approximations. The new direct B2 link is a stair; the existing eastern subway ramp remains the step-free connection between those fitted levels. This increment does not establish a complete accessible route to every station floor.

## Rebuild

Run `prepare-porta-plaza.mjs` with the parent manifest, then `prepare-east-transfer-base.mjs` to remove the two exact wall panels. Run `build-porta-plaza.mjs`, `web/v2/compose-component.mjs` and `finalize-east-transfer.mjs` in order. Existing escalator records, hardware and comb supports remain unchanged.

`verify-porta-plaza-openings.py` checks the deck boundary, stair opening, each tread and retained B2 wall coverage. `verify-east-transfer-geometry.mjs` compares exact browser/native positions, normals and sign UVs while checking retained data. `verify-east-transfer.mjs` walks the declared routes and tests the stair guards in the complete native station. `inspect-east-transfer-chrome.mjs` uses `porta-plaza-views.json` for the actual Chrome views.

`install-east-transfer.py` installs the component into the existing editable Blender scene, saves it, reopens it and checks geometry, UVs, normals, materials, lights and retained bindings. It uses the component's own prefix and collection name.

## Verification

- Twelve native walks pass with 8,838 position samples: subway arrival, both B2 stair directions, the aisle loop, middle cross-passage and two shop entrances. Each route begins and ends grounded at the expected level. Both stair guards pass 60 further push samples each; the player stops about 0.29 m from the well edge and remains grounded. The initial 0.30 m test clearance was corrected to account for the actual 0.24 m native capsule and 0.025 m skin; geometry did not change.
- Browser/native comparison: 1,000 added panels, 36,096 vertices and 12,032 triangles agree, including normals and sign UVs. The two retired wall panels remove 24 browser triangles. Retained native records and browser buffer bytes remain unchanged.
- The deck/stair check verifies the 19.2 m² floor opening, all fifteen treads, 3.4 m hall clearance and B2 wall coverage outside its intended opening.
- Ten actual Chrome views were inspected, including both stairs, both aisles, cross-passages, the subway arrival and the retained North gate. No page errors; texture count stays at 366 and reflection captures at seven. Short rolling frame samples are approximately 16.7 ms median and 16.8 ms p99; they overlap and are not a sustained performance benchmark.
- Chrome walking, full physical rest, recall, menu and home checks pass. The editable Blender scene saves and reopens with matching geometry, UVs, normals, materials, lights and retained bindings. `npm run build:web` passes.
- Cost: 11 static material batches, 24 fixtures using the existing two-light pool, and 1,166,504 additional browser bytes. Net geometry growth is 12,008 triangles.

Final native walking, gameplay and promotion receipts are recorded with this delivery under `.local/v2/current/components/porta-plaza/`. The committed `web/v2/assets.json` identifies the current integrated bundle.

After promotion, the main local runtime passes grounded spawn, a 1.35 m walk, full translation/spin rest at 8.56 s, free exploration result, recall and home. The entry at X26, Y−6.2, Z35 faces along the new South Street. The editable source hash is `a81f1e43b8fced22addd368653ee901ead5c4f66b79bc328aed260d516f1294f`.

The current assets were replaced in place. After the main runtime check, 1,229,171,310 bytes of superseded candidate scenes, layouts and the stopped candidate overlay were removed. The existing source texture directory and small receipts remain. No remote publication is part of this delivery.
