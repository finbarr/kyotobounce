# NIWA frontage: new architectural evidence

27 September 2026. Research progress; no model, collision or public route changed.

## Useful new views

- [JTB/Rurubu article, 8 June 2025](https://rurubu.jp/andmore/article/23413), photographed by Ryota Fujii: [frontage](../photos/niwa-rurubu-frontage.jpg) and [approach](../photos/niwa-rurubu-approach.jpg). Capture dates are not supplied. The first view clearly shows projecting timber members, independent stone stair flights, square planters, a drainage channel and the lower walkway. It also exposes more of the warm stone stepped terrace than the September JR image.
- [NAKED announcement, 4 March 2025](https://naked.co.jp/works/24937/): [ceremony frontage](../photos/niwa-naked-ceremony-frontage.jpg) and [interior](../photos/niwa-naked-interior.jpg). The 3 March ceremony helps distinguish the pale glazing frames and dark fascia; the interior shows timber grain, warm wall lighting and dark ceiling fixtures. Event decoration and people hide parts of the structure.

All four photographs were visually inspected. They are reference copies, not licensed game textures. The unrelated Rurubu food hero was inspected and omitted from the architectural catalogue.

## Missing construction details

| Element | Observed detail | Work still needed |
|---|---|---|
| Timber frontage | Tall posts on small dark feet, projecting joists, long fascia, deeper transverse members | Establish post centres, beam sections, overhang and transitions to the enclosed frontage |
| Glazing | Narrow pale metal vertical frames, low horizontal rails, dark band above | Resolve panel count, operable doors, frame depth and glass reflections |
| Entrance | Distinct grey granite stair flights interrupted by square planters | Register the second camera; determine landing, riser count, tread run and exact end returns |
| Lower walkway | Pale broad paving, narrower dark slabs next to stairs and linear drainage | Establish walkway level and boundary; keep drain detail visually readable without adding collision traps |
| Raised stone terrace | Warm speckled stepped forms beside cafe frontage | Reconcile the foreground seat with the complete rear terrain and stair topology |
| Planting | Clipped tree at the open pergola and planted square boxes | Confirm durable placements across dates before modeling plant mass |
| Interior | Timber counter, pale textured wall, warm light strip, dark ceiling and spots | Add a shallow visible interior with controlled material and lighting costs |
| Temporary furniture | Umbrellas, tables, chairs, menu boards and event objects vary between views | Choose a documented arrangement and preserve clear public circulation |

## Fixed-camera measurement study

[Reproducible measurements](niwa-frontage/measure.json) use the already registered September JR camera and the unchanged court03 datum. Ten manually selected original-image points are intersected with seven possible facade planes (local u44 through u50). This is a sensitivity study, not a fitted facade or survey.

At assumed u47, three roof points give Y34.949, 34.958 and 34.895 m. Changing the assumed plane by 1 m changes those heights by about 0.18 m. Agreement with one municipal roof elevation therefore does **not** establish the frontage footprint. The near/middle tentative thresholds give Y31.733 and 31.838 m. The farther threshold point is occluded and explicitly rejected as a construction constraint.

The lowest stair edges are in front of the facade. Intersecting them with the facade plane is invalid for assigning their height. At the provisional garden level Y31.093377, the two tentative foot picks imply u42.573 and u44.916; at municipal arrival level Y29.973377 they imply u50.377 and u54.688. Their disagreement requires better point identification and a second registered view. Do not alter the court height or invent a stair count to force agreement.

The municipal model is coarse; its low roof surfaces cannot independently establish the 2025 timber renovation. The existing foreground seat also inherits a provisional garden plane. Its native collision checks remain valid for that candidate, but they do not validate this unresolved architectural datum.

## Next bounded construction step

1. Register the Rurubu frontage photograph using unchanged source-building corners and facade features; reserve independent check points.
2. Match durable threshold, planter and stair-edge points across the registered photographs. Resolve the lower walkway/raised terrace relation before freezing collision geometry.
3. Build the timber and framed-glass frontage on that resolved footprint. Use original material maps, repeat shared profiles, and document provisional or occluded details.
4. Check the browser/native geometry, entrance traversal, matched-camera appearance and incremental rendering cost before integration.

The full station remains inner-roof01, the isolated furnished court remains03, and the long-term goal remains active. This research does not accept a final visual milestone or a gameplay/performance gate.

## Follow-up completed

The [second camera and joint construction study](NIWA-FRONTAGE-REGISTRATION.md) now supplies cross-view planter dimensions and updated height hypotheses. Source-only and joint camera versions are preserved; next work is the frontage/entrance component and its local paving interfaces.
