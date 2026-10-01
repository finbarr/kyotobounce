# Rooftop garden bamboo

## Evidence and change

The [operator's garden photographs](https://www.kyoto-station-building.co.jp/service/square/)
show slender jointed bamboo, branching green crowns, pale support frames with
inward-leaning legs, and yellow ribbed planters with grey rims. The third
saved photograph gives the clearest view of the frame and exposed planting
surface. Cane counts, plant height and frame dimensions are fitted estimates.

This pass rebuilds all four bamboo beds in their existing footprints. It adds
76 tapered canes, forked leaf sprays, visible nodes, support frames and bindings,
recessed soil, hollow planter walls, rims and vertical ribs. The leaf meshes
have varied angles and drooping tips. Short sprays sit above the soil.

Acceptance is recognizable leafy bamboo with fitted support frames, clear
public aisles, matching visible and physical planter surfaces, and working
walking, throwing and recall in the local game.

## Construction and checks

`build-garden-bamboo.mjs` retires 171 panels and 78,704 triangles and adds
92 panels and 289,504 triangles in 13 material batches. There are 15,748
individual leaves. The component adds 24,329,500 browser bytes and no textures
or lights. Canes, supports, planter walls, rims and soil have native collision;
leaves, twigs, node collars, bindings and fine fluting are decorative.

The replacement verifier checks retained browser bytes and native records,
new visible/colliding geometry, and unchanged moving hardware. The physical
geometry stays within 35 mm of each existing bed footprint. Actual foliage
overhang is at most 315 mm, beneath the declared 650 mm limit. All planting
stays below 4.65 m above the garden floor.

Six Chrome views were inspected at 1440 × 900, including both sides, the
arrival and close views of the frames. Short frame samples had a 95th
percentile of 16.7–16.8 ms; texture count stayed at 387 and reflection captures
at seven. These observations cover the inspected views, not a sustained
performance benchmark. All four recessed soil surfaces pass native placement
within 6 mm of their visible height.

Both garden aisles pass native walking in both directions, with 960 position
samples, and both planter-face boundary checks pass. Chrome passes the same
four routes with 12 grounded waypoint checks and both boundaries, with no
browser errors. The browser asset build also passes.

The saved Blender source was reopened and checked against the candidate:
geometry, UVs, export normals, removed objects and retained bindings match,
with zero preview-normal discrepancy. Native gameplay passes walking, a free
throw beside the western bamboo reaching complete translation and spin rest
in 13.90 seconds, recall forfeiture and home.
Chrome gameplay passes entry, walking, a complete throw with zero final
velocity and spin, unsaved result presentation, recall during flight and home.
Its first run missed the short walking threshold while source verification
was running; the unchanged test passed after that work finished. The cause of
that first failure was not established.

| Final asset | SHA-256 |
| --- | --- |
| Layout | `e2d4a80b698275cd3d369c48511a4c9d722e6785bbe7d764e98c0b6777df91c7` |
| Browser geometry | `35b63c325190e4b970b0c91de7c4a55c8cb08032c29b04ecc731c0d2b2e599a2` |
| Editable scene | `cce75b01de00b0b7ef0f34fcb30f45bd579199b03c6b38769675015e90813ebd` |

## Rebuild and storage

Use one `COMPONENT` directory under `.local/` and the recorded parent:

1. `build-garden-bamboo.mjs PARENT COMPONENT`
2. `prepare-east-transfer-base.mjs PARENT COMPONENT/spec.json COMPONENT/station`
3. `web/v2/compose-component.mjs COMPONENT/station/assets.json COMPONENT COMPONENT/station COMPONENT/station/removal.json`
4. `finalize-east-transfer.mjs PARENT COMPONENT/station/assets.json COMPONENT`
5. `verify-static-replacement.mjs PARENT COMPONENT/station/assets.json COMPONENT COMPONENT/geometry-proof.json`
6. Inspect Chrome views and check native/Chrome routes, soil contact and gameplay.
7. Blender `install-east-transfer.py -- PARENT COMPONENT/station/assets.json COMPONENT COMPONENT/source`

Except for composition, the scripts are in `web/station/realism/`. Promotion
replaces the current editable source and exports in place. Superseded full
exports, duplicate component geometry and the temporary preview overlay are
removed. Reference photographs,
screenshots and generated assets stay outside Git.

The exact planting arrangement is an approximation. Central low planting
beds, seating and lawn still need refinement from the same photographs.
