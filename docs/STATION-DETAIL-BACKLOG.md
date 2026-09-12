# Station detail pass

## Current round — 2026-09-12

The September 8 batch K025–K031 is integrated, verified and deployed with
`assets-v3`, source `3741821`. The old assignment below is retained as scope
history; its pending handoff language no longer describes the current fleet.
All five development VMs were retired after verified preservation on September 12.

See [STATION-REFERENCE-AUDIT.md](STATION-REFERENCE-AUDIT.md) for the new
Street View/indoor photosphere comparison, specific remaining gaps, references,
model anchors and acceptance for K032–K036. K032 is integrated locally with static full-game and continuous shader-orbit
checks; it is not deployed. The larger geometry jobs are queued and have no running machines.

## Completed research and assignments — 2026-09-08

The user rejected the first pass as visually too sparse after deployment. This
second assignment is substantial visible scene work, with five independent jobs
starting from deployed source `4ee2976` and `assets-v2`. Prior acceptance below
describes the earlier bounded pass; it does not establish visual completeness.

### Evidence and missing features

| Feature | Current-model evidence | Reference and decision |
| --- | --- | --- |
| West Exit 7-Eleven Heart-in | `build-konbini.py` deliberately creates an empty shell. Its only text is small `Heart-in / WEST EXIT 2F`; final approach/interior captures show a generic gray box and dark room. | [Retail operator](https://www.dailyservice.co.jp/shop?stations%5B0%5D=%E4%BA%AC%E9%83%BD), [JR map](https://www.jr-odekake.net/station/img/premises/0610116.pdf), [branch exterior photographs](https://tabelog.com/kyoto/A2601/A260101/26033019/dtlphotolst/4/smp2/). Keep the 2F West Exit branch; add identity, glazing, furnished interior and discoverable approach. Interior arrangement is an authored approximation. |
| East Square tree, stepped seats and globe gazebo | The east court floor and enclosure exist, but the named fixture/landmark inventory lacks these features. A visual baseline is required before editing. | [Operator East Square photograph](https://www.kyoto-station-building.co.jp/app/themes/kyoto-station-building/service/square/img/img_eastsquare_01.jpg). Author the planting, support stakes, pale stepped seating and white openwork gazebo as a coherent court. |
| West 4F 朱甲舞 sculpture | `muromachi-square` exists; no corresponding sculpture in the canonical named geometry. | [Operator photograph](https://www.kyoto-station-building.co.jp/app/themes/kyoto-station-building/service/square/img/img_muromachisquare_01.jpg). Add the recognizable vermilion curved silhouette and plinth. |
| East 4F Space sculpture | No corresponding sculpture in the named geometry. | [Operator photograph](https://www.kyoto-station-building.co.jp/app/themes/kyoto-station-building/service/square/img/img_karasumasquare_01.jpg). Add the pale asymmetric frame and colored circular elements. |
| East 4F KYOTO letters | No letter monument in the named geometry. Older reference photos omit this addition. | [Operator announcement](https://www.kyoto-station-building.co.jp/news/kyotomonument/) documents the permanent December 2025 installation. Author freestanding letters and original seasonal surface artwork. |
| East 7F grand and West Exit 2F upright pianos | No piano IDs in canonical boxes/beams/panels. | [Operator installation page](https://www.kyoto-station-building.co.jp/service/special_setting/) documents both types and locations. Model their distinct cases, keyboards, pedals, seats and surroundings; musical interaction is outside this job. |
| East Square miniature station exhibit | No miniature exhibit in the named geometry. | The same installation page documents a 4.8 × 1.0 × 0.72 m miniature. Inspect enclosure photos before authoring an original simplified station model, display base and enclosure. |
| Registered station wayfinding and retail identity | `station-details.js` contains generic substring labels, including a west-side fallback to Kyoto Theater. Current frontage assignment needs an audit. | [Official floor guide](https://www.kyoto-station-building.co.jp/floorguide/). Queue a separate identity/location audit and bounded signage correction after the first wave. |
| Stone, metal, glazing and daylight | `station-look.js` removes granite color/normal maps; finishes rely on repeating diffuse grids. Garden/shop glass bypass generic glass treatment. One central reflection capture serves all elevations; hardware is outside the main finish traversal. | Dedicated PBR job using original material maps and [Three.js color management](https://threejs.org/manual/en/color-management.html), [physical materials](https://threejs.org/docs/pages/MeshPhysicalMaterial.html), and [filtered environment capture](https://threejs.org/docs/pages/PMREMGenerator.html). |

The operator's [plaza guide](https://www.kyoto-station-building.co.jp/service/square/)
and [installation map](https://www.kyoto-station-building.co.jp/app/themes/kyoto-station-building/service/special_setting/img/img_aboutlegobrickarea_map.png)
establish floor/area relationships. They do not establish surveyed game coordinates.
Named-ID absence is a research lead, not a substitute for inspecting the full
scene. Each job must capture the current full-game view and inspect its references
before modeling. Research photographs remain reference-only and outside Git/assets.

### First wave and acceptance

| ID | Machine / branch | Owned implementation | Acceptance |
| --- | --- | --- | --- |
| K025 | kyoto-camera / `fleet/heart-in-20260908` | Existing konbini builder, registration and audit; new `web/station/heart-in/` source. | Recognizable 7-Eleven/Heart-in branding from the west public approach; illuminated shelves, product categories, refrigerators and checkout; continuous walking route; doorway, gallery and fixture contact proofs; preserve playable receiving space. |
| K026 | kyoto-station / `fleet/photorealism-20260908` | `station-look.js`, new station material/light helpers and original texture source. | Distinct meter-scaled stone, satin metal and transparent glazing; readable sheltered spaces; appropriate static reflections for hall/gallery/garden; matched moving browser views and reported render/memory/download cost. |
| K027 | kyoto-robot / `fleet/east-square-20260908` | New `web/station/east-square/` generator and candidate layer. | Recognizable tree, stepped seating and globe gazebo in three reference-matched views; open circulation and substantial visible/contact geometry agreement. |
| K028 | kyoto-physics / `fleet/plaza-landmarks-20260908` | New `web/station/plaza-landmarks/` generators and separate landmark layers. | Three recognizable 4F landmarks with open silhouette details, supported bases, correct area registration and native contact tests. |
| K029 | kyoto-audio / `fleet/station-exhibits-20260908` | New `web/station/exhibits/` generator and three separate prop layers. | Distinct grand/upright pianos with close-view detail; recognizable miniature station/display; approach clearance and native contacts. |
| K030 | queued; next available feature machine | Registered signage/frontage audit, then bounded corrections. | Source-backed labels and directions for modeled destinations, readable at gameplay distance; no generic wrong-side name substitutions. |

Every geometry job owns a separate candidate blend, visual export and matching
collision proposal, never the shared canonical blend/layout or exporter. Reserve
the East Square core for K027 and boundary exhibit niches for K029; both submit
an anchor/occupied-volume receipt derived from existing floor triangles and the
official spatial diagram. Integration resolves transforms before either combined
collision layout or final asset pack is accepted.

Deliver reference comparisons, normal full-game wide/close screenshots and a
moving inspection; isolated bright workbench shots alone do not pass. Record
triangle/batch/texture deltas and browser errors. Geometry acceptance requires
actual candidate worker contacts, not just visual overlap. Preserve existing
routes, scores and immutable archived bundles. Photorealism keeps the accepted
fixed shadow filter and bounded practical-light pool, uses at most three static
reflection zones, and reports Linux software rendering separately from final
Mac/Metal validation (target warmed median ≤18 ms, p99 ≤25 ms at fixed resolution).

All five jobs use their own worktree, port 4281–4285, database and logs. Four use
medium reasoning; photorealism uses high; all use standard service. Reuse the five
existing 4-vCPU/8-GB machines (current combined rate $1/hour). Notify the user of
an actual Unity authentication requirement. Feature jobs do not deploy. Keep
only reproducible source, final candidate assets and compact review evidence.

## Earlier shipped pass

Bounded scope: K006 hardware/finishes, K008 rooftop garden, K010 tactile paving,
K012 shadows, K020 doorway artifacts and K021 practical lighting. Final status is
tracked in [FLEET_QUEUE.md](FLEET_QUEUE.md). This is an independently modeled
interpretation, not a survey. Reference photographs inform original geometry;
no downloaded photo pixels or third-party models enter the asset pack.

## References

- [Station operator: design](https://www.kyoto-station-building.co.jp/about/history/)
  establishes the central valley, east/west terraces and glass/metal enclosure.
- [Operator: squares, roof garden and public routes](https://www.kyoto-station-building.co.jp/service/square/)
  supplies photographs and locations for Karasuma Square, Muromachi Square,
  the grand staircase, Skyway and Oozora Hiroba rooftop terrace. Photographs show
  dark stair cheeks, pale nosings, riser equipment, glass shoes, panelized metal
  cladding, and bamboo beds, benches and perforated lamp shades in the garden.
- [Operator: stair illumination](https://www.kyoto-station-building.co.jp/graphical_illumination/)
  documents LEDs on125 of171 steps. Modeled daytime cassettes follow the retained
  game stair contours; they do not reproduce a commercial light show.
- Tactile profiles use [manufacturer tile drawings](https://www.eco-rubbertech.jp/pdf/catalog2026-2027.pdf)
  and [stud/bar drawings](https://www.mandf.co.jp/mandfpdf/mandfvol9katarogu.pdf).
  Dimensions are product-based references, not a JIS certification claim.
- [Retail operator shop4828](https://www.dailyservice.co.jp/shop/detail/4828)
  and the [JR January2026 station map](https://www.jr-odekake.net/station/img/premises/0610116.pdf)
  establish the West Exit Heart-in shop on2F outside the gates. Model coordinates
  remain inferred; a roof-to-shop throw requires separate native course proof.

## Implemented source and acceptance

| Task | Result | Remaining integration gate |
| --- | --- | --- |
| K006 | Curved stair-riser cassettes/lenses, glass shoes/service joints fitted to actual faces, mineral cassette/vent and stair finishes, Linux Noto CJK fallback. Hardware has150batches/92,864triangles versus100/46,176 before. | Rebuild hardware on the final layout and inspect full-game matched views. |
| K008 | Original rooftop garden fitted inside actual slanted façades, with planting, seating, lamps, guards and continuous28-step access from landing14. Exact visible meshes supply contact. Native walking, eight floor/guard shots,55,186floor samples and full-width stair/turn checks pass. | Final shop-combined browser export and coordinator visual acceptance. |
| K010 |43patches /86matched base-and-relief meshes; warning dots and guiding bars have5mm tapered profiles. Native rolling/bounce comparison passes. Old painted relief planes removed. | Ship source with matching new assets; old Catch the Lift disks require a new course revision. |
| K012 | Station-fitted4096shadow map, four stable fixed taps, tight footprint and world-space-preserving depth bias. Mac full-game views show clean broad surfaces and stable shadows,16.6–16.7ms medians. | Atrium p99 was24.2ms versus18.8ms under background load; no identical-tail claim. Check added high-deck geometry in final views. |
| K020 | Exporter subtracts only covered upward cap fragments from two west5F substrate/edge meshes; four triangles /0.935947m² trimmed. Exposed rims and side faces retained. | New complete export and continuous near/far doorway inspection. |
| K021 | Two retained shadowless fixtures fade to zero before reassignment. Actual native walk changed4lit relocations to0; fixed light count, bounded fades, retention and rollback checks pass. | Completed on current full station; no further feature work. |

Garden access is at Z[-31,-22.32], widened to2.6m structural width for2.4m clear
walking space. It connects the retained Y49.5859649 landing to Y54.4982456 garden.
The lower turning apron joins the actual curved landing polygon. The earlier
proposed stair foot at Z-34 was unsupported and is superseded. Exact fit, native
proof and reproduction commands are in [GARDEN-INTEGRATION.md](../tools/GARDEN-INTEGRATION.md).

## Build and handoff

Use the canonical export commands in [ASSETS.md](ASSETS.md). The main exporter
accepts explicit source/layout/output paths and exports only the active browser
scene, excluding the unused full authoring scene. Hardware accepts that same
layout and its own source-output path. The temporary structural exporter wrapper
has been removed; there is one maintained browser export implementation.

Final main source, collision JSON, main GLB and hardware must share a reviewed
asset revision. Preserve immutable prior assets and historical challenge/replay
bytes before replacement. Candidate binaries, downloaded research, temporary
services, failed captures and superseded exports stay out of Git. Keep only the
final editable source, reproducible tools and compact acceptance evidence once
replacements pass. No additional detail phases are implied by this document.
