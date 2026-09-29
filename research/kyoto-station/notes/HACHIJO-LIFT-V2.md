# Hachijo East: public lift

Location superseded by the [Hachijo crossing](HACHIJO-CROSSING-V2.md). The operator's photographed route places this lift outside on the station frontage. The current build restores the provisional indoor shaft openings and moves the car to X166, Z−189.8. The construction and test details below describe the earlier provisional increment.

29 September 2026. Add a working lift between the subway South public lobby and the Hachijo East ground entrance.

## Evidence and construction

The [city's Kyoto station page](https://www2.city.kyoto.lg.jp/kotsu/tikadia/hyperdia/menu0221.htm) lists an accessible route from the subway South gate to the north and south sides of Hachijo Street. The saved subway plan, `maps/subway-kyoto-plan.pdf`, identifies the connected public levels. The [Kintetsu illustrated subway route](https://www.kintetsu.co.jp/station/station_info/pdf/Kyoto_03.pdf), dated 20 January 2026, shows the Hachijo East approach, commercial passage, existing descent and South gate hall. Its saved page renders were visually inspected alongside the existing entrance research.

This increment connects the station side of Hachijo. The public car travels 6.2 m from Y−6.2 m to the existing foyer at Y0. It sits beside the stair, leaving the western JR through-route and lower ticket machines accessible. The shaft cuts four slabs: the foyer floor, lower lobby floor, lower ceiling and railway subgrade. Each receives a 9.44 m² opening while retaining its previous stair and passage openings.

The enclosure has a pit, roof, steel thresholds and frames, landing doors, call buttons and original bilingual signs. The native car and door mechanics are shared with the two existing lifts. Press E inside to ride or beside a landing to call it. All thirty escalator lanes and both existing lift definitions remain unchanged. No realtime lights are added.

The operator evidence establishes the connections; shaft position, dimensions and finishes are fitted approximations. The underground crossing beneath Hachijo Street and the lift on its south side remain unfinished.

## Verification

- Browser/native correspondence covers thirty added or replacement panels, 1,728 vertices and 576 triangles. Four retired panels remove 184 triangles. Unrelated native records and retained browser buffer bytes remain unchanged.
- An independent surface check compares both faces of each replacement slab with its original footprint minus the shaft opening. It verifies the retained openings, the complete travel height and both level thresholds.
- Ten normal-speed native walks pass with 3,359 position samples. They cover the public passage, South gate, full forecourt approach, JR bypass and ticket machines in both directions.
- Chrome verifies both rides, doorway obstruction, closed doors at the empty shaft, calling the car back, independent private sessions and throw/recall during descent. Eight inspected views cover the lower hall, ticket machines, South gate, upper lift, retained stair and JR approach.
- The native play loop passes walking, full translation/spin rest, free results, recall and home. `npm run build:web` passes. The existing worker with lift support is compatible; no C# change or rebuild is needed.
- The editable Blender scene saves and reopens with matching geometry, materials, UVs, retained object bindings and eighteen lift parts. Its source hash is `95a9c755bd1d1c814c1ff5e8551bce64f5eed6abe0cc928da644460225086c38`.
- Short 1440×900 Chrome samples record about 16.7 ms median and 16.8 ms p99, with 369 textures and seven reflection captures stable across the views. These overlapping samples are not a sustained performance benchmark.
- Normal Chrome gameplay passes, including walking, throwing, recall, the menu and home. The first run timed out opening the menu after recall; an instrumented repeat and a second unchanged standard run passed. The intermittent failure was not reproduced or fixed, and its log is retained with this increment's private receipts.

## Rebuild and delivery

Run `prepare-hachijo-lift.py` against the parent manifest, then `prepare-east-transfer-base.mjs`, `build-hachijo-lift.mjs`, `web/v2/compose-component.mjs` and `integrate-subway-lift.mjs` in that order. The preparation checks the shaft against neighboring geometry before cutting the four slabs.

Use `verify-east-transfer-geometry.mjs` and `verify-hachijo-lift-openings.py` for export and opening checks, then `verify-east-transfer.mjs` for complete-station routes. `inspect-exit-five-chrome.mjs` reads this component's lift definition for the ride checks; `hachijo-lift-views.json` defines the surrounding views. `install-east-transfer.py` installs the static construction and eighteen editable moving parts, saves the complete Blender scene and reopens it for verification.

Net static growth is 392 triangles, plus eighteen moving boxes. Appending the new component adds 94,628 browser bytes. Current asset identities are pinned in `web/v2/assets.json`. Private receipts are retained under `.local/v2/current/components/hachijo-lift/`. The local spawn is at the lower lift approach, X157.2, Y−6.2, Z−135. Generated full scenes replace the current bundle in place.

The promoted local runtime passes a 1.36 m walk, full translation/spin rest at 8.56 s, free result, recall and home. After verification, 1,269,068,786 bytes of superseded candidate scenes, layouts and stopped preview output were removed. The current scene, source textures and verification receipts remain.
