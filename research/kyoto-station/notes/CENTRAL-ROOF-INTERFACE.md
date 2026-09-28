# Central roof integration and the remaining Skyway conflict

27 September 2026. [Actual-game before/after gallery](central-roof-interface/index.html).

## What changed

The central canopy and two transverse branches now belong to a local station construction candidate. Both imported north-frontage meshes are rebuilt from the original municipal triangles before clipping. The new 113-face roof exclusion is combined with the existing eastern 248-face exclusion. Original UVs and interpolated corner normals are retained. The twelve registered vertical side faces are preserved; four intersect the frontage clipping zones, while the other eight lie outside them.

The two rebuilt meshes contain 1,358 western and 1,393 eastern triangles. Source UVs match 2,536 / 3,876 uncut corners with maximum differences of 2.98e−8 / zero. The 3,155 central component panels reuse the existing glass and steel materials. The verifier confirms that only the two declared existing frontage records change, and the component panels are appended; unrelated geometry, materials and course fields remain unchanged.

## What passes

All **528 full exported-scene/native ray comparisons** pass, with maximum hit-position difference 0.000166322 m. The 278 eastern controls return exactly the predecessor's native hit coordinates and surface IDs. The sixteen duplicate imported roof overlaps have been removed.

The complete isolated `npm run test:runtime` passes: entry/tutorial, reconnection, authoritative scoring, progression, replay sharing, normal/2× playback, native design validation and 64 rapid throw/recall cycles. The initial invocation stopped when its standalone campaign test lacked the explicit worker executable; the corrected full invocation and its log are retained. These runtime checks do not cover every authored course solution.

The existing revised terrace destination remains supported, with two passing capsule walks. Course definitions match the predecessor except their layout hash. Browser build and tool syntax checks pass.

## What fails and why

**Skyway Trapdoor fails its authored solution.** Thirty other authored shots retain their complete recorded pose sequences, exact durations, waypoint lists, final positions and destination outcomes. All 31 reach full physical rest; a stopped ball is not automatically a cleared course.

The failing shot still collects its first two banks on the old Skyway and old canopy. At **0.5611119 seconds**, it hits the new central glass at native coordinates **(-41.554802, 44.939102, 7.039708)**. Its trajectory then diverges and misses banks 3–5. [The saved divergence record](central-roof-interface/course-impact.json) identifies both original native traces and their hashes.

Three local canopy conflicts also remain: `canopy-glazing-051-19`, `canopy-depth-strut`, and `canopy-glazing-120-29`. They precede the new component surface by about 0.1973 / 0.0945 / 0.1342 m in the diagnostic rays. The full-scene verifier correctly agrees with these visible/native obstructions; it does not make them acceptable architecture.

This candidate is **not ready for promotion**. The registered roof, inner truss, old canopy removal and central/eastern Skyway placement need coordinated construction. Then the affected course can receive a verified solution against the final geometry while retaining its identity and scoring rules. Cutting an unsupported hole or waiving the failed solution would conceal the mismatch.

## Visible review and cost

All six actual-game screenshots were inspected. The aerial view shows the new central envelope; the western junction exposes the new transverse branch beside the obsolete structure. The interior is visibly dominated by overlapping old and new canopy geometry. None is a final visual pass, and the cameras are architectural inspections rather than registered photograph comparisons.

The candidate asset has **2,493,236 triangles**, **1,946 batches**, **465 materials**, and **127,358,644 runtime bytes**. The provisional texture allocation estimate remains 846.208 MiB. The integrated triangle increase includes the export pipeline's treatment of overlapping geometry; the standalone component count alone is not the full cost.

Chrome 153 on AC power, 1280×720, five seconds warmup and twenty seconds per view:

| View | Frame p95 before → after | GPU p95 before → after |
|---|---:|---:|
| Aerial | 18.3 → 18.4 ms | 14.98 → 14.74 ms |
| Western junction | 18.4 → 18.4 ms | 15.50 → 15.56 ms |
| Interior | 18.6 → 18.3 ms | 13.73 → 14.05 ms |

There were no browser errors, warnings, hidden frames, dropped queries or GPU timer disjoints. Isolated GPU maxima of 41.93 ms before and 42.52 ms after remain in the receipts without matching long frame intervals. This one diagnostic pair proves neither a performance improvement nor the full repeated-gameplay and twenty-minute audio/context-soak requirements.

## Current files and next step

The construction candidate is `station-central-interface-01`, served locally on port 4403 with an isolated database and worker log. The verified playable predecessor remains `station-east-clearance-01` on port 4402. No production change or deployment occurred.

Maintained tools: `rebuild-central-roof-interface.py`, `verify-central-interface.mjs`, and `compare-central-interface.mjs` in the reconstruction worktree. Its `STATE.md` records exact asset hashes and active inputs. The gallery includes construction, native controls, all authored-shot results, the failed trajectory analysis, runtime log and both capture receipts.

Next: resolve metric central/eastern Skyway placement and the municipal inner shell, rebuild the source-backed truss/support assembly, and remove the old roof as a coordinated change. The full long-term scope—fifteen registered views, materials and lighting, both plazas/streets, upper spaces, vegetation, evening appearance, gameplay, performance and packaging—remains active.

The gallery passes Chrome checks at 1440 and 390 px: six images, nine local evidence links, no missing images, overflow or browser errors. The desktop page was visually inspected.
