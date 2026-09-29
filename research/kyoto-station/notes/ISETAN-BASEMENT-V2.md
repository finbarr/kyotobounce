# Isetan basement connections

## Defect and acceptance

The western station B1 hall and Porta B2 lift lobby ended at solid walls at X−43. No Isetan receiving floor existed behind them. The northern B2 aisle also ended at X−24.

This increment opens B1 into a connected food-hall loop, opens both B2 entrances from the Porta aisles, preserves both central-lift approaches, and connects B1 and B2 with a guarded internal stair. Done means normal native walks pass in both directions, Chrome can walk the B1 loop, the stair has clear headroom, and the saved Blender source matches the collision and browser exports.

## Evidence and fitted geometry

The official [Isetan B1 guide](https://www.mistore.jp/store/kyoto/shops/floorB1.html) and [B2 guide](https://www.mistore.jp/store/kyoto/shops/floorB2.html) link floor-plan images dated 16 September 2026 in their alt text. Local reference copies are registered in `sources.json` as `isetan-b1-floor-plan-20260916` and `isetan-b2-floor-plan-20260916`. The Isetan plans are rotated relative to the station diagrams: the station-facing entries appear at their bottom. Orientation and the adjacent public halls were cross-checked with the saved station operator B1 and B2 diagrams.

B1 has its eastern arrival opening into sweets, bread and drinks counters. B2 has two eastern entrances and food, deli and fresh-market aisles. Both plans show counter islands, perimeter circulation and internal stair cores. These diagrams establish connectivity, not construction measurements.

The new food-hall footprint is fitted at X−123..−43, Z−14..25. It retains B1 Y−4.9135828018 and B2 Y−8.7135829926. B1 has a five-metre opening; B2 has two five-metre openings and an extended northern receiving hall. The stair uses 22 risers of 0.1727272814 m, 0.30 m going, two 2.7 m wide flights and a 1.85 m intermediate landing. Its upper floor and B2 ceiling have matching openings and protected edges.

Counter locations, dimensions and finishes are provisional. This is a circulation and structure pass. Full branded fitouts, remaining Isetan lifts/escalators, and connections to other store floors remain unfinished. Reference images are private research and are not game textures.

## Reproduction

Use the recorded parent manifest and component specification in the private receipt folder. In order:

1. `extract-isetan-basement.mjs PARENT COMPONENT`
2. `prepare-east-transfer-base.mjs PARENT COMPONENT/spec.json BASE`
3. `build-isetan-basement.mjs BASE/assets.json COMPONENT`
4. `web/v2/compose-component.mjs BASE/assets.json COMPONENT COMPOSED`
5. `finalize-east-transfer.mjs PARENT COMPOSED/assets.json COMPONENT`
6. `verify-east-transfer-geometry.mjs PARENT BASE/assets.json COMPOSED/assets.json COMPONENT PROOF`
7. `verify-isetan-openings.py COMPOSED/assets.json COMPONENT PROOF` using Shapely.
8. Native `verify-east-transfer.mjs`, Chrome `walk-isetan-basement-chrome.mjs`, and `inspect-east-transfer-chrome.mjs` with `isetan-basement-views.json`.
9. Blender `install-east-transfer.py` to save/reopen the source and check bindings, geometry and UVs.

Scripts without an explicit directory above are in `web/station/realism/`. Candidate testing uses isolated port 4426 and its own database and worker log. Publication replaces the current private station bundle in place; temporary full exports are removed after verification.

## Delivery

Integrated into the current private station bundle. Evidence is in `.local/v2/current/components/isetan-basement/`:

- Ten native routes pass with 11,643 walking samples, covering both food-hall loops, both stair directions and both central-lift approaches. The upper-floor guard also blocks the lower-flight opening.
- Chrome keyboard walks pass the B1 loop (12 waypoints), internal descent and both B2 entrances (22 waypoints). A stair check uses the actual supporting tread so stopping just before a riser does not falsely report the next landing height.
- Ten Chrome inspection views have no page errors. Textures remain at 374 and reflection captures at seven. Short rolling frame samples have median 16.7 ms and p99 16.8 ms; these are local observations, not a sustained performance benchmark.
- Geometry proof checks all 5,860 added triangles and 17,580 vertices. Four stale wall surfaces are removed from both exports; unrelated encoded browser geometry remains byte-identical.
- All 22 treads and the intermediate landing have at least 2.1 m clear headroom. The B1 floor opening matches the B2 ceiling opening.
- Blender save/reopen verifies all 485 new panels, geometry, UVs, materials and retained bindings. Existing moving hardware and native code are unchanged.
- `npm run build:web`, isolated `npm run test:runtime` and `npm run test:v2:browser` pass. The candidate's normal shot finishes at full translation/spin rest after 8.51 s; recall forfeits the next moving attempt.

The component adds 767,284 browser bytes. The existing bounded light pool serves its 26 fixtures. The current manifest pins layout `ff614f1844e5742298a378754c19173092394d814ac27446eb6ce71b4289ddf0` and geometry `f13c19a50a75eb38d9bb3f5f50db71e68eece89878c69ab6123df2582252192e`. The promoted main runtime also passes, with full rest after 8.52 s. Cleanup removed 1,287,701,365 bytes of superseded generated files while preserving the current editable source, original references and small verification receipts.
