# East Square: courtyard and garden construction

27 September 2026. Isolated construction candidate03; no full-station installation or final visual acceptance. [Visual review](east-court-construction/index.html).

## Built

The source-derived low floor now preserves the complete municipal boundary and six-vertex opening. A separate 21 × 18.5 m garden platform connects to it through north and west stairs and a ramp beside the Skyway bank. The connected candidate includes the existing eastern Skyway02 escalators and arrival apron.

- Arrival Y29.973377 m; garden Y31.093377 m. The 1.12 m rise remains a construction hypothesis.
- Two seven-riser stairs: each rise0.16 m, going0.34 m. North width16 m; west width8.5 m. These are model dimensions, not as-built measurements.
- Ramp16.8 m ×2 m, rise1.12 m (1:15), with handrails and an upper landing. This is not accessibility certification.
- New court:40 closed panels,680 triangles,3 material batches. Combined eastern assembly:113 panels,52,916 triangles,7 materials,2,532,364 GLB bytes plus existing moving lanes.

The coarse city-model texture provides an initial placement reference for the garden. Its boundary is provisional; no photograph-matched camera has yet accepted it. A current reference needs to resolve the garden's actual finish and the arrangement around NIWA. The [operator listing](https://www.kyoto-station-building.co.jp/restaurant_cafe/004/) confirms NIWA in the east zone on 7F. Its menu photograph does not establish court geometry and was excluded from the architectural image library.

## Why the old garden was rebuilt

The legacy garden is both at the old elevation and across the newly registered source openings. Ten of its 44 unique top vertices project outside the 53-face source footprint, including the stair opening and rounded southern recess. The [overlay](east-court-construction/old-footprint.png) and [coordinate check](east-court-construction/old-containment.json) record those conflicts. Simply lowering the old garden would retain them.

## Verification

- All 7,020 projected samples on the new garden/stair/ramp/rail triangles lie in the selected source footprint.53 source boundary vertices survive unchanged in plan;28 interior-hole samples remain absent from the low floor. These are geometry checks, not proof of actual public access.
- The isolated native worker passes 14 normal-speed capsule walks:3 north-stair lanes,2 west-stair lanes, the ramp and the apron-to-garden connection, each in both directions. Every endpoint is checked against its required level. No physics code was changed.
-230 vertical browser/native rays agree at115 route samples; no sampled obstruction. Two exact shared-edge ties are retained in the report. No covered-headroom minimum is claimed because these selected paths have no overhead surface in the isolated assembly.
- Serialization verifies all 78,810 vertices and every triangle index/winding across the composed asset; maximum float error4.256e−6 m.
- The builder checks closed oriented edges and positive volume for every panel. Candidates01–03 have identical geometry hashes; revisions corrected verifier routes rather than changing geometry to satisfy a test.
- `npm run build:web`, relevant JavaScript syntax checks and `git diff --check` pass. Chrome overview, ramp and source-context images were inspected. These use inspection lighting and unregistered cameras; they do not prove photorealism or full-game performance.

The first audit omitted a lower approach point on the apron route and assumed stair descent followed a straight height interpolation. The next audit exposed checkpoints only 0.10 m from the first riser, within the 0.24 m capsule radius. Final checkpoints are 0.50 m clear, normal speed is explicit, the allowed level envelope retains fall protection, and all endpoints must be within 0.08 m of their required level. Both earlier failed reports remain in .local.

## Remaining work

Register the garden edges and level changes to current architectural photographs. Reconstruct the 4F descent, eastern lift/toilet corridor, southern entrance and escalator/lift connection, perimeter boundaries and missing handrail details. Add the flared columns, retaining/seat edges, planting, furnishings and current tenant frontage using dated references. Preserve existing recognizable fixtures or replace them with justified current equivalents. Materials, paving joints, vegetation and lighting still need the visual rubric.

Only then coordinate the full Skyway/restaurant/court replacement, remap affected fixtures and courses, and run full station runtime, registered-view and Chrome performance/audio gates. The integrated station remains inner-roof01 with its previously recorded open failures. No commit, push or deployment has occurred.
