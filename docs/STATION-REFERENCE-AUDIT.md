# Kyoto Station: reference-to-model audit

Audited 2026-09-13 against source `efe3144`, pinned **assets-v5**, and canonical layout `b304c84aa1292e9e401c4abde9d305f754548d3b815fba8137802c9a2a385515`.

The model has the main atrium, staircase, escalators and several recognizable landmarks. Its largest remaining weaknesses are incomplete public routes, approximate shop placement, repetitive architectural bays and sparse furnishings. More polygons or higher-resolution stone alone will not correct these differences.

This is an audit of the current game, not a claim that the additions below have been built. The implementation queue is [STATION-DETAIL-BACKLOG.md](STATION-DETAIL-BACKLOG.md). It replaces the previous audit and retired machine assignments.

## What was actually inspected

- Rendered the pinned current assets in Chrome using the game's station materials, authored details, escalators, lighting and reflection code. Saved 12 diagnostic views: central hall, east shops, west cafe/gallery, Central Gate, two East Square directions, two garden views, Skyway, Heart-in, Great Staircase and the longitudinal atrium. Camera positions are in [STATION-AUDIT-VIEWS.json](STATION-AUDIT-VIEWS.json).
- Reopened and rotated [Creative Office Haruka's indoor photosphere](https://www.360cities.net/image/kyoto-station). Its capture date is **18 December 2014**. Used it for the atrium's facade rhythm, recesses, lattice and soffits, not current shops or seasonal installations.
- Reopened [indoor Google Street View](https://www.google.com/maps/@?api=1&map_action=pano&pano=fx-nt8QKKxR0HkRNsB6MCQ&heading=199&pitch=0&fov=75). The displayed imagery is **February 2017**. Inspected the covered concourse's columns, stairwell guards, lighting and tactile branches. The floor selector is not independent proof of a photographed location.
- Visually inspected the operator's current 1F, 2F and east-1F map exports; JR West's January 2026 isometric station plan; the station building facility diagram; and the venue manual's dimensioned 2F passage and West Square sheets.
- Inspected operator photographs of East Square, Muromachi Square, the roof garden, Skyway, south promenade, south plaza, north–south passage, West Square and Stone Museum, plus the structural engineer's atrium and Skyway photographs.
- Checked the current layout's geometry and route inventory, the concourse and Heart-in authoring scripts, registered signs, and existing scene layers. A missing object name alone was **not** treated as proof that something is absent.

The layout contains 7,113 boxes, 34,765 beams, 8,256 panels, 82 flights and 20 escalators. These are layout records, not draw calls or a measure of fidelity. The diagnostic renderer omits the player and HUD. Its lighting is the game's setup, not a calibrated recreation of each reference photograph; neither pixel differences nor color differences are dimensional evidence.

## Most consequential findings

### The ground-floor 7-Eleven is still missing

The existing store is explicitly registered as **2F West Exit Heart-in**, with its threshold at native `(-54, 7.35, -18)`. It is present: the new render shows its branded fascia, glazed entrance, fridges, checkout and stocked shelves. Its interior is an authored approximation.

There is also a **1F Central Gate Heart-in outside the gates**. The [retail operator's branch page][central-heart] identifies that distinct branch and shows it on a 1F map; the [building's 1F plan][map1] places the convenience store on the north side of the central concourse. The 2F model does not satisfy this ground-floor feature. Add it at the correct mapped approach rather than duplicating the existing store beside an arbitrary wall. The operator also distinguishes other station branches; those should not be conflated with this one.

### The central concourse has labels and fixtures, but not the full station frontage

The current render has Central Gate barriers, route-name boards, an information window, a clock, vending/ticket fixtures and posters. However, a large blank dark backing immediately behind the gates closes the scene; the arrival hall reads as a terminal wall. Ticket machines and four generic poster bays do not communicate the real ticket-office, passenger-service and retail cluster.

Use [JR's station plan][jr] to separate Central Gate, ticket offices, station information, tourist information, luggage services and paid platforms. Model visible depth behind the gate line without accidentally making paid railway areas part of the playable public route. The map provides topology and identities, not a surveyed metric transform into our scene.

The [current 1F map][map1] also identifies Yojiya and the travel/currency-exchange frontage. These deserve recognizable thresholds and displays. Generic vending or locker props elsewhere are not substitutes for their locations.

### Several public spaces are not represented faithfully as connected destinations

The [2F plan][map2] shows the north–south free passage, West Square, Isetan edges, hotel reception approach and Kyoto Theater/Washoku Koji approach as distinct spaces. Our west inspection reaches a cafe/gallery of repeated opaque panels and benches, with stairs crossing ahead. It does not reproduce the photographed public-passage or West Square ensemble. Existing circulation surfaces must be surveyed and reused where correct; do not mark the entire west side absent.

The operator's [north–south passage photograph][passage-photo] shows banded square columns, yellow panels and a low dark ceiling with round luminous openings and linear services. Its [West Square photograph][west-photo] shows a separate tall curved room, reflective cylindrical columns, a balcony band with diagonal patterning, shop shutters and escalators. These are different architectural modules, not one interchangeable concourse kit.

The [3F south promenade photograph][promenade-photo] and [4F south plaza photograph][south-photo] reveal two further distinct destinations. The model has south boundaries, approaches and a Muromachi connection, but no identifiable complete counterpart to either photographed space was established. Queue them as **missing identifiable spaces / registration required**, not as measured missing floor area.

### Large facade differences dominate the view

Compare the [engineer's atrium photograph][engineer-atrium] and indoor photosphere with `03-along-atrium` and `02-great-stair`. The current long wall repeats similar deep rectangular bays and broad, flat stone/glass bands. It lacks the reference's local changes in panel fields, small square recess arrays, varying reveals, projecting stone-framed volumes and service/display openings.

The main space frame exists and has substantial geometry. Its supports, wall connections and edge transitions still need local photographic registration. Repeating another generic module across the whole wall would increase density without making the architecture more accurate. Start with one bounded bay and its adjacent transition, then establish which real sections actually repeat.

### Landmark presence has been mistaken for completion

East Square already contains a globe gazebo, supported tree, seating, piano and miniature exhibit. The render confirms them. Nevertheless, the layout of raised platforms and extensive guardrails looks very different from the open square and pale seating in the [operator's photograph][east-photo]. The yellow perforated architectural volume, floor-light arrangement, facade base and pedestrian clearances need particular attention. Register two opposing viewpoints before moving any collision surface.

The rooftop garden also exists. `garden-current` shows planting islands, bamboo, benches, lamps and a guard. It remains visibly sparse beside the [operator's garden photograph][garden-photo]: thin bamboo crowns, simple planting edges, limited groundcover and a largely featureless perimeter. The roof edge and landing work must accompany planting improvements.

The stored `inspect-roof-photo-2021` pose now looks across a building edge rather than producing the intended garden comparison. That camera cannot serve as acceptance evidence for the current asset pack. Several other stored camera entries already say registration is pending. Their presence in JSON is not proof of an accurate reconstruction.

### Material and lighting work needs a controlled comparison

Current captures show broad nearly black walls and heavy lattice shadows obscuring detail, while many reference photos reveal much more readable stone and interior light. Their weather, exposure and time differ, so the audit cannot assign this solely to material color or solely to lighting.

Create a matched daytime comparison that checks exposure, stone roughness/normal scale, glass transmission/reflection and indirect illumination together. The Heart-in products are still simple colored blocks; furnishing silhouettes, packaging variety, shelf-edge labels and plausible interior brightness would improve close views more than merely enlarging the existing textures.

## Area-by-area coverage

“Approximate” means a recognizable model element exists but its form, placement or detail is not accepted. “Unresolved” means the exact current counterpart or photographic registration remains unproven.

| Area | Current evidence | Remaining difference | Queue |
| --- | --- | --- | --- |
| 1F Central Gate Heart-in | Only the separately registered 2F shop is established | Distinct 1F storefront and approach missing | K038 |
| 1F Yojiya / travel frontage | Generic shop/service faces | Correct mapped identities, windows and thresholds | K039 |
| 1F Porta / Isetan edge | Floors, shop shells and generic connections | Legible entrances and below-grade route mouths | K040 |
| 1F east concourse | Osake / 7 Taps artwork and furnished bays exist | Compressed placement; hotel/police/locker/lift relationships unregistered | K041 |
| Central Gate / ticketing | Gate units, boards and generic information window visible | Office composition, operational signage and believable depth | K042 |
| 2F north–south passage | Related west landing/cafe geometry exists | Continuous public route and photographed column/ceiling identity unresolved | K043, K035 |
| 2F West Square | No faithful counterpart established in inspected west views | Curved foyer, balcony, polished columns, shop entrances | K044 |
| 2F theater / Washoku Koji | East passage and theater-related geometry exist | Actual foyer, entrances and current restaurant identities | K045 |
| Main atrium / stair walls | Space frame, bays, stone and glass exist | Distinct facade families and their transitions | K033 |
| 3F south promenade | South approaches exist; exact counterpart unresolved | Long planted route, parapet apertures, paving/drainage, rail views | K046 |
| 4F south plaza | South volumes exist; recognizable wood square not established | Turf/play zone, timber furniture, work area and surrounding openings | K047 |
| East 7F court | Tree, gazebo, seats, piano, exhibit present | Court arrangement, yellow volume, fixtures and enclosure | K048 |
| East 7F restaurant edge | Generic curved restaurant shell and doors | NIWA identity and verified storefront/interior-visible details | K049 |
| West 8F–10F destinations | Repeated facade/door modules and Ramen direction sign | Distinct FUKUNAGA901, KATO and Ramen Koji arrival frontages | K050 |
| Skyway | Long enclosed route, steel and rails present | Glazing opacity zones, bases, brackets, lights and portal details | K051 |
| Roof garden | Planted islands, bamboo, lamps and benches present | Plant density, edge enclosure, paving and landings | K036 |
| North forecourt | Bus-terminal/context geometry exists | Stone Museum and entrance-specific street furniture not established | K052 |
| Walking surfaces | Tactile geometry and stone textures exist | Map-accurate branches, thresholds, drainage and local finish changes | K053 |
| Night identity | Arcade effects exist | Station-specific staircase / Skyway / East Square light installations | K054 |
| Whole scene appearance | Current PBR/reflection pipeline exists | Matched daylight calibration and better fixture/material variation | K055 |
| Inspection evidence | Many stored poses, mixed registration status | Usable current reference pairs and route map | K056 |

The operator's [floor guide][floors] establishes NIWA on 7F, FUKUNAGA901 on 8F, KATO on 9F and Ramen Koji on 10F. Those identities must be placed in the correct building wing, not assigned to the nearest anonymous door. Full private hotel rooms, every department-store interior and all railway platforms are outside this audit's first implementation batch.

Small but distinctive later details include the ammonite-bearing stair wall between 1F and B1F, and the Great Staircase winner inscriptions, both documented by the [station operator][tour]. Add them only to a registered location. Temporary exhibition tents, dated advertisements and seasonal event props in old photographs are not permanent building features.

## Evidence and uncertainty rules for implementation

1. Establish floor, wing and public-route connections from operator maps first. Then fit a human-height photograph using at least three architectural anchors. Publish the chosen anchors and uncertainty; do not invent centimeter accuracy from a diagram.
2. Verify a second view not used to fit the first. A copied camera label or an attractive isolated asset is not acceptance.
3. Author scene geometry and collider changes together. Prove walking and ball contact at entrances, stair lips, guards and new raised furniture; rerun affected course solutions after topology changes.
4. Keep believable service depth behind visible entrances, even where the interior remains inaccessible. Do not cover an architectural omission with a sign naming it.
5. Benchmark the actual game after each integrated group. Prefer shared atlases, repeated-instance geometry and bounded lighting. Preserve readable detail and collision fidelity; do not trade the audit's visual gains for hidden resolution cuts.

## Source register

All links checked 2026-09-13. Operator image publication/capture dates are generally not stated. The venue manual is labeled 2025 and includes 2024 event examples. Those are evidence of permanent architecture, not a September 2026 event calendar.

- [JR West station plan][jr]: dated 31 January 2026, isometric circulation and facility identities. Its stair/elevator reference numbers are map keys, not physical station signs.
- [Building 1F map][map1], [2F map][map2], [east 1F tenant map][map-east]: extracted from the current official floor guide; schematic, not a construction survey.
- [Building facility diagram][facility]: useful for wing/floor relationships; not proof of current tenancy.
- [Venue manual][manual]: printed pages 14 and 19 inspected for the 2F passage and West Square. Dimensions describe event footprints and nearby geometry; they must not be mistaken for whole-room sizes.
- [Structural engineer's project page][engineer]: construction and architectural photographs.
- [Operator plaza guide][squares] and [floor guide][floors]: current public-area and tenant identities. Individual photographs are linked above.
- [Indoor photosphere](https://www.360cities.net/image/kyoto-station): 2014, multiple directions visually inspected.
- [Indoor Street View](https://www.google.com/maps/@?api=1&map_action=pano&pano=fx-nt8QKKxR0HkRNsB6MCQ&heading=199&pitch=0&fov=75): February 2017, covered concourse detail only.

[central-heart]: https://www.dailyservice.co.jp/shop/detail/5404
[jr]: https://www.jr-odekake.net/station/img/premises/0610116.pdf
[map1]: https://www.kyoto-station-building.co.jp/app/themes/kyoto-station-building/floorguide/img/map/img_map_1f.svg
[map2]: https://www.kyoto-station-building.co.jp/app/themes/kyoto-station-building/floorguide/img/map/img_map_2f.svg
[map-east]: https://www.kyoto-station-building.co.jp/floorguide/1f/?tenant=sta-bldg
[facility]: https://www.kyoto-station-building.co.jp/app/themes/kyoto-station-building/guidemap/pdf/facility-01.pdf
[manual]: https://www.kyoto-station-building.co.jp/app/themes/kyoto-station-building/service/eventspace/pdf/manual.pdf
[engineer]: https://www.kanebako-se.co.jp/works/view/240
[engineer-atrium]: https://www.kanebako-se.co.jp/media/5/9/0/590_800x600.jpg
[passage-photo]: https://www.kyoto-station-building.co.jp/app/themes/kyoto-station-building/service/square/img/img_pedestrianwalkway_01.jpg
[west-photo]: https://www.kyoto-station-building.co.jp/app/themes/kyoto-station-building/service/square/img/img_westsquare_01.jpg
[promenade-photo]: https://www.kyoto-station-building.co.jp/app/themes/kyoto-station-building/service/square/img/img_southpromenade_01.jpg
[south-photo]: https://www.kyoto-station-building.co.jp/app/themes/kyoto-station-building/service/square/img/img_southsquare_01.jpg
[east-photo]: https://www.kyoto-station-building.co.jp/app/themes/kyoto-station-building/service/square/img/img_eastsquare_01.jpg
[garden-photo]: https://www.kyoto-station-building.co.jp/app/themes/kyoto-station-building/service/square/img/img_oozorahiroba_01.jpg
[floors]: https://www.kyoto-station-building.co.jp/floorguide/
[squares]: https://www.kyoto-station-building.co.jp/service/square/
[tour]: https://www.kyoto-station-building.co.jp/tour/
