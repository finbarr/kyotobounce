# Kyoto Bounce v2: continuous improvement, one completed task at a time

## User direction — 28 September 2026

Continue over a long period with no overall time cap or single-milestone endpoint. Keep the useful station artwork, source geometry, research and export tools. Work forward, finish the current task, commit it, update the playable v2 build, and then move to the next task. Before/after presentations and routine approval checkpoints are not required.

All existing levels are disposable, including targets, hints, starts, progression and the private Locker/Pillar repairs. They impose no constraints on v2 architecture. Stop investigating or repairing their failures. Design fresh levels around completed areas later.

This supersedes the previous iteration pilot and the old plan's course-preservation requirements, time limits and repair queues. It does not authorize deleting production scores or deploying changes. The replacement goal is active.

## Replacement goal

Continuously develop Kyoto Bounce v2 from the best existing station reconstruction, finishing one focused improvement at a time, committing it and updating the playable v2 build before starting the next, discarding all existing levels as constraints and creating new ones around the improved station while preserving reliable movement, ball physics, audio and Chrome performance, following `research/kyoto-station/V2-ITERATION-PLAN.md` without an overall time cap, before/after presentations or routine review pauses.

## Working loop

1. **Choose one task.** Select the highest-value next improvement from the current playable build and the short queue. State its area/files, concrete outcome and relevant checks. Keep tasks small enough to finish independently: one architectural connection, one material group, one usable route or one new level. Avoid an open-ended task such as “finish the station.”
2. **Stay on that task until done.** Investigate, implement, inspect the actual result and resolve failures caused by the change. Do not start a different feature or turn incidental findings into a parallel project. Put unrelated findings in the queue. A required dependency becomes part of the current task; use the smallest adequate solution. If genuinely blocked on external access or user input, report the specific blocker rather than calling the task finished.
3. **Deliver the finished task.** Integrate it into the local playable v2 build, run the relevant checks, commit its source changes and identify the matching private generated assets. Keep the preview accessible with a stable launch command or local URL. A component that exists only in an isolated study is not a delivered improvement.
4. **Report briefly and continue.** Give the commit, what improved, where it can be played, and any material limitation. Then choose the next task without waiting for routine approval. User messages steer the ongoing work.

No scheduled end-of-batch review or elapsed-time stop is required. This is an ongoing goal; a completed task is a delivery, not completion of the entire goal. Continue until the user stops or redirects the work, or an actual external blocker prevents progress.

## First task

Establish a playable local v2 foundation from the best existing reconstruction, initially using the eastern courtyard/NIWA area as an accessible spawn. Reuse the existing game engine, saved artwork and compatible native worker.

Remove old levels/progression from the v2 entry flow and provide free exploration with walking, throwing and recall. Use separate local v2 data while developing. Keep the current published game/data untouched until an explicitly authorized release. Preserve required engine behavior without preserving old level fixtures or migration compatibility.

Done when the build opens directly into the v2 experience, the improved station is visible, the player can walk and throw through complete physical rest, recall works, and relevant browser/runtime checks pass. Commit and deliver that foundation before starting further station improvements.

## Delivered foundation

The first task is integrated in the local v2 build. `npm run dev:v2` uses the latest complete gate bank02 station, courtyard spawn, free walking/throwing/recall and a separate database. Asset identities are in `web/v2/assets.json`; launch instructions and verification commands are in `docs/LOCAL_PLAY.md`. Native and Chrome play-loop checks pass. The next task is the first courtyard/café improvement below.

## Subsequent priorities

Maintain a short ordered queue. Prefer visible impact, confidence in the evidence and low integration cost. Initial priorities after the foundation:

- Finish conspicuous courtyard/café material, lighting and architectural joins using the existing work.
- Correct the source-supported western landing/escalator discrepancy and its public connections, without considering retired course targets.
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

Make a bounded local commit for each completed task, with a concise explanation and validation. Keep original art and generated binaries/media out of Git as required by `docs/ASSETS.md`; record the current asset manifest/hash and retain the editable source. Keep one clear current v2 candidate and the last working checkpoint, rather than accumulating a new complete project copy for every tiny experiment.

“Deliver” means an integrated, checked, locally playable improvement and its commit. Push, merge and production deployment require their own authorization. Do not pause for permission to continue ordinary implementation and local delivery within this goal.
