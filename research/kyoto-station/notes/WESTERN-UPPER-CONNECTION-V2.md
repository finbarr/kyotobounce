# Western station connection

28 September 2026. Integrated into the local v2 bundle selected by
`web/v2/assets.json`. The playable route now connects the source interior landing,
Muromachi Square, all fourteen Grand Stairway flights, the western restaurant,
western bridge and central Skyway. Both northern escalator lanes and the southern
stair approach connect to their shared floors. This is a geometry and circulation
delivery; materials, lighting and intermediate floor registration still need work.

## Research and modeling choices

- The operator's [Muromachi Square plan](https://www.kyoto-station-building.co.jp/app/themes/kyoto-station-building/service/eventspace/pdf/drawing_muromachi.pdf)
  supplies the lower stair contours, plaza boundary and southern approach.
  Its saved PDF SHA-256 is `bfbd2424826dd3fb90aef6a0303cf1d00befb86c7ab5a65128cf6b33be1c3925`.
- The [operator's 4F guide](https://www.kyoto-station-building.co.jp/floorguide/4f/)
  establishes the plaza's floor assignment. It is schematic rather than surveyed.
- [Kyoto City's municipal model](https://data.city.kyoto.lg.jp/resource/?id=21224)
  supplies the lower and upper landing anchors. Source GLB SHA-256:
  `0df73fd383c265904711bf09e4a628d109f7792dc9e4be524d3f531666df06a1`.
  Attribution: Kyoto City, CC BY 4.0.
- [Western approach research](WESTERN-APPROACH.md) and
  [its registration](western-approach/registration.json) describe the restaurant,
  oblique western bridge and their source/photograph correspondences.

The lower rigid fit rotates the dimensioned plan by -6.08545 degrees and
translates native X/Z by `(2.96050, 5.92016)` m, without changing plan scale.
The fitted curve residual is 0.3515 m RMS and 0.7060 m maximum. An independent
plaza corner differs by 0.3667 m. These are agreement measurements between
models, not survey accuracy.

The common plaza finished floor is 15.614658 m, matching the source interior
landing. The coarse exterior floor is about 1.0172 m lower. Sharing the interior
height and extending the plaza to the interior cut edge are explicit construction
choices. The previous inherited plaza was 3.9713 m above this interior landing.

At 10F, the doorway center is anchored to native X/Z
`(-133.8445434570, -21.9596538544)` and finished height 45.08334298 m.
The upper correction rotates 7.04591 degrees; its plan displacement blends from
the fixed lower plan between X=-84 and X=-130 m. The upper roof landing is modeled
at 49.1937 m. Intermediate boundaries and floor allocation remain provisional.
The [operator's stair description](https://www.kyoto-station-building.co.jp/service/square/)
and its step-count/height convention still need reconciliation with those
intermediate source levels before treating every riser as measured.

## Implementation

- `prepare-west-connected-layout.mjs` moves the plaza's adjoining stairs,
  facades, guards and southern connector together. The sculpture stays rigid.
- `prepare-west-upper-registration.mjs` aligns the upper doorway, keeps each
  escalator straight between its corrected endpoints, converts sheared boxes to
  explicit panels, and updates western floor datums and diagnostic routes.
- `prepare-west-upper-connection.mjs` installs 3,098 researched restaurant,
  bridge and central Skyway panels and retires the displaced draft families.
- `clear-west-upper-envelope.mjs` removes displaced facade fragments inside
  the replacement corridor footprints. The replacement walls, floor and ceiling
  define that envelope.
- `clear-west-bank-transfers.py` extends the four shared landing openings through
  transverse slab rims that blocked the arriving treads. It uses closed Boolean
  cuts and verifies paired edges and positive volume. Width is the existing tread
  plus 0.10 m total clearance; the cut ends 0.04 m before the flat tread path ends.
  These clearances are modeling choices.
- `install-west-connected-layout.py` rebuilds the corresponding editable meshes,
  preserves unrelated source objects, and incorporates the previously appended
  NIWA and guard components into the Blender scene. Existing candidate edits are
  protected by source/layout receipt checks before replacement.
- The standard browser exporter and hardware generator produce the matching
  delivery files. `prepare-west-connected-motion.mjs` retains the exact component
  comb-support contracts.

## Acceptance evidence

The compact [integration receipt](WESTERN-UPPER-INTEGRATION-V2.md) records
asset hashes, checks and their limits.

| Check | Result |
| --- | --- |
| Saved source versus native | 7,031 panels; exact triangle order; maximum position error 0.00000789 m; 47,704 unique native bindings |
| Grand Stairway | All fourteen flights both ways; 764 uphill / 774 downhill samples |
| Restaurant and central Skyway | Complete route both ways; 1,018 outbound / 1,017 return samples |
| Northern escalators | Both lanes across all four banks both ways; 421 / 498 / 500 / 420 samples |
| Southern approach | Lower landing, both flights, connector and plaza both ways; 183 / 178 samples |
| Gameplay | Configured spawn, 1.38 m walk, full translation/spin rest in 4.29 s, free result, recall forfeiture and home |
| Chrome controls | Entry, WASD, throw, result presentation, recall during flight, menu and home pass |
| Chrome views | Eight views at 1440×900; zero page errors; median 16.7 ms and p95 at most 16.8 ms |
| Browser build | `npm run build:web` passes |

The northern check preceded the final southern connector correction. A complete
comparison of panel, box, beam, flight, escalator and route records proves the
southern connector was the only geometry change; the receipt records that reuse.
All other route checks use the final layout hash. Short fixed views are not a
release performance soak.

Reproduce affected native checks with the current layout:

```sh
node web/station/realism/verify-west-grand-stairway.mjs .local/v2/current/station/station-layout.json .local/v2/checks/grand-stairway
node web/station/realism/verify-west-upper-connection.mjs .local/v2/current/station/station-layout.json .local/v2/checks/upper-route
node web/station/realism/verify-west-side-connections.mjs .local/v2/current/station/station-layout.json .local/v2/checks/side-routes
```

Launch with `npm run dev:v2` at http://127.0.0.1:4425. The spawn is now on
Muromachi Square. The current editable scene contains all installed components;
`sourceComponents` is empty. Keep the current texture directory with that scene.
The station layout aliases the source layout so the bundle does not need two
identical full JSON files.

## Continue from this delivery

Improve the restaurant and Skyway materials, light fixtures and architectural
finishes using the existing references. Inspect exposed approach edges and their
railings before adding small decorations. Keep the intermediate stair registration
limits explicit, and refine them when source comparisons change a meaningful
modeling decision. Reuse this scene and checkout; the preceding candidates are
superseded.

The expensive inner loop was full-scene reconstruction and attribute restoration.
Resolve collision failures before that export. For large embedded layouts,
`bpy.data.texts.load` avoids the repeated line copying observed with `Text.write`.
