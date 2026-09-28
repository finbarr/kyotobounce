# Gate integration review

28 September 2026. The lower facade and provisional passage/bridge now form one component. **It is not installed in the full station.**

![Proposed gate overlaid on the unchanged full station](gate-integration-review/full-station-overlay.png)

This Chrome view deliberately keeps the existing station underneath the new assembly. The two bridges are visible: the proposed bridge above and the old shallow mezzanine farther back below it. Old barriers, signs, glazing and support columns also remain. This is a dependency review, not the intended final appearance or a photographic acceptance image.

## What is ready

- The selected facade contains 452 records: front stone, sixteen blind recesses, returns, soffit and lights. It excludes the older sample floor and upper bay.
- The passage contributes 146 records, including its walking bridge but no ground slab. The current hall and concourse floors remain the integration surfaces.
- Combined: 598 records, 7,364 triangles, twelve material batches and a 3,753,916-byte GLB. This is the component's size, not the complete game's cost.
- Every native vertex and triangle matches the browser component within 0.75 micrometres; winding and flat normals pass. The facade's original UVs and normal attributes are copied without recomputation.
- Chrome rendered the assembly with the complete station at the requested camera, with no page errors. This was a static inspection, not an FPS benchmark or gameplay test.

![Existing and proposed gate plan envelopes](gate-integration-review/plan.svg)

The bridge envelopes in this diagram are convex hulls. They are not exact walking areas. The new bridge elevation, depth, end connections and ceiling remain provisional, as explained in [the passage study](CENTRAL-GATE-PASSAGE-BRIDGE.md).

## What must be replaced together

The inventory identifies 118 old gate-equipment records and 127 central-hall records within the broad transition region. These counts define a review set, not a deletion list.

| Group | Current evidence | Next action |
| --- | --- | --- |
| Old curved mezzanine, railings and upper glazing | Visibly duplicates the proposed bridge; some upper glazing intersects the proposed ceiling's bounds | Replace as one architectural assembly after checking its wing connections |
| Old column supports | Four splayed support pieces intersect the proposed ceiling's bounds | Resolve support locations with the bridge and side connections |
| Gate barriers, boards, offices and ticket machines | Existing barriers are about 22 m behind the source facade; their count and placement are inherited estimates | Establish a coherent replacement bank and adjacent offices from photographs/maps |
| Old front returns, soffit and attached lamps | Belong to the old 33 m portal, rather than the source 17 m opening | Retire or rebuild associated solids, visible fixtures and authored lights together |
| Existing hall/concourse floors | Coverage was independently verified in the preceding floor study | Preserve geometry and surface IDs |
| Municipal source art | No municipal records intersect the inventory regions; the original central facade was excluded during an earlier station import | Do not delete unrelated municipal wings or frontage |
| Neighboring shop walls and upper circulation | Shared structures extend beyond this component | Inspect junctions and clip only the justified replacement area |

The contact audit found 21 candidate pairs involving thirteen existing surfaces. These are conservative bounds tests against new solids. Floor-to-wall contacts are expected; curved geometry can also produce false positives. They are not thirteen confirmed defects or permission for blanket deletion.

## Gameplay dependencies

Seven courses have features within the broad transition envelope: `kyoto-ticket`, `kyoto-cafe`, `kyoto-pillar-carom`, `kyoto-balcony`, `kyoto-terracedrop`, `kyoto-skyway-trapdoor` and `kyoto-crossstation`. Eleven nominal walking routes cross one or more review regions. These are spatial dependencies, not eleven failing walks or seven new course failures.

Pillar Carom needs trajectory testing even though its marked targets do not reference the old information glazing: its current repaired trajectory uses that glazing on the way to a target. Preserve that dependency explicitly when replacing the office frontage. Existing seven unresolved course repairs remain unresolved; this review did not run or change courses.

## Installation sequence

1. Resolve barrier-bank placement and both bridge-end connections; retain explicit uncertainty for unmeasured dimensions.
2. Author an exact retirement/clip manifest covering old bridge, offices, gate fixtures, returns and their lights. Preserve unrelated geometry and the two current floor panels.
3. Install the coordinated assembly into a new private full-station Blender/layout pair and export matching browser geometry.
4. Inspect the full scene, run native walks and affected course trajectories, then the complete Chrome/runtime gates.

The current private full station remains candidate05; active assets remain courtyard life04. No commit, deployment, service or course changes were made.

## Receipts

[Selection](gate-integration-review/facade-selection.json) · [Assembly](gate-integration-review/assembly.json) · [Vertex/index verification](gate-integration-review/serialization.json) · [Normals](gate-integration-review/normals.json) · [Full inventory](gate-integration-review/inventory.json) · [Chrome capture](gate-integration-review/chrome-overlay.json) · [File hashes](gate-integration-review/manifest.json)
