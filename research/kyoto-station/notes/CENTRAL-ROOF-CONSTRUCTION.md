# Central canopy and transverse roof branches

27 September 2026. [Construction gallery](central-roof-construction/index.html).

## Evidence and selection

The municipal source object `Untitled.203` contains a continuous central roof connected to two transverse barrel roofs. A downward ray at renderer `(3.6,60,-15.4)` reaches face 13162 at Y50.021096 m. Edge-connected growth at 30 degrees selects 113 outward/upward roof triangles: 65 main, 24 western transverse and 24 eastern transverse. Raising the threshold to 40 degrees adds twelve vertical side faces. Those twelve remain in the original interface; they are not reclassified as glass. The previously registered eastern and western flares are separate.

This selection retains the source outer coordinates, attachment boundaries and branch intersections. It does not replace the roof with a rectangular extrusion. The 97 unique source vertices and 79 boundary edges form a connected orientable surface. Its 7,210.997 m² area is the municipal mesh area, not a surveyed roof measurement. The selected coarse shape is corroborated at a qualitative level by [FUJISASH's historical full-complex aerial](../photos/fujisash-QA97036-27.jpg) and the [structural engineer's project photographs](https://www.kanebako-se.co.jp/works/view/240). No photograph-matched camera acceptance is claimed.

Primary operator references were rechecked: [floor guide](https://www.kyoto-station-building.co.jp/floorguide/) and its 10F plan. The dated [2014 Skyway photographic walk](https://www.zekkeikana.com/kyoto/shimogyoku/skyway/skyway41.html) remains useful for the suspended corridor, which is not changed by this component.

## Construction and cost

`build-central-roof.mjs` constructs one continuous, closed glass shell across all 113 source faces. It offsets only the inner surface by a provisional 24 mm along averaged vertex normals and caps the perimeter. Source triangulation therefore creates no artificial internal end caps. The existing 1.44 m grid assumption is mapped separately along the main and transverse surface profiles; maximum profile projection distances are 7.36 / 2.83 / 1.80 mm. These numerical residuals describe grid parameterization, not survey accuracy or photo agreement.

The grid has 100 mm square members, consistent with the nominal size in the published structural account. Grid pitch/phase, glazing thickness and optical values remain hypotheses. The published 2 m inner truss, its bracing, supports, seals and drainage are still absent.

The initial build split straight runs into module-sized objects: 9,110 panels and 109,692 triangles. Keeping each straight run continuous within a source facet gives **3,155 closed panels and 38,232 triangles**, using two material batches. The visible grid density is retained. A mesh run can span several physical fabrication joints; those joints are not modeled by these mesh endpoints. This is an asset-cost reduction, not a measured frame-rate improvement.

## Verification

- Every closed panel passes welded-edge manifold and positive-volume checks.
- Exported float32 browser positions agree with native positions within 0.000004234 m, with corresponding reflected winding.
- **250/250 native/browser first-hit probes pass**, including every outer and inner glass triangle and 24 sampled frame members; maximum position error 0.000373735 m.
- Rebuilding independently produces identical GLB, native-panel and construction-report bytes.
- Script syntax checks, `git diff --check`, and `npm run build:web` pass.
- Three source-context Chrome views were rendered and inspected: aerial, hall and western junction. These use inspection lighting and are not the full game.

The full-station interference check passes **231/250** expectations. Sixteen hits identify duplicated imported frontage roof faces (essentially coincident with the new glass). Three hit the old canopy: `canopy-glazing-051-19`, `canopy-depth-strut`, and `canopy-glazing-120-29`, at approximately 0.1973 / 0.0945 / 0.1342 m difference. Failures are retained for source-interface and old-canopy replacement; they are not waived by the isolated result.

The hall view remains blocked by the municipal model's opaque inner shell. It cannot establish glazing or interior lighting quality. The junction view exposes the branch shape, but also coarse source surfaces and the unfinished connection to the western flare. Both failed visual conditions remain visible in the gallery.

## Next integration

Rebuild the west/east imported frontage from original triangles while preserving earlier eastern roof exclusions and the twelve vertical side faces. Coordinate removal of old central/western canopy geometry with the registered western roof, bridge and central corridor. Register the inner shell before replacing it with the published truss structure. Keep the playable candidate unchanged until the coordinated layout, route and course tests pass.

The current playable candidate is still `station-east-clearance-01`. No current game assets, service, C# source, scoring data or production deployment changed. The previous candidate's runtime results are not evidence for this uninstalled component. All 15-view, material, plaza, vegetation, evening and full Chrome performance milestones remain in force.

## Receipts

See the gallery for source selection, exact registration, construction, native tests, station interference, rebuild hashes and camera records. The authoritative component is `central-roof-02`; `central-roof-01` is the retained higher-cost draft.
