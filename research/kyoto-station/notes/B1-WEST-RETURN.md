# Western B1 return passage

28 September 2026. [Review gallery and route diagram](b1-west-return/index.html).

## What changed

The local B1 candidate now joins its north and south outer aisles around the western end of the escalator well. A lower opening also connects the return to the well floor. The upper enclosure is retained exactly.

The [operator B1 map](../maps/porta-shopguide-2026.pdf), [station floor diagram](../maps/floor-b1.svg) and [route photograph](../photos/porta-b2-route-05.jpg) support an open western approach adjoining Isetan. The map is schematic, and the photograph has no accepted camera registration. The 3 m return depth and 5.1 m opening span are explicit provisional assumptions.

This adds 37.07036 m² of floor. Its boundary follows the existing oblique core edge and both aisle ends. It intentionally removes 1.70911 m³ from the previous lower western wall and replaces the retained ends with two closed jamb meshes. The upper enclosure, other frontages, floor openings and four moving lanes remain unchanged.

The outer Isetan frontage, service links, eastern stair approach and B2 descent remain unfinished. Open component boundaries must be reconciled before station-wide installation. The candidate is uninstalled and does not accept a final visual milestone.

## Verified results

| Check | Result |
|---|---|
| Native/browser component probes | 5,526 pass; maximum difference 0.0985 mm; 24 independently checked shared-boundary ties |
| Walking | Ten actual capsule walks: both directions across the north join, transverse return, south join and two sides of the well opening |
| Floor and headroom | 35 sampled locations pass |
| Floor interfaces | Complete seams to core and both aisles; zero positive footprint overlap |
| Parent preservation | 833 existing records and four moving lanes exactly retained; one lower-wall record intentionally replaced |
| Source volume partition | Difference 3.01×10⁻¹³ m³ at the unchanged 10⁻⁷ m³ tolerance |
| Visual/native serialization | Indices and winding match; maximum Float32 coordinate difference 1.035 µm |
| Browser | Three Chrome inspection views rendered and inspected; browser asset build and diff check pass |

The first floor check incorrectly used a convex hull, which filled a shallow concavity along the source edge. The corrected verifier unions the actual top triangles; no construction geometry or tolerance was changed to obtain the pass.

Assembly23 contains 842 records, 66,732 triangles, 136,470 vertices, 22 materials and a 6,412,656-byte GLB. Compared with assembly21, it adds 282 triangles, eight records and 23,696 bytes, with no additional material. These resource counts do not establish a frame-time result.

## Ceiling correction

Chrome revealed a coplanar ceiling seam in assembly22. The final assembly23 subtracts the source upper-enclosure projection from the new ceiling footprint, removing 0.632818 m² of overlap while leaving the floor and opening unchanged. An independent check of the emitted ceiling triangles proves zero remaining overlap and exact agreement with that subtraction. Both final Chrome views were inspected; the visible seam is resolved.

## Reproduction and limits

Worktree: `/Users/finbarr/.codex/worktrees/performance-audit/kyoto`.

- Specification: `.local/station-realism/hall-b1-west-return-spec-02/spec.json`
- Component: `.local/station-realism/hall-b1-corridors-03`
- Assembly: `.local/station-realism/hall-descents-assembly-23`
- Preparation: `web/station/realism/prepare-b1-west-return.py`
- Construction: `web/station/realism/build-hall-b1-corridors.mjs`
- Independent interfaces: `web/station/realism/verify-b1-west-return.py`
- Native walking: `web/station/realism/verify-b1-west-return-walks.mjs`
- Gallery: `scripts/build-b1-west-return.py`

The comparison uses identical cameras before/after and inspection lighting. It is not a photographic match. Shop boundaries, architectural dimensions, surface finishes and lighting remain provisional. No C# or service code changed. Full-station course checks, representative gameplay performance and the 20-minute audio/context soak remain open.
