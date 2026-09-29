# Daruma central table and circulation

## Reference and fit

The [Kyotopi opening visit](https://kyotopi.jp/articles/hakatadaruma) and its saved Kyoto interior photograph show a cream communal table in front of the rear counter. The earlier model omitted this table. The [owner's opening release](https://prtimes.jp/main/html/rd/p/000000008.000131832.html) reports 18 seats. Neither source is a measured seating plan.

This iteration fits a 3.05 × 1.10 m table, 0.99 m high, within the existing registered shop footprint. There are nine table seats, six rear-counter seats and three side-counter seats. That allocation, the dimensions and the rear kitchen depth are modeling estimates. The photograph supports the table's presence and finish; it does not establish every seat position. Reference image identity is recorded in [DARUMA-KITCHEN-V2.md](DARUMA-KITCHEN-V2.md).

## Integrated change

- Move the rear counter and serving area 1.97 m deeper into the existing footprint. Fit the rear solids inside the oblique boundary and retain the shop entrance and glazed side.
- Move five existing rear stools, add a sixth, and add nine stools around the communal table. Small rounded cushion rims soften all eighteen seats.
- Add the cream table, timber frame/legs and two groups of the already-authored pitchers, condiment containers and notices. Reuse existing texture materials; no new image textures are introduced.
- Move two pendants over the rear counter and move the hood light with its fixture. Add the corresponding rear track. The renderer still allocates two shadowless light slots.
- Keep a continuous in-game walking loop around the table. The front, left, rear and entrance-side route centers are explicitly exercised in both directions by the native worker.

The relocation touches 191 existing panels and 7,434 unique positions. Existing indices, normals, UVs and other encoded attributes stay unchanged. The appended furniture has 113 closed parts, 13,812 triangles and eleven material batches; it adds 669,812 bytes to the prepared GLB.

## Verification

`verify-daruma-table.mjs` checks the inherited binary against an independently reconstructed buffer containing only the selected position changes. It checks all 15,458 appended vertices, oriented triangles, normals and UVs against the native layout, verifies the eighteen cushion solids, and rejects unrelated native-record changes.

`install-daruma-table.py` updates the same editable Blender source, restores authored normals after vertex relocation, saves and reopens the file, then checks moved and appended geometry, attributes, panel bindings and fixture positions.

`verify-daruma-table-walks.mjs` passes sixteen native walks: three doorway lanes, the public aisle, and all four sides of the dining loop, each in both directions. A downward placement probe identifies `daruma-table-cream-top` at 0.99 m above the floor.

Browser build, lossless-asset checks and fixed light-pool checks pass. Five Chrome views at 1440 × 900 show a median sampled frame interval near 16.7 ms with no page errors; the brief audio-clock check passes. Core gameplay passes a 1.36 m walk, full translation/spin rest after 7.91 s, recall forfeiture and home. Chrome controls pass entry, WASD, throwing/results, recall during flight, menus and home. Receipts accompany the current component. These are focused local checks rather than a long-session performance soak.

## Asset identity

| Asset | SHA-256 |
| --- | --- |
| Layout | `059191649ac68923c11e82be8a7cd4349b4cef764b3bc9f58e34af959d9b4dc3` |
| Runtime geometry | `2eaee948ed194bfdce4217e89707aa22665f94c7ce4a069981260637ca23dace` |
| Editable source | `7a4f61a28d685596612fa76d48ee9c7007a661ce0d11b84a70de7622bb2593fb` |

Scripts are `prepare-daruma-table.mjs`, `build-daruma-table.mjs`, `verify-daruma-table.mjs`, `verify-daruma-table-walks.mjs` and `install-daruma-table.py` in `web/station/realism/`. The current Blender file contains the full scene. Small component files and receipts live in `.local/v2/current/components/daruma-table/`; temporary full-station exports and source copies are removed after promotion.

Next: the photographed wall fittings and unfinished interior joins. The exact historic photographs, complete wall displays and surveyed seating plan remain unresolved; continue the broader station queue after this interior task.

Promotion check: the main preview has a ready native worker, the current layout receipt and the exact recorded GLB. Full intermediate copies are removed. Disk usage after promotion: current bundle 667 MiB, candidate receipts/views 37 MiB, live preview layout/overlay 274 MiB, retired 4426 metadata/logs 68 KiB.
