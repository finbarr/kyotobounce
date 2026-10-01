# Eastern canopy connection to the atrium roof

30 September 2026.

## Defect and reference

The eastern escalator landing still had large opaque fragments hanging beside
its entrance and an open seam between the central roof and eastern canopy.
Chrome inspection identified the fragments in three imported municipal panels.

The operator's [East Square photograph](https://www.kyoto-station-building.co.jp/service/square/)
shows a continuous glazed connection and exposed framing over the escalators.
The saved reference is `photos/square-img_eastsquare_01.jpg`. It establishes the
visible arrangement; it does not establish individual member dimensions.

## Construction

- Join the nine retained central-roof boundary vertices to the 25 vertices on
  the eastern canopy's root. Neither existing roof is moved. The new closed
  glass shell is 24 mm thick and preserves every boundary point.
- Add two intermediate arches, longitudinal rails and edge framing. Spacing,
  thickness and member sections are fitted reconstruction dimensions.
- Replace the coarse end facing with three glazed sections around a clear
  landing opening, 3 m wide and 3.2165 m high. The opening follows the existing
  two escalator approaches.
- Remove 35 old faces, covering 54.0962 m². Keep lower supporting wall faces,
  the adjoining building, floors and moving escalator assemblies.

The addition contains 142 closed panels and 2,436 triangles, batched into two
existing materials. Net rendered geometry increases by 2,401 triangles and
144,884 encoded bytes.

## Acceptance and verification

The five Chrome inspection views cover the close junction, connection from
above, square, arrival and descent. They show the closed roof seam, clear
entrance and removal of the hanging solid fragments. Texture and reflection
capture counts stay stable across the inspected views; no page errors occur.

Browser and native exports match every added coordinate and triangle, with
zero coordinate error. All 34 retained roof-boundary vertices match exactly.
The browser removes exactly the same area as the source and retains every
other index and all original encoded attributes. All other native records,
including the 48 escalators and 14 lifts, are unchanged.

The saved Blender source reopens with exact added geometry and authored
normals, exact retained geometry and UVs, and valid native bindings. Retained
preview normal-vector error is at most 0.000509.

Both landing approaches and returns pass normal-speed native walking: four
routes and 215 position samples. Native escalator rides pass for 25.592 m up
and 25.573 m down. Chrome rides pass for 25.376 m up and 25.318 m down, with
moving rendered treads and grounded arrivals. Native gameplay passes full
translation/spin rest, recall and returning home. The browser asset build
passes. The final Chrome gameplay check also passes entry, movement, a full
throw and result, recall during flight, menu and home.

Short 1440×900 inspection samples record a 16.7 ms median frame time. Four
views have a 16.8 ms p99; the descent view has a 33.4 ms p99. These short
samples establish no sustained performance claim.

## Rebuild and delivery

Against the parent manifest, run `build-east-canopy-junction.mjs`, then
`install-east-canopy-interface.py` in Blender, `repair-east-canopy-browser.mjs`,
`verify-component-serialization.mjs` and `verify-east-canopy-interface.mjs`.
The installer and browser repair also retain their earlier removal-only mode.
Native route and ride checks and Chrome inspection use the complete station.

The local source and runtime bundle are replaced in place after verification.
Full temporary candidate exports are removed. Small final receipts remain in
`.local/v2/current/components/east-canopy-junction/`.

Next: inspect the routes onward from East Square to its raised garden and
restaurant terrace, including the short stairs and ramp.
