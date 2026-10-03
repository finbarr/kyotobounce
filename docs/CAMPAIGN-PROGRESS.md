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

**4 / 30 delivered.** Level 1, **First Bounce**, is on the west atrium floor.
Its 1.5 m target radius introduces aim and charge without a landing requirement.

| Level | Native solutions | Nearby full clears | Chrome |
| --- | --- | --- | --- |
| 1. First Bounce | 2 / 2, full translation and spin rest | 6 / 6: ±15° yaw, ±5° pitch, 2.0–3.6 m/s | First attempt cleared; overview, movement/home, hint, result and saved replay passed |
| 2. Blue Wall Bank | 2 / 2, including a sharp wall rebound | 6 / 6: ±5° yaw, ±5° pitch, 7.5–8.5 m/s | First attempt cleared; visible wall patch, overview, hint and replay passed |
| 3. Clock In | 2 / 2, including the mounted clock rebound | 6 / 6: ±2° yaw, ±2° pitch, 11.5–12 m/s | Two first-attempt clears, identical 52,622-point solutions; overview and replay passed |
| 4. Ticket Slalom | 2 / 2, two distinct cabinet banks and sharp turns | 6 / 6: ±0.5° yaw/pitch, ±30 ms charge; every sample rested | First gameplay attempt cleared both targets; 66,621 points, overview and replay passed |

The suggested 2.8 m/s shot has a 28.3 m total native trajectory. All variation
runs settled naturally. The Chrome run saved 32,120 authoritative points; its
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
banked 43,565 points on its first attempt, with a 16.7 ms median frame time,
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

**Next: level 5**, an atrium glass-bank route with an optional landing bonus.
Use the existing glazing around the public basement opening, record a new shot,
and keep the finish zone generous enough to teach the bonus. This should finish
the introductory chapter before the campaign moves into the basement.

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
