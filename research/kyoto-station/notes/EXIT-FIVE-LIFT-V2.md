# Exit 5: public street lift

**Placement correction pending:** the [subway registration audit](SUBWAY-REGISTRATION-V2.md) finds that this working lift sits beside the wrong core and uses a generic pavilion that differs from street photographs. The route verification below demonstrates the fitted connection, not its real-world registration. Correct the subway/public-route placement before relocating this shaft.

29 September 2026. Connect the public subway passage to the northeast station forecourt with a second operating passenger lift.

## Evidence and construction

The [city's Kyoto station page](https://www2.city.kyoto.lg.jp/kotsu/tikadia/hyperdia/menu0221.htm) names the accessible route from the platform lift through Central 1 and the Exit 5 lift to the east side of the station's main entrance. Its saved `maps/subway-kyoto-plan.pdf`, dated 7 August 2026, shows the two lifts and their separate landings. The plan was visually inspected and the operator page checked for this increment. It establishes the connected levels; the shaft alignment, pavilion, car dimensions and finishes are fitted approximations.

The new car rises 5.981115 m from the public passage at Y−6.2 m to the retained forecourt paving. It sits in a recess beside the existing street stair, leaving a clear public bypass to Porta. Three old corridor panels are replaced with matching floor and ceiling openings and a recessed wall. A 9.44 m² opening is cut from the textured municipal paving. The upper threshold follows the original paving slope along its front edge and meets the level car floor at the other end.

A glazed pavilion, roof, steel frame, separate landing doors, call buttons and original bilingual Exit 5 signs enclose the street arrival. The lift reuses the verified native car, door, sensor and rider mechanics. Press E inside to ride, or beside a landing to call it. The first platform lift and all thirty escalator lanes remain unchanged. Other Porta and Hachijo lifts remain unfinished.

## Verification

- Browser/native correspondence checks cover forty added or replacement panels, 1,656 vertices and 552 triangles. Three old panels remove 36 triangles. An independent paving check verifies the opening, original surface positions, interpolated UVs and smooth normals. All unrelated native geometry and retained browser buffer bytes remain unchanged.
- Eight native walks pass with 4,642 position samples, covering the passage approach, bypass, street approach and the complete walk between the Central 1 lift landing and Exit 5, in both directions. The first test path incorrectly crossed the paid-hall wall; it was corrected to use the actual gate at Z−41.1. Geometry did not change for that correction.
- Real Chrome verifies entering, riding, exiting onto the forecourt, holding doors with a player in the doorway, the closed empty shaft, calling the car back, and a throw/recall during descent. A second private session stays independent. Six inspection views cover the lower approach, bypass, pavilion and retained street staircase, with no page errors.
- Normal Chrome gameplay and the native play loop pass, including full translation/spin rest, recall and home. `npm run build:web` passes. No C# changes were needed; the compatible worker with lift support was reused.
- Short 1440×900 view samples are about 16.7 ms median and 16.8 ms p99, with 368 textures and seven reflection captures. These overlapping samples are not a sustained benchmark.

## Rebuild and delivery

Run `prepare-exit-five.py` against the parent manifest, then `prepare-exit-five-base.mjs`. The preparation clips the original paving in both exports while retaining its material and mapping. Run `build-exit-five.mjs`, `web/v2/compose-component.mjs` and `integrate-subway-lift.mjs`. The lift definition is shared by native and browser metadata.

Use `verify-east-transfer-geometry.mjs`, `verify-exit-five-openings.mjs` and `verify-east-transfer.mjs` for export correspondence, paving/threshold checks and complete-station routes. Chrome checks use `inspect-exit-five-chrome.mjs` and `exit-five-views.json`. `install-east-transfer.py` installs the replacement paving, static construction and eighteen editable moving parts into the current Blender scene, then reopens it to verify the result.

Net static growth is 562 triangles, plus eighteen moving boxes, and 127,124 browser bytes. No realtime lights are added. The saved Blender source hash is `98b4571d9bed167016f40d8cd406d52e1e3d05b53370a02998c59686d9085651`.

Current asset identities are pinned in `web/v2/assets.json`. Private receipts are retained under `.local/v2/current/components/exit-five/`; the current local spawn faces the lower lift at X147.6, Y−6.2, Z36.8. Generated full scenes replace the current bundle in place.

The promoted main runtime passes a 1.37 m walk, full translation/spin rest at 8.56 s, free result, recall and home. After that check, 1,268,633,400 bytes of superseded candidate scenes, layouts and the stopped preview overlay were removed. The editable source, source textures and small verification receipts remain.
