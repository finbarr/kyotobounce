# Subway registration: correct the layout before moving Exit 5

29 September 2026. Research increment against local main `344c016` and layout `adde5dd0e01b4019c890fcc0ef5304c89484520359ed002077cbffcddfcd06ff`. No station geometry changed in this increment.

## Finding

The current subway works as a fitted network, but its relationship to the real station is wrong. Moving Exit 5 farther east to match the diagram's relative ordering would compound that problem. The paid cores, public passage and street exits need a shared registration first.

The [current Kotochika plan](https://kotochika.kyoto/common/pdf/floormap_kyoto15.pdf), with north pointing left, places Exit 5 on the east side of the public passage near Central 1. The model places its lift west of the North core instead: the car origin is X147.6, Z39.8, while the current track pair is centred at X177. Public routes added around the wrong core can pass every walking test without validating the real building's layout.

An independent, coarse geographic check reinforces the concern. Transforming the saved [OpenStreetMap extract](https://www.openstreetmap.org/api/0.6/map?bbox=135.7587,34.9858,135.7613,34.9871) through `art-source/station-municipal-frame.json` gives these native coordinates:

| Feature | East X (m) | North Z (m) |
| --- | ---: | ---: |
| Mapped Exit 3, node 4334052856 | 112.22 | 125.80 |
| Mapped Exit 4, node 2789395084 | 41.11 | 121.06 |
| Mapped western track at Z0 | 92.22 | 0 |
| Mapped eastern track at Z0 | 105.75 | 0 |
| Current western track at Z0 | 167.75 | 0 |
| Current eastern track at Z0 | 186.25 | 0 |

The track-pair means differ by 78.02 m east–west at this section. **This is a discrepancy diagnostic, not an accepted 78.02 m translation.** The OSM ways retain KSJ2 / MLIT 2007 source tags, the track spacing differs, and the mapped line curves. OSM supplies no indoor elevations. Unnumbered entrance nodes must stay unidentified. Stronger surface anchors and the full public-route topology are needed before choosing the replacement geometry.

## Street and underground evidence inspected

- The [clinic operator's access map](https://kyoto-clinics.jp/access/) places Exit 5 near the eastern theatre-side escalator, beside the taxi area. It is a schematic, not a scale drawing.
- The [city's accessibility presentation](https://www.city.kyoto.lg.jp/templates/shingikai_kekka/cmsfiles/contents/0000287/287988/05prezen1.pdf), PDF page 18 (printed pages 4–5), shows the street lift outside, east of the taxi platform. The earlier assumption that PDF pages 4–5 contained the station map was incorrect.
- The [city tourism detail and photograph](https://kyoto-universal.jp/traffics/template/kyoto_station.html) show an underground lift recess beside a stair. Its walls have alternating stone bands and its approach has tactile paving.
- The [dated street-lift photograph](https://www.kyotojapantravelmap.jp/kyotostation-elevator/) shows a solid tan tiled kiosk with narrow glazed door panels, signage and a tactile approach. The [wider street photograph](https://kyoto-rys.com/facility/elevator/) places it at the end of the taxi canopy. These contradict the current generic glazed pavilion, but do not establish its exact shaft position.
- [NatsuTV's June 2025 photograph](https://commons.wikimedia.org/wiki/File:%E4%BA%AC%E9%83%BD%E5%B8%82%E5%96%B6%E5%9C%B0%E4%B8%8B%E9%89%84%E4%BA%AC%E9%83%BD%E9%A7%855%E7%95%AA%E5%87%BA%E5%85%A5%E5%8F%A3.jpg) establishes the Exit 5 stair canopy, brick enclosure and Granvia/theatre context. The geotag is a camera position, not a measured entrance coordinate; it is not accepted as a shaft anchor.

Ten new source receipts in `sources.json` pin the downloaded maps, photographs, page and OSM extract. Research media stay outside Git and are not shipped in the game.

## Next construction increment

1. Register the northern subway's street connections against the retained exterior and the operator's plan. Resolve the taxi-side lift and Exit 5 stair together, then connect them to a correctly oriented Central 1 public approach. Include the northern extent toward Exits 3/4; do not constrain the layout to the current short North-gate footprint.
2. Replace the affected core/passages as one coherent component. Reuse verified lift and escalator mechanics. Remove obsolete panels, motion instances, route records and shaft openings instead of leaving duplicate entrances or long invented connecting corridors.
3. Keep the current playable bundle until the replacement has matching source/browser/native geometry and complete public and paid connections. Verify both directions from platform lift through Central 1 to the street lift, the stair alternative, Porta connections and the retained southern passage. Check doors, landings, headroom and empty-shaft protection in native and Chrome runtimes.
4. Commit and merge that complete replacement, replace the current generated bundle, then clean the superseded full candidate. Eastern shop fitouts and more numbered exits follow the corrected circulation.

The acceptance evidence must distinguish **walkable**, **correctly connected**, and **registered against real features**. The existing native walking checks establish the first; they cannot establish the other two alone.

## Reproduce this audit

With `pyproj` installed:

```sh
python web/station/realism/audit-subway-registration.py web/v2/assets.json research/kyoto-station/maps/north-station-osm.xml .local/v2/current/components/subway-registration-audit
```

The script verifies the layout hash, projects and inverse-checks the mapped coordinates, reads the actual rail-head panels and lift definition, and writes `registration.json` and a north-up diagnostic `plan.svg`. It never edits assets. The report pins its inputs and script hash. The diagram was rendered and visually inspected. Nine real Chrome inspection views of the retained exterior are saved with this audit; these are source-location inspections, not new gameplay acceptance tests. No native rebuild or browser asset rebuild is needed for this research-only commit.
