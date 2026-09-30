# Isetan 3F–4F internal escalators

30 September 2026. Connect the constructed third and fourth store floors with an operating up/down pair and protected floor openings.

## Evidence and fit

The operator’s [3F guide](https://www.kyoto-station-building.co.jp/floorguide/3f/) and [4F guide](https://www.kyoto-station-building.co.jp/floorguide/4f/) show central store escalator banks. Their saved `maps/floor-3f-isetan.svg` and `maps/floor-4f-isetan.svg` establish the internal connection. The public Grand Stairway occupies the space above the previous northern internal stair; extending that stair directly would intersect it. The escalator pair fits within the central store rooms and clears the retained public structures.

The pair runs east/west from X−104, at Z−20 and Z−17. It rises 4.085965 m between the existing floors, with a 7.077099 m inclined run, 1.234118 m flat landings and 0.984562 m tread width. Each chain has 60 steps and runs at 0.5 m/s, one up and one down. Position, lane count, assigned directions, incline and machinery dimensions are fitted approximations. These are not surveyed coordinates or a complete reconstruction of every bank shown on the plans.

Four retained slabs receive bounded openings: the 3F floor, the ceiling below it, the ceiling above it, and the 4F floor. Their original footprints and heights remain outside those openings. The fourth-floor south display counter and its top are removed to clear the approach. Stainless pit covers and comb plates meet the moving treads; glass balustrades and black handrails follow each lane. Fixed glass guards protect the fourth-floor wells, with clear approaches at their eastern ends.

## Verification

- The 400 replacement/additional panels contain 18,724 triangles. Their browser and native vertices and normals match. All unrelated native records and retained browser buffer bytes remain unchanged. Six old panels and 140 browser triangles are retired. The browser geometry grows by 1,577,576 bytes.
- Four slab comparisons verify the floor and ceiling cuts; 160 headroom volumes along the moving paths have at least 2.1 m clearance. The browser tread surface matches an independent native box oracle over 64,000 samples at 80 phases, with maximum height error below 0.000001 m.
- Ten native walks pass around both landings and the fourth-floor wells, recording 860 position samples. Two barrier checks confirm the upper guards block access to the openings. Both native idle rides remain grounded, travel over 6.4 m along their slopes, and exit onto the correct floor.
- The editable Blender scene saves and reopens with matching static geometry, materials, retained object bindings and both operating chains. The existing hardware asset remains valid; the shared browser/native paths describe the added movement.

- Chrome passes both idle rides and all five selected aisle routes, with 12 checked waypoints and no page errors. Four inspected views show the boarding approaches, upper openings and underside. Short 1440×900 frame samples record 16.7 ms median and 16.8 ms p99 across 480 overlapping samples; these are not a sustained performance benchmark. Resources remain at 376 textures and seven reflection captures.
- Native gameplay passes walking, full translation/spin rest at 13.91 seconds, free outcomes, recall and home. The Chrome gameplay check and `npm run build:web` pass. Served browser and layout hashes match the candidate receipts.

Further escalator banks and higher-floor lift service remain unfinished.

## Rebuild and receipts

Run `prepare-isetan-escalators.py` against the parent manifest, then `prepare-east-transfer-base.mjs` for the exact retirement. Build against the prepared base with `build-isetan-escalators.mjs`, compose using `web/v2/compose-component.mjs`, and append the paths with `integrate-porta-motion.mjs`. The shared integrator and motion verifier accept this two-lane component. `install-porta-connection.py` installs the replacement slabs, guards and animated chains in the retained editable source.

`verify-porta-geometry.mjs` checks exact browser/native correspondence and retained buffers. `verify-isetan-escalator-openings.py` checks the slabs and passenger headroom. Native routes use `verify-east-transfer.mjs`; native rides use `verify-subway-escalators.mjs`. Chrome routes, rides and views use the existing component inspection tools.

Current hashes are pinned in `web/v2/assets.json`. Private receipts live under `.local/v2/current/components/isetan-escalators/` after promotion. The candidate’s full exports and temporary preview overlay are removed when the checked result replaces the current bundle.
