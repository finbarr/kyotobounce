# Platform 0 and the north railway edge

28 September 2026. Connect the paid concourse to platform 0 and repair its interface with the retained station floor.

## Repair

The rectangular rear floor crossed the provisional track 0 alignment toward the east. Its edge now follows that track, leaving 1.0985 m to the nearest railhead. Extensions complete a 415 m platform from X−230 to X185. The central section uses the original floor, with its basement opening, front boundary and granite texture retained. The ground below the railway extends north to cover the eastern track end.

Remove the artificial room behind Central Gate: its raised floor, back wall, returns, low ceiling and five incorrectly numbered platform signs. A continuous canopy joins the newly exposed platform area. The actual gate cabinets, closed flaps and office backs remain; this repair opens the room on the paid side, not a public ticket lane.

A branch from the elevated paid concourse reaches platform 0 through 42 steps, a middle landing, handrails and a clear stair hood. The floor rises 7.35 m, with a 0.175 m rise, 0.32 m going and 1.8 m middle landing. Platform number signs identify the new route. Canopy supports clear the tracks and walking path.

## Evidence and limits

The saved [JR West plan](https://www.jr-odekake.net/station/img/premises/0610116.pdf), dated 31 January 2026, establishes platform 0 and its elevated access. The [operator's current plan index](https://eki.jr-odekake.net/premises?id=0610116) was rechecked. The saved station-building overview and registered [municipal roof outlines](../geodata/plateau-2024/README.md) establish the broad arrangement. Number glyphs use the documented [authoring font](PLATFORM-NUMBER-FONT.md).

The platform extent, floor slope, stair dimensions, canopy profiles and support positions are fitted to the current model, not surveyed dimensions. Northern furnishings, exact track curves and roof profiles, lifts, escalators, western platforms 30–34 and the eastern transfer connection remain unfinished. The southern railway and Shinkansen/Kintetsu fronts take priority next.

## Verification and cost

- Twelve native walks pass, with 2,711 position samples: the stair and opened room in both directions, both joins to the original floor, the platform ends and the extended railway ground.
- All 194 added panels, 10,224 vertices and 3,408 triangles match between native and browser exports. Twelve obsolete source objects and 183 clipped browser triangles are removed. The rebuilt rear floor area is 2,339.4 m²; its edge clears the rail throughout.
- The Blender scene saves and reopens with matching added geometry, floor edits, UVs, normals and retained bindings. The original basement opening remains intact.
- `npm run build:web`, `test:runtime` and `test:v2:browser` pass. The native play check includes full translation-and-spin rest, recall and home. Chrome checks entry, walking, throwing, the result, recall during flight and menu navigation.
- Nine views inspected in actual Chrome have no page errors. Short 1440×900 samples contain 810 frames, with a 16.7 ms median and approximately 16.8 ms p99. These samples do not establish sustained gameplay or audio performance.

Net browser increase: 3,274 triangles, seven material batches and 362,584 bytes. No additional dynamic lights or motion hardware. Private receipts live under `.local/v2/current/components/platform-zero/`; current asset identities are pinned in `web/v2/assets.json`. Superseded complete station candidates are removed after integration.

## Rebuild

Against the expected parent manifest, run `extract-platform-zero.py`, `prepare-platform-zero.mjs`, `build-platform-zero.mjs` and `web/v2/compose-component.mjs` in order. The preparation preserves the front floor mesh and reconstructs only its rear portion, including surfaces previously hidden by the discarded room. `verify-platform-zero-geometry.mjs` checks replacement scope, floor area, clearance and geometry correspondence. `verify-platform-zero.mjs` walks the complete native station. `install-platform-zero.py` updates the editable Blender source and verifies it after reopening. These are replacement tools that assert the expected parent geometry.
