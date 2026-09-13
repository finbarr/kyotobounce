# Kyoto Station references and model limits

Checked 2026-09-13. The 22 accepted station packages are implemented in **assets-v6**, canonical layout `232b331fe5f7543bf8b228774e15c6228fffb5ee389c2a538029665827e19cc8`. See the [completed package checklist](STATION-DETAIL-BACKLOG.md) and [authoring and verification guide](../web/station/additions/README.md).

## Registration

Operator maps establish floors, building wings, identities and public-route connections. Photographs establish architectural motifs and furnishing types. The model uses human-scale interpreted dimensions; neither a schematic map nor a photo establishes a surveyed transform. No metric reconstruction or photorealistic equivalence is claimed.

| Reference | Implemented correspondence | Limits |
| --- | --- | --- |
| [Central Gate Heart-in branch][central-heart] and [1F plan][map1] | Separate 1F convenience store, with Yojiya and travel/currency exchange in mapped order; retained 2F West Exit store | Counters, stock and private interior dimensions are authored |
| [JR plan][jr], [1F plan][map1] and [east tenant map][map-east] | Central Gate depth and services, Porta descent, Isetan entrance, Osake/7 Taps and hotel/service approaches | Paid gates remain closed; no full railway-platform or hotel-room reconstruction |
| [North–south passage photo][passage-photo] and [2F plan][map2] | Banded columns, yellow panels, low ceiling, round fixtures and a continuous public route | Heights and bay spacing are interpreted within the playable station |
| [West Square photo][west-photo] and [venue manual][manual] | Separate curved balcony room, patterned band, polished columns, shutters, side stair and upper gallery | Manual dimensions describe event footprints, not the entire room |
| [South promenade][promenade-photo] | Long 3F walkway, perforated parapet, drainage, planting and both end connections | External city context remains simplified |
| [South plaza][south-photo] | Distinct 4F Wood Square with turf, timber play forms, work counters, outlets and ceiling/dome motifs | Furniture dimensions and play shapes are original interpretations |
| [East Square][east-photo] | Yellow perforated volume and floor lights, retaining the tree, gazebo, piano and miniature | Existing gameplay surfaces constrain the arrangement |
| [Roof garden][garden-photo] | Denser bamboo, lower planting, mineral paving, drainage, benches and enclosure | Species, seasonal growth and individual plants are not surveyed |
| [Floor guide][floors] and tenant access pages | NIWA at east 7F; FUKUNAGA901, KATO and Ramen Koji at west 8F, 9F and 10F | Visible interiors and product displays are authored, not exact store layouts |
| [Operator plaza guide][squares] | Skyway glazing bases, brackets, ties, lighting and portals; six Stone Museum shelters with samples | Repeated structure is interpreted from public views |
| [Engineer photographs][engineer] and indoor panorama | Bounded facade families, recess arrays, projecting bands, grilles and transitions | Old photographs establish architecture, not current tenancy or seasonal signage |
| [Operator plaza guide][squares] | Evening artwork at the Grand Staircase risers, East Square wall and Skyway | Original animated artwork; not a copy of an operator show |

[NIWA](https://www.kyoto-station-building.co.jp/restaurant_cafe/004/), [FUKUNAGA901](https://www.fukunaga294.jp/location.html), and [KATO](https://www.katomodels-kyoto.com/storeinfo) were checked against their current venue/access pages. Floor numbering follows the operator maps rather than assuming equal storey heights.

## Evidence

The implementation carries 44 named inspection views with reference URLs and architectural anchors, plus 20 native walking routes. The browser inspector supplies opposing views and editable camera positions. Its reverse retail camera is moved clear of the retained escalator casing; the old roof pose is superseded by `add-garden-arrival` and `add-garden-edge`.

The verified geometry has 3,074 generated solids with matching visible bounds, 430 floor-support samples, 20 completed capsule walks and 12 ball-contact checks. Every current course has two native full-clear solutions. The current acceptance report includes matched daylight renders and repeated fixed-resolution browser measurements. Research images stay outside Git and the shipped asset pack.

Full private hotel rooms, every department-store interior and railway platforms remain outside the accepted scope. Temporary exhibition tents, dated advertisements and seasonal props in photographs are not treated as permanent architecture. The model remains a playable, independently authored interpretation of Kyoto Station.

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
