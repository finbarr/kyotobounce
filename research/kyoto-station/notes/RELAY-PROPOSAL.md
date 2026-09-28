# Escalator Relay: a feasible B1 line, still too sensitive

28 September 2026. [Route diagrams, actual Chrome screenshots and receipts](relay-proposal/index.html).

## Outcome

A private seven-target proposal completes the long descent to B1 twice with its exact authored input. It is **not accepted**: all three nearby-input checks fail, and a real Chrome keyboard throw collects only the first target. The existing game and latest verified private catalog are unchanged.

The proposal retains the original upper start, the exact first target, all seven target radii, scoring rules, allowed controls and sequence of public levels. Targets 2–6 move within their original levels, onto natively validated surfaces. The last target moves off the invalid moving escalator onto a fixed B1 floor. The measured path is **172.97 m**, compared with the original **157.99 m**; the descent gains about 4.91 m. This avoids shortening the route just to stop before the handrail.

Suggested speed stays 5 m/s, yaw 76.5°, pitch 0° and side spin zero. Topspin changes from −100 to +150. The private campaign text names B1, and its displayed distance becomes 173.0 m. The new line is a proposal for the same long relay, not proof that all aspects of difficulty are unchanged.

## Placement changes

| Target | Change in center | Surface / level |
|---|---|---|
| 1 | Unchanged | Upper landing |
| 2 | Approximately 1.34 m, mostly sideways | Muromachi Square, same level |
| 3 | Approximately 4.78 m | West 2F landing, same level |
| 4 | Approximately 2.56 m | West 2F landing, same level |
| 5 | Approximately 2.57 m | West 2F landing, same level |
| 6 | Approximately 0.22 m | Replacement hall floor, Y=0 |
| 7 | From (−4.37, 0, 5.74) to (7.78, −4.914, 7.09) | Fixed B1 floor |

The west-platform targets remain separated by more than 6 m. Every circle keeps its original ID, normal and radius. The complete seven-target challenge passes native selection. Full-circle placement rejected earlier B1 contact points; the accepted final position is a later fixed-floor contact, not an arbitrary endpoint.

## Native and actual-browser evidence

The two exact throws collect all seven targets and finish at complete translational and rotational rest after 42.676 s. The unchanged service scoring functions compute 1,344,207 points for each saved native trace. These offline evaluations create no score records.

- Yaw 76.55° collects targets 1 and 7 only.
- Speed 5.02 m/s collects target 1 only.
- Speed 4.98 m/s collects target 1 only.
- Chrome's normal H/Space sequence launches at **5.0133348 m/s** and collects target 1 only. It rests on the west 2F landing after 27.434 s, with zero linear and angular velocity. Its partial 52,681-point result is saved only in the isolated local test database. A saved partial score is not a completed course.

The browser loads the complete matching candidate05 geometry and all moving-lane metadata at 1280×720. No browser script error occurred. This is a gameplay check, not a frame-time benchmark, registered architectural comparison or visual acceptance.

## A verifier correction

The new native verifier initially asserted the worker's `success` flag. For these waypoint-only courses, that flag attests to reaching a destination; there is no destination circle. The service computes route completion from authoritative waypoint IDs and its own scoring functions.

The verifier now uses those existing functions. The original report and raw traces are preserved; `corrected-summary.json` re-evaluates their hashes, seven target hits, rest evidence and authoritative scoring without rerunning physics. The exact hints clear; the neighbors still fail. No physics, scoring or acceptance threshold changed to convert the failures into passes.

## Other bounded trials

Twelve unranked design trials tested reduced backspin (0, −25, −50, −75), a steeper −30° launch at 9.5–10.1 m/s, and forward spin (+50, +100, +150, +200). Some lines reach the concourse or B1; others stop upstairs. They are diagnostic traces, not additional course clears. The +150 route supplied this concrete seven-target proposal.

## Artifacts and remaining work

Worktree artifacts: `relay-route-proposal-01`, `relay-route-proof-01`, `relay-browser-01` and the stopped `runtime-relay-01` server workspace. Tools: `prepare-relay-route.mjs`, `prove-relay-route.mjs`, `verify-relay-browser.mjs`, and the expanded `probe-relay-routes.mjs`. All live native, server and Chrome processes started for this check are closed.

Further course tuning must address the unstable upper descent before this proposal can become playable. Keep it separate from `pillar-approach-02`, the latest verified private catalog containing Locker Loop and Pillar Carom. Do not install the rejected relay into the active game.

The gate, adjoining upper architecture and B2 connections also remain unfinished. Complete their source registration and geometry before finalizing routes that depend on them; the current Pillar line itself requires revalidation when gate geometry changes. This reconstruction work can advance while the unaccepted relay remains an explicit integration task. All seven unresolved courses remain required before final gameplay acceptance.

No architecture, native C#, physical material, scoring rule, active game definition or production data changed. The complete station, plazas, street frontages, materials, light, vegetation, fifteen reference views and Chrome/runtime/audio gates remain in scope. The reconstruction goal is active; nothing was committed, pushed or deployed.
