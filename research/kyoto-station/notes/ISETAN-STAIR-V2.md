# Isetan internal ground-to-second-floor stair

## Defect and acceptance

The ground and second-floor receiving halls are open, but the internal stair
ends at ground level. Extend the existing northern core to 2F with two flights,
a middle landing, handrails and protected floor openings. Keep access to the
basement stairs and a clear aisle around the upper stairwell.

Finish when native and Chrome traversal connects B2, B1, ground and 2F through
the core; both upper approaches and the northern bypass are usable; guards stop
entry onto the open well; headroom and saved source/export correspondence pass.

## Evidence and limits

The saved official [1F](https://www.mistore.jp/store/kyoto/shops/floor1.html) and
[2F](https://www.mistore.jp/store/kyoto/shops/floor2.html) plans show stairs on the
northern side of the store entrance. Their orientation matches the station
operator's floor diagrams. Research files: `maps/isetan-1f-2026.png` and
`maps/isetan-2f-2026.png`.

This is a fitted continuation of the existing reconstructed core. The plans
establish circulation and general position, not surveyed stair dimensions.
Store escalators, store lifts and higher floor connections remain unfinished.

## Implementation

The stair rises 7.344 m in two flights of 21 treads, with 174.9 mm risers,
300 mm goings and a 1.85 m deep middle landing. Sloping glazed guards and steel
handrails protect both flights. The opened ground ceiling and second-floor slab
share the same well; three crossing foundation panels are clipped in the source,
browser and collision exports. The old basement flights remain beneath it.

A 1.8 m northern bypass passes between the protected opening and the hall wall.
One perimeter counter and six inlays crossing the opening are removed. The
former ceiling fixture is replaced by a supported middle-landing light, and
signs and tactile warnings identify both arrivals.

## Verification

- 12 native routes, 1,575 recorded movement samples and two guard checks pass.
  The route suite uses running input; Chrome checks use ordinary walking.
- All 92 treads across B2–B1, B1–ground and ground–2F have 2.1 m headroom.
  In total, 527 clearance volumes cover treads, landings and connecting aisles
  against the complete station panels, boxes and generated collider bounds.
- Seven ordinary Chrome keyboard routes pass, including the new stair in both
  directions, the northern bypass and the retained basement stairs.
- Saved/reopened Blender geometry, UVs, normals and retained bindings match.
  All 88 new panels are closed; the component has 1,096 triangles. Fifteen
  old panels are retired, and the moving hardware stays unchanged.
- Native and Chrome gameplay pass: configured spawn, walking, full
  translation/spin rest, free result, recall forfeiture and home. The native
  check measures 1.38 m movement and 11.08 s to full physical rest.
- Five Chrome views were inspected. The short 600-sample frame check measured
  16.7 ms median and 16.8 ms p99, with 371 textures and seven reflection captures
  stable across the views. This is not a sustained performance benchmark.
- `npm run build:web` passes. Net browser geometry growth is 570,140 bytes.

Implementation: `web/station/realism/build-isetan-stair.mjs` and
`prepare-isetan-stair.mjs`. Small build and verification receipts are retained
in `.local/v2/current/components/isetan-stair/`; the current bundle is replaced
in place after verification.
