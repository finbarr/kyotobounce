# Rooftop garden court and promenade

30 September 2026. Continue the atrium route beyond the repaired garden stair.

## Placement and connection

The detailed garden occupied the eastern arrival platform, beside a second,
coarse garden embedded in the municipal roof mesh. Its benches and perimeter
barrier obstructed the route towards that roof. A native probe from the arrival
stopped at X−163.560/Z−23.804 on parent layout
`776b3f0d52845b27d9d1a9a3ed1888b96d17fe9586463b7f382f41a6547083d2`.

The replacement puts the retained planting, seats, screens and lamps on the
western roof court. One continuous floor joins the stair arrival, garden court,
northern viewing bay and western promenade. Fitted cuts remove the duplicate
municipal garden and clear the public paths while preserving surrounding roof
rooms and the lower building. A glazed opening replaces the blind face of the
northern viewing screen. The final garden stair and its floor opening stay in
place.

The public floor covers approximately 1,930 m². The assembly moves 29 m west
and 12 m north in the existing model. These are registration corrections within
the reconstructed station, not surveyed real-world measurements. Exposed edges
receive glazing and rails. Roof-room finishes, the western Isetan entrance and
the lower Skyway connection still need separate work.

## Evidence

- The operator’s [RF guide](https://www.kyoto-station-building.co.jp/floorguide/rf/)
  and [roof plan](https://www.kyoto-station-building.co.jp/app/themes/kyoto-station-building/floorguide/img/map/img_map_rf.svg)
  establish the garden at the Grand Stairway arrival and the public arm extending
  west along its northern side. The plan is schematic.
- The operator’s [square guide](https://www.kyoto-station-building.co.jp/service/square/)
  and saved `square-img_oozorahiroba_01.jpg` through `_03.jpg` show planted beds,
  bamboo, benches, coloured lamp standards and the enclosed rooftop court.
- A [February 2019 walk](https://plaza.rakuten.co.jp/asobikokoro2/diary/201902110000/)
  documents the northern viewing glazing, westward passage and Isetan entrance.
  Its dated photographs support the architectural arrangement; current signage
  and furnishings need newer evidence.

## Build and verification

The builder relocates 261 useful objects, removes the old guard and arrival
sign, and preserves 75 objects belonging to the garden stair. Native collision
is retained for the relocated benches and other physical fixtures; decorative
foliage remains non-colliding. Existing moving hardware is unchanged.

Private inputs and receipts live in the `garden-promenade` component directory
of the current local bundle after integration. Original photographs, full
station exports and editable source binaries remain outside Git.

Reconstruction tools:

1. `inventory-garden-source.py` identifies decorative source objects absent from
   the collision layout.
2. `prepare-garden-promenade.py` fits the public floor and retirement scope.
3. `extract-garden-access.py` records the exact source triangles, normals and UVs.
4. `build-garden-promenade.mjs` builds the floor and guards and relocates the
   complete garden assembly.
5. The shared retirement, fitted-opening and composition tools integrate the
   replacement. `verify-garden-promenade.py` independently checks floor coverage,
   relocation, preserved stairs and unchanged moving hardware.

The declared acceptance routes cover the arrival, northern view, western
promenade and southern garden path in both directions, plus three outer-edge
barrier checks. Real Chrome inspection and walks, native gameplay checks and
editable-source verification are required before this increment is delivered.

### Delivery checks

- Native walks cover all eight directions with 1,698 position samples. Three
  outer-edge guards retain the player on the roof. All 548 sampled headroom
  volumes are clear to 2.1 m.
- Chrome completes the same eight routes with 46 grounded waypoint checks and
  no browser errors.
- The replacement browser mesh matches all 479 new native panels. The 261
  relocated objects retain their geometry, UVs, authored normals and collision
  flags; 75 stair objects and all 48 escalators and 14 lifts remain unchanged.
- Five final Chrome views were inspected. Each sampled 120 frames with a 95th
  percentile of approximately 16.8 ms; this is a short local observation, not a
  sustained performance benchmark. Texture and reflection resource counts stay
  stable through the view sequence.
- The browser play loop passes throwing, full physical rest, recall and home.
  The native smoke test passes with full rest after 12.94 simulated seconds.
  Its first run timed out during concurrent verification; a diagnostic throw
  and the unchanged smoke test subsequently completed. Browser route checks
  resume from completed routes after snapshot/input interruptions, then finish
  with no other gameplay clients running.
- The saved Blender source matches the layout, UVs and exact export normals.
  Three municipal face corners have measured packed viewport-normal differences
  of at most 0.573 degrees; the installer bounds those specific cases while
  retaining full-precision export checks.

Final layout: `998ed6f0116c3f99d7e72014d35fc195849b429cb070caf10a163c14619325da`.
Final browser geometry: `7782198009257e2b9871992853f0869d764595cbb5777407e08cee90bd267924`.
