# Daruma glazed shopfront and counter

28 September 2026. The local v2 station replaces shop 4’s solid placeholder with a glazed side, sign and display frontage, usable doorway, ticket terminal and a visible counter area.

## Evidence and modeling choices

The [station operator](https://www.kyoto-station-building.co.jp/restaurant_cafe/122/) identifies 元祖博多だるま at map position 4, on 10F south of the Grand Stairway. Placement uses the existing operator-map registration. The map is schematic; the footprint fit and doorway dimensions are estimates.

A [firsthand visit dated 23 June 2026, published 27 June](https://osumituki.com/kyoto-ramen/225895.html), shows the built shop’s glazed side above a dark timber base, red sign with pale lettering, dark main sign, large display and ticket terminal. This takes precedence over the [owner’s 1 June opening release](https://prtimes.jp/main/html/rd/p/000000008.000131832.html), whose reference imagery includes a different lantern entrance. The release describes 18 counter seats and supplies the pale counter, red round stool and chrome stem vocabulary. It does not establish a surveyed Kyoto seating plan.

Private research files:

- `photos/daruma-front-20260623.webp`: built glazed frontage, SHA-256 `3cfda4328c77c3e159c02f184d1250284f0ec41ae8a90d20e9f845d521d5dd46`.
- `photos/daruma-sign-20260623.webp`: built main sign and history display, SHA-256 `6f0061b8fced0e0fd461d04030458d9c8c24384b6310b2d87fe8473d1c492a3c`.
- `photos/daruma-exterior-opening-2026.jpg` and `photos/daruma-interior-opening-2026.jpg`: the owner’s opening reference collages. Their captions call them images of the proposed appearance; do not treat every depicted detail as confirmation of the built Kyoto shop.

The game uses original typesetting for the name, menu and history display. No research photograph pixels are used in textures. The photographic mural, exact lettering, complete kitchen and full seating plan remain unfinished. Eight stools suggest the visible dining area; the terminal is decorative. The short glazed side and long sign wall follow the photographs, while their dimensions and the doorway’s position within the fitted footprint remain approximations.

## Construction and checks

- Six retired native panels are replaced by 111 closed panels and 5,112 browser triangles in eight material batches. Glass, main walls, counter, stools and terminal collide; printed faces, small utensils and fixture details are decorative. The doorway is 1.35 m wide.
- The existing full export had clipped overlapping geometry from two triangles on the placeholder’s underside. The replacement removes 74 exact matching triangles plus nine clipped fragments. The omitted area matches the prior export receipt’s `0.7210582 m²` within `0.002 m²`; every other encoded buffer byte is retained.
- One 2048 × 1024 PNG atlas carries the original lettering. Its estimated uncompressed RGBA8 storage with mipmaps is 10.7 MiB. The component adds 608,044 bytes to the trimmed station GLB.
- Six authored fixtures feed the existing pool of two shadowless lights. The component composer now validates and appends light metadata to the native layout and browser station metadata. Front spots and pendants illuminate the display and counter at nearby views. Farther outside the glazed side, nearby aisle lights can occupy both slots, leaving the interior dimmer; the two-light limit remains a rendering approximation.
- Reopening the saved Blender scene verifies all 111 meshes, indices, UVs, packed atlas, stable panel bindings and six fixture positions/intensity/range values. Maximum position error is zero and maximum UV error is `1.673e-8`.
- Eight native walks pass: three doorway lanes in both directions and the public aisle past the terminal in both directions. The final native gameplay test passes a 1.36 m walk, full translation/spin rest in 4.17 seconds, free result, recall and home.
- Chrome views at 1440 × 900 show correctly oriented signs, transparent glazing and the counter through the doorway. Median sampled frame interval is 16.7 ms; no page errors. The lighting check confirms two slots and active Daruma fixtures at the front and entrance. A short audio-clock check passes; it does not establish audible quality or long-session stability.
- Browser build, lossless asset and fixed light-pool checks pass. Chrome controls cover entry, WASD, throw/result, recall during flight, menu and home.

## Integrated asset identity

| Asset | SHA-256 |
| --- | --- |
| Layout | `72bc8a4162139eeb52d051b6d8f8463966090bc1616440962984f55124dd142a` |
| Station GLB | `2a99d20f64ac8e30aacf65f1915ec52a463cbf5c0c9a75af4e6c67aaea2acb51` |
| Editable source | `7feff3ea7c0ee5fce642742e9802542ee0861442701680e10baa63ab2bbe1a28` |

Scripts are `prepare-daruma-frontage.mjs`, `build-daruma-frontage.mjs`, `install-daruma-frontage.py` and `verify-daruma-frontage.mjs` in `web/station/realism/`. The editable current source contains the component; private original SVG/PNG and small receipts live in `.local/v2/current/components/daruma-frontage/`. The source texture is also retained under `.local/v2/current/source/textures/` for future exports. The current bundle remains private and is identified by `web/v2/assets.json`.

Next: refine the conspicuous flat timber, counter and stool finishes in these two modeled shopfronts. Keep the fitted architecture and usable routes, and use the saved close references to add material detail before expanding to another tenant.

After promotion, the main preview reports a ready native worker and serves the exact recorded GLB plus all six Daruma fixture records. Temporary full-scene exports, layouts and candidate overlay were removed. Disk check: current bundle 661 MiB, candidate receipts/views 30 MiB, live preview layout/overlay 275 MiB; no candidate file exceeds 20 MiB.
