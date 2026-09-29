# Central 1 eastern entrance

29 September 2026. Restore the missing eastern gate and its connection to the existing paid hall.

## Evidence and repair

The [current Kotochika operator plan](https://kotochika.kyoto/common/pdf/floormap_kyoto15.pdf) shows gate banks on both sides of Central 1. The saved [city station diagram](https://www2.city.kyoto.lg.jp/kotsu/tikadia/img/map/sta/pdf/k11map.pdf) establishes its platform stair and passenger lift. The model had a solid wall along the eastern side, separating this hall from the newly connected public passage.

The repair opens twelve metres of that wall and adds a gate bank with one open lane. It aligns with the existing western gate's open lane, so either entrance reaches the same paid hall, stair and platform lift. The remaining eastern wall and closed lanes preserve the boundary. A two-sided sign and floor guide identify the route. The eastern public passage and southern crossing stay outside the gates.

This is a circulation repair within the fitted layout. The [subway registration audit](SUBWAY-REGISTRATION-V2.md) remains unresolved: neither this opening nor the operator's schematic establishes surveyed coordinates. Gate dimensions, materials and lane alignment are fitted. Correcting the subway position, Exit 5 and its street connections remains the next structural priority.

## Acceptance

- Walk between the east and west gates in both directions.
- Reach the existing platform stair and lift from the eastern public passage; descend and return by the stairs, and ride the lift to the platform.
- Preserve the public bypass, retained eastern wall and closed gate lanes.
- Match browser geometry, native collision and the saved editable source. Check the visible result in Chrome and verify ordinary walking, throwing, full ball rest, recall and home.

## Reproduction

Against the recorded parent, run `prepare-central-one-east.mjs`, `prepare-east-transfer-base.mjs`, `build-central-one-east.mjs`, `web/v2/compose-component.mjs` and `finalize-east-transfer.mjs`. Verify exports with `verify-east-transfer-geometry.mjs`, native routes with `verify-east-transfer.mjs`, and Chrome with `walk-central-one-east-chrome.mjs` and `central-one-east-views.json`. `install-east-transfer.py` installs and reopens the editable scene.

## Verification and cost

Eight native walks pass with 4,617 position samples, covering both gate entrances, the stair and lift approaches, and the public bypass in both directions. The three closed lanes and retained wall pass 240 boundary samples. Chrome completes twenty keyboard-driven waypoints, including stair descent/ascent, calling and entering the lift, riding it to the platform and walking out.

Eight Chrome views were visually inspected. Both sign faces read correctly, the gate opening meets its surrounding walls, and the public passage, stairs and lift vestibule remain clear. The view sweep retains 378 textures and seven reflection captures. Short frame samples have a 16.7 ms median and 16.8 ms p99; they do not establish sustained frame or audio performance.

The repair replaces one twelve-triangle wall with thirty panels and 360 triangles: a net addition of 348 triangles, six material batches and 118,576 appended browser bytes. It adds no lights. All added vertices, triangle indices, normals and sign UVs match between the browser and native exports; retained browser bytes and unrelated native records remain identical. The saved/reopened Blender scene has matching geometry and bindings. Existing lifts and escalators are unchanged.

`npm run build:web`, candidate native gameplay and Chrome gameplay pass. The native ball reaches full translation/spin rest after 13.93 seconds; recall forfeits the moving attempt, and home returns to the new entrance. Private source, geometry, route and browser proofs are retained under `.local/v2/current/components/central-one-east/`.

The integrated local main build passes native gameplay too, reaching full rest after 13.91 seconds. Cleanup removes 1,293,150,930 bytes of superseded generated files and the stopped candidate preview's asset overlay. The current editable source and playable bundle remain in their existing paths.
