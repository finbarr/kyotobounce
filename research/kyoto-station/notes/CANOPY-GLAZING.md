# Canopy and curtain-wall glazing evidence

## New primary reference, retrieved 27 September 2026

[FUJISASH / FACING ONLINE station project](https://www.facing-online.com/detail.php?id=226) supplies eight full-size project photographs and a one-page curtain-wall detail PDF. All ten files are retained and SHA-256 indexed in `sources.json`. Copyright remains with the publisher; these are research references, not runtime textures.

The page identifies an order-made, pressure-equalized grid curtain wall and July 1997 construction completion. The photographs' dates are unconfirmed: the north plaza construction in 03/04 and former southern THE CUBE signage in 13/22 make them historical structural references, not current landscape/tenant evidence. Strong blue color rendering is not a calibrated color or optical measurement.

## Inspected photographs

- 03/04: elevated north facade, curved upper canopy and strongly reflected buildings on lower glazing. Good additional registration candidates, including front/back roof edges.
- 14: north hotel frontage; open framing at canopy end, projecting window guards, recessed entrance and separately framed lobby roof.
- 19: hotel facade corner; mullions, opening vents, projecting balconies and curved entrance canopy.
- 13/22: southern department-store facade, circular windows, exterior stair and window-grid changes. Historical signs must not be copied into the current station.
- 01: dusk north hotel and canopy; selective warm occupied windows, lit lobby roof, darker canopy. Daylight probe reuse will not satisfy this evening reference.
- 27: aerial full complex, roof service zones, railway platforms and plaza geometry. Use for structure/context, with period-specific landscaping excluded.

## Drawing inspection

`plans/fujisash-QA97036.pdf` is one A4 page, raster artwork, with no extractable text. Its metadata creation date is 2 February 2016; this does not establish the drawing's issue date. The whole page was rendered and inspected.

The page shows vertical and horizontal curtain-wall sections, bolted support brackets, gasketed frame profiles, a grid elevation, operable panels and a glass-facade photograph. Legible detail labels include 255 total depth, 105 and 150 subdivisions, 25 joints and 1485 bay spacing; units are not explicitly stated on the sheet, so millimetres are an architectural inference. A small overall elevation label appears inconsistent with the repeated bay labels; do not derive a whole facade width from it. No optical transmission/reflectance value, glass product designation or explicit canopy assembly identification is shown. Treat it as a facade-detail reference, not proof of the canopy's coating or its 1.44 m structural grid.

## Current candidate and unresolved fidelity

The authored model shares `Glass - placeholder` among 5,698 canopy glass panels and guards/shop/bridge glass. The exporter now separates only prefix `canopy-glazing-` combined with that source material. Some objects sharing the prefix are solid steel: retain their original material. Geometry and the native layout are preserved.

The candidate uses a separate canopy shader, a north-exterior reflection capture for its outward side and existing interior captures on its inner side. Its coverage, F0 and tint are provisional photographic tuning values, not source specifications. The exterior probe is a spatial approximation; large-facade reflection parallax, geometry mismatch, night lighting and the glass/frame relationship remain unresolved. Test actual-game views from the plaza and inside the hall, plus the explicitly labeled north photographic cutaway, before judging appearance or cost.

## First candidate result

[Actual-game comparison gallery](canopy-comparison/index.html), with original capture receipts and geometry verification beside it. Three fixed views in Chrome 153 on this M2 laptop, 1280×720, 5 s warmup and 20 s measurement each. The elevated photo view uses a 60 m near-plane cutaway to exclude the unmodeled private Tower interior; its performance is not a gameplay acceptance result.

| View | Frame p95 before → after | GPU p95 before → after | Draw calls |
| --- | --- | --- | --- |
| Registered north cutaway | 18.60 → 18.30 ms | 14.00 → 14.29 ms | 1058 → 1059 |
| Plaza | 18.60 → 18.40 ms | 14.00 → 14.07 ms | 928 → 929 |
| Hall interior | 18.60 → 18.30 ms | 14.06 → 14.06 ms | 202 → 203 |

No browser errors, warnings, hidden frames, GPU query disjoints or dropped queries. Frame p99 remains at or below 18.9 ms. One pair does not establish a speedup or clear the repeated-pair/live-play acceptance gates. Reflection targets increase from 18 to 24 MiB; measured one-time capture execution increases from 986 to 1283 ms. This is not total game startup time.

The exterior now has broader reflections and less visible background structure. The interior remains readable, with darker glazing. The envelope still fails the reference: too much exposed framing, incorrect silhouette/pier proportions, overly smooth reflection structure and inaccurate reflection parallax remain. The source photos show much stronger building reflections on the lower facade. No visual milestone is accepted.

The exported 2,303,933 triangle positions, normals and winding match exactly. Glass UVs match exactly; 72 UV components on three unrelated east canopy finishes differ by at most 5.96e-8 due to export rounding. The independent geometry check records these differences rather than calling the entire file byte-identical. All seven packed material masks pass exact channel verification. Native layout and source Blender hashes remain unchanged.
