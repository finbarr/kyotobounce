# Isetan north core: B3 through 5F

30 September 2026. Relocate the provisional north lift clear of the public Grand Stairway, serve all eight constructed store levels and restore its former floor openings.

## Evidence and fit

The station operator’s [5F Isetan guide](https://www.kyoto-station-building.co.jp/floorguide/5f/?tenant=isetan) and the store’s [5F plan](https://www.mistore.jp/store/kyoto/shops/floor5.html) place the northern lift banks beyond the public stair edge. The retained 2F and lower-floor plans establish the lower receiving halls. The previous fitted car position, X−91/Z12, could not extend upward: its shaft would intersect the third and fourth public stair flights.

The replacement car is fitted at X−96/Z30, facing south. It serves B3, B2, B1, 1F, 2F, 3F, 4F and 5F, with 32.974249 m of travel. Six lower hall extensions connect the existing rooms to its landing doors. Fourth and fifth floors already extend into this northern wing. Continuous shaft walls, fitted slab openings, landing sills and protected doors enclose the car. Floor labels and fourteen fixtures make the approaches legible.

Thirteen slabs are rebuilt: eight close the former shaft openings, while the others receive the new shaft. The lower extensions add about 1,036 m² of missing floor. Bounded cuts remove obstructing wall and façade fragments; counters blocking the B1, B2 and 2F approaches are removed. A small pre-existing gap in the fifth-floor slab’s browser surface is also closed when rebuilding it from the collision surface.

Plans support the bank’s relationship to the public stairs and halls. Coordinates, hall dimensions, floor datums, individual car placement and finishes remain fitted approximations. Further cars and floors 6F–11F remain unfinished.

## Verification

The component replaces 131 panels and 2,010 browser triangles, adds 138 panels with 2,248 triangles, and makes bounded cuts to 87 retained panels. Browser and native replacement surfaces, UVs and normals agree. The other thirteen lifts, all 42 escalators and public stair records remain unchanged.

Independent checks cover all eight sills, static car and doorway clearance, eight restored slab openings and the six lower hall floors. Passenger headroom checks cover 611 route volumes and 35 beam checks at 2.1 m clearance. Twenty-six native walking routes pass with 1,843 samples, covering both directions to every landing and across each former car footprint.

All 48 Chrome lift checks pass: eight destination controls, grounded arrivals and exits, protected moving doors, input handling, private-session isolation and mid-descent throw/recall. Sixteen native rides cover each adjacent stop in both directions and both full-height journeys. Additional checks verify rejection of an unknown floor and calling the car to a protected empty landing. Chrome walking passes all eight approaches with 29 waypoints. Native and Chrome gameplay pass walking, full translation/spin rest, free results, recall and home; native full rest takes 8.41 seconds.

The editable Blender scene is saved and reopened to verify the new static panels, thirty moving lift parts, material bindings and exact export normals. One thin foundation corner has a 0.122° Blender preview-normal difference; its stored export normal remains exact. Six inspected Chrome views show the landing approaches. Short samples record 16.7 ms median and 16.8 ms p99 across 720 frames, with 378 textures and seven reflection captures. These are a visual smoke check, not a sustained performance benchmark.

## Rebuild and receipts

`prepare-isetan-north-core.py` derives the slab repairs, extensions and bounded cuts from the current layout. `build-isetan-north-core.mjs` creates the replacement core and eight-stop lift. `extract-isetan-north-core.py` records the selected source faces; `prepare-porta-west-base.mjs` retires them with matching plane, bounds and winding. Coincident source faces can share browser triangles, so per-object area totals are diagnostic rather than a completeness test. `open-isetan-ground.mjs` applies the partial cuts, `compose-component.mjs` joins the component, and `integrate-subway-lift.mjs` replaces only the declared north car.

`verify-static-replacement.mjs`, `verify-isetan-north-core.py` and the shared headroom checker inspect the resulting geometry. `verify-multi-stop-lift.mjs` runs the native journey checks. `install-east-transfer.py` installs and reopens the editable source. The private delivery receipts are in `.local/v2/current/components/isetan-north-core/`; hashes are pinned in `web/v2/assets.json`. Promotion replaces the current bundle in place and removes the full candidate exports and temporary preview overlay.
