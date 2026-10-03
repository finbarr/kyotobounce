# New station campaign

Target: exactly 30 new levels on the rebuilt station. Local development only;
do not deploy, publish asset packs or change production.

## Delivery rule

Finish one level before starting the next. Record a native route, choose readable
targets on its actual contact faces, write the brief and hint, repeat the solution
at full translation and spin rest, sample nearby inputs, then play it in Chrome.
Commit and merge the verified increment into local `main`.

Keep the architecture fixed unless a chosen level exposes a concrete blocker.
Use the current station bundle and one checkout. Retired levels and their fixtures
are replaced, with no compatibility or archival work.

## Current scoring

Waypoints now start at **×10**, then double to ×20, ×40, ×80…; each distinct
bank adds +0.5×. Zero-target shots retain their ×1 base and can still rank.
With equal movement and landing bonuses, eighteen banks match one waypoint.
The rule is `waypoint-v4`; retired scoring records do not mix with current scores.
The local native worker was rebuilt and the preview restarted for this version.

The first four courses passed fresh service checks for collection, full rest,
the new multiplier, authoritative replay parity and progression. A real zero-target
shot earned 16,379 points and ranked below a one-target clear at 111,978;
both saved replays reproduce their scores. Evidence is in
`.local/campaign/scoring-v4/balance.json`. Geometry and authored launch inputs
are unchanged, so the earlier native route/tolerance evidence still applies.

Chrome cleared First Bounce at 111,941 points with the visible ×10 component;
its result, saved replay, scrub and retry controls passed. The sampled median
frame time was 16.7 ms and no music steps were skipped during the shot. Receipt:
`.local/campaign/scoring-v4/opening-browser/result.json`.
Typecheck, unit tests and browser build passed. All runtime checks passed after
extending the garden test's observation window to allow natural rest beyond one
minute; no physics or finish condition was changed.

## Sequence

| Levels | Area | Teaching and challenge |
| --- | --- | --- |
| 1–5 | Atrium floor and ticket gates | Aim, charge, one bank, overhead structures |
| 6–10 | Basement glazing and public descents | Glass banks, lower landings, changes of height |
| 11–15 | Atrium bridges and connected balconies | Rail gaps, underpasses, longer banks |
| 16–20 | Grand staircase and gardens | Step rebounds, climbing arcs, terrace landings |
| 21–25 | Platforms and station-side public space | Canopies, columns, long sight lines |
| 26–30 | Connected station spaces and retained forecourt | Multi-bank and multi-level finales |

These are authoring areas, not placeholder courses. Route choices may change when
native shots show a better target or an unreliable interaction.

## Current increment

**28 / 30 delivered.** Level 1, **First Bounce**, is on the west atrium floor.
Its 1.5 m target radius introduces aim and charge without a landing requirement.

| Level | Native solutions | Nearby full clears | Chrome |
| --- | --- | --- | --- |
| 1. First Bounce | 2 / 2, full translation and spin rest | 6 / 6: ±15° yaw, ±5° pitch, 2.0–3.6 m/s | First attempt cleared; overview, movement/home, hint, result and saved replay passed |
| 2. Blue Wall Bank | 2 / 2, including a sharp wall rebound | 6 / 6: ±5° yaw, ±5° pitch, 7.5–8.5 m/s | First attempt cleared; visible wall patch, overview, hint and replay passed |
| 3. Clock In | 2 / 2, including the mounted clock rebound | 6 / 6: ±2° yaw, ±2° pitch, 11.5–12 m/s | Two first-attempt clears; overview and replay passed |
| 4. Ticket Slalom | 2 / 2, two distinct cabinet banks and sharp turns | 6 / 6: ±0.5° yaw/pitch, ±30 ms charge; every sample rested | First gameplay attempt cleared both targets; overview and replay passed |
| 5. Glass Return | 2 / 2, glass rebound and return landing bonus | 6 / 6: ±2° yaw/pitch, ±20 ms charge; every sample earned the bonus at full rest | First attempt earned the landing bonus; overview, saved replay, scrub and retry passed |
| 6. Basement Drop | 2 / 2, a 6.42 m descent from release to B1 | 6 / 6: ±3° yaw/pitch, ±60 ms charge; every sample rested | First attempt cleared; chapter selection, overview, hint, saved replay, scrub and retry passed |
| 7. Pier Pressure | 2 / 2, opposite pier banks with two sharp turns | 6 / 6: ±2° yaw/pitch, ±60 ms charge; every sample rested | First attempt cleared both targets; overview, hint, saved replay, scrub and retry passed |
| 8. Ceiling Skip | 2 / 2, ceiling rebound followed by a B1 floor hit | 6 / 6: ±2° yaw, ±1° pitch, 11.5–12 m/s; every sample rested | First attempt cleared; ceiling patch visible while aiming, overview and saved replay controls passed |
| 9. Upward Bound | 2 / 2, moving-step contact and a 4.91 m climb | 6 / 6: ±1° yaw/pitch, ±20 ms charge; 4 / 4 additional step phases; every sample rested upstairs | First attempt cleared; upward cutaway, hint, saved replay, scrub and retry passed |
| 10. Glass Loop | 2 / 2, back-wall and inside-glass targets with two sharp turns | 6 / 6: ±0.5° yaw, ±1° pitch, ±30 ms charge; every sample rested | First attempt cleared; both patches visible, overview, hint and saved replay controls passed |
| 11. Bridge Pinball | 2 / 2, opposite glass-pane banks above the ticket hall | 6 / 6: ±1° yaw/pitch, ±40 ms charge; every sample rested | First attempt cleared; chapter selection, unobstructed aiming, overview and replay controls passed |
| 12. Step Down | 2 / 2, sloping ceiling bank and 3.03 m drop to a stair tread | 6 / 6: ±1° yaw, ±0.5° pitch, 11.6–12 m/s; every sample rested | First attempt cleared; cutaway shows the start and both patches, replay and retry passed |
| 13. Terrace Triple | 2 / 2, ledge bounce, 8.85 m descent and return-wall bank | 6 / 6: ±0.25° yaw, ±0.5° pitch, ±12 ms charge; every sample rested | First attempt cleared all three targets; overview, hint, saved replay, scrub and retry passed |
| 14. Timber Turn | 2 / 2, timber and column banks with a return landing bonus | 6 / 6: ±0.5° yaw/pitch, ±20 ms charge; every sample earned the bonus at full rest | First attempt earned the landing bonus; visible timber patch, overview and saved replay controls passed |
| 15. Promenade Pinball | 2 / 2, glass and wall banks followed by a return floor patch | 6 / 6: ±0.5° yaw/pitch, ±15 ms charge in POWER; every sample rested | First attempt cleared all three targets; POWER hint, overview and saved replay controls passed |
| 16. Stair Skip | 2 / 2, marked stair tread and a 3.92 m descent onto Muromachi Square | 8 / 8: ±1° yaw/pitch, ±20 ms charge, ±10 backspin; every sample rested | First attempt cleared both targets; readable aiming labels, full spin hint, overview and saved replay controls passed |
| 17. Soft Landing | 2 / 2, uphill lob and full rest in the gold ring 2.62 m above the start | 6 / 6: ±1° yaw/pitch, ±15 ms charge; every sample earned the gold bonus | First attempt earned the bonus; overview, scout/return, complete spin hint and saved replay controls passed |
| 18. Garden Corner | 2 / 2, end-wall and glass banks followed by a floor patch | 6 / 6: ±1° yaw/pitch, ±30 ms charge; every sample rested in the upper approach | First attempt cleared all three targets; overview, hint, saved replay, scrub and retry passed |
| 19. Planter Skip | 2 / 2, low planter bank and return patch followed by full rest in the gold ring | 6 / 6: ±1° yaw/pitch, ±20 ms charge; every sample earned the bonus | First attempt earned the bonus; garden overview, visible patches, hint and saved replay controls passed |
| 20. Rooftop Circuit | 2 / 2, concrete and glass banks, outward/return floor patches and full rest on the garden level | 6 / 6: ±0.5° yaw/pitch, ±10 ms charge; every sample collected all four targets | First attempt cleared; four-target overview, complete hint, saved replay, scrub and retry passed |
| 21. Platform Zero | 2 / 2, canopy rebound, hanging-sign bank and return floor patch | 6 / 6: ±0.5° yaw, ±0.25° pitch, full charge minus 20/40 ms; every sample rested on the platform | First attempt cleared; chapter selection, visible canopy patch, overview, complete hint and saved replay controls passed |
| 22. Column Switchback | 2 / 2, narrow canopy-column and station-wall banks followed by a floor patch | 6 / 6: ±0.25° yaw/pitch, ±10 ms charge; every sample collected all targets and rested | First attempt cleared; overview, backspin hint, saved replay, scrub and retry passed |
| 23. Canopy Crossing | 2 / 2, both faces of the platform canopy followed by the track-bed patch below | 6 / 6: ±0.5° yaw, ±0.25° pitch, full charge minus 10/20 ms; every sample collected all targets and rested | First attempt cleared; overview, scouting above the roof, complete hint, saved replay, scrub and retry passed |
| 24. Platform Descent | 2 / 2, upper stair bank, sloping-roof rebound and platform patch 7.35 m below the start | 6 / 6: ±0.5° yaw, ±0.25° pitch, full charge minus 10/20 ms; every sample collected all targets and rested | First attempt cleared; stair overview, complete backspin hint, saved replay, scrub and retry passed |
| 25. Underpass Circuit | 2 / 2, ceiling, opposing walls and floor banks plus the gold landing | 6 / 6: ±1° yaw, ±0.5° pitch, full charge minus 20/40 ms; every sample collected all targets and landed at rest | First attempt cleared at 1,641,513 points; readable aiming marker, overview, movement/home, saved replay, scrub and retry passed |
| 26. Grand Descent | 2 / 2, stair landing, square, balcony and lower-passage targets across a 25.4 m descent | 6 / 6: ±0.5° yaw/pitch, full charge minus 10/20 ms; every sample collected all four targets and rested | First attempt cleared at 847,747 points; overview, full backspin hint, movement/home, saved replay, scrub and retry passed |
| 27. Skyway Circuit | 2 / 2, three glass banks and a final deck target in the high gallery | 6 / 6: ±0.25° yaw/pitch, full charge minus 10/20 ms; every sample collected all four targets and rested | First attempt cleared at 827,652 points; overview, readable glass patches, complete hint, movement/home, saved replay, scrub and retry passed |
| 28. Tower Return | 2 / 2, tower shaft bank and two return patches across the forecourt | 6 / 6: ±0.25° yaw/pitch, ±8 ms charge; every sample collected all three targets and rested | First attempt cleared at 412,889 points; tall-route overview, POWER hint, movement/home, saved replay, scrub and retry passed |

The suggested 2.8 m/s shot has a 28.3 m total native trajectory. All variation
runs settled naturally. The Chrome run saved an authoritative score; its
sampled median and p95 frame times were 16.7 ms, with 112 BPM music and no skipped
music steps. This is one local playthrough, not a station-wide performance claim.

Evidence: `.local/campaign/opening-proof/summary.json` and
`.local/campaign/opening-browser/result.json`, with screenshots in the latter
directory. Service checks passed score/replay parity, completion, recall,
fresh/returning entry and creator recording, tamper rejection and cancellation.
`npm run typecheck`, `npm test` and `npm run build:web` passed.

The proof runner and runtime tests now use the rebuilt station and new catalog.
Old campaign preservation checks, proof inputs and audit claims were replaced.

Level 2 uses a 0.65 m radius patch entirely on the existing blue west frontage.
The exact 8.0 m/s hint travels 59.0 m and settles after 29.46 seconds. Chrome
cleared it on the first attempt, with a 16.7 ms median frame time,
112 BPM music, no skipped music steps and no page errors. Native and browser
receipts are in `.local/campaign/blue-bank-proof/` and
`.local/campaign/blue-bank-browser/`. Returning-player and creator-return checks
also passed with the two-level catalog. No station geometry changed.

Level 3 targets the existing mounted clock with a 0.30 m radius patch. Full
precision charge and 50° elevation produce a 68.3 m route, ending at full rest
in the basement after 26.82 seconds. Evidence is in `.local/campaign/clock-proof/`
and `.local/campaign/clock-browser/`. Its first browser session reported one
skipped music step without a phase baseline; a focused rerun recorded zero during
charge/flight, 112 BPM and a 16.7 ms sampled median frame time. The browser proof
now records audio counters before each shot so loading/capture delays can be
distinguished from gameplay.

Level 4 uses opposite faces of the existing wide-lane cabinets, with 0.25 m and
0.20 m target radii. Its 8.0 m/s, slightly downward shot travels 27.7 m and rests
after 17.84 seconds. The neighboring shots rest within 16–21 seconds. Evidence:
`.local/campaign/ticket-slalom-proof/` and `.local/campaign/ticket-slalom-browser/`.
The successful Chrome run had 16.7 ms sampled median/p95 frames and no skipped
music steps during charge/flight. No geometry or physics changed.

Level 5 banks a 0.40 m patch on the western basement glazing and returns toward
a 2 m radius landing circle beside the start. The waypoint clears the course;
the landing adds an optional bonus. The 5.2 m/s, level, spin-free hint reaches
full rest in 23.48 seconds. All six nearby shots collect the waypoint and earn
the bonus within 22.82–23.97 seconds. The native solver checks the entire ball
fits inside the landing circle, rather than just its center.

Chrome cleared the course with the bonus on its first attempt. Sampled median
and p95 frame times were 16.7 and 16.8 ms, music stayed at 112 BPM with no skipped steps,
and there were no page errors. The overview now keeps numbered target badges
clear of the start and landing labels. Local service checks pass authoritative
scoring, bonus award, saved replay parity, progression and recall forfeiture.
Native, browser and service receipts are in `.local/campaign/glass-return/`.
Typecheck, unit tests and browser build pass. No station geometry changed.

Level 6 opens **Below the Glass** with a lob over the central oval glazing.
Its 0.65 m radius floor patch is 4.91 m below the launch pad. The 5.5 m/s hint
at 30° elevation clears the rim and reaches full translation and spin rest in
21.83 seconds. Both exact runs and all six neighbors clear; nearby rest times
range from 11.92–24.14 seconds. The proof also verifies the native trajectory
descends more than 6 m from release into B1.

The overview cutaway follows descents so the upper floor does not hide lower
targets; every target disk and the start remain below the cut plane. Native,
service and Chrome evidence is in `.local/campaign/basement-drop/`. The service
passes authoritative scoring, saved replay parity, completion and recall.
Chrome clears on its first attempt at 122,107 points; the final run has 16.7 ms
sampled median/p95 frames, 112 BPM music, zero skipped music steps and no page
errors. Typecheck, the portable suite, browser build and focused presentation
checks pass. No station geometry or physics changed.

Level 7 uses a 0.40 m patch on an inner B1 pier and a 0.25 m patch on the
opposite wall. Its 5.5 m/s, 10° upward shot banks the first face, bounces on the
aisle floor and collects the return patch. The exact hint reaches full rest in
10.33 seconds; all six neighbors collect both targets and rest in 10.34–11.11
seconds. Chrome clears first try at 216,011 points, with 16.7/16.8 ms sampled
median/p95 frames, 112 BPM music, no skipped steps and no page errors.
Service scoring/replay/progression/recall checks, typecheck, unit tests and the
browser build pass. Evidence: `.local/campaign/basement-bank/`.
No station geometry, physics or shared rendering changed for this increment.

Level 8 starts in the open northern B1 frontage. Its full precision shot at
35° elevation hits a 0.50 m ceiling patch, then a 0.65 m floor patch beneath the
central glass opening. The 30.0 m recorded route stays within the public
basement and reaches full rest in 19.27 seconds. Native proof explicitly checks
that upward motion reverses downward at the ceiling contact, as well as both
target hits and zero translation/spin at rest.

The flatter hint keeps the ceiling target visible above the power controls.
Chrome clears first try at 221,866 points with 16.7 ms sampled median/p95 frames,
112 BPM music, zero skipped steps and no page errors. Scoring, saved replay,
scrub, retry, progression and recall checks pass. Typecheck, unit tests and the
browser build pass. Receipts: `.local/campaign/ceiling-skip/`. Station geometry,
physics and browser presentation code are unchanged for this level.

Level 9 gently drops the ball onto the upward B1 escalator. Its level, spin-free
1.0 m/s hint collects a 0.25 m patch on the fixed upper exit plate and reaches
full rest in 30.99 seconds. Every proof checks actual qualifying contact with
the moving steps and a finish at least 4.8 m above the start. Four additional
shots sample quarter-cycle step phases; their measured release times are within
34 ms of the requested phases. All ten variations clear and rest in 29.06–31.85
seconds. A wider +2° pitch sample fell back into B1, so the verified pitch
tolerance is ±1°; the level hint explicitly calls for a level aim.

The overview cutaway now follows upward routes as well as descents, revealing
the lower starting pad and the upper target together. Chrome clears the final
version first try at 112,848 points, with 16.7/16.8 ms sampled median/p95 frames,
112 BPM music, zero skipped steps and no page errors. Authoritative scoring,
saved replay parity, completion and recall checks pass. Typecheck, unit tests,
the catalog check and browser build pass. Evidence: `.local/campaign/upward-bound/`.
No station geometry or physics changed.

Level 10 closes the basement chapter with a loop through an open frontage.
The 10.0 m/s shot at 15° elevation banks a 0.45 m back-wall patch, rebounds from
the side wall and collects a 0.40 m patch on the inside of the glass. It returns
to the aisle and reaches full rest in 13.42 seconds. All six nearby variations
collect both targets and rest in 12–15 seconds. Native proof checks two sharp
turns at the target contacts; the recorded route is 17.7 m long.

Chrome clears first try at 221,276 points. Both patches are visible above the
power controls, and the cutaway shows the open entrance and return bank.
The overview, hint, saved replay, scrub and retry pass, with zero skipped music
steps or page errors. Service scoring, replay parity, completion and recall,
typecheck, unit tests and browser build pass. Evidence:
`.local/campaign/basement-finale/`. No geometry, physics or browser code changed.

Level 11 opens **Above the Atrium** on the public glazed bridge at 9.59 m.
An 8.0 m/s shot at 10° elevation hits 0.40 m patches on opposite window panes,
then rolls into the connected west corridor. The recorded path is 49.6 m; the
exact hint rests in 30.82 seconds and all six neighbors rest in 25.39–32.26
seconds. Native proof confirms sharp turns at both glass contacts.

The narrow bridge pushed the aiming camera to 1.24 m from the robot, hiding the
target behind its body. The existing near-camera hiding threshold is now 1.6 m
while aiming. Chrome shows an unobstructed target and clears first try at 227,868
points; sampled median/p95 frames are 16.7/16.8 ms, with zero skipped music steps
and no page errors. A separate Chrome check retains the robot in the normal
atrium aiming view. Overview, chapter selection, saved replay, scrub and retry
pass. Service scoring/replay/completion/recall, typecheck, unit tests, focused
camera checks and browser build pass. Evidence: `.local/campaign/bridge-bank/`.
Station geometry and native physics are unchanged.

The shot recorder now rejects a placement on a different floor from the requested
start. For low ceilings, set `startRayHeight` below the ceiling; the bridge uses
2 m instead of the default 3 m. This keeps authoring on the public walking floor.

Level 12 uses the access stairs west of the glass bridge. Full precision power
at 10° elevation hits a 0.40 m patch on the sloping ceiling, then a 0.12 m patch
entirely within a lower stair tread. The hint rests on the steps in 5.38 seconds.
All six nearby shots collect both targets and rest in 5.31–24.52 seconds; some
continue onto the lower landing. Native proof checks the sharp ceiling bank
and a drop of more than 2.9 m from release.

Sloped-ceiling courses now use a cut along the ceiling face, a horizontal roof
cut and a steeper overview camera to expose the lower tread behind the stair
walls. The final Chrome run clears first try at 210,476 points, with zero skipped
music steps or page errors. Overview, hint, saved replay, scrub and retry pass.
Service scoring/replay/completion/recall, typecheck, unit tests, focused waypoint
presentation checks and browser build pass. Evidence: `.local/campaign/step-down/`.
Station geometry and native physics are unchanged.

Level 13 starts on the public west balcony at 7.35 m. Its 9.0 m/s arc hits a
0.40 m ledge patch, drops to a 0.80 m atrium-floor patch, then banks a 0.32 m
patch on the ticket-hall return wall. The exact hint rests in 22.48 seconds;
all six neighbors collect all three targets and rest in 22.33–22.91 seconds.
Native proof confirms the 8.85 m descent and a sharp turn at the wall.

The initial aim grazed terrace coping on one side, and ±20 ms charge missed
the small wall patch. The final hint is centered farther left, with a larger
wall target validated entirely on its native face. Its measured power tolerance
is ±12 ms, so this remains a precision challenge. The earlier sensitivity is
recorded in `.local/campaign/balcony-drop/sensitivity-note.json`.

Chrome clears first try at 417,177 points. The overview exposes all three target
patches and the drop into the hall. Movement/home, hint, saved replay, scrub and
retry pass; sampled median/p95 frames are 16.7/16.8 ms, with zero skipped music
steps and no page errors. Service scoring/replay/completion/recall, typecheck,
unit tests and browser build pass. Evidence: `.local/campaign/balcony-drop/`.
Station geometry and native physics are unchanged.

Level 14 uses the public Wood Square at 19.61 m. A level 8.0 m/s shot hits a
0.25 m patch on the triangular timber play structure, skips across the turf and
banks a 0.30 m patch on the column base. Its return roll finishes in a 0.75 m
gold circle. Both patches pass native face and ball-clearance validation. The
16.3 m recorded route rests in 11.93 seconds; all six neighbors collect both
targets, earn the landing bonus and rest in 11.86–12.04 seconds. Native proof
confirms sharp turns at both marked contacts.

Chrome earns the landing bonus first try at 431,143 points. The timber patch is
visible while aiming; the overview shows both targets and the return circle.
Movement/home, hint, saved replay, scrub and retry pass. Sampled median/p95
frames are 16.7/16.8 ms, with zero skipped music steps and no page errors.
Service scoring/replay/completion/recall, typecheck, unit tests and browser build
pass. Evidence: `.local/campaign/wood-square/`. Station geometry and native
physics are unchanged.

Level 15 finishes **Above the Atrium** on the third-floor promenade at 15.5 m.
It introduces the POWER range: 24.0 m/s at 8° down banks the parapet glazing,
crosses to the opposite wall and returns to a floor patch. Target radii are
0.40 m, 0.30 m and 0.80 m, validated on their native faces. The recorded route
is 45.5 m; the exact hint rests on the promenade in 24.62 seconds. All six
neighbors collect all targets and rest in 14.43–24.92 seconds. Both yaw samples
continue to the railway area after collecting the targets; the other samples
finish on the promenade. There is no destination requirement.

Chrome clears first try at 427,400 points. The POWER selector and white 24.0 m/s
mark match the hint, and the overview exposes all three patches. Movement/home,
saved replay, scrub and retry pass. Sampled median/p95 frames are 16.7/16.8 ms,
with zero skipped music steps and no page errors. Service scoring/replay/
completion/recall, typecheck, unit tests and browser build pass. Evidence:
`.local/campaign/promenade/`. Station geometry and native physics are unchanged.

Level 16 opens **Staircase & Gardens** on the first grand-staircase landing.
**Stair Skip** uses 4.5 m/s precision power, 14.5° downward aim and 80 backspin
to strike a 0.10 m tread patch, then a broad 1.0 m patch on Muromachi Square.
Both disks were validated on their native faces. The recorded route is 35.7 m,
with a 3.92 m descent from release to its lowest point. Both exact solutions
rest in 21.83 seconds; all eight variations collect both targets and rest in
21.63–21.95 seconds on the connected upper floor. There is no destination bonus.

Chrome clears first try at 217,116 points. The launch receipt confirms that H
applies yaw, pitch, backspin, sidespin and power range; the browser proof now
checks all five. Movement/home, overview, saved replay, scrub and retry pass.
Sampled median/p95 frames are 16.7/16.7 ms, with zero skipped music steps and
no page errors. Service score/replay/completion/recall, typecheck, unit tests and
browser build pass. Evidence: `.local/campaign/grand-staircase/`.

The downward aiming camera rises above the landing edge and leaves more room
below the reticle. Numbered waypoint labels also appear while aiming, so small
or edge-on surface patches remain identifiable. Tight camera views hide the
robot within 2.2 m. Exact contact disks, launch physics and station geometry are
unchanged. Chrome also confirms the open First Bounce view retains the robot,
while the tight Bridge Pinball view hides it and keeps the target and reticle
visible. Superseded stair candidates were removed after the final native
proof; only concise sensitivity notes remain.

Level 17, **Soft Landing**, climbs from the seventh to the wider eighth stair
landing. A 75° lob at 9.9 m/s precision power uses maximum backspin (−200) to
brake on the upper floor. The 0.50 m purple waypoint precedes a 0.70 m gold
finish ring; both are validated on `north-circulation-landing-08`. The recorded
route is 14.1 m. Both exact solutions stop in 10.03 seconds, and all six nearby
shots earn the bonus in 8.82–10.16 seconds. All finish on the upper landing,
2.62 m above the start. Station geometry and native physics are unchanged.

Chrome earns the gold bonus on its first attempt at 210,954 points. The overview exposes the
start, stair flight, waypoint and destination. The 75° launch view looks upward;
the hint explains using F to scout the landing first. Actual orbit, scout,
ascent and return controls expose both circles without changing yaw, pitch or
spin. Movement/home, the complete H hint, saved replay, scrub and retry pass.
Service checks confirm authoritative scoring, replay parity, completion and
recall forfeiture. Sampled median/p95 frames are 16.7/16.8 ms, with zero skipped
music steps and no page errors. Typecheck, unit tests and browser build pass. Evidence:
`.local/campaign/stair-rise/`.

The scouting recorder accepts `playbackRate: 2` to use the game's existing
fast-forward and shorten authoring waits. Native contact and rest rules remain
unchanged. Browser proof also checks scouting for steep lobs and waits for the
score's count-up animation before capturing the result. Superseded full traces
were removed; only concise sensitivity notes remain.

Level 18, **Garden Corner**, turns through the upper arrival balcony into the
garden approach. Its 8.0 m/s, 6° shot banks a 0.45 m end-wall patch and a 0.35 m
glass-guard patch, then crosses a 0.85 m floor target. The recorded route is
33 m. Both exact solutions stop in 21.41 seconds; all six neighbors collect
every target and rest in the upper approach in 21.06–21.65 seconds.

Chrome clears first try at 427,084 points. Overview, movement/home, complete
hint, saved replay, scrub and retry pass, with 16.7 ms sampled median/p95 frames,
zero skipped music steps during the shot and no page errors. Three steps were
skipped before charging, so cold transitions remain in the final stability audit.
Service scoring, replay parity, completion and recall checks pass. Typecheck,
unit tests and browser build pass. Evidence: `.local/campaign/garden-approach/`.
Station geometry, native physics and browser code are unchanged.

Level 19, **Planter Skip**, uses the rooftop garden's existing low planter wall.
A level, spin-free 6.0 m/s shot skips off the floor into a 0.16 m planter patch,
returns through a 0.55 m floor patch and rests in a 0.85 m gold ring. Its native
path is 11 m. Both exact solutions stop in 12.58 seconds; all six neighboring
shots collect both targets and earn the bonus in 12.17–12.98 seconds.

Chrome earns the bonus first try at 411,203 points. The overview and aiming view
show the targets among the benches and planting. Movement/home, complete hint,
saved replay, scrub and retry pass, with 16.7 ms sampled median/p95 frames,
zero skipped music steps and no page errors. Service scoring, replay parity,
completion and recall checks, typecheck, unit tests and browser build pass.
Evidence: `.local/campaign/garden-bench/`. Station geometry, native physics and
browser code are unchanged. The superseded lamp-grazing scout was replaced;
only a concise note remains.

Level 20, **Rooftop Circuit**, closes the garden chapter with four targets on the
southern public outlook. An 8.0 m/s, 24° shot banks 0.15 m concrete and 0.27 m
glass patches, then collects 0.80 m and 0.85 m floor patches before and after its
return from the existing enclosure. The recorded path is 34.4 m. Both exact
solutions stop in 18.63 seconds; all six neighbors collect every target and rest
on the garden level in 18.65–19.21 seconds.

The initial 16° route depended on a glass-sill contact: half-degree variations
missed targets or left the station. Raising the shot clears that sill. The final
proof retains the same aim tolerance and verifies sharp turns at both marked
wall contacts. Superseded traces were replaced, with concise rejection notes
kept locally. Station geometry and native physics are unchanged.

Chrome clears first try at 826,684 points. The overview locates all four targets;
movement/home, complete hint, saved replay, scrub and retry pass. Sampled
median/p95 frames are 16.7 ms, with zero skipped music steps and no page errors.
Service authoritative scoring, replay parity, completion and recall checks pass,
as do typecheck, unit tests and browser build. Evidence:
`.local/campaign/garden-finale/`. Browser code is unchanged.

Level 21, **Platform Zero**, opens **Platforms & Tracks** with an upward bank
into the canopy, a rebound from its hanging platform sign and a return floor
patch. Full 12 m/s precision power at 52° follows a 66.7 m native route. The
0.55 m canopy, 0.22 m sign and 0.85 m floor disks were validated on their actual
faces. Both exact solutions rest in 26.67 seconds; all six neighbors collect
every target and rest on the platform in 24.43–35.36 seconds.

Chrome clears first try at 422,605 points. Overview, movement/home, full hint,
saved replay, scrub and retry pass, with 16.7/16.8 ms sampled gameplay median/p95
frames, zero skipped music steps and no page errors. Initial loading still has
a 2.1-second main-thread task, retained for the final cold-start audit. Evidence:
`.local/campaign/platform-entry/`. The upward aiming view leaves more space for
canopy targets above the power meter; this adjustment tapers near vertical to
keep steep-lob reticles below the top controls. Launch inputs are unchanged.

The final camera check passes Soft Landing, Stair Skip, Ceiling Skip and First
Bounce with unchanged hint inputs and visible reticles clear of the controls.
Typecheck, unit tests, browser build and the full local runtime suite pass,
including authoritative scoring/replays, progression, recall, exploration and
creator recording, save and tamper rejection.

Level 22, **Column Switchback**, banks the narrow canopy column beside Platform
0, crosses back to the station wall, then collects a floor patch on its return.
The 7.0 m/s, 15° hint uses 100 backspin and follows a 43.7 m path. The column's
0.10 m target fits its 0.26 m face; the wall and floor patches have 0.45 m and
0.90 m radii. Both exact solutions stop in 26.96 seconds and make sharp turns
at both marked banks. All six neighboring shots clear in 26.81–26.99 seconds.

Chrome clears first try at 417,632 points. Overview, movement/home, the complete
backspin hint, saved replay, scrub and retry pass. Sampled gameplay median/p95
frames are 16.7 ms, with zero skipped music steps and no page errors. Initial
loading includes a 1.85-second main-thread task, retained in the browser receipt
for the final stability audit. Service checks pass authoritative scores, replay
parity, completion, leaderboard and recall. Typecheck, unit tests and browser
build pass. Evidence: `.local/campaign/platform-column/`.

The small column patch was covered by its own aiming label. Target labels now
sit above the contact point with a short leader line, keeping the painted disk
visible. Chrome checks pass on the column, stairs, basement ceiling and opening
course. Station geometry and native physics are unchanged. The superseded
low-angle scout was replaced with a concise local note.

Level 23, **Canopy Crossing**, clears the tracks, skips across both sloped faces
of the next platform canopy and drops onto a track-bed patch. The full 12 m/s,
55° hint follows a 49.0 m native path. Roof targets have 0.45 m and 0.65 m radii;
the lower target has a 1.0 m radius. Both exact solutions collect all three
targets and stop in 18.72 seconds. All six nearby shots clear and reach full
translation and spin rest in 17.41–34.29 seconds.

Chrome clears first try at 426,809 points. Overview, movement/home, the complete
hint, saved replay, scrub and retry pass. The roofs sit above the launch view;
F enters scouting and E gains height to inspect both marked roof faces before
returning to the unchanged launch. Sampled gameplay median/p95 frames are
16.7/16.8 ms, with zero skipped music steps and no page errors. The browser
receipt retains a 1.77-second loading task for the final cold-start audit.
Evidence: `.local/campaign/track-crossing/`.

Typecheck, unit tests, browser build and the full local runtime suite pass.
The runtime suite covers authoritative scoring, replay parity and completion
for First Bounce, Promenade Pinball and Canopy Crossing, plus recall forfeiture,
free exploration and creator recording, save, identical-shot proof, tamper
rejection and cancellation. No production data or assets were changed.

Level 24, **Platform Descent**, starts in the cross-station passage beside the
stairs to platforms 2/3. A downward throw banks off the marked upper tread,
rebounds from the sloping stairwell roof, then descends to the platform patch.
The full 12 m/s, −30° hint uses 80 backspin and follows a 67.0 m native path.
Targets have 0.13 m, 0.65 m and 1.5 m radii, each validated on its actual face.
Both exact shots reach full translation and spin rest in 33.42 seconds; all
six neighbors collect every target and rest in 33.06–34.73 seconds.

Chrome clears first try at 428,280 points. Overview, movement/home, the complete
backspin hint, saved replay, scrub and retry pass. Sampled gameplay median/p95
frames are 16.7 ms, with zero skipped music steps during the shot and no page
errors. Initial loading includes a 1.92-second main-thread task; one music step
was skipped before charging. These remain in the browser receipt for the final
cold-start audit. Evidence: `.local/campaign/platform-descent/`.

A separate Chrome scout check inspects the roof patch from below, clear of
the controls, then returns to the same launch inputs. Its screenshot and receipt
are in `roof-view/` under that evidence directory.

Typecheck, unit tests and browser build pass. Service checks pass authoritative
scoring, saved replay parity, completion, leaderboard and recall forfeiture.
The station geometry and physics are unchanged. Superseded scouts were reduced
to a small local note; the final candidate reuses the same proof directory and
station bundle.

Level 25, **Underpass Circuit**, completes the platform chapter in the public
passage beneath the tracks. A full 12 m/s throw at 40° banks off the ceiling,
east wall, floor and west wall, then settles in the gold ring. The native path
is 25.2 m. The four target radii are 0.40, 0.50, 0.65 and 0.60 m; the landing
radius is 1.5 m. Both exact proofs settle in 15.655 seconds, and all six nearby
inputs collect every waypoint and land in 15.41–15.86 seconds.

This route exposed an obsolete −5 m cutoff in service scoring: the native ball
completed the course, but its valid −6.2 m floor caused a zero-point forfeit.
The service now uses `StationLayout.FallLimitY()` supplied by the native worker.
For this station it is −18.0636 m. The same value drives live scoring and is
recorded in every new replay; the service rejects a mismatched native boundary.
Existing saved scores are preserved. A focused native regression checks a
separate floor at −30 m, its calculated −35.5 m boundary, full-rest completion,
escaped-ball cancellation and fallen-player recovery. Scoring regressions cover
basement points, replay parity, boundary crossings and client tampering.

The worker was rebuilt and the local preview restarted. Full runtime checks
pass First Bounce and Underpass Circuit scoring, replays, completion and recall,
plus exploration and creator recording, save, exact native proof and cancellation.
Typecheck, unit tests and browser build pass. No station geometry changed.

Chrome clears first try at 1,641,513 points: ×80 for four waypoints, +2× for four
banks, an 820,000-point landing bonus and 1,513 movement points. Overview,
movement/home, full hint, saved replay, scrub and retry pass. The ceiling label
now shifts above the aiming reticle while keeping its leader on the target.
The browser check asserts that visible target labels leave the reticle clear.
Sampled median/p95 frames are 16.7/16.8 ms, with zero skipped music steps and
no page errors. An initial 1.90-second main-thread task remains in the receipt
for the final cold-start audit. Evidence: `.local/campaign/underpass-circuit/`.
The eight native route proofs preceded the protocol-only rebuild; the rebuilt
worker repeated the exact route through both service and Chrome checks.

Level 26, **Grand Descent**, begins **Station Finales** on the seventh grand
staircase landing. A full 12 m/s throw at −15° with 80 backspin skips down the
stairs, crosses Muromachi Square and the balcony, then rebounds from the balcony
guard into the lower public passage. Its four floor targets span elevations
27.93, 15.61 and 7.35 m, with a 25.4 m drop from the starting landing. The native
route measures 112.3 m. Target radii are 0.40, 1.5, 1.0 and 2.0 m, all validated
on their actual supporting faces.

The launch is centered in the measured gap between the curved handrail posts.
Both exact proofs collect all four targets and reach full translation and spin
rest in 28.09 seconds. All six nearby inputs clear the same route and rest in
28.01–29.80 seconds. Evidence: `.local/campaign/grand-descent/proof/`.
Superseded scouts are condensed in `scout-notes.json`; only the current raw shot
and proof remain. The station geometry and native physics are unchanged.

Chrome clears first try at 847,747 points. The overview exposes all four targets
and the elevation change; movement/home, the complete hint, saved replay, scrub
and retry pass. Sampled final-flight median/p95 frames are 16.7 ms, with no
skipped music steps during charge or flight and no page errors. Three music
steps were skipped before charging, alongside a 2.18-second initial main-thread
task. Keep this receipt in the final cold-start audit; the first flight window
also includes two shorter tasks, peaking at 59 ms. Evidence:
`.local/campaign/grand-descent/browser/`.

A separate Chrome scout check inspects the first painted disk from above the
handrail, then returns to the unchanged launch position and complete hint.
The screenshot and receipt are in `landing-view/` under that evidence directory.

Typecheck, unit tests and browser build pass. Service checks confirm all four
targets, authoritative score/replay parity, full rest, completion, leaderboard
placement and recall forfeiture. One service check was interrupted by a verified
924-second laptop sleep; the same check passes with a scoped idle-sleep
assertion. Its interruption evidence is retained locally.

Level 27, **Skyway Circuit**, uses the glass gallery at elevation 45.08 m.
A full 12 m/s precision throw at 15.5° with no spin banks between the glass
walls, skips off the deck, collects a low return-glass patch and reaches the
final floor target. Its recorded route measures 37.8 m. The three glass
circles have radii 0.30, 0.30 and 0.10 m; the floor circle is 0.70 m.

Native placement validates each whole circle on its supporting face. The launch
and return patch are centered using measured contact positions, keeping the
route clear of mullions and the small patch between the rails. Both exact
proofs collect every target with three sharp glass rebounds and reach full
translation and spin rest in 27.14 seconds. All six neighboring inputs clear
and rest in 26.68–28.03 seconds. Superseded scouts are summarized in
`scout-notes.json`; current traces remain under
`.local/campaign/skyway-circuit/proof/`. Station geometry and physics are unchanged.

Chrome clears first try at 827,652 points. The overview, complete hint,
movement/home, saved replay, scrub and retry pass. A separate scout check
inspects the small third disk close up, then restores the unchanged launch
position and hint. Screenshots and receipts are under `browser/` and
`target-view/` in the same evidence directory.

Sampled final-flight median/p95 frames are 16.7 ms, with no skipped music steps
before or during the shot and no page errors. The performance receipt retains
a 2.25-second initial main-thread task and a 335 ms task in the window ending
during charging. All flight windows have no long tasks or playback underruns.
Include these startup/entry measurements in the final stability audit.

Typecheck, unit tests, browser build and the updated catalog check pass. Local
service checks pass all four targets, full rest, authoritative scoring,
independent saved-replay parity, completion, leaderboard placement and recall
forfeiture. The native proof hashes match the committed catalog and inputs.

Level 28, **Tower Return**, sends a 75 m/s POWER shot over the hotel onto
Kyoto Tower's shaft, 58.6 m above the launch pad. The rebound returns across
two forecourt patches. Its recorded route measures 226.0 m; the tower circle
has a 0.60 m radius and each paving circle has a 1.00 m radius.

Native placement validates each whole disk on its face. Both exact hints
collect all three targets and stop translating and spinning in 29.45 seconds.
All six nearby inputs clear and rest in 29.25–32.06 seconds. Evidence is under
`.local/campaign/tower-return/`. Geometry and native physics are unchanged.

The overview now fits complete target disks between its heading, controls and
leaderboard, and projects labels from the constrained camera position. A steep
intermediate bank gets a sloping cutaway that removes foreground roofs.
Chrome checks every current course at 1440×900 and 1280×720; the final cutaway
is also inspected on Tower Return and Skyway Circuit. Geometry tests cover
the complete disk rims at desktop, laptop and portrait aspect ratios.

Chrome clears at 412,889 points with all three targets, full rest and independent
saved-replay score parity. The overview, complete hint, movement/home, replay,
scrub and retry pass. No music steps are skipped before or during the shot;
sampled final-flight median/p95 frames are 16.7/16.8 ms, with no page errors.
The performance receipt retains a 2.00-second initial main-thread task and a
53 ms task in the window ending during charging. Flight windows have no long
tasks or playback underruns. Cold entry remains part of the final audit.

Typecheck, unit tests, browser build and catalog checks pass. Local service
checks pass target collection, authoritative score/replay parity, full rest,
completion, leaderboard placement and recall forfeiture. Proof hashes match
the current catalog and inputs.

**Next: author level 29**, continuing the finale chapter in the existing
connected station spaces and retained forecourt. Finish its native proof,
nearby variations, Chrome playtesting and local merge before the next level.

## Floor repair

Ticket Slalom's long-running shot was reproduced in the production native solver
at 1,824.5 ms charge. The 1 cm paving joints had backing 2 mm below the tiles;
alternating tile-edge contacts prevented sustained support. The repaired floor
has a closed, continuous exterior, flush grout and the same basement openings.
Its buried tile walls are removed. Physics and finish rules are unchanged.

The editable source, native mesh and selected browser export match. Existing
texture coordinates are transferred from the source, and all unrelated encoded
browser geometry and textures are retained. Four alternate browser triangles
cover the same 0.543286 m² region within 2 μm; the fragment audit records that
comparison. The current bundle replaces the candidate, with no extra station copy.

- All 81 charges from 1,824–1,834 ms in 0.125 ms steps reach zero velocity and
  spin in 16.16–20.55 seconds, including both reproduced failures.
- All four levels pass two exact hints and six neighbors each: 32 full clears.
  Current hint rest times are 20.78, 30.96, 26.85 and 19.61 seconds respectively.
- Chrome clears Ticket Slalom on its first attempt in 19.61 seconds at 226,900
  points with ×20 from its two waypoints. Replay, scrub, retry and movement pass;
  sampled median frame time is 16.7 ms, with zero skipped music steps or page errors.
- Local service checks pass all four courses' authoritative scores, saved replays,
  progression and recall forfeiture. Creator recording, save, identical-shot clear
  with destination, tamper rejection and cancellation also pass.
- Typecheck, unit tests, browser build and the final Unity editor regression pass.

Geometry/source/rest receipts are in
`.local/v2/current/receipts/atrium-floor-grout/`; native routes are in
`.local/campaign/grout-proof/` and Chrome evidence in `.local/campaign/grout-browser/`.
These rest checks supersede the earlier authoring timings above.

## Railway-base precision repair

The rejected Wood Square scout exposed a second rest fault under the tracks:
the small ball could penetrate a flat railway-base triangle and receive a
tilted recovery normal. The original 1,826 ms charge reproduced the failure;
centering the mesh alone still failed at 1,827 ms. The collider now uses local
coordinates and bisects long edges to at most 8 m. Only the railway base is
refined, from 128 to 26,700 collision triangles. Its visible shape, authored
faces, openings and material remain unchanged. The source comparison checks
every triangle's containment, winding and area. This follows the
[PhysX guidance on large triangles](https://nvidia-omniverse.github.io/PhysX/physx/5.1.3/docs/Geometry.html#triangle-meshes).

- All 81 charges from 1,824–1,834 ms in 0.125 ms steps reach zero translation
  and spin in 12.18–47.28 seconds. An 80-second observation window allows the
  longer rolling routes to finish naturally; timeouts still fail.
- The rebuilt worker independently repeats the two reproduced cases at exact
  1,826 and 1,827 ms inputs. Both settle on the railway base in 16.40 and 29.44
  seconds, with zero and two overlap recoveries respectively.
- All prior 20 levels have matching native hint receipts; none of those exact
  routes contacts the changed base. The complete catalog audit remains due
  after level 30.

Evidence is in `.local/campaign/platform-entry/rest-final.json`,
`railway-worker-summary.json` and `prior-route-scope.json`. The native worker
was rebuilt and the isolated preview restarted. Ball forces, damping and finish
conditions are unchanged; no station asset copies were created.

## Canopy contact repair

Canopy Crossing exposed a missed waypoint on the platform 2/3 roof. The ball
touched inside the disk, but the native collision normal was 11.01° away from
the authored face and failed the normal-alignment check. The exact launch is
retained in `web/levels/canopy-contact.json`.

The same mesh refinement now applies to the two roof panels. Their 24 source
triangles become 3,896 collision triangles, with a maximum edge of 5.88 m. The
geometry verifier checks containment, winding and area against the original
faces. Visible geometry and target sizes remain unchanged. Beams and braces
are excluded by the roof-role filter.

The focused regression passes: the inside contact is within 0.02° of the face,
and the shot stops translating and spinning. The worker was rebuilt and the
preview restarted. Both exact course shots and all six nearby inputs now
collect every target and reach full rest. Evidence is under
`.local/campaign/track-crossing/`, including `contact-baseline.json`,
`contact-refined.json` and the current `proof/` receipts.

The prior-course audit checked 182 native shots across all 22 earlier levels.
Only Promenade Pinball touched these roof panels. Its two exact shots and six
neighbors pass again on the rebuilt worker, collecting all three targets and
reaching full rest in 14.43–24.99 seconds. The scope receipt is
`prior-route-scope.json`; refreshed routes are in
`.local/campaign/promenade/proof/`.

## Outstanding final checks

- The first cold Chrome view of Ticket Slalom had a 6.7-second render/main-thread
  stall and missed a short movement input. The warmed rerun passed. Cause is
  unprofiled; investigate cold level entry as part of the final stability check.
  The measured report is retained in the local browser directory's
  `cold-view-note.json`. Gameplay proof now waits for the view to finish drawing
  and retains loading/performance reports; that does not resolve the cold stall.
- One Step Down overview run recorded 14 skipped music steps before charging,
  with a 4.28-second maximum scheduler gap. Its shot had no skipped steps, and
  the final run had none throughout. The cause remains unprofiled; include
  sloped-ceiling cutaway transitions in the final stability pass. Receipt:
  `.local/campaign/step-down/cold-view-note.json`.
- One Soft Landing camera check timed out after 120 seconds during startup
  while a separate native proof worker was running. Service telemetry showed
  loading with zero rendered frames. The same check succeeded once the native
  proof ended; cause is unproven, and the first helper did not retain browser
  errors. Include cold startup and resource contention in the final stability
  audit. Receipt: `.local/campaign/stair-rise/startup-note.json`.

Before final acceptance, remove any remaining standalone retired-level probes
under `web/tests/` rather than adapting their old course IDs or routes.

The catalog is `web/starter-challenges.json`; reproducible inputs and tolerances
are `web/levels/proof-inputs.json`. Full native traces and Chrome receipts stay in
`.local/campaign/`, outside Git. A campaign is complete only when all 30 entries
have native and browser evidence and the combined menu, scoring, replays,
progression, creator flow and music have passed local checks.

## Floor regression workflow

The focused rest fixture is `web/levels/ticket-slalom-rest.json`. Run
`Kyoto.Editor.BatchTasks.CampaignRest` through Unity batch mode with `KYOTO_LAYOUT`,
`KYOTO_REST_INPUT` and `KYOTO_REST_REPORT` set to absolute paths. Omit `-quit`;
the batch task enters Play mode and exits after the test. This defaults to a failing
40-second observation limit, never a gameplay finish timer.

The floor repair uses `prepare-atrium-grout.py` (Shapely 2.1+),
`build-atrium-grout.mjs` and `install-atrium-grout.py`, then the normal browser
exporter with `--only-object hall-bay-floor-surface` for the parent and candidate.
Use `verify-atrium-floor-fragments.py` if the parent uses equivalent alternate
triangulation. `install-atrium-grout-browser.mjs` replaces visible fragments while retaining
all other encoded geometry and textures. Selected exports still consider nearby
station objects when removing hidden overlaps. Use Blender's `--python-exit-code 1`
so a failed source/export assertion stops the workflow.
