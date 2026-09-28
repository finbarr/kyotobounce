# Complete central-hall openings and guards

The [construction gallery](central-hall-wells/index.html) extends passage07 into a complete above-ground floor/guard component. This advances G01/G11/G13. The full station remains courtyard life04/browser04; the new component is uninstalled. The previous goal turn made progress by supplying the source topology and operator route references; this turn builds and verifies that geometry.

## What changed

- Expanded the source-derived floor to **452.96 m²**, with all three openings retained and **370 paving slabs**. The provisional 5.6 m gate-passage depth and playable Y=0 datum remain explicit assumptions.
- Added three curbs, three glass bodies and three metal caps. The two large wells keep their open approach ends; the central oval retains its source shape without an invented function.
- Preserved all **1,616 original guard/cap triangles**. The source leaves the glass/cap interfaces open; each part is closed at the original boundary vertices to produce solid native geometry.
- Kept the other **580 parent native records identical**. The only changed existing record is the shared floor; nine well records are added. No game installation, service/scoring/C# change, commit or deployment.

Source: the Kyoto City municipal GLB, SHA-256 `0df73fd383c265904711bf09e4a628d109f7792dc9e4be524d3f531666df06a1`, CC BY 4.0. The [basement research note](CENTRAL-HALL-BASEMENT.md) records the photographs, operator maps, first-landing uncertainty and source limitations.

## Final candidate

Worktree output: `.local/station-realism/central-hall-bay-11/`.

| Item | Value |
|---|---|
| Specification | `central-hall-bay-spec-07/spec.json` |
| Spec SHA-256 | `73b35f98dc92e933362b1493a07bdb7d45abade82eb25df6f22bf8ac0f9c0dae` |
| GLB SHA-256 | `d20ce9e80749a7b8ba5ceec93802334d55a3ac30e540aa7630a7cb3274ba56f6` |
| Native SHA-256 | `44d519c00f5edd58145971d3f1fbc5066bfaced713f84993046386b085d42531` |
| GLB size | 3,454,460 bytes |
| Geometry | 590 closed records; 477 colliding; 14,976 triangles; 44,928 vertices |
| Materials | Eight batches, nine original 512 px maps; 12 MiB calculated RGBA with mipmaps |

The guard assembly uses a local Y shift of −0.036583 m to join the retained floor datum. X/Z and the original guard triangles remain unchanged. This is a construction assumption, not survey accuracy. No new photographs are used as game textures.

## Verification

- **Floor:** three complete holes; backing differs from the unsimplified source/approach/passage footprint by 1.723e−7 m², below the unchanged 1e−6 m² limit. Tile area outside the expected footprint is zero.
- **Source geometry:** all 1,616 original guard/cap triangles match exactly after the declared height shift. Fifteen horizontal cross-sections match at 10 µm computational precision. That precision is not a claim about real-world accuracy.
- **Export:** every vertex, triangle index and winding agrees between browser and native records; maximum coordinate error 1.035 µm. All 14,976 face normals pass.
- **Native rays:** `central-hall-bay-native-11/report.json` contains 13,620 passing sampled triangle probes; maximum hit difference 0.02037 mm under the unchanged 1 mm limit. Four independently verified shared-boundary ties are recorded. Decorative parts are excluded from collision.
- **Native movement:** `central-hall-well-walk-02/report.json` passes twelve floor support checks, nine gate head queries, six gate walks and twelve walks around the wells, including both central gaps. Three additional downward queries confirm that the complete openings remain unfilled. The initial repeated cutout query also passes.
- **Browser:** matched before07/after11 overview cameras and a walking-height close view were rendered in Chrome. These are unregistered component inspection views with static viewer lighting; they do not establish whole-game performance or final appearance.
- Browser asset build and relevant syntax/diff checks pass. No native rebuild was required because C# was unchanged.

## Failures preserved and corrected

Revisions08/09 extruded guard footprints. Horizontal source comparisons exposed end-cutout differences; revision10 retains the exact source side triangles instead. The first floor verifier accidentally reapplied the coordinate grid during clipping and reported an 8.618e−5 m² difference; `central-hall-bay-10/floor-proof-precision-failure.json` preserves that failed receipt. The verifier now resets computational precision after the declared initial source snap, preserving analytic gate edges. Tolerances are unchanged.

Revision10 passed eighteen walks but failed one of 13,624 ray probes. A 0.236 mm nearly collinear floor edge created an eight-metre thin triangle on the underside, producing a 1.907 mm native hit difference. Revision11 coalesces that single vertex: maximum outline shift 0.2873 µm and changed area 1.723e−7 m². The native tolerance stays at 1 mm. The full final probe set and walks were rerun; the [failed collision receipt](central-hall-wells/rejected-collision.json) remains available.

## Still required

1. Build the paired moving escalators, casings, well lining and supported lower floor. The municipal source contains two lanes per side; its model ends above −5 m and does not establish any deeper B2F continuation.
2. Resolve the first-landing identity separately from the route destination. The July 2026 photograph labels the nearer well B1F; the operator directions describe reaching B2F.
3. Finish blue glass decoration, realistic glass/metal response, stone edges, joint aliasing, indirect light and contact shadows. The current gray glass and empty wells are visibly unfinished.
4. Reconcile Balcony waypoint support with the completed curbs/guards and lower geometry. Prior footprint checks are not executed course failures, and component ray/walk checks do not prove existing shots.
5. Complete the neighboring hall architecture and interfaces, replace the shared visual/native floor together, and verify the integrated station's routes, courses, runtime and Chrome performance.

No final visual milestone is accepted. Both plazas, adjoining streets, wider station architecture, remaining registered views, full gameplay comparisons and the twenty-minute audio/context soak remain in the active long-term goal.

## Tools

Worktree: `prepare-central-hall-wells.py`, `build-central-hall-bay.mjs`, `verify-central-hall-wells.py`, extended `verify-central-hall-passage.mjs`, and the existing serialization, normal and native-ray verifiers. The native commands use `node --experimental-strip-types` and the compatible executable selected with `KYOTO_WORKER_EXECUTABLE`; no `tsx` dependency was installed.
