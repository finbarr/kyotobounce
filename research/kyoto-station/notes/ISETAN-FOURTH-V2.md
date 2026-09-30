# Isetan fourth-floor connections

## Defect and acceptance

The 4F store entrances from Muromachi Square are sealed by the retained building
shell. Behind them, separate floor plates and foundations obstruct the store's
north–south circulation. Open both entrances into connected receiving halls and
aisles, keeping the Grand Stairway and northern side stairs clear.

Finish when native and Chrome walks pass through both entrances, around the
western aisle loop and between the north and south halls. Check the affected
public stairs, 2.1 m headroom, continuous floor joins, protected forecourt edge,
matching browser/collision geometry and the saved editable source.

## Evidence and limits

- The [station operator's 4F plan](https://www.kyoto-station-building.co.jp/floorguide/4f/)
  shows Muromachi Square, the Grand Stairway, northern approach and Isetan.
  Saved reference: `maps/floor-4f.svg`.
- The [operator's Isetan layer](https://www.kyoto-station-building.co.jp/app/themes/kyoto-station-building/floorguide/img/map/img_map_4f_isetan.svg)
  shows two eastern entrances from the square, connected aisles and a northern
  stair/lift core. Saved reference: `maps/floor-4f-isetan.svg`. North is up.
- [Isetan's current floor guide](https://www.mistore.jp/store/kyoto/shops/floor4.html)
  identifies women's clothing, accessories, formalwear and a cafe on 4F.

The hall dimensions, forecourt fit and finishes are approximations. The fixed
public stair geometry determines the fitted inner boundary. Internal store
stairs and lifts above 3F, escalators, western parking access and tenant fitouts
remain unfinished. Access to this floor uses the constructed public approach.
The low display blocks establish aisles rather than reproducing specific shops.

## Construction

Use the retained Muromachi floor datum at Y15.614658. Preserve both original
store floor plates, Muromachi Square and its southern connector exactly. Fill
only the missing area beneath the new hall and northern forecourt strip.

The hall wraps around the public stairs: a southern receiving room, a western
cross aisle and a northern receiving room. Its western edge at X−118.6 stays
inside the retained municipal facade. Its eastern boundary steps back to
X−91 between Z−6 and Z24.5, keeping the initial Grand Stairway and north-side
flights outside the room. The southern entrance is at X−75, Z−10.5; the northern
entrance is at X−73, Z28. A narrow guarded forecourt joins the northern doorway
to the square beside the retained municipal frontage. The ceiling underside is
Y18.635.

Three disjoint room volumes cut the crossing facade/foundation surfaces and
the overextended lower portions of north-side stair parapets. Those cuts stop
below the actual public stair treads, preserving the upper guards.
The cutter and verifier support several disjoint volumes for one retained panel,
preserving its faces, corner normals and material outside those volumes.

The generated foundations under north-side flights 03 and 04 also extend through
the receiving hall. Replace those two foundations with five closed solids cut
around the room, preserving their original footprint and the structure below the
floor and above the ceiling. The stair treads and walking ramps remain exact.
Independent section checks compare the replacement with both the native contour
geometry and the original Blender faces.

Reproduction uses `prepare-isetan-fourth.py` with the local geometry Python
packages, Blender `extract-isetan-fourth.py`, `build-isetan-fourth.mjs`, then the
existing `prepare-porta-west-base.mjs`, `open-isetan-ground.mjs` and
`web/v2/compose-component.mjs` tools. Build in one candidate. Run the static,
floor, headroom, native-route and Chrome checks before source installation and
in-place promotion.

## Verification

- 79 closed panels / 1,056 triangles, 18 fixtures and one original sign atlas.
  Retired 36 obstructing panels and two generated foundation objects; bounded
  cuts preserve 146 existing panels outside the room openings.
- 723.866 m² of missing floor filled. All four original floor panels remain
  exact. Missing and duplicate floor areas are each below 0.0001 m².
- All 14 scoped native routes pass (2,838 samples), including both store doors,
  both aisle loops, the southern approach, the Grand Stairway's first flight
  and the three northern side flights. The forecourt barrier also passes.
- Five Chrome keyboard routes pass at 28 waypoints. Static headroom checks pass
  in 684 sampled volumes, resolving 72 conservative beam bounds against their
  actual segments. Legacy escalator flight records do not create native meshes;
  actual moving hardware remains unchanged and is covered by runtime walks.
- Five inspected Chrome views / 600 frames: median 16.7 ms, p99 16.8 ms.
  Texture count remains 376 and reflection captures remain seven across views.
  These short local measurements cover these views only.
- Saved and reopened Blender source preserves geometry, bindings, UVs and the
  exact full-precision export normals. Blender's encoded preview normals differ
  by at most 0.071 degrees. Static browser geometry grows by 2,691,176 bytes.

- `npm run build:web`, native gameplay and Chrome gameplay pass at the indoor
  exploration start (X−80, Z−24). Both translation and spin reach zero before
  the shot finishes; recall and return-to-start pass.

Delivery receipts are retained under `.local/v2/current/components/isetan-fourth/`.
The single candidate is promoted into the existing local main bundle, then its
duplicate full exports and isolated server overlay are removed.

## Next defect to investigate

A broader retained Grand Stairway route stalls at approximately
X−80.837, Y18.306, Z5.708 near flight 02, on both the parent and candidate
layouts. Normal-speed and alternative waypoint checks also fail. This does not
block access to the new halls from Muromachi Square, but the upper public route
is not claimed as verified. Investigate the collider and walking-assist geometry
there before extending the store upward. The failed diagnostic receipts are
retained beside this increment's passing scoped route reports.
