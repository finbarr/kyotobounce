# East Square ramp landing

30 September 2026.

## Repair

The ramp's rising rails stopped at its upper landing. The north and east
edges of that landing were open above the lower escalator arrival. A native
walk reproduced the missing barrier by crossing the eastern edge; the check
stopped at the crossing, before measuring a fall.

The operator's [7F map](https://www.kyoto-station-building.co.jp/floorguide/7f/)
shows the ramp and its turn onto East Square. The added guard follows the
existing landing and matches the retained rail's material, 45 mm sections,
550 mm middle rail and 1.05 m top rail. These are fitted reconstruction
dimensions, not surveyed measurements.

Extend the north rail by 2.5 m and return it around the 2 m eastern edge.
Four posts and small base plates support the addition. The southern turn
onto the square remains open across the landing's 2.5 m width.

The change adds 12 closed panels, 144 triangles, one draw batch and 12,820
encoded browser bytes. It uses the existing material and adds no textures.

## Verification

- Native walking passes up and down the ramp and through the landing turn
  in both directions: four routes and 638 samples. Separate checks push
  against both guarded edges for 60 samples each without crossing them.
- Chrome keyboard walking passes the same four routes. Both edge checks
  retain floor support and stop at the new guard.
- Five Chrome views were inspected, including the approach, turn and return.
  Texture and reflection-capture counts stay stable; no page errors occur.
- Added browser vertices and triangles match the native panels. Existing
  native records and browser buffers remain exact, including moving hardware.
  The saved Blender source reopens with matching geometry, UVs, normals and
  native bindings.
- The browser asset build and native gameplay check pass, including full
  translation and spin rest, recall and home.
- Chrome gameplay passes entry, movement, a complete throw and result,
  recall during flight, menu and home.

An old route definition crossed the restaurant's sculpted stone terrace as
though it were the retired uniform stair. The current turning ascent passes
native walking. Its return needs a start point clear of the adjacent glazing;
the rejected placement is not evidence of blocked walking geometry.

## Delivery

Build with `build-east-square-landing.mjs`, compose with
`web/v2/compose-component.mjs`, verify with `verify-static-replacement.mjs`,
and install into Blender with `install-east-transfer.py`. The shared Chrome
walker now checks declared guarded boundaries as well as ordinary routes.

The verified source and exports replace the current local bundle in place.
Temporary full exports are removed; small receipts remain in
`.local/v2/current/components/east-square-landing/`.

Next: inspect the public passages along East Square's eastern and southern
edges, including their connections to the lift and toilet corridor.
