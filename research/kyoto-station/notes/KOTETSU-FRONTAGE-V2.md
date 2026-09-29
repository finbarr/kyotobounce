# Kotetsu shopfront

28 September 2026. Shop 3 in the western restaurant route now has a timber and ribbed-metal frontage, tiger screen, ticket terminal and a usable doorway into a shallow counter area.

## Research and interpretation

The [station operator’s shop page](https://www.kyoto-station-building.co.jp/restaurant_cafe/114/) identifies 麺や虎鉄 in Kyoto Ramen Koji, on 10F south of the Grand Stairway. Its position uses the operator floor map and the existing western approach registration.

The [McKee firsthand visit](https://mckee-blog.net/menyakotetsu_misoramen_kyotoramenkoji/) supplies the frontage reference: honey-colored timber framing, a ribbed metal strip, dark upper fascia, white name sign, tiger screen, two lamps and a black ticket terminal beside the doorway. The article is dated July 2024 and shows a March 2026 update; the photograph’s capture date is uncertain. The [frontage photograph](https://mckee-blog.net/wp-content/uploads/2024/07/menyakotetu_kyotoramenkouji_1-scaled.jpg) is retained privately for research at `research/kyoto-station/photos/mckee-kotetsu-front-202407.jpg`, SHA-256 `4543e8e86477d7d53c5cc64957dee2c46b225dbfa9e7b0eeffb5af668b5e7f82`.

Dimensions are fitted estimates, not surveyed measurements. The tiger artwork is an original imagegen illustration; signage and terminal artwork are newly typeset. Reference photograph pixels are not used as game textures. The terminal is decorative, with three miso menu names and no prices. The white sign is currently a lit surface rather than a separately emissive sign. The shallow interior only suggests the counter; seating, kitchen and the complete dining room remain unfinished.

## Implementation and verification

- Remove six solid draft panels and their 76 matching browser triangles. Retain all other native records and inherited encoded buffers.
- Add 190 closed panels, 2,280 triangles and six material batches. Fine ribs, printed surfaces and lamps are decorative; walls, frames, counter and terminal have native collision. The doorway is 1.2 m wide.
- Use one 2048 × 2048 artwork atlas. Estimated uncompressed RGBA8 storage including mipmaps is 21.3 MiB; this is a size estimate, not measured GPU allocation. The original tiger input remains in the private component folder.
- Reopen the saved Blender source and verify all 190 added panels, triangle indices, UVs, packed artwork and panel ID bindings. Maximum position error is zero; maximum UV error is `1.703e-8`. Two inherited objects use the exporter’s supported object-name fallback for surface IDs.
- Eight native walks pass: three doorway lanes out and back, plus the public aisle in both directions past the ticket terminal. Feet stay within 0.12 m of the floor and arrive within 0.12 m of each target.
- Three 1440 × 900 Chrome views have no page errors and 16.7 ms median frame intervals. They show readable, correctly oriented signage and the open doorway. These short samples do not establish long-session performance.
- Browser build and lossless asset checks pass. Native gameplay checks pass a 1.36 m walk, full translation/spin rest in 4.27 seconds, free result, recall and home. Chrome controls pass entry, station rendering, WASD, throw/result, recall during flight, menu and home.

## Current asset identity

| Asset | SHA-256 |
| --- | --- |
| Layout | `b8dd5185a94b66e01dfb94bd17991065b7a2b5670d6e9e051ba0c7ae9e6b5d3d` |
| Station GLB | `632992aea625aa449b111d5072996816790162bf475236efbde4f5060ff59260` |
| Editable source | `c214e625cf4e93e7abb9723944a43246bdf18eac53cc57da515c19f10f06dac9` |
| Artwork atlas | `39de19a87e94f7417bf4fe67edf449cdad23947b8215fc54051cbd5b4b134ae7` |
| Original tiger artwork | `acd29bfd3d236200ccda8208e5064a05f3140fbcd1243216d9043225b3e654ea` |

The checked-in preparation, builder, source installer and native walk verifier are in `web/station/realism/`, named `prepare-kotetsu-frontage.mjs`, `build-kotetsu-frontage.mjs`, `install-kotetsu-frontage.py` and `verify-kotetsu-frontage.mjs`. The current source already includes this frontage. Component inputs and receipts are retained in `.local/v2/current/components/kotetsu-frontage/`; the canonical source texture is `.local/v2/current/source/textures/kotetsu-artwork.png`.

The temporary base, composed station and source copies were removed after promotion. Disk usage at delivery: current bundle 643 MiB, candidate receipts/views 29 MiB and the active preview layout/overlay about 275 MiB. No full candidate station remains. The private asset pack is not yet published; the checked-in manifest identifies the locally playable bundle.

Next: improve the restaurant aisle’s remaining large blank shopfronts from current tenant references, starting with the neighboring storefront. Keep deeper Kotetsu interiors explicitly approximate until useful interior references are available.
