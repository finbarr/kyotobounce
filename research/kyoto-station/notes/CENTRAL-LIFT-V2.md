# Central elevator and western receiving halls

29 September 2026. Five connected stops, replacing the missing central lift and exposed western B1 approach.

## Evidence and fitted geometry

The [research note](CENTRAL-LIFT-RESEARCH.md) records the five destinations, the recessed ground entrance and the operator's 1F/B2 drawings. The newly inspected [operator parking diagram](https://www.kyoto-station-building.co.jp/app/themes/kyoto-station-building/parking/img/parking_04.jpg), linked from its [parking page](https://www.kyoto-station-building.co.jp/parking/), places the central lift among the B3 parking rows and marks pedestrian crossings, service access and the Isetan/Granvia directions. Its inset photograph confirms the blue sloped shopfront fascia and recessed ground entrance. The saved image and hash are in `sources.json`.

The shaft is fitted at native X−39, Z−3 and opens east into a recessed lobby. This is a model registration, not a surveyed location. Stops use the retained B2, B1, ground and 2F datums; the provisional B3 datum is 3.6 m below B2.

| Stop | Native floor Y | Receiving route |
| --- | ---: | --- |
| B3 | −12.313583 m | Parking aisles and pedestrian crossing |
| B2 | −8.713583 m | Western dining aisle |
| B1 | −4.913583 m | Both retained B1 aisles through a new western hall |
| 1F | 0 m | Recessed entrance off the central concourse |
| 2F | 7.350000 m | Connected walk into the north–south public passage |

The upper walk runs south of the lower intermediate deck. The receiving landing has a solid plinth where it overlaps that lower level; it does not create a low passage beneath the upper floor. All five doors have fixed frames and thresholds, and only the occupied landing opens. The orientation is shared by native collision, player support, browser meshes, camera obstacles and saved replay presentation.

The B3 floor establishes the parking arrangement and usable receiving aisles. Its 82 drawn bays, dimensions, columns, height and finishes are fitted approximations. Vehicle ramps, service rooms, the full Isetan/Granvia connections, detailed retail interiors and photographic material refinement remain unfinished.

## Export and source

Only the central shaft footprint is cut through the concourse. The browser's pre-existing tactile-strip masks and granite UVs are retained; its top and underside lose the same 18.88 m² as native collision. The western intermediate slab and two route barriers are replaced with fitted openings. Static construction adds 347 panels and 4,492 triangles, including six original direction signs. Existing moving escalators and the other six lifts remain unchanged.

The reconstruction tools are `prepare-central-lift.py`, `prepare-east-transfer-base.mjs`, `cut-central-lift-floor.mjs`, `build-central-lift.mjs`, `web/v2/compose-component.mjs`, `integrate-subway-lift.mjs` and `install-east-transfer.py`. They assert the parent asset hashes. Source installation retains the embedded collision seed and editable lift parts, including their orientation and separate landing heights.

## Verification

The complete station passes fourteen normal-speed native walks through the receiving routes, in both directions. Geometry checks cover all 347 added panels, matching browser/native triangles, the five sill heights and the full car/door travel volumes. The editable Blender source saves and reopens with matching geometry, UVs, normals, collision bindings and all 24 oriented moving parts.

Chrome passes 34 lift checks: all five rides and exits, grounded arrival, protected doors, rendered part positions, independent sessions, floor selection and throw/recall during descent. A reproduced dialog race is fixed: a delayed close event no longer closes a newly reopened floor picker. Ten final station views were inspected. The rebuilt worker also passes 61 oriented five-floor fixture checks and 4,820 sampled poses.

The service typecheck, portable suite, browser build and ordinary native/Chrome walking, throwing, complete physical rest, recall and home checks pass. Receipts are retained in `.local/v2/current/components/central-lift/`; `web/v2/assets.json` pins the delivered bundle. The current editable source and playable exports replace their predecessors in place. This is a local delivery; no remote publication is included.
