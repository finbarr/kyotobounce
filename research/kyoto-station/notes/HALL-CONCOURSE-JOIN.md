# Hall and concourse floor integration

28 September 2026. [Geometry review and course dependency map](hall-concourse-join/index.html).

## What changed

The old shared concourse slab would cover the reconstructed basement wells if retained beneath the new hall. A new **uninstalled** floor component cuts out the complete 598.846461 m² hall footprint, including its three openings. It preserves the remaining 14,047.153539 m², the pre-existing western opening, the 0 m floor datum, the original 0.600000024 m slab depth and the `concourse` surface identity/material/role/collision properties.

The replacement hall backing covers 452.964385 m², leaving 145.882077 m² of source-derived well openings. All 842 records and four moving lanes of assembly23 remain exact; only composed browser material indices shift by one. The outer floor in the Chrome review uses a plain inspection material. It is not final paving or a complete station view.

This advances the installation work; it does not install the hall or establish photographic completion. The full station remains courtyard life04/browser04.

## Evidence

- Spec: `hall-concourse-join-spec-02/spec.json`, SHA256 `b01ce336fa38b005d61fd0c9c68ab140a18b77d54853a2055d3d772eed56a002`.
- Component: `hall-concourse-join-01`, one closed panel, 104 triangles. Native SHA256 `fc4e99f6f0123c2154fdde52d4b941ba611e88e684789d494ed21bbf4db100c1`; GLB SHA256 `79bc33d09b530ff155cb7ee3067903d3320247bf11f2063371763570a4d3ac81`.
- Combined inspection: `hall-concourse-assembly-02`, 843 records, 66,836 triangles, 23 materials; GLB SHA256 `2085be951ce719b10b63dc81234282e6233435a3d9f8d1057f595d8fc7078f36`; native SHA256 `9ba5420fd5427d49b450414e7bfae05b38db3f5448353c88fefac46e5f19d1de`.
- [Independent footprint proof](hall-concourse-join/interface-proof.json): zero overlap; total coverage differs from the original floor minus the three wells by only 5.21e-15 m². The entire 109.820247 m shared boundary is covered on both sides within 10 nm.
- [Serialization](hall-concourse-join/serialization.json): indices/winding exact, maximum Float32 position error 1.035 µm.
- `hall-concourse-native-01/report.json`: all 28 support/headroom samples and eight actual player walks passed across four floor joins, in both directions. The subsequent course audit stopped on a genuine Balcony conflict; the overall report remains failed.
- `hall-concourse-native-02/report.json`: a support-only follow-up completed all 74 authored concourse-center queries from 17 courses. It retained ten conflicts; it did not repeat the already-passing walks.
- Both Chrome views inspected; browser asset build and `git diff --check` pass. Native/render processes terminated. No C# or service change.

The first preparation assertion incorrectly compared tile tops alone against the continuous footprint, excluding their intentional recessed joints. The final check uses the continuous backing at −2 mm. The first exact GEOS line subtraction also split nominally collinear segments at floating-point roundoff; final proof covers the whole boundary with an explicit 10 nm band. Neither correction moved geometry or waived a physical gap.

## Course reconciliation is required

[Complete machine-readable dependency list](hall-concourse-join/course-summary.json).

| Course | Conflicting centers | Observation |
|---|---|---|
| Balcony Express | patch-1, patch-2, patch-5 | Two curbs; one point now looks down onto the B1F floor |
| Escalator Relay | patch-7 | Moving escalator surface; rejected as a fixed target |
| East-to-West Ricochet | patch-1, patch-2, patch-5, patch-6, patch-7 | Moving escalator surfaces; rejected as fixed targets |
| Sculpture Square Slingshot | patch-2 | Well curb |

Ten other centers retain support near their original height but change from `concourse` to `hall-bay-floor-surface`. Those surface references also need reconciliation. The other 54 queried centers retain the original support identity and pass this center check.

These queries use a 0.1 m placement radius. They do **not** prove full authored target-disk clearance, unobstructed ball paths, valid starting routes, a successful throw or complete-station gameplay. No course, scoring rule or score record was changed. Keep these failures visible until complete-station integration and course replay resolve them; do not fill the actual wells merely to retain old target positions.

## Remaining work

Replace the old hall/gate geometry by exact identities; connect upper and adjacent architecture; complete B2; preserve course identities while reconciling their authored surfaces and intended routes; then run full runtime, visual and Chrome performance checks. This floor component alone is not sufficient for installation.

A [new all-position source audit](hall-concourse-join/source-depth.json) finds the municipal station mesh ends at renderer Y = −4.995001793 m. It provides no B2 floor datum. The [360° route inspection](BASEMENT-360-INSPECTION.md) remains useful for adjacency and enclosure, but does not establish hidden dimensions.
