# Hall course audit and Locker Loop repair

28 September 2026. [Trajectory diagrams and receipts](hall-course-audit/index.html).

## One bounded repair passes

Locker Loop's finish moves **17.13 cm**, from the old concourse to the replacement `hall-bay-floor-surface`. Its **1 m radius, four original waypoints, start, shot hint and scoring remain unchanged**. The private catalog increments this course from revision 2 to 3; all other course definitions differ only in their candidate layout hash.

Two repeated authored shots and the existing +0.05° yaw neighbor each collect all four targets and finish inside the destination at full native rest. The same three inputs also pass on the preceding layout. The new authored rest has 20.0 cm of radial margin; the neighbor has about 14.7 cm. These three trials prove these inputs, not an exhaustive tolerance envelope.

The accepted private files are `locker-finish-04/catalog.json` and `proof-inputs.json`; native evidence is in [the placement receipt](hall-course-audit/locker-placement.json), [after proof](hall-course-audit/locker-proof.json) and [before proof](hall-course-audit/locker-proof-before.json). They remain separate from the active game's catalog.

## Why the first search failed

Native rays distinguish two problems: the western 1F–2F stair blocks some one-metre circles, and other circles span the `concourse` / `hall-bay-floor-surface` boundary. All 388 sampled floor points retain the expected height; this is not a floor hole at the finish.

The search initially imposed an unnecessary requirement to retain the old surface name. It therefore rejected one valid native placement in the 197-position search and 51 in the expanded 1,125-position search. Those failed receipts are preserved and superseded. Allowing the replacement floor, then validating the entire challenge natively, finds the repair without shrinking the circle or changing the shot. Native validation and its tolerances are unchanged.

## Full placement audit: inherited problems exposed

The earlier hall-only audit covered 74 concourse features. The expanded audit tests **166 starts, waypoints and goals across all 31 courses**, with their authored radii and normals. The preceding courtyard layout already has **11 failures**. The new hall candidate adds **20**, giving **31 affected placements across nine courses** before the Locker Loop repair.

| Course | Before hall integration | After hall integration |
|---|---:|---:|
| Balcony Express | 0 | 5 |
| Locker Loop | 0 | 1 |
| Escalator Relay | 0 | 2 |
| East-to-West Ricochet | 1 | 10 |
| Fascia Flip | 5 | 5 |
| Garden Switchback | 4 | 4 |
| Pillar Carom | 0 | 1 |
| Skyway Trapdoor | 1 | 1 |
| Sculpture Square Slingshot | 0 | 2 |

These are placement checks, not 31 played courses. A ray hitting a valid floor metres below the original start is counted as a mismatch. East-to-West Ricochet's authored start is **3.527 m above** its current support in both layouts, so its diagnostic throw is refused. Garden Switchback, Fascia Flip and Skyway Trapdoor also have inherited placement failures. The Locker Loop proof resolves one of the nine courses privately; the other eight remain open.

## Paired trajectories explain the new conflicts

Four unchanged authored inputs were replayed in unranked native design sessions, on both complete layouts, to full translational and rotational rest. Starts must resolve within 1 mm of the authored position; target placement checks are not bypassed in the actual campaign proof.

| Course | Before path | New path |
|---|---:|---:|
| Locker Loop | 50.41 m | 50.35 m |
| Balcony Express | 111.31 m | 68.02 m |
| Escalator Relay | 157.99 m | 143.43 m |
| Sculpture Square Slingshot | 190.78 m | 118.78 m |

Locker Loop stays close to its original route. Balcony Express hits the western well glass at 10.544 s. Escalator Relay first contacts the western basement handrail at 37.111 s. Sculpture Square Slingshot falls through the newly opened well and first contacts the basement floor at 9.533 s; it rests on B1 rather than crossing the old flat concourse. The previous [Pillar Carom comparison](HALL-PHYSICS-INTEGRATION.md) separately identifies the oval guard collision.

These are consequences of the reconstructed openings and guards, not evidence that the new geometry should be removed. The remaining routes need explicit revisions that retain their characteristic banks, traversal and difficulty, followed by complete native proofs. The diagnostic design captures are not replacement course definitions.

## Scope and remaining work

Native layout remains `47693cafa1aa635c6ceb88cedc1794a1d53fff612ba022661a4c5b6d986ff341`; no architecture, browser geometry, C#, physics parameters or production data changed in this audit. No performance or final visual acceptance is claimed.

Next: reconcile the remaining course routes and inherited upper-level support mismatches; finish gate/upper interfaces and evidence-based B2 geometry; then complete the plan's station, plaza, street, material, light, vegetation, 15-view and Chrome/runtime acceptance gates. The long-term goal remains active. Nothing was committed, pushed or deployed.
