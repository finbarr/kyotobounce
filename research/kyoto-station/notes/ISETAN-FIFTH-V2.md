# Isetan fifth-floor connection

30 September 2026. Open the retained fifth-floor Grand Stairway doorway, complete the receiving hall and aisles, and connect them to 4F with an operating escalator pair.

## Evidence and fit

The station operator’s [5F guide](https://www.kyoto-station-building.co.jp/floorguide/5f/) and [Isetan overlay](https://www.kyoto-station-building.co.jp/floorguide/5f/?tenant=isetan) show connected store aisles, central escalator banks, and the relationship to the eastern public Grand Stairway. Their saved plans are `maps/floor-5f.svg` and `maps/floor-5f-isetan.svg`. The store’s [5F directory](https://www.mistore.jp/store/kyoto/shops/floor5.html) identifies the retail floor; tenant interiors remain outside this structural increment.

The retained source establishes the doorway and floor elevation, 20.660666 m. Its head and both jambs remain intact. Removing the leaf and meeting stile opens the original passage. A fitted threshold with glass side guards closes the gap between the store slab and the generated stair landing. The northern floor remains exact; additional slabs fill about 446 m² of missing floor without overlapping the existing slabs or landing.

Connected south, west and north aisles fit within a concave room around the public stair structure. Bounded cuts remove façade fragments, extended foundations and deep parapet faces inside the hall, while leaving the public stair surfaces and upper guards intact. Walls, a ceiling, fifteen fixtures and three direction signs establish a usable interior shell.

The 4F–5F escalators stack above the previous pair, at X−104 and Z−20/−17, rising 5.046008 m. Each chain has 69 steps and runs at 0.5 m/s, one up and one down. Fitted openings in the fifth-floor slab and fourth-floor ceiling provide clearance. Removing the old western end guards permits boarding the new lanes; retained side guards protect the older well. The new upper wells have fixed guards and clear eastern arrivals.

Room dimensions, machinery dimensions, exact lane placement, directions and finishes are fitted approximations. Further escalator banks, higher-floor lift service, western parking connections and tenant fitouts remain unfinished.

## Verification

- The 492 added/replacement panels contain 19,752 triangles. Browser and native geometry match; 34 old panels and 506 browser triangles are retired, with bounded cuts to 102 retained panels. Unrelated native records and retained browser buffer bytes remain exact.
- Floor coverage agrees within 0.002 m², including the stair threshold, without duplicate floor sheets. The retained doorway frame and northern floor remain exact. The public stair surfaces and their upper guards remain clear.
- Two slab comparisons verify the new openings. Passenger headroom checks cover 348 volumes along both new and retained escalator pairs and 680 volumes along the flat aisle routes, all with 2.1 m clearance. Browser tread heights agree with the independent native box oracle over 64,000 samples at 80 phases, with maximum height error below 0.000001 m.
- Fourteen native route walks pass, including both directions through the doorway, aisle loops and public stair connection, with 2,362 position samples. A guard check blocks access to the south well.
- All four native and Chrome idle rides pass, covering the new pair and the retained pair below. Riders remain grounded and exit onto the correct floor; rendered treads advance during each Chrome ride. Six Chrome walking routes pass with 85 checked waypoints, including both public stair directions, and no page errors.
- The editable Blender scene saves and reopens with matching geometry, UVs, materials, retained bindings and the two new animated chains. Export normals are stored exactly; the maximum Blender preview normal difference is 0.072°.
- Six inspected Chrome views show the doorway, receiving hall, upper wells, north aisle and both lower approaches. Short 1440×900 frame samples record 16.7 ms median and 16.8 ms p99 across 720 overlapping samples. Resources remain at 377 textures and seven reflection captures. These short samples are not a sustained performance benchmark.
- Native gameplay passes walking, full translation/spin rest at 13.88 seconds, free outcomes, recall and home. Chrome gameplay and `npm run build:web` pass. The served browser geometry, moving hardware and 42 escalator records match the candidate identities.

## Rebuild and receipts

`prepare-isetan-fifth.py` reads the parent layout, derives the floor infill and two slab openings, and selects the bounded cuts. `extract-isetan-fifth.py` records the selected faces from the retained Blender source. `prepare-east-transfer-base.mjs` removes those exact old faces; `open-isetan-ground.mjs` applies the partial cuts. `build-isetan-fifth.mjs` creates the hall and uses `store-escalators.mjs` for the fitted machinery. Compose with `web/v2/compose-component.mjs`, then append the motion paths with `integrate-porta-motion.mjs`.

`verify-static-replacement.mjs` compares the browser/native geometry and retained records. The opening verifier preserves triangle winding when distinguishing adjacent slab segments’ opposite-facing closure faces. `verify-isetan-fifth-floors.py` checks floor coverage, the retained doorway and public stair clearance. The shared escalator-opening and hall-headroom checks inspect both new and retained circulation. `install-east-transfer.py` installs the checked result into the editable source and verifies it after reopening.

Hashes are pinned in `web/v2/assets.json`. Private receipts live in `.local/v2/current/components/isetan-fifth/` after promotion. The checked assets replace the current bundle in place; the candidate’s full scene, layout, station export and temporary preview overlay are removed.
