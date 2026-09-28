# Escalator Relay: obstruction and inherited sensitivity

28 September 2026. [Route comparison, input table and native receipts](relay-diagnosis/index.html).

## What is established

The preceding courtyard layout clears all **seven original targets** twice with the displayed 5 m/s, 76.5° yaw, 0° pitch, −100 topspin input. Both attempts finish at complete translational and rotational rest. Its existing **+0.05° yaw neighbor fails**, hitting only target 1 and stopping on the west second-floor landing. The strict neighbor proof therefore exits with a failure; this is an inherited sensitivity, not a new hall regression.

On hall candidate05, target 6 retains its position and 0.5 m radius but needs the replacement floor ID. Target 7 lies over a moving escalator, so native placement rejects it. Temporarily selecting only the six supported targets verifies that the unchanged hint hits all six and then contacts the **western basement handrail at 37.111 s**, at native position approximately (−11.428, 0.578, 4.760). It eventually rests near (−11.211, 0.023, 4.549). Total path falls from **157.99 m to 143.43 m**.

The six-target selection is diagnostic only. It does not replace the original seven-target course, and its native success field must not be presented as a course repair. No canonical or private playable catalog was changed this turn. The preceding combined Locker Loop/Pillar Carom catalog remains the newest verified private catalog.

## Bounded input study

| Study | Trials | Result |
|---|---:|---|
| Unranked design routes, yaw 76.2–76.9° | 8 | All rest; routes diverge substantially. These are not target proofs. |
| Original six supported targets, selected yaw values 76.3–76.55° | 12 | Ten rest, one leaves the station, one times out. Only exact 76.5° collects all six. |
| Original six supported targets, small charge/spin changes | 8 | All rest; none collects all six. |
| Original seven-target course on preceding layout | 3 | Two authored hints clear; existing 76.55° neighbor fails. |

The charge study tests 4.99, 4.995, 5.005 and 5.01 m/s at original aim/spin. The spin study tests −99.9, −99.95, −100.05 and −100.1 at original speed/aim. These finite samples do not prove that another route is impossible or define a continuous failure interval.

Several trials reach B1, but they miss earlier targets. One unranked 76.3° shot rests at B1; the corresponding six-target diagnostic does not reach rest within the observation window. Moving-lane phase is not controlled in these diagnostic studies, so those two outcomes do not establish repeatability. Neither timeout nor recall counts as completion.

At 5.005 m/s, contact history already differs on `daikaidan-flight-04` around 3.16 seconds, well before the new basement architecture. The changed stair bounces then send the ball across a different part of Muromachi Square. This localizes that sampled sensitivity to the upper descent; it does not identify a physics-engine bug or justify changing the stair geometry.

**Use native waypoint-hit events for acceptance.** The replay's impact list omits some rolling contacts. Its nearest recorded impact can be outside a circle even when the native waypoint event confirms a valid hit. The diagnostic distance columns are therefore not success criteria.

## Next bounded revision

Develop a stable descent line first, preserving the course's upper start, successive public levels, seven target sizes and long relay character. Keep the source-derived wells and guards. If the final leg continues to B1, place its final circle on a fixed, fully validated floor; preserve comparable traversal length and explicitly document any necessary waypoint relocation. Do not move the last target just in front of the obstruction and call the shortened route preserved.

Before accepting a revision, require repeated native full seven-target clears, nearby-input trials and actual Chrome keyboard throws to complete physical rest. Separate the inherited upper-descent sensitivity from the new obstruction. Preserve failed trials and keep candidate definitions private until these checks pass.

## Scope

Native layout remains `47693cafa1aa635c6ceb88cedc1794a1d53fff612ba022661a4c5b6d986ff341`. Architecture, browser assets, physical materials, C#, scoring and active game definitions are unchanged. The new diagnostic script is `web/station/realism/probe-relay-routes.mjs` in the reconstruction worktree. All native sessions are isolated and create no production records.

Seven courses still require reconciliation. Gate/upper connections, B2 dimensions, final station/plaza/street materials and lighting, vegetation, registered architectural views and the complete-game Chrome/runtime/audio gates remain open. The reconstruction goal is active. Nothing was committed, pushed or deployed.
