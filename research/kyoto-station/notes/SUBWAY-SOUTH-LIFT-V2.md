# Subway South gate: missing platform lift

29 September 2026. Connect the South paid gate hall to the southern end of the subway island platform.

## Evidence and omission

The [city's station facilities page](https://www.city.kyoto.lg.jp/kotsu/page/0000009812.html) identifies platform lifts inside both Central 1 and South gates. Its equipment text states an April 2021 snapshot. The saved [station diagram](https://www2.city.kyoto.lg.jp/kotsu/tikadia/img/map/sta/pdf/k11map.pdf), still linked by the current station page, independently depicts both connections. The southern part was visually re-inspected for this increment. These are separate from the public lifts in the Hachijo Street passage.

The current model had the Central 1 car, South stairs and upward escalator, but no South platform lift. The existing South hall was an empty receiving room at the proposed position. Chrome inspection confirmed space between the platform columns and beside both platform aisles.

## Construction

The new car connects Y−11.2 m on the platform to Y−6.2 m in the South paid hall. It sits at X177, Z−129 with a south-facing doorway. Three structural slabs receive a 9.44 m² shaft opening; their existing stair, escalator and Central 1 shaft openings are preserved. Floor-joint strips are clipped around the new pit. The existing floor supplies both landings, so no second landing slab overlaps it.

The enclosure has continuous side and back walls, a pit, roof, steel thresholds, frames, landing doors, buttons, indicators and original bilingual directions. It reuses the existing native car, sensor, door and rider mechanics. Both side aisles, South gate approach and retained stair approach remain available. The other four lifts and thirty escalator lanes are retained without changes. No realtime light is added.

The sources establish the connection and southern platform position. Shaft dimensions, orientation, exact placement and finishes are fitted approximations. Platform toilets, detailed services and the remaining Porta lifts remain unfinished.

## Verification and rebuild

The browser/native comparison covers 33 added or replacement panels, 2,700 vertices and 900 triangles. Five retired panels remove 504 triangles. Retained native records and browser buffer bytes remain unchanged. Net static growth is 396 triangles; the component appends 163,556 browser bytes, plus eighteen moving parts.

Ten normal-speed native walks pass through both platform aisles and between the lift, gate and retained stair: 2,820 position samples. The independent opening check confirms all three slab footprints retain their earlier openings, four floor-joint pieces avoid the pit, and the full car travel and both doorways are clear.

Seven Chrome checks cover entry, doorway sensing, native rider transport and independent sessions, upper exit, the protected empty shaft, descent with throw/recall, and return exit. Eight surrounding views were visually inspected with no page errors. Across 960 sampled view frames the median is 16.7 ms, p99 is 16.8 ms and maximum is 33.4 ms; 240 ride frames have a 16.7 ms median and 16.8 ms maximum. These are short local samples. Normal native and Chrome gameplay checks pass, including full translation/spin rest, recall and home. `npm run build:web` passes.

The saved Blender scene reopens with all 33 panels and eighteen lift parts matching their geometry, UVs, normals and materials. Existing panel bindings are valid. Source SHA-256: `03796383f569e204cd2acc8e83f8bff3234575ca0da753f50daf10e25ba6b508`.

The promoted local build passes the native play loop at port 4425. Cleanup removes 1,273,967,046 bytes of superseded prepared/composed scenes and the stopped candidate preview, preserving the current source, textures and verification receipts.

Run `prepare-subway-south-lift.py`, `prepare-east-transfer-base.mjs`, `build-subway-south-lift.mjs`, `web/v2/compose-component.mjs` and `integrate-subway-lift.mjs` in order against the parent manifest. The preparation and independent opening verifier require Shapely. Geometry checks use `verify-east-transfer-geometry.mjs`; `verify-subway-south-lift-openings.py` compares the complete retained slab footprints and clips static faces against the full car travel and both doorways.

`verify-east-transfer.mjs` exercises the surrounding routes in the complete native station. `inspect-exit-five-chrome.mjs` reads this component's `lift-spec.json` for the full ride and safety checks. `subway-south-lift-views.json` defines the surrounding views. `install-east-transfer.py` installs and reopens the editable scene to check geometry, UVs, normals, bindings and lift parts.

Current asset identities are pinned in `web/v2/assets.json`. Private receipts live under `.local/v2/current/components/subway-south-lift/` after delivery. Full generated candidate scenes are removed after promotion; the current source and textures stay in place.
