# Isetan B3 parking stair connection

## Defect and acceptance

The east B3 garage ends in a solid western wall, while the reconstructed store
stair ends one level above it at B2. Complete the missing descent, open a usable
garage doorway and retain the existing B2–B1, B1–ground and ground–2F routes.
The connection must join both garage aisles and the central lift approach.

Done when native and ordinary Chrome walking reach B2 from parking and return,
the retained store stairs remain usable, headroom and boundary checks pass,
and saved source, browser and native geometry correspond.

## Evidence and modeling limits

The station operator's [parking page](https://www.kyoto-station-building.co.jp/parking/)
and saved `maps/east-parking-access-2026.jpg` show an Isetan connection at the
western end of the east B3 garage. The diagram uses a lift symbol: that dedicated
parking lift remains a separate missing connection.

Isetan's official [B2 plan](https://www.mistore.jp/store/kyoto/shops/floorB2.html)
and [B1 plan](https://www.mistore.jp/store/kyoto/shops/floorB1.html), saved as
`maps/isetan-b2-2026.png` and `maps/isetan-b1-2026.png`, label a northern stair
**1F–B3F**. This directly supports extending the basement stair down one floor.
The exact horizontal registration and doorway into parking are fitted to the
existing reconstruction; the diagrams do not supply surveyed measurements.

The B3 vertical datum remains provisional. Vehicle ramps, the dedicated Isetan
parking lift and the Granvia connection remain unfinished.

## Construction

Two flights of eleven treads span the 3.6 m fitted B3–B2 height difference,
with 300 mm goings and 163.6 mm risers. The new landing, doorway and threshold
join the existing garage floor. Wall-mounted rails and a protected stairwell
continue the upper core. New signs, supported lights and a pedestrian crossing
make the garage approach legible.

The formerly solid B2–B1 treads and landing are rebuilt with thin structural
bases, preserving their exact top surfaces and horizontal footprints. The B2
floor has the matching stair opening. Twenty-five old panels are retired;
85 closed panels with 1,060 triangles replace them and complete the connection.

The complete-station check covers 114 treads and 731 headroom volumes, including
both garage approaches and the retained upper routes. All have 2.1 m clearance;
the 23 rebuilt upper surfaces retain their exact walking positions.

## Verification and delivery

- Fourteen native routes pass in both directions, with 2,147 recorded movement
  samples. The wall beside the new garage doorway blocks passage as intended.
  Native traversal uses running input; browser traversal uses ordinary walking.
- Seven ordinary Chrome keyboard routes pass, covering both stair directions,
  the two garage approaches, the food-hall approach and the rebuilt B2–B1 stair.
- Saved/reopened Blender geometry, UVs, normals and retained bindings match the
  browser and native exports. Existing lifts and escalators remain byte-exact.
- Native and Chrome gameplay pass from the B3 spawn. The native test measures
  1.35 m walking, full translation
  and spin rest after 8.62 s, free result, recall forfeiture and home.
- Five Chrome views were inspected, including the corrected wall/floor junction.
  The short 600-sample frame check measured 16.7 ms median and 16.8 ms p99,
  with 372 textures and seven reflection captures stable across the views.
  This is not a sustained performance benchmark.
- `npm run build:web` passes. Net browser geometry growth is 222,440 bytes.

Builders: `web/station/realism/prepare-isetan-parking.mjs` and
`build-isetan-parking.mjs`. Verification uses the shared stair headroom and
Chrome route helpers, with the component's declared stair list and route names.
Small receipts are retained in `.local/v2/current/components/isetan-parking/`;
full candidate exports are removed after promotion into the current bundle.
