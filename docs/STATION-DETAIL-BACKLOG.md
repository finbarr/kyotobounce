# Station detail pass

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
