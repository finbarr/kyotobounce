# Gameplay fixes

Requested 2026-09-15. Planning only: the reports below are not yet reproduced or diagnosed. This queue covers five items and does not resume older station or feature backlogs.

## Todo

- [ ] **1. Reliable success and next-level navigation.** Reproduce successful shots where the Next level button disappears and Space charges another shot on the same level. Trace authoritative completion, result display, course ordering, and keyboard priority. Every successful campaign result with a following level must visibly offer Next level; clicking it, Space, and N must advance exactly once. Holding Space for fast-forward before completion must not accidentally advance or charge a new shot. Keep retry intentional through R. Give the final campaign level and custom levels an explicit completion/navigation action rather than silently hiding progression. Verify success without a new personal best or top-ten score, and after retries and level changes.

- [ ] **2. Safe rapid recalls and retries.** Reproduce throw → repeated R → immediately charge again, including recalls during release and while the previous trajectory is arriving. Trace delayed commands, shot messages, timers, animation and camera state. Repeated recall must be harmless; discarded shots must not move the camera, animate the ball, restore old results, or interrupt the new charge. Test rapid taps, held R, delayed responses and repeated sequences. Preserve immediate retry responsiveness.

- [ ] **3. Diagnose degradation over many throws.** Measure before changing cleanup code: compare frame-time percentiles, long frames, retained browser memory, render resource counts, and server/native memory and timing over at least 100 throws after warmup, including rapid recalls and level changes. Inspect shot buffers, replay data, effects, audio, event listeners and timers for accumulation. Distinguish expected bounded caching, garbage collection, rendering cost and network/server stalls. Fix demonstrated causes, then repeat the same workload and report before/after measurements. Completion requires no unbounded per-shot retention and no progressive slowdown in the measured workload, not merely forcing garbage collection or lowering visual quality.

- [ ] **4. Correct aim and camera on level entry.** On first entry, Next level, and manual selection, initialize the robot's orientation and the camera from that level's H suggested aim. The reticle and view must be correct before any mouse movement or H press. Clear stale orbit, charge and playback state when changing levels; camera collision handling must still keep the robot visible. Verify after a manually orbited shot, a rapid recall and returning from a replay. Use a sensible target-facing fallback for courses without a hint.

- [ ] **5. Improve the opening level sequence.** Audit the opening campaign in gameplay, including actual camera clearance. Start with a simple shot outside the store in an open station area, with clear targets and generous visibility. Progress through basic aiming and charge control, an easy bank, then more constrained interiors and trickier routes. Reorder or replace opening courses as needed; update numbering, first-time entry and progression consistently. Verify every changed course's suggested shot against native physics, including required waypoints and any required destination. Keep only the current course definitions and avoid historical compatibility scaffolding.

## Verification and completion

- Use one isolated worktree, local service port, database and worker log. No extra agents or machines are required by this queue.
- Reproduce and record the failures first; suspected races and leaks remain hypotheses until measured.
- Test the complete loop in a real browser: enter level → charge → recall rapidly → charge again → finish successfully → Space to next level. Check desktop and mobile result/button layouts.
- Run the relevant regression tests and browser build. Run typecheck and the service suite for service changes, and the isolated runtime suite for physics/protocol/scoring integration. Rebuild the native worker before testing any C# edits.
- Retain authoritative scoring and the rule that a shot ends only when translation and spin stop. Recall forfeits. Do not hide these bugs with timed completion or reduced graphics quality.
- Mark each item complete with reproduction, fix and verification evidence; report any remaining limitations. Deployment requires the user's authorization and must be followed by read-only production checks, without production test scores.

## Goal to send back

Fix and verify all five items in docs/GAMEPLAY-FIX-QUEUE.md, then deploy the completed fixes to production.
