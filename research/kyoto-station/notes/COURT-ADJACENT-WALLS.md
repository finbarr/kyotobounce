# Courtyard hotel returns and service walls

**Integration update:** These component surfaces are now installed in a matching full native/browser candidate; see [installation evidence](COURT-ADJACENT-INTEGRATION.md). The construction results below remain the component record.

27 September 2026. Component04 / visual preview02. [Open matched comparisons](court-adjacent-walls/index.html).

## Result and boundary

Seven previously blurred municipal wall patches now have a source-bound construction candidate: the perpendicular hotel return and its glazing, the foreground tiled tower, a pale enclosure with eight recessed ventilation slots, dark service-wall panels with small fasteners, and the upper return. Four observed hotel windows are recessed into the new return. The component covers 1,213.4437 m² of projected source area.

This is an isolated architectural component and a visual-only composition in the full browser scene. The full native/Blender station remains `station-hotel-court-03`. The preview must not be used as its gameplay asset. Installation, full-station scope checks, courtyard walks and actual-game measurements are the next step.

The existing [JR Central reference](https://souda-kyoto.jp/blog/01367.html) and [Rurubu / Ryota Fujii reference](https://rurubu.jp/andmore/article/23413) supply the visible treatments. Both were published in 2025; capture dates are unknown. Municipal geometry supplies the wall positions and bounds. No new reference was downloaded; the library remains 208 entries / 193 downloaded source files. Original ceramic maps are reused; photographs were not copied into textures.

## Source registration

Both previously registered cameras remain fixed. Surface picks in both images identify the corresponding municipal faces; the source GLB hash is pinned. Each patch uses a vertical plane from the selected source triangles, preserving their projected outline. The largest source departure from a selected plane is 2.711 mm. This quantifies model planarity, not real-world survey accuracy.

| Patch | Original face IDs in Untitled.203 | Projected area |
|---|---|---:|
| Hotel return | 4668–4672 | 609.3591 m² |
| Foreground tower | 4721–4729 | 422.7220 m² |
| Pale vent front | 8366–8367 | 13.8135 m² |
| Pale vent side | 8368–8369 | 5.9113 m² |
| Dark front and lower extension | 8287–8290 | 93.1786 m² |
| Dark side | 8347–8350 | 21.2707 m² |
| Upper return | 7034–7035 | 47.1885 m² |

The four return-window centres are manually observed in the original 816×544 JR photograph. Three fit a repeated two-column/two-row arrangement on the fixed source plane; the fourth is withheld. Fit RMS is 0.419 pixels, and the withheld centre differs by 0.308 pixels. This small check supports the repeated centres only. It does not independently validate the camera, wall dimensions, window size or recess depth. The Rurubu view largely occludes this window group.

Window width/height reuse the previous 0.88×1.92 m estimate. The visible construction includes only the four observed openings. Hidden windows remain unresolved. The 100 mm ceramic tiles, larger panel joints, eight slot dimensions, panel fasteners and optical finishes are inferred details. Dark panel cells are nominally 1.08×0.78 m; their spacing still needs closer photographic confirmation.

## Construction and corrections

The component contains 1,010 closed panels / 12,444 triangles / 37,332 emitted vertices / nine material batches. There are 714 colliding panels and 296 decorative panels, including shallow glazing details, vent vanes and 116 fasteners. Physical material labels distinguish glass and facade. Three existing 512² ceramic maps are reused; their decoded RGBA+mipmap estimate is 4 MiB within the component, not an incremental whole-game allocation measurement.

Two rejected builds are retained as evidence. A Boolean difference created a narrow glass-boundary sliver below the intended band; directly intersecting the band with its height bounds fixed it. Earcut also failed closure around multiple narrow vent holes in one backing panel. Splitting at the hole edges preserves the polygon union and produces simple closed sections. No closure tolerance was relaxed.

The first successful preview showed service-wall joints that were too light. Final04 assigns their backing the existing dark vent material. This changes only browser material indices; exact comparison confirms all vertices, winding, collision flags and physical materials match the tested03 component.

## Verification and visible preview

- **8,892 native/browser collision probes pass**, covering every colliding triangle in component03; zero mismatches or shared-boundary exceptions. Maximum position difference is 0.02996 mm. The material-equivalence receipt proves that the final04 physical records are unchanged.
- Final04 serialization checks every vertex and index, with correct winding and maximum Float32 position error 7.831 micrometres.
- All 12,444 face-normal checks pass. Minimum face/normal dot is 0.9999999703.
- The ceramic image bytes, samplers and material semantics match the original source; all 5,676 ceramic UV vertices match their local-coordinate formula. Untextured materials contain no unused UVs.
- A repeat build reproduces final GLB and native bytes. Component GLB is 1,151,984 bytes; no optimized full-scene cost is claimed yet.
- The visual preview clips 32 triangles in two municipal batches. Each of its seven removed areas agrees with the registered patch within 0.000066 m²; total removed area is 1,213.443784 m². This is a browser preview scope check, not a Blender/native installation proof.
- `npm run build:web` passes. No service, native C# or scoring code changed.

The before and after images use identical cameras, dimensions and static viewer lighting. Both final images were visually inspected. The return, tower and service boxes now read as separate constructed surfaces. The right-hand lower frontage still uses blurred source geometry, the cafe corner remains unfinished, and the tile/glass appearance needs actual-game lighting. Planting, furniture, paving details and sculpted terrace forms are still absent or incomplete. No final photographic milestone or game-performance gate is accepted.

The gallery passes Chrome checks at 1440 and 390 px: four images, fifteen local links, working before/after selection, no overflow or page errors. Both layouts were visually inspected. This pass’s component worker, source renderers and gallery server have stopped.

## Artifacts and next action

All construction artifacts remain under the isolated worktree's `.local/station-realism/`:

- `court-adjacent-spec-05/spec.json`: `04286fe2f0eb56e7e01590c93653a14352c26098cd3949ba881538132b92ea21`.
- `court-adjacent-04/court-adjacent.glb`: `1d4681811056bb0cb7f6f37ba1f5fe49720cda1f1ddabc89af7b782f7cc54c74`.
- `court-adjacent-04/native-panels.json`: `ac02bdd7717e5b1e46bebe461ec104387ff954b9ffb4e113054261cd6425e378`.
- `court-adjacent-preview-02/preview.glb`: `f968bbec5d5f47b8549cf0ed01a328901a3e6586c4abdb309eb683a5b109f2d2`.
- Component/native reports, final serialization/normals/material checks and repeat proof are linked from the gallery. Commands are in `web/station/realism/README.md`.

Next, install these exact seven bounded replacements into hotel-court03, reuse the six existing hotel materials, add the three service materials, prove unaffected records and polygon coverage, then rerun courtyard traversal and actual-game comparison. Do not silently substitute the browser-only preview for a matched native scene. The full long-term goal, thirteen other view registrations, wider public spaces, both plazas, frontages and final runtime/performance gates remain active. No commit, push or deployment.
