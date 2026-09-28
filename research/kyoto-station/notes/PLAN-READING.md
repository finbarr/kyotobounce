# Plans, maps and source conflicts

All page numbers below are 1-based PDF page numbers unless described as printed pages.

## Best architectural drawings found

- **World Architecture 61, November 1997**, article by Carol Mancke and Michael Bade; photographs credited to Tomio Ohashi. [Original PDF](https://www.usmodernist.org/WORLD/WA-1997-61.pdf), saved in `architecture/`. PDF p42 / printed p40 has a site plan; PDF p45 / printed p43 has east–west and west–east sections plus north/south elevations. Visually inspected p42–45. Use these to establish overall organization and facade proportions; the scan is insufficient for precise small-part dimensions. No full as-built drawing set was obtained.
- **Operator event-space manual, 2025**: [PDF](https://www.kyoto-station-building.co.jp/app/themes/kyoto-station-building/service/eventspace/pdf/manual.pdf). Visually inspected PDF p15 / printed p14 and PDF p20 / printed p19. They include local plan geometry and dimensioned event footprints. A 9,100 mm annotation in the first and the 5,900/12,000 mm annotations in the second describe drawn areas, not entire rooms. Read annotations in context; do not substitute them for a surveyed structural grid.
- **Hachijo completion brochure, December 2016**: [PDF](https://www.city.kyoto.lg.jp/tokei/cmsfiles/contents/0000301/301545/kanseikinen.pdf). Inspected cover and PDF p2, p3, p6. Includes historic before/after evidence and a broad completed southern facade/forecourt photograph on p6. Current fixtures and transport routing still need confirmation. The companion municipal brochure contains the facility layout; PDF p2 was also visually inspected and includes the Miyako Yume Terrace, taxi/drop-off areas, bicycle parking, bus bays and sunken garden.
- **JR West map, 31 January 2026**: [PDF](https://www.jr-odekake.net/station/img/premises/0610116.pdf). Visually inspected. Best orientation reference for rail operators, gates, connections and level relationships; isometric diagram, not a construction plan.
- Official 1F/2F SVGs and all-floor diagram are downloaded; other floor pages preserve tenant information. The Kyoto subway K11 and Kintetsu diagrams are separate saved maps.

## Original architect archive

The [National Archives of Modern Architecture](https://www.bunka.go.jp/nama/collection/hara/index.html?menu=3-0-10) identifies a large Hara / Atelier Phi drawing-and-sketch collection containing JR Kyoto Station material. The collection database returned HTTP 403 here. Its existence is verified; individual Kyoto drawings and reproduction permissions were not obtained. The saved 2023 bulletin is a useful research lead, not a substitute for those drawings.

## Sources to keep distinct

- The [CCA record](https://www.cca.qc.ca/en/search/details/collection/object/382906), AP140.S2.SS1.D95.P16, belongs to James Stirling/Michael Wilford's 1990–1991 competition proposal. **Do not model the built station from it.**
- [Obayashi's 1998 report](https://www.obayashi.co.jp/en/ir/documents/ar_98.pdf), PDF p11, gives contemporary building context and a useful staircase/roof photograph. It says 117 steps; the current operator describes 171. The discrepancy has not been resolved, so use the current operator for the full staircase count and check physical extents before changing geometry.
- Fujitec's installation photographs and statistics describe the original project. They do not establish current elevator counts or present-day finishes.
- Old photos and dated panoramas establish durable architecture better than current shop names. Modern floor guides establish tenants better than 1997 images.
- Operator photos may be heavily color graded. Do not sample their RGB values directly as material albedo or infer physical illumination from exposure.
- PLATEAU is useful for exterior context. Its catalogue lists several levels of detail; that does not mean every building has textured LOD3 or that interiors are covered. The multi-gigabyte city archives were not downloaded.

## Remaining evidence worth acquiring during implementation

1. Higher-resolution original Hara plans/sections with explicit reproduction terms.
2. Matched, dated close-up photos of curtain-wall nodes, roof drainage, stair nosings, floor/stone joints and exterior signs.
3. Current Hachijo and north bus-terminal walkthrough playback and selected camera matches.
4. Seasonal plant identification and recent roof/East Square survey views.
5. A confirmed coordinate/height transform for each municipal dataset used.

These are research follow-ups, not claims that a current laser scan, BIM model or unrestricted texture library is available.

## Additional section leads — 28 September

See [the basement section audit](BASEMENT-SECTIONS.md). BSCA’s 2015 operator presentation is saved, but its PDF p3 is an undimensioned building-use axonometric. The Arketipo article lists transverse sections, but its drawing downloads returned HTTP 403. Neither source currently supports a numerical B2F elevation.
