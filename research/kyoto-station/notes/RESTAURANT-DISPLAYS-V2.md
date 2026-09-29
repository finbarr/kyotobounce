# Restaurant entrance directories

28 September 2026. Two framed tenant directories flank the restaurant entrance in the local v2 station.

## Research and interpretation

The [current operator floor guide](https://www.kyoto-station-building.co.jp/ramen_koji/) was checked on 28 September 2026. It lists the ten tenants and numbered locations used in the directory artwork:

1. 祗園らぁ～めん京
2. UNO RAMEN
3. 麺や虎鉄
4. 元祖博多だるま
5. ラーメンこがね家
6. 富山ブラック 麺家いろは
7. ラーメン東大
8. 麺匠たか松
9. ワンタンメンの満月
10. 中村商店

The saved [Soul Kyoto photograph](https://soulkyoto.blog.fc2.com/blog-entry-395.html), captioned 9 February 2014, supplies the dark-framed entrance display style. The new artwork is an original, legible tenant directory using current names. It does not reproduce the historical food photographs, menus or prices. Case placement and dimensions are fitted estimates: each case is 1.35 × 1.65 m, mounted beside the existing illuminated frame. Actual food/menu displays and interior shop fronts remain unfinished.

## Implementation and checks

- Twelve closed panels, 144 triangles, three material batches and one 1536 × 1024 PNG shared by both faces. The PNG is 108,065 bytes; the composed station GLB grows by 123,720 bytes.
- The component composer now appends embedded images, textures, samplers and UV attributes while retaining every inherited encoded buffer and metadata prefix. The composed texture hash and sampler are checked against the source artwork.
- The editable scene contains the matching cases and packed artwork. Reload verification checks all twelve meshes, triangle indices and UVs: zero measured position error; maximum UV error `1.834e-8`.
- Six native doorway walks pass: three lanes, each out onto the landing and back. Cases sit outside the opening; small frame and printed-face details are decorative, while the main cases collide.
- Three Chrome views verify left-to-right numbering, readable Japanese text and mounting without page errors. Brief frame samples have median 16.7 ms. These are visual spot checks, not broad release performance acceptance.
- Browser asset build and lossless asset checks pass. The isolated native test passes a 1.37 m walk, full translation/spin rest (7.90 s), free result, recall forfeiture and home.

## Current asset identity

| Asset | SHA-256 |
| --- | --- |
| Layout | `2b1c076820cb949542903fcb32eb246259e536dbb6934a2c954ee2eb22200830` |
| Station GLB | `789ea71dbed15f8cf4808c8239227a6bd29f7230dd453ebcf11bbb6b87ef01b6` |
| Editable source | `1060e5da8cfe0ba572f09bb7414a487d704d88adcffa0bc0c07e2f10ec8f98c0` |

The checked-in builder and installer are `web/station/realism/build-restaurant-displays.mjs` and `install-restaurant-displays.py`. The current source already includes the displays. Small component inputs and receipts are retained in `current/components/restaurant-displays/`; the original SVG and PNG are generated locally. The source texture is also retained at the canonical `current/source/textures/restaurant-directory.png` path for future exports. The current station uses one source/layout bundle; temporary full-scene exports and the candidate service overlay were removed after promotion. Disk check: current bundle 625 MiB, candidate receipts/views 27 MiB and the live preview overlay/layout 275 MiB. The restarted main service reports a ready native worker.
