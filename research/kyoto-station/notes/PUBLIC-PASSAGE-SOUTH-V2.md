# Public passage: southern continuation

28 September 2026. This pass replaces the premature southern exit with a continuous route through the railway footprint to a southern arrival deck and ground landings.

## Evidence and defect

The previous public floor ended at native Z−81 m. Two flights then descended to a small forecourt at Z−103 m, well inside the railway footprint. The route was physically walkable: the initial native audit passed with 1,040 samples. Its location and level sequence were wrong.

The [Kintetsu route to JR West](https://www.kintetsu.co.jp/station/station_info/pdf/Kyoto_02.pdf), dated 20 January 2026, shows a lower public hall, a stair/escalator ascent, and an upper corridor continuing to the JR West gate. Both pages were saved and visually inspected. Its photographs also establish the vaulted upper ceiling and cylindrical lower-hall columns. The companion [Shinkansen route](https://www.kintetsu.co.jp/station/station_info/pdf/Kyoto_01.pdf) places the two operators' entrances opposite each other across the lower hall. The downloaded PDFs and hashes are recorded in `sources.json`; their photographs are research references, not game textures.

The saved station overview and [municipal Hachijo plan](https://www.city.kyoto.lg.jp/kensetu/page/0000178520.html) show the public passage continuing into the southern terrace, with lateral stairs to the forecourt. Registered Kyoto City / MLIT PLATEAU roof edges place southern frontage objects `26100-bldg-466189` and `26100-bldg-466077` around native Z−170…−195 m. Roof edges establish broad coverage, not exact thresholds or public-access boundaries. The retained local coordinate transform and data attribution are documented in `geodata/plateau-2024/README.md`.

## Implemented connection

- Retain the northern 2F passage and its existing branches. Close the exposed ceiling edge strips and the gap immediately before the extension.
- Extend the Y7.35 m crossing from Z−81 to Z−112, with a faceted vaulted roof, ribs, western glazing and parapets.
- Descend through 22 steps to a lower public hall at Y3.675 m. The hall continues to Z−185.
- Add a covered southern deck to Z−195, with guarded west/east stairs. Each staircase has two eleven-step flights and an intermediate landing, reaching the ground pavement.
- Remove the obsolete 99 exit objects from native geometry, the browser export and the editable Blender scene. Browser removal follows authored face polygons and their complete bounds; this includes the small extensions of the old rails beyond their nominal endpoints.

The route topology is evidence-based. The two modeled floor elevations, 12 m hall width, 0.167045 m stair rise, 0.32 m going, exact walls and southern deck dimensions remain provisional fits. The ticket halls, gates, moving escalators, lifts, platform routes and complete Miyako Yume Terrace/forecourt remain unfinished. The current lower hall supplies a continuous public route; it does not yet reproduce those side destinations.

## Verification and cost

Verification receipts are retained under `.local/v2/current/components/public-passage/` after promotion. The geometry check covers all 356 added panels, 16,080 vertices and 5,360 triangles. It also checks the retained native records and encoded browser data. Preparation removes 1,709 clipped browser triangles belonging to the old exit; the resulting net increase is 3,651 triangles, five material batches and 461,392 bytes. Fifteen new fixtures use the existing pool of at most two active lights.

The editable scene saves and reopens with matching geometry, normals, materials, light emitters and retained box/panel bindings. Four normal-speed native walks pass with 5,298 recorded positions: northern passage to west ground landing and back, plus both directions of the east stair. Endpoint floor heights are within 0.06 m. Nine actual Chrome views cover the retained join, upper crossing, level change, lower hall, deck, both external stairs and southern exterior, with no page errors. The 810 short frame samples at 1440×900 have a 16.7 ms median and approximately 16.8 ms p99; this is not a long performance soak. Native and Chrome gameplay checks pass, including full translation/spin rest, recall and home. `npm run build:web` passes.

Rebuild in order with `extract-public-passage-exit.py`, `prepare-public-passage.mjs`, `build-public-passage.mjs` and `web/v2/compose-component.mjs` against the parent manifest. Verify with `verify-public-passage-geometry.mjs` and `verify-public-passage.mjs`, then integrate with `install-public-passage.py`. These tools assert their expected parent geometry.

## Subsequent work and remaining connections

The [conventional railway](CONVENTIONAL-RAILWAY-V2.md), [platform 0](PLATFORM-ZERO-V2.md) and [southern operator fronts](SOUTHERN-GATES-V2.md) are integrated. Next, build the southern paid concourses and railway behind the closed operator gates, followed by the remaining Hachijo building, terrace and forecourt. Keep smaller finish work behind these missing structures.
