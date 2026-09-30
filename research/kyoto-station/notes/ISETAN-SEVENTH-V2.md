# Isetan seventh-floor connection

30 September 2026. Connect the southern Grand Stairway entrance to the seventh-floor store halls and add the operating 6F–7F escalator pair.

## Evidence and fit

The station operator’s [7F guide](https://www.kyoto-station-building.co.jp/floorguide/7f/?tenant=isetan) and [plan overlay](https://www.kyoto-station-building.co.jp/app/themes/kyoto-station-building/floorguide/img/map/img_map_7f_isetan.svg) establish the store aisles, central escalators, northern lift halls and Museum “Eki” Kyoto beside the Grand Stairway. The store’s [7F directory](https://www.mistore.jp/store/kyoto/shops/floor7.html) confirms direct museum access from the Grand Stairway. Tenant fitouts are outside this increment. The downloaded plan remains with the private component receipts.

The source supplies the 30.349 m floor datum and public landing. The upper stair flights move west, so the new western aisle follows their usable clearance and turns into the northern wing. About 91 m² of missing floor connects the southern, western and northern halls. A fitted portal replaces the sealed southern doorway; a bounded opening through the overextended façade pier clears its public approach. The public flights and landings retain their native geometry.

The new escalators stack above the existing pair, rising 4.844167 m from 6F at 0.5 m/s in opposite directions. Floor and ceiling openings provide passenger headroom. Upper guards protect the wells, and the sixth-floor aisle connects the retained and new banks.

Dimensions, lane positions and finishes are fitted approximations. The northern seventh-floor public entrance, north-lift extension, museum and other tenant interiors remain unfinished. The north lift still serves B3–6F.

## Geometry checks

- 481 added/replacement panels contain 19,908 triangles. Twenty-three old panels and 436 browser triangles are retired; bounded cuts affect 54 retained panels. Unrelated native records and retained browser buffer bytes remain exact.
- Floor coverage, excess and overlap each remain below 0.002 m². The three reconstructed slabs preserve their footprints outside the declared openings. Sub-micron overlay spikes are snapped before triangulation. Stone floor UVs retain the exporter’s 2.4 m world mapping.
- The browser retirement check handles triangles spanning several coplanar source faces. It preserves 150 public stair triangles and checks the slabs’ full removal area, accounting for the pre-existing stair cutout. Per-face area limits preserve duplicate railing posts belonging to retained guards. This fixes the striped floor overlap found during Chrome inspection.
- Public stair clearance covers 54 nearby tread envelopes at nominal 2.1 m headroom with a 1 mm modeling tolerance. Escalator clearance covers 364 passenger volumes across the new and retained pairs; the hall routes cover another 685 volumes.
- Across 64,000 samples at 80 phases, browser tread heights and the native box oracle differ by less than 0.000001 m.

## Runtime and source verification

- Fourteen native walks pass with 2,349 position samples, including the public approach in both directions, both hall routes and the sixth-floor transfer. The well boundary remains guarded. Six Chrome walks pass with 90 checked waypoints.
- Native and Chrome passive rides pass on both new lanes and the retained pair below. Riders stay grounded and arrive on the correct floor; Chrome also verifies that the rendered treads move.
- The saved Blender scene preserves the matching geometry, UVs, material bindings and animated chains. Export normals remain exact. Five measured Blender viewport normal differences are bounded: two unchanged tiny foundation faces inherited from 6F, two new narrow foundation faces, and one slab-edge face below the floor. The largest is the inherited 0.559° difference.
- Six inspected Chrome views show clear entrances, floors, aisles and well guards. Short 1440×900 samples record 16.7 ms median and 16.8 ms p99 across 720 overlapping frame samples. These are smoke checks, not a sustained performance benchmark.
- `npm run build:web`, native gameplay and Chrome gameplay pass. Native gameplay verifies full translation/spin rest at 13.89 seconds, free outcomes, recall and home. Served asset hashes and all 46 escalators and 14 lifts match the candidate.

## Rebuild and receipts

`prepare-isetan-seventh.py` derives the floor openings, room cuts, missing floor and public stair protection. `build-isetan-seventh.mjs` creates the fitted hall and escalators; `extract-isetan-seventh.py` records the retired source faces. Use `prepare-porta-west-base.mjs`, `open-isetan-ground.mjs`, `web/v2/compose-component.mjs` and `integrate-porta-motion.mjs` to assemble the candidate. `verify-isetan-seventh-floors.py` and the shared correspondence, headroom and runtime checks verify the result. `install-east-transfer.py` installs the component into the editable source.

Hashes are pinned in `web/v2/assets.json`. Private receipts live in `.local/v2/current/components/isetan-seventh/` after promotion. The candidate replaces the current bundle in place; its full source, exports and temporary preview overlay are removed.
