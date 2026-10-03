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

**10 / 30 delivered.** Level 1, **First Bounce**, is on the west atrium floor.
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

**Next: author level 11**, opening the atrium bridges and balconies chapter.
Choose a visible fixed bank or gap on an existing public bridge; finish native
proof, nearby variations, Chrome playtesting and the local merge before level 12.

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

## Outstanding final checks

- The first cold Chrome view of Ticket Slalom had a 6.7-second render/main-thread
  stall and missed a short movement input. The warmed rerun passed. Cause is
  unprofiled; investigate cold level entry as part of the final stability check.
  The measured report is retained in the local browser directory's
  `cold-view-note.json`. Gameplay proof now waits for the view to finish drawing
  and retains loading/performance reports; that does not resolve the cold stall.

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
the batch task enters Play mode and exits after the test. This is a failing
40-second observation limit, never a gameplay finish timer.

The floor repair uses `prepare-atrium-grout.py` (Shapely 2.1+),
`build-atrium-grout.mjs` and `install-atrium-grout.py`, then the normal browser
exporter with `--only-object hall-bay-floor-surface` for the parent and candidate.
Use `verify-atrium-floor-fragments.py` if the parent uses equivalent alternate
triangulation. `install-atrium-grout-browser.mjs` replaces visible fragments while retaining
all other encoded geometry and textures. Selected exports still consider nearby
station objects when removing hidden overlaps. Use Blender's `--python-exit-code 1`
so a failed source/export assertion stops the workflow.
