# Kyoto Bounce v2: continuous improvement, one completed task at a time

## User direction — 28 September 2026

Continue over a long period with no overall time cap or single-milestone endpoint. Keep the useful station artwork, source geometry, research and export tools. Work forward, finish the current task, commit it, update the playable v2 build, and then move to the next task. Before/after presentations and routine approval checkpoints are not required.

All existing levels are disposable, including targets, hints, starts, progression and the private Locker/Pillar repairs. They impose no constraints on v2 architecture. Stop investigating or repairing their failures. Design fresh levels around completed areas later.

This supersedes the previous iteration pilot and the old plan's course-preservation requirements, time limits and repair queues. It does not authorize deleting production scores or deploying changes. The replacement goal is active.

## Replacement goal

Continuously improve Kyoto Bounce v2’s station and surroundings to match real life more closely, using research to guide each focused task; finish, test, commit, and merge each improvement into the playable main build before starting the next, reusing one checkout, removing superseded generated assets, and preserving smooth gameplay and reliable physics.

## Working loop

1. **Choose one task.** Select the highest-value next improvement from the current playable build and the short queue. State its area/files, concrete outcome and relevant checks. Keep tasks small enough to finish independently: one architectural connection, one material group, one usable route or one new level. Avoid an open-ended task such as “finish the station.”
2. **Stay on that task until done.** Investigate, implement, inspect the actual result and resolve failures caused by the change. Do not start a different feature or turn incidental findings into a parallel project. Put unrelated findings in the queue. A required dependency becomes part of the current task; use the smallest adequate solution. If genuinely blocked on external access or user input, report the specific blocker rather than calling the task finished.
3. **Deliver the finished task.** Integrate it into the local playable v2 build, run the relevant checks, commit its source changes, merge the completed task into local `main`, and identify the matching private generated assets. Keep the preview accessible with a stable launch command or local URL. A component that exists only in an isolated study is not a delivered improvement.
4. **Report briefly and continue.** Give the commit, what improved, where it can be played, and any material limitation. Then choose the next task without waiting for routine approval. User messages steer the ongoing work.

No scheduled end-of-batch review or elapsed-time stop is required. This is an ongoing goal; a completed task is a delivery, not completion of the entire goal. Continue until the user stops or redirects the work, or an actual external blocker prevents progress.

## First task

Establish a playable local v2 foundation from the best existing reconstruction, initially using the eastern courtyard/NIWA area as an accessible spawn. Reuse the existing game engine, saved artwork and compatible native worker.

Remove old levels/progression from the v2 entry flow and provide free exploration with walking, throwing and recall. Use separate local v2 data while developing. Keep the current published game/data untouched until an explicitly authorized release. Preserve required engine behavior without preserving old level fixtures or migration compatibility.

Done when the build opens directly into the v2 experience, the improved station is visible, the player can walk and throw through complete physical rest, recall works, and relevant browser/runtime checks pass. Commit and deliver that foundation before starting further station improvements.

## Delivered foundation

The first task is integrated in the local v2 build. `npm run dev:v2` uses the latest complete gate bank02 station, courtyard spawn, free walking/throwing/recall and a separate database. Asset identities are in `web/v2/assets.json`; launch instructions and verification commands are in `docs/LOCAL_PLAY.md`. Native and Chrome play-loop checks pass. The next task is the first courtyard/café improvement below.

## Subsequent priorities

Latest delivery: [Kotetsu shopfront](notes/KOTETSU-FRONTAGE-V2.md) replaces shop 3’s solid placeholder with a photo-guided timber and metal frontage, original tiger screen, ticket terminal and usable doorway. Native doorway/aisle walks, saved-source correspondence and Chrome gameplay pass. Continue with the neighboring shopfront; the deeper dining room remains unfinished.

The [restaurant entrance directories](notes/RESTAURANT-DISPLAYS-V2.md) add two framed displays with all ten current operator-listed shop names. The doorway stays clear and the artwork is integrated into the editable source. Continue with the interior shop frontage and photographed menu/display fittings.

The [restaurant practical lighting](notes/RESTAURANT-LIGHTING-V2.md) connects seven existing aisle fixtures to the two-light pool. Warm light reveals the floor and nearby walls while the active light count stays fixed. Source and runtime checks pass. Next, build the entrance menu/display frontage from the saved photograph, with current operator information where text is needed.

The [restaurant charcoal tile floor](notes/RESTAURANT-FLOOR-V2.md) adds narrow joints, material variation and a single local reflection capture. The collision geometry is unchanged; native gameplay and Chrome controls pass. Continue with the entrance frontage and the interior practical fixtures visible in the saved photograph.

The [restaurant entrance lantern frame](notes/RESTAURANT-ENTRY-FRAME-V2.md) adds the photographed cream diffusers, dark crossbars and kickplates. Six native doorway walks and Chrome views pass. Its source is integrated into the same editable station.

The western interior landing, Muromachi Square, fourteen Grand
Stairway flights, northern banks, southern approach, restaurant and central
Skyway are integrated into the current editable scene and playable bundle.
Native route checks pass in both directions; source correspondence, Chrome
controls and core gameplay checks pass. Evidence and remaining modeling limits
are in [WESTERN-UPPER-CONNECTION-V2.md](notes/WESTERN-UPPER-CONNECTION-V2.md).
Continue with the new upper route's finishes and lighting, inspecting exposed
approach edges and railings before adding small decorations.

Maintain a short ordered queue. Prefer visible impact, confidence in the evidence and low integration cost. Initial priorities after the foundation:

- Finish conspicuous courtyard/café material, lighting and architectural joins using the existing work.
- Refine the connected western route's materials, lighting and source-supported edge details.
- Improve the central hall/gate passage as connected, usable architecture.
- Complete canopy/Skyway connections, then north and south approaches in focused tasks.
- Introduce fresh v2 levels as individual areas become stable and interesting to play; develop navigation/progression around those new levels.
- Continue materials, lighting, planting, frontage detail, atmosphere and performance improvements across the station and immediate surroundings.

This queue can be reordered between tasks. It is not permission to abandon the task in progress. The entire station and both plazas remain the long-term ambition, but unfinished distant areas do not prevent delivering a completed local improvement.

## Keep iteration inexpensive

- Start with the existing research and assets. Research only questions that materially affect the current task. If evidence remains ambiguous, record a plausible approximation once and continue where it is safe and visually credible; do not present inference as measurement.
- Settle large forms and connections before polishing tiny fixtures. Refine camera calibration only when it changes a meaningful modeling decision. No required before/after pairs, comparison galleries or presentation packages. Inspect the current result in a real browser; retain screenshots only when useful for diagnosis or a brief update.
- Preview changed components against cached station context. Reuse loaders/exporters before building infrastructure. Measure tool latency and remove repeated full-scene work from the inner loop where practical. Full exports belong at integration checkpoints, not every small edit.
- Cache checks of unchanged sources by content hash. Preserve necessary provenance, visual/collision correspondence and asset identity without repeating exhaustive hash sweeps or exactness reports for unrelated content.
- Track time spent in research, editing, export, verification and infrastructure at a useful coarse level. If one step repeatedly dominates, fix or avoid that specific cost within the task; do not start an open-ended tooling rewrite. Timing informs efficiency, not a deadline for abandoning unfinished work.
- Work locally with the existing graphics setup. Do not restart GPU procurement, remote fleets or delegation without a new user instruction.

## Required behavior and proportionate checks

Old course placement checks, authored trajectories, progression and level-specific acceptance tests are retired v2 requirements. Remove obsolete expectations as the v2 flow/catalog replaces them. Do not reshape the station, tune hints or relocate old targets to keep them passing.

Preserve the core engine invariants: authoritative outcomes, a shot finishing only after translation AND spin stop, recall forfeiture, and matching visible/colliding geometry for traversable and ball-contact surfaces. Small decorative details can remain noncolliding where appropriate.

Run the repository's required checks for the files changed. Keep core runtime tests, replace obsolete level fixtures with v2 fixtures, and avoid record-creating production tests. Rebuild/restart the native worker for C# changes; geometry-only tasks can reuse a compatible worker.

For each delivery, inspect the actual local game in Chrome and exercise the affected behavior: movement/camera, throwing/rest/recall, and changed escalators or collision boundaries. Use repeatable frame-time samples at fixed resolution and check music for stalls when rendering/audio changes warrant it. Reuse valid unchanged checks. Fix reproducible regressions introduced by the task. Reserve broad v2 campaign and long performance/audio soak checks for release candidates; short checks are not full-release acceptance.

## Commits, assets and publication

Make a bounded local commit for each completed task, with a concise explanation and validation. Keep original art and generated binaries/media out of Git as required by `docs/ASSETS.md`; record the current asset manifest/hash and retain the editable source. Keep the current bundle in `.local/v2/current/` and at most one temporary candidate. After the candidate passes, promote it and remove superseded full-scene exports, layouts and compiled builds. Keep original research, editable sources and small build receipts. Git holds source history; do not retain a full station export per commit. Merge each completed task into local `main` before beginning another. Reuse a suitable checkout; archive finished worktrees after preserving their required ignored assets and stopping their services.

This retention rule also covers diagnostic copies such as `layout-used.json`, `probe-layout.json` and `preview.glb`, and graphical checkpoint builds under `artifacts/`. Moving them to an evidence folder does not make them necessary history. Retain the small report and source identity; remove the large superseded input/export once the current result is verified. Check checkout disk usage at delivery so duplication is caught during the task that creates it.

“Deliver” means an integrated, checked, locally playable improvement and its commit. Local merges are authorized by the user’s iteration workflow. Push and production deployment require their own authorization. Do not pause for permission to continue ordinary implementation and local delivery within this goal.
