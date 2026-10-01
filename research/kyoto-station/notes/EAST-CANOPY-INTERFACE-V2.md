# Eastern canopy and Skyway interface

## Evidence and defect

The station operator's [East Square photograph and guide](https://www.kyoto-station-building.co.jp/service/square/)
show the escalators beneath a transparent curved canopy. The reference copy is
`photos/square-img_eastsquare_01.jpg`; the historical view from the upper landing
is `photos/zekkeikana-skyway4b.jpg` (2014). The operator page was checked again
on 30 September 2026. These images establish the visible construction and
connections, without supplying surveyed member dimensions.

The current Chrome arrival view shows opaque municipal surfaces overlapping
that reconstructed glazing. Browser rays identify the underside in
`municipal-station-frontage-east-Untitled.203` and another coincident surface in
`municipal-station-court-east-Untitled.203`. Nine old horizontal tie assemblies
also hang clear of the replacement roof and building. The route itself remains
usable, but those obsolete pieces obscure the canopy and create broken joins.

## Repair scope

Remove the old envelope faces inside the registered eastern canopy, keeping
the reconstructed glass and grid. Selection checks each triangle's vertices,
edge midpoints and centroid against the 248 existing eastern glazing facets
and the adjoining central roof. A first Chrome check exposed an additional
opaque cap at their junction, including a narrow face projecting through the
glazing. The final selection includes that cap within X74.7–82.5, Y47.5–50.5,
Z11.7–22.4, excluding vertical walls. It removes 88 frontage faces from
`Untitled.203` (241.766 m²), 145 courtyard faces (455.416 m²), and 45 frontage
faces from `Untitled.201` (38.116 m²).
The building wall to the north and the Skyway floor are excluded.
The 0.9 m envelope bound distinguishes the coarse duplicate shell from adjoining source
attachments; it is a reconstruction boundary, not a surveyed roof thickness.

Retire the nine detached ties, their 36 fasteners and nine plates. Preserve all
other native records, the complete moving escalator assemblies, the remaining
building surfaces, and the current material and texture data.

## Acceptance

- Inspect the ascent, descent, upper landing and square view in Chrome. The
  opaque roof overlap and floating ties must be gone, with a coherent retained
  canopy and adjoining building.
- Match the source, browser and native removal; retain every other browser
  index and attribute, and every other native record.
- Reopen the saved source and verify retained geometry, UVs, normals and bindings.
- Ride both escalators in their operating directions in the native runtime and
  Chrome, with grounded arrivals and visibly moving browser treads.
- Pass the browser asset build and isolated gameplay checks, then merge into
  local main and replace the full temporary candidate in place.

The retained canopy grid is still a fitted reconstruction. Detailed structural
connections and surface treatment can be refined after the major overlaps are
removed.

## Verified geometry and source

The final edit removes 278 native panel faces and 54 detached objects. The
browser removal covers exactly the same surface area, deleting 2,654 triangles
while retaining every other index and all original vertex, texture and material
data. The serialized native layout differs only by those declared removals;
all escalators, lifts, floors and other records remain exact.

The saved Blender source was reopened. Retained geometry and UVs match exactly,
authored export normals are retained, and all actual source bindings point to
the correct native records. Maximum preview normal-vector difference is
0.000506. The bulk file loader embeds the collision layout without the slow
character-by-character text insertion found during profiling.

Four final Chrome views show the cleared envelope and junction strip, with no
detached ties. The remaining source facing at the canopy's root is still coarse;
fitting that facing and its structural connection is the next task. This is
not final acceptance of every canopy detail.

Both final native rides pass: 25.605 m upward and 25.634 m downward, with grounded
arrivals. Both Chrome rides pass too: 25.351 m upward and 25.366 m downward,
with grounded arrivals and moving rendered treads. The browser asset build,
isolated native gameplay and Chrome gameplay tests pass, including complete
translation and spin rest, recall during flight and returning home.

Delivery replaces the current local source and runtime bundle in place. Full
candidate exports are removed; the small inspection and verification receipts
remain under `.local/v2/current/components/east-canopy-interface/`.
