# Isetan ground entrance and food-hall stair

## Defect and acceptance

The ground-level Isetan vestibule terminates at closed glass and a rear wall.
The existing lower building façade also crosses the intended receiving space.
There is no store floor or connection to the existing basement stair core.

This increment opens the vestibule into a ground-floor receiving hall and aisle
loop, then extends the existing B1–B2 core to ground level. Finish when ordinary
native and Chrome walks pass through the entrance and between all three floors,
the affected openings have clear headroom and protected edges, and the saved
Blender source matches browser and collision geometry. Preserve the upper
façades, existing basement aisles, and all moving hardware.

## Evidence and limits

The [official Isetan 1F plan](https://www.mistore.jp/store/kyoto/shops/floor1.html)
(image alt text `1F_260701`) shows the east entrance facing the station, a main
aisle past boutiques, cross aisles, and internal vertical circulation. The saved
station operator 1F diagram confirms its orientation. Research image:
`maps/isetan-1f-2026.png`; reference only, never a game texture.

The receiving hall and stair dimensions are fitted to the current station and
the already connected food halls. They are not measured construction dimensions.
The western portion of the store, north/west external entrances, remaining
escalators/lifts, upper floors and branded shop fitouts remain unfinished.

## Construction and reproduction

The fitted ground hall spans X−123..−73.12, Z−28..16, with its finished floor at
Y0.006 and ceiling underside at Y4.6. The B1 connection retains Y−4.9135828018.
The two new flights have 28 risers of 0.1756994 m and 0.30 m going. They stack
above the existing B1–B2 flights, with a larger intermediate landing and matching
openings through the concourse, ground finish and B1 ceiling.

The old Grand Stairway foundations were solid extrusions to ground level.
Fifteen visible foundations are replaced with source-derived geometry ending at
the hall ceiling; four unrendered escalator-foundation placeholders are removed.
All 19 stair/escalator path definitions keep their original contours, elevations
and rise. Their old generated foundations are disabled. Moving escalators,
lifts and hardware assets are unchanged.

The replacement removes four vestibule boxes, 131 lower façade/ceiling/guard
panels, and the 19 source foundation objects. Ninety further façade panels and
the concourse opening are edited. The new component has 168 closed panels,
7,216 triangles and seventeen fixtures served by the existing light pool.

Reproduce in one private candidate folder:

1. Blender `extract-isetan-ground.py PARENT COMPONENT` pins the exact source.
2. `build-isetan-ground.mjs PARENT COMPONENT` builds the hall, stair and foundations.
3. `prepare-porta-west-base.mjs PARENT COMPONENT COMPONENT/station` removes the
   declared old surfaces. Its optional `--audit` checks coverage without writing exports.
4. `cut-central-lift-floor.mjs COMPONENT/station/assets.json COMPONENT/spec.json`
   opens the retained concourse with its texture coordinates and existing holes.
5. `open-isetan-ground.mjs COMPONENT/station/assets.json COMPONENT` opens the
   crossing façade sections and disables the replaced generated foundations.
6. `web/v2/compose-component.mjs` appends the component in the same station folder,
   supplying its `removal.json` receipt. Use `report.geometry.spawn` in the candidate manifest.
7. `verify-static-replacement.mjs`, `verify-isetan-ground-headroom.py`, native
   `verify-east-transfer.mjs`, Chrome `walk-isetan-ground-chrome.mjs`, and the
   generated `views.json` check correspondence, headroom and ordinary traversal.
8. Blender `install-east-transfer.py` saves and reopens the editable source.

Scripts without an explicit directory are in `web/station/realism/`. Original
research stays private. The candidate is tested on isolated port 4426 and replaces
the current local bundle only after validation.

## Delivery checks

- Sixteen native route walks pass: entrance and aisle loops, boutique doors,
  both basement stair connections, B1 approach and two retained upper flights.
  The ground stair guard blocks entry onto the lower-flight opening.
- Five Chrome keyboard routes pass, including both stair directions. Native
  and Chrome gameplay checks pass for walking, full translation/spin rest,
  recall and home. `npm run build:web` passes.
- All 50 new and retained treads plus both intermediate landings have 2.1 m
  clear headroom. Blender save/reopen and geometry checks verify matching
  source, collision, browser surfaces, normals and texture coordinates.
- Ten Chrome views have no page errors or growing texture/reflection counts.
  Short 1440×900 observations show 16.7 ms median and 16.8 ms p99 frame intervals;
  these are local samples, not a sustained performance benchmark.
- Net station geometry growth is 1,348,624 bytes. The current source and station
  exports replace their predecessors in place; full candidate exports are removed.

The hall remains a fitted architectural shell. Detailed shop interiors and the
remaining store circulation are deferred to later increments.
