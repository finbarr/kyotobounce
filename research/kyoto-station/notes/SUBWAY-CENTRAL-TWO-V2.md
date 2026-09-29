# Central 2 subway gate and platform connection

29 September 2026. The public underground passage now opens through Central 2 gate into an enclosed hall and a two-flight stair to the existing Karasuma Line island platform.

## Evidence and fitted construction

The saved [city station diagram](https://www2.city.kyoto.lg.jp/kotsu/tikadia/img/map/sta/pdf/k11map.pdf) was rendered and visually inspected. It places Central 2 between the South and Central 1 gates, with a separate descent to the shared platform. The [current K11 page](https://www2.city.kyoto.lg.jp/kotsu/tikadia/hyperdia/menu0221.htm), checked on 29 September, lists Central 2 as an unstaffed gate and one island with two tracks. Its station diagram section is dated 7 August 2026. The diagram establishes connections; it does not provide surveyed dimensions.

The fitted concourse remains at Y−6.2 m and the platform at Y−11.2 m. The gate vestibule opens through the public passage's east wall at Z−89 to −77 m. One clearly open lane connects to the hall. Thirty steps in two flights, with a 1.8 m intermediate landing, descend through matching openings in the structural deck and platform ceiling. The shaft spans X174–180 m, Z−70 to −58.15 m.

Two old column rows crossed this shaft. Their four columns are replaced by supports outside the stair walls and overhead beams with walking headroom. The other column triangles remain at their original coordinates. Both platform side aisles stay connected to the neighboring South and Central 1 stair landings. Rails, closed platform doors and tactile edge strips remain in place.

Original bilingual labels, an approach tactile strip and seven ceiling fixtures identify the route. The fixtures use the existing pool of at most two active lights. Hall dimensions, stair counts, support framing, finishes and fixture locations are fitted approximations. Gates are static. The North gate, platform escalators and accessible vertical connections remain unfinished.

## Rebuild and verification

Against the eastern-underpass parent:

1. `prepare-subway-central-two.mjs` records the ten exact surfaces to retire and the original column batches.
2. `prepare-east-transfer-base.mjs` removes those native panels and matching browser triangles using the recorded scope.
3. `build-subway-central-two.mjs` creates the replacement deck, ceiling, gate, hall, supports and stairs. Compose them with `web/v2/compose-component.mjs`; `finalize-east-transfer.mjs` binds unchanged moving hardware and the component's spawn.
4. `verify-east-transfer-geometry.mjs` checks exact added geometry and retained records. `verify-subway-central-two-openings.py` checks the shared deck and ceiling footprints with Shapely: their only change is the new 71.1 m² stair opening. `verify-east-transfer.mjs` runs the component's twelve native routes. The shared tools accept this component's prefix, spawn and collection name.
5. `inspect-east-transfer-chrome.mjs` accepts `subway-central-two-views.json` for nine camera views. `install-east-transfer.py` installs the component into the existing editable source and validates it after reopening.

Geometry comparison covers 156 added panels, 13,632 vertices and 4,544 triangles, replacing 3,392 triangles: a net increase of 1,152 triangles. The component adds ten material batches and 536,444 browser bytes, including replacement index buffers. Retained native records and encoded browser geometry match the parent.

All twelve native walks pass, with 5,928 position samples: the gate and stairs in both directions, the public passage, both platform aisles, and connections to the South and Central 1 stair landings. Each route checks floor height, grounded arrival and endpoint height within 0.06 m. A long test leg initially exceeded the harness's 35-second limit while still moving; intermediate waypoints fixed the test without changing geometry. Previously passing walks were retained against the same layout hash.

All nine Chrome views were inspected at verified camera positions, with no page errors and stable texture/reflection-capture counts. Short rolling frame windows at 1440×900 had a 16.7 ms median, 16.8 ms p99 and 33.4 ms maximum; these overlapping windows are not a sustained performance benchmark. Chrome gameplay passes walking, throwing, full rest, recall and home. The editable Blender source saves and reopens with matching geometry, labels and retained object bindings. `npm run build:web` passes.

The promoted preview on port 4425 passes the native gameplay check: a grounded spawn, 1.35 m walk, full translation/spin rest after 13.94 seconds, free result, recall forfeiture and home. The source layout hash is `048e6807c8fe6fe3bda45f2cfe16c1a9d1b419c1732106fe5f7321a0b9c2ad2e`.

Private construction and verification receipts are kept under `.local/v2/current/components/subway-central-two/`. The current editable source and playable station were replaced in place. Cleanup removed 1,220,159,901 bytes of generated full-scene candidates and the stopped port 4426 overlay. The current source, textures, research and small receipts are retained.
