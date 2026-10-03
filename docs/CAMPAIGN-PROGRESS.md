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

**1 / 30 delivered.** Level 1, **First Bounce**, is on the west atrium floor.
Its 1.5 m target radius introduces aim and charge without a landing requirement.

| Level | Native solutions | Nearby full clears | Chrome |
| --- | --- | --- | --- |
| 1. First Bounce | 2 / 2, full translation and spin rest | 6 / 6: ±15° yaw, ±5° pitch, 2.0–3.6 m/s | First attempt cleared; overview, movement/home, hint, result and saved replay passed |

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

**Next: level 2**, a readable single wall bank inside the atrium. Start by scouting
the existing west frontage or ticket-gate structures and recording a native shot;
choose the target from an actual rebound. No new room or geometry is needed.

Before final acceptance, remove any remaining standalone retired-level probes
under `web/tests/` rather than adapting their old course IDs or routes.

The catalog is `web/starter-challenges.json`; reproducible inputs and tolerances
are `web/levels/proof-inputs.json`. Full native traces and Chrome receipts stay in
`.local/campaign/`, outside Git. A campaign is complete only when all 30 entries
have native and browser evidence and the combined menu, scoring, replays,
progression, creator flow and music have passed local checks.
