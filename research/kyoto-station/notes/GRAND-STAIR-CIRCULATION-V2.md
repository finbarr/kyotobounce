# Grand Stairway passenger-lane audit

## Finding

The suspected flight 02 obstruction recorded during the 4F work was a route
error. The test followed the middle contour vertex, then crossed the central
handrail at the next flight. The native stop at X−80.837, Z5.708 is beside
`daikaidan-flight-02-center-post-0`, centred at X−80.752, Z5.995. Chrome inspection
shows a continuous stair with the handrail separating the two passenger lanes.
The failing waypoint segment passes within 0.105 m of the post; the player and
post radii require at least 0.262 m of clearance even before the collision skin.

Preserve that handrail. Test the actual walking lanes at one-quarter and
three-quarters of the contour width. The [station operator's square guide](https://www.kyoto-station-building.co.jp/service/square/)
describes 171 steps connecting the square to the rooftop plaza; the retained
model has that count across 14 flights. Dimensions and architectural registration
remain approximate; this audit verifies circulation, not a surveyed reconstruction.

## Coverage

`prepare-grand-stair-routes.mjs` derives all riser and landing waypoints from the
current canonical layout. Both routes start on the square and finish beyond the
last riser on the rooftop landing. The native test walks each route in both
directions and checks support height throughout.

The Chrome check uses keyboard movement for a complete north-lane ascent and
south-lane descent. Generated stairs use a separate walking ramp in native
physics. The browser verifier now evaluates nearby contour triangles and their
edges, accounting for the capsule's spherical contact on slopes and joins. It
requires grounding, the configured 48-degree slope limit and the existing
waypoint-height limit. Existing panel-stair checks remain in place.

No station geometry, collision records, native code or game controls change.
No full station candidate is needed for this audit.

## Reproduce

Use the existing local main preview on port 4425:

```sh
node web/station/realism/prepare-grand-stair-routes.mjs \
  web/v2/assets.json .local/v2/candidate/grand-stair-audit
KYOTO_FAST=1 node web/station/realism/verify-east-transfer.mjs \
  .local/v2/current/station/station-layout.json \
  .local/v2/candidate/grand-stair-audit \
  .local/v2/candidate/grand-stair-audit/native-walks
node web/station/realism/walk-isetan-stair-chrome.mjs \
  http://127.0.0.1:4425 web/v2/assets.json \
  .local/v2/candidate/grand-stair-audit \
  .local/v2/candidate/grand-stair-audit/chrome-walks
```

## Verification

- All four native routes pass: 2,661 samples through 14 flights / 171 risers,
  including all intervening landings and supported endpoints.
- Three real Chrome views confirm the retained centre rail and usable lanes at
  flights 02 and 03.
- Both full Chrome keyboard routes pass: 372 grounded waypoint checks, covering
  a north-lane ascent and south-lane descent. No browser errors were reported.

Receipts, current views and the geometric diagnosis are retained under
`.local/v2/current/components/grand-stair-audit/`. Only these small audit artifacts
were created; the active station bundle is unchanged.

The audit applies to layout
`f36ce5311c04640393a1f78834b0806099719010f7c46eb3d5cb27dd12b033f6`
and static geometry
`cbfc3ca2f91a139a269b433de1176e127d7c4db877cdd1d63277bbef397e7e2b`.
