# Porta west: public lift to the forecourt

29 September 2026. Add the missing lift beside the western cross-passage and connect it to the station forecourt.

## Evidence and construction

Page 1 of the saved [Porta operator floor guide](https://www.porta.co.jp/common/pdf/floor/shopguide_jp.pdf), printed 29 May 2026, marks a lift beside C3 on West Street, between the northern and southern shopping streets. The [accessibility guide](https://omoiyarimap.jp/pages/kyoto-porta/index_hanrei.html) also lists a lift in the west underground area. The map and current model were visually inspected. This is separate from the B2 South-area lift.

The fitted shaft is at X22, Z45, beside the existing west cross-passage. It connects the mall at Y−6.2 m to the retained forecourt at approximately Y−0.126 m. A 9.44 m² opening passes through the mall deck, ceiling and original municipal paving. The paving retains its original surface, normals and interpolated texture coordinates around the opening. The upper threshold follows the sloping paving at its outer edge and meets the level car at its inner edge.

The lower shaft is enclosed; a framed glazed pavilion, roof, landing doors, call buttons and original bilingual signs mark the street arrival. The car reuses the verified native lift mechanics. Both shopping streets, the adjacent cross-passage and B2 stair approach remain available. No shop rooms or columns are removed. Other lifts, escalators and floor openings remain in place.

The plan establishes the west-area connection and relative position. Exact alignment, dimensions, orientation and pavilion finishes are fitted approximations. The B2 lift, remaining street entrances, farther west shops and Kotochika remain unfinished.

## Rebuild and verification

Use `prepare-porta-west-lift.py`, `prepare-exit-five-base.mjs`, `build-porta-west-lift.mjs`, `web/v2/compose-component.mjs` and `integrate-subway-lift.mjs` in order against the parent manifest. Shapely is required for the preparation and slab/shaft verifier. The shared paving cutter preserves the earlier street openings.

`verify-east-transfer-geometry.mjs` compares browser and native geometry. `verify-exit-five-openings.mjs` validates the paving and fitted upper threshold using this component's prefix. `verify-porta-west-lift-openings.py` checks the retained floor footprints and car/doorway clearances. Native routes use `verify-east-transfer.mjs`; Chrome rides use `inspect-exit-five-chrome.mjs` and this component's `lift-spec.json`. Surrounding views use `porta-west-lift-views.json`. The saved source is installed and reopened with `install-east-transfer.py`.

Current asset identities are pinned in `web/v2/assets.json`; private receipts live under `.local/v2/current/components/porta-west-lift/` after delivery.

## Verified result

- Ten normal-speed native routes pass with 2,511 position samples, covering both shopping streets, the cross-passage bypass, forecourt approach and retained B2 stair approach in both directions.
- Seven Chrome lift checks pass: entry, doorway sensing, rider transport and independent sessions, upper exit, protected empty shaft, descent with throw/recall and return exit. Normal Chrome and native gameplay pass, including full translation/spin rest, recall and home.
- All 35 added/replacement panels, 1,476 vertices and 492 triangles match between the native and browser exports. Two retired slabs remove 56 triangles; the paving cut adds 24 triangles. Net static growth is 460 triangles, plus eighteen moving lift parts. Browser geometry grows by 170,804 bytes. No light is added.
- Independent checks preserve the complete floor footprints outside the 9.44 m² shaft, including existing openings and solid collision flags. The car travel and both doorways are clear. The paving check verifies its retained geometry, smooth normals, texture mapping and sloped threshold.
- Eight Chrome views were visually inspected, with no page errors and stable counts of 371 textures and seven reflection captures. Across 960 view frames the median is 16.7 ms, p99 is 16.8 ms and maximum is 33.3 ms. The 240 sampled ride frames have a 16.7 ms median and 16.8 ms maximum. These are short local samples.
- The Blender scene saves and reopens with matching panels, UVs, normals, materials, eighteen lift parts and retained bindings. Source SHA-256: `1d3274957ee0381e94c54cea2818d3a5b527c1db60d7759039dbfb7de03cd234`. `npm run build:web` passes.

The promoted main preview passes the native play loop at port 4425. Cleanup removes 1,274,666,177 bytes of superseded candidate scenes and the stopped preview, preserving the current source, textures and small verification receipts.
