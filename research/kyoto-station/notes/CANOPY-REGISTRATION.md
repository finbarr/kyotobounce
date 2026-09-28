# Canopy position and north facade integration

## Cross-section evidence

The registered municipal shell and authored central roof profile are offset horizontally. Exact triangle/plane intersections at renderer X = -40, 0 and 30 m give the following crown differences (source relative to current authoring):

| X | Northward difference | Height difference |
| --- | --- | --- |
| -40 m | 11.987 m | -0.592 m |
| 0 m | 12.648 m | -0.592 m |
| 30 m | 13.144 m | -0.592 m |

At heights 25, 35 and 45 m, front-surface differences span 11.446–13.883 m across the three sections. These are source/model differences, not survey uncertainty estimates. The municipal mesh is coarse, and the horizontal discrepancy cannot by itself identify every correct roof/Skyway connection.

[Central section plot](canopy-registration/section.svg) · [Full measured intersections and hashes](canopy-registration/sections.json).

The red profile is current authoring; cyan/green lines are the municipal outer/inner shell. The initial rough 12–17 m estimate mixed a lower facade/balustrade edge with the roof toe. Those are different features; the refined comparison uses the crown and equal-height roof cuts instead. Do not fit the 15.44 m balustrade to the authored roof toe.

## Consequences for the reconstruction

- Preserve the registered city frame. Roof, Skyway, supporting walls and their connections need a coordinated correction; moving only the glass would create gaps and intersections.
- The present roof height is close to this municipal section. A uniform whole-station scale would not resolve the discrepancy.
- Current authored Skyway floor geometry spans a complex route, including the western restaurant approach. Changing its position requires route, collision and course proofs; a single translation inferred from the crown is insufficient.
- Register interior/Skyway photographs against durable source features before rebuilding those connections.

## North frontage candidate 01

The municipal north facade has now been added around the central opening, between the existing restored wing seams. Source clipping zones are X [-169.477757,-53.6] and [40.5,125], northing >=18, height >=0 m. These are temporary integration boundaries, not surveyed architectural joints. Source textures are licensed municipal assets; manufacturer reference photographs are not used as runtime textures.

The candidate adds 417 meshes / 104,342 native triangles, including projecting windows, recessed openings, cladding and facade piers. The existing core remains, so occluded surfaces and an exposed old mass beside the western inner seam still require cleanup. The roof remains in its previous position. Source-derived facade geometry is a baseline for subsequent close detail, not the completed photorealistic finish.

All 31 course placements and exact authored shots pass on the candidate at full native rest. Twelve directional native surface probes agree with the source to within 0.000011 m. Three central out-and-back entrance tests pass at X=-40, 0 and 30 m. The previous start at X=60, northing=27 is now obstructed by the east facade; X=100 was not reached by the fail-fast test. This failed test is retained. Determine the actual public entry and integrate it before accepting east-side circulation; do not invent a doorway simply to pass the old walk.

Reproduction: `web/station/realism/measure-canopy-registration.mjs`, `restore-station-frontage.py`, and `verify-frontage-surfaces.mjs` in the implementation worktree. Candidate layout, Blender source, screenshots and native receipts remain local. No reconstruction milestone is complete.


## Actual-game comparison and runtime result

[Before/after gallery](frontage-comparison/index.html) includes the registered north cutaway plus ordinary plaza and interior views. The complete isolated native runtime suite passed on the candidate, including reconnect, replay, fast-forward, designer validation and rapid recall. Each screenshot and report is tied to the candidate layout hash in the gallery receipts.

| View | Frame p95 before → after | GPU p95 before → after | Draw calls before → after |
| --- | --- | --- | --- |
| North architectural cutaway | 18.5 → 18.2 ms | 14.20 → 14.29 ms | 1059 → 1079 |
| Plaza | 18.4 → 18.3 ms | 14.00 → 14.12 ms | 929 → 944 |
| Interior | 18.6 → 18.4 ms | 13.73 → 13.95 ms | 203 → 215 |

Chrome 153 / M2 Metal, fixed 1280×720, five seconds warmup and twenty seconds per view. Identical browser sources, fixture and camera parameters; candidate assets/layout differ. No page errors, warnings, hidden frames or disjoint GPU queries. One pair cannot establish a small performance change or replace full-game repeated-pair and 20-minute acceptance.

The pedestrian plaza view also exposes dark baked undersides and coarse source textures. The interior retains an overly dense, dark frame pattern. These are next-pass defects, not acceptable final finishes.

## Subsequent return-wall repair

[Candidate 02](FACADE-RETURNS.md) restores the clipped inner returns and removes the exposed old pier. One course destination is explicitly revised to preserve its six-waypoint shot through the resulting open passage. All 31 courses, the complete runtime suite and twenty public walks pass; canopy position is still unchanged.

## Full section and western bridge anchors

The [subsequent registration](ROOF-BRIDGE-REGISTRATION.md) fits the entire central profile, checks two held-out sections, and identifies the municipal western bridge floor and top. It resolves why a crown-only shift fails; the coordinated playable assembly is still pending.
