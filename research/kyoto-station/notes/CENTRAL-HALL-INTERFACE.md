# Central hall integration dependencies

**Follow-up:** [The corrected floor and gate passage](CENTRAL-HALL-PASSAGE.md) replace the unsupported 0.2366 m sample-floor choice and preserve source cutouts. The findings below describe the earlier bay03 component.

The current bay cannot be added directly to the full station. Its provisional paving would cover five existing Balcony waypoints, and the old gate wall, ticket equipment and upper public walkways need a coordinated replacement.

[Dependency diagrams and receipts](central-hall-interface/index.html) · [Bay construction](CENTRAL-HALL-CONSTRUCTION.md)

## Inputs and unchanged full station

- Full native layout: worktree `.local/station-realism/station-court-life-04/station-layout.json`, SHA256 `9ed317e3d57fb44d9a4dc7bd4400c8ac77b4c6c1311180e89f9e055982a27c9e`.
- Uninstalled component: `central-hall-bay-03`, GLB SHA256 `5c6f786b95290ceaa515f878cd86c5eb2e0239f96dc81d65b3414f54e33a7024`, native SHA256 `b55bb2d2d078e3f583e4226101dc945c9da24b0cdc0df7bd4c021b6fa9301a29`.
- Specification: `central-hall-bay-spec-01/spec.json`, SHA256 `4ca750ac05e97e8712690dd04ecd85cd6f287801ffdbc78c71dc187c4688a492`.
- Inventory: `central-hall-interface-02/inventory.json`, SHA256 `026fb9a90c894e873cd96b5b34606cb3528fda4b0a91e415322af3d7c15a7d95`.
- The canonical 31-course catalog was read and hashed, not edited. The full browser asset remains `court-life-browser-04`.

No source, component, full-station, scoring or service geometry changed during this check. No commit, push or deployment. The temporary additive layout is a diagnostic artifact, not a reconstruction candidate.

## What the inventory establishes

`inventory-central-hall-interface.mjs` transforms native records once into the source gate's local frame: X east, Y up, depth south of `Z = 5.3313210438 - 0.01665995456 X`. It declares four review volumes: the component bounds, the gate opening, a transition envelope spanning the current hall and gate equipment, and an upper interface envelope.

It finds 2,664 records:

| Kind | Count |
| --- | ---: |
| Panels | 1,609 |
| Boxes | 968 |
| Beams | 29 |
| Stair flights | 1 |
| Light positions | 57 |

The records include 436 old hall objects, 118 gate fixtures, 1,130 roof parts, the shared concourse floor and 979 other neighbors. Every entry has its kind, array index, stable ID and exact serialized record hash. Repeated IDs are not treated as unique identifiers.

Panel triangles and rotated box solids are checked against the review volumes. Beams, stairs and escalators use conservative envelopes; lights are point locations only. There are no escalator envelopes in these particular volumes. Thirty-nine roof records intersect the broad component bounds, but none intersects an actual new solid. No installed municipal-layer triangle surface intersects the review volumes.

The tool also checks existing panel triangles and boxes against all 537 colliding component boxes, asserting that each component is an axis-aligned box in the declared local frame. It finds zero surface/box intersections. This excludes containment inside arbitrary closed panel meshes and is not a native clearance or gameplay result.

The 11 nominal routes include the current hall in/out route, east frontage connections, 3F promenade, 4F wooden walkway and Skyway. Segment clipping catches five region crossings whose endpoints both lie outside the region. This is a foot-point path inventory, not swept-player clearance.

Seven courses have nearby authored features: Ticket, Cafe, Pillar Carom, Balcony, Terrace Drop, Skyway Trapdoor and Cross Station. Eleven additional courses refer to the shared concourse outside the feature region. Do not interpret that shared ID as evidence that all 18 courses change.

## Native floor discrepancy

`probe-central-hall-floor.mjs` ran two fresh compatible native workers. One loaded the unchanged full layout; the other loaded a private copy with the uninstalled component added. Each made downward placement queries at all five Balcony waypoint centers. There were no throws, service connections, database records or production changes.

| Query set | Support | Height |
| --- | --- | ---: |
| Current full station, all five points | `concourse` | 0 m |
| Diagnostic additive component, all five points | `hall-bay-floor-slab-*` | 0.236600 m |

Maximum numerical error against the intended 0.2366 m difference was 0.00000001822 m. Both workers stopped after their queries. The raw ten responses and exact layout hashes are in `central-hall-floor-probe-01/report.json` and the research gallery.

The component's backing bottom is 0.0366 m above the existing floor, so zero solid intersections does not establish a safe addition. The support surface still changes and covers the existing waypoint plane. This is not an executed course failure: no ball trajectory was run in the diagnostic layout.

## Required integration decisions

1. **Floor datum:** 0.2366 m came from a coarse source mesh, not a surveyed floor level. Resolve this against the wider hall registration. Preserve the continuous current playable floor until an explicit floor replacement and transitions are ready. Do not invent a step, silently raise course targets or accept coincident browser surfaces.
2. **Gate passage:** complete jamb returns and passage paving. The current ticket-gate fixtures remain roughly 22 m behind the source wall plane; the sample's 5.6 m return depth does not establish a correct gate-equipment location. Register the actual gate line and office boundaries before moving them.
3. **Adjacent architecture:** the current opening is 33 m wide; the source opening is 16.999 m. The small sample cannot replace the complete wall slice by translation. Complete neighboring bays and explicitly connect both ends.
4. **Upper routes and roof:** preserve the current 3F/4F walkway connections until their adjoining geometry has a replacement. Use the registered roof and exact source interfaces; do not shift a whole wall/roof layer just to meet the sample.
5. **Installation and proof:** make a fresh full-station candidate using exact record identities and hashes. Then verify Blender/browser/native correspondence, connected walks, authored courses, runtime behavior, actual-game visual comparisons and Chrome performance.

No new broad photo registration was accepted. The earlier nearly coplanar eight-point pose remains supplementary; independent depth landmarks are still needed. The previous Skyway Trapdoor failure and the wider long-term plan remain open.

## Verification

An independent readback verified all 2,664 record hashes, 11 route hashes, 18 catalog record hashes and all input hashes. Inventory revision 02 changes only the grouping of `central-roof-*` records; geometry, route and course results match revision 01 exactly. Both inventory runs are retained. See `central-hall-interface/verification.json`.
