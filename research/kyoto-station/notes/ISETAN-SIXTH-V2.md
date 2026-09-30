# Isetan sixth-floor connection

30 September 2026. Connect the southern Grand Stairway entrance to sixth-floor store aisles and add the operating 5F–6F escalator pair.

## Evidence and fit

The station operator’s [6F Isetan guide](https://www.kyoto-station-building.co.jp/floorguide/6f/?tenant=isetan) and [floor-plan overlay](https://www.kyoto-station-building.co.jp/app/themes/kyoto-station-building/floorguide/img/map/img_map_6f_isetan.svg) establish the public stairs east of the store, entrances at both ends, connected aisles and central escalator banks. The store’s [6F directory](https://www.mistore.jp/store/kyoto/shops/floor6.html) identifies ISETAN MEN’S and the floor’s cafés. The downloaded operator SVG is retained with the private component receipts. Tenant fitouts are deferred.

The source supplies the sixth-floor elevation, 25.504833 m, and the public landing. The previous doorway intruded beside the upper public stair flight. Its five pieces are replaced by a portal fitted entirely on the landing, with a clear passage into the southern hall. Bounded façade cuts clear the approach. The public landing and all stair flight records remain unchanged.

About 200 m² of floor infill connects the southern, western and northern aisles. The room stays inside the retained western façade and wraps around the public stair structure. Both sixth-floor slabs are reconstructed with public landing and stair clearances, eliminating overlapping floor sheets. Selected foundation, façade and deep parapet fragments are removed inside the room; the upper public stair guards remain intact. Walls, a ceiling, ten fixtures and three direction signs establish a usable interior shell.

The new escalators stack above the existing bank, rising 4.844168 m from 5F. They run at 0.5 m/s in opposite directions. Openings through the sixth-floor slab and fifth-floor ceiling preserve passenger headroom. Upper well guards protect the floor edges, and the lower boarding aisle joins the retained 4F–5F pair.

Room dimensions, lane placement and directions, machinery dimensions and finishes are fitted approximations. The northern sixth-floor public entrance and north-lift extension are next; the current lift still serves B3–5F. Further store floors, lift cars, western parking connections and tenant interiors remain unfinished.

## Verification

- The 476 added/replacement panels contain 19,764 triangles. Browser and native geometry match. Twenty-six old panels and 501 browser triangles are retired, with bounded cuts to 65 retained panels. Unrelated native records and retained browser buffer bytes remain exact.
- Floor coverage, excess and overlap each stay below 0.002 m². Three slab comparisons verify the floor and ceiling openings. Public stair clearance is checked per tread at the native generator’s actual elevations, with nominal 2.1 m headroom and a 1 mm modeling tolerance. Fifty-two nearby tread envelopes pass; retained landing geometry is exact.
- Escalator headroom checks cover 370 volumes across the new and retained pairs; flat routes cover another 695 volumes. Browser tread heights agree with the independent native box oracle over 64,000 samples at 80 phases, with maximum height error below 0.000001 m.
- Fourteen native walks pass with 2,387 position samples, including both doorway directions, the aisle loops and the public stairs. A boundary check confirms the south well is guarded. Six Chrome walks pass with 85 checked waypoints.
- Native and Chrome idle rides cover both new lanes and both retained lanes below. Riders remain grounded and exit on the correct floor, and Chrome verifies the rendered treads move.
- The saved Blender source preserves matching geometry, UVs, material bindings and both animated chains. Exact export normals are retained. Two tiny cut-foundation faces have Blender viewport normal differences of 0.559° and 0.121°; the verifier bounds this exception to those named foundations, face area below 0.000002 m² and angle below 0.6°.
- Six inspected Chrome views cover the doorway, halls, upper wells and boarding approaches. Short 1440×900 samples record 16.7 ms median and 16.8 ms p99 across 720 overlapping frame samples; these are not a sustained performance benchmark.
- Native gameplay passes walking, complete translation/spin rest at 13.93 seconds, free outcomes, recall and home. Chrome gameplay and `npm run build:web` pass. Served geometry, unchanged moving hardware, 44 escalators and 14 lifts match the candidate identities.

## Rebuild and receipts

`prepare-isetan-sixth.py` derives the room cuts, missing floors and slab openings from the parent. `extract-isetan-sixth.py` records the retired source faces. `build-isetan-sixth.mjs` creates the room and fitted machinery using `store-escalators.mjs`. `prepare-porta-west-base.mjs` removes the exact authored faces, including surfaces whose browser triangulation differs from the source; `open-isetan-ground.mjs` applies the bounded partial cuts. Compose with `web/v2/compose-component.mjs`, then append the moving paths with `integrate-porta-motion.mjs`.

`verify-static-replacement.mjs`, `verify-isetan-sixth-floors.py` and the shared headroom/opening checks verify correspondence and circulation. `install-east-transfer.py` installs the component into the retained source and checks it after saving and reopening.

Hashes are pinned in `web/v2/assets.json`. Private receipts live in `.local/v2/current/components/isetan-sixth/` after promotion. The component replaces the current bundle in place; the candidate’s full source and exports and temporary preview overlay are removed.
