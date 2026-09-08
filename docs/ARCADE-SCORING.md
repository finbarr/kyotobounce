# Kyoto Bounce scoring

The compact power control is at most 360 px wide, with a 12 px meter. Its primary number and tick labels show release speed in m/s. A full windup takes 2.8 seconds; speed increases evenly from 0.5 m/s to either 12 m/s (Precision) or 100 m/s (Robot). Press P or use the range buttons before winding up. Range locks at charge start, and server timing determines release speed without coarse power steps. The `robot-v4` rule creates fresh challenge revisions while preserving old boards and replays. Starter hints retain their previous launch speeds and select the appropriate range.

## Classic courses (`combo-v5`)

`10,000 × 1.75^banks × (1 + min(active seconds, 60) / 12) × landing accuracy`

- Each qualifying, distinct surface multiplies the combo by 1.75. Contacts need at least 1 m/s impact speed, 0.18 seconds between awarded banks, and 0.6 m separation. Repeated surfaces and a run of numbered stair/escalator treads count once. There is no five-bank cap.
- Active time counts authoritative trajectory segments that translate or rotate, including slow rolling and spinning in place. It continues after target entry until physical rest, and tops out at ×6 after 60 active seconds. Stationary rest-dwell segments add no time.
- Banks freeze at the first target entry. Further movement continues earning time and can change the final landing, but cannot add banks.
- A supported rest inside the target keeps 100%. Outside, accuracy falls linearly with distance from the usable target edge, including height. The falloff range is 35% of the start-to-target distance, clamped to 3–12 m. Outer rings mark 75%, 50%, 25%, and zero.
- Touching the target reserves at least 25% of the combo if the shot completes outside. A distant miss with no target visit earns zero. Required-route challenges still require that route. Recall and leaving the station forfeit the attempt.
- The final score is saved only after the native ball stops translating and rotating. Live numbers are provisional; there is no shot timer or early target finish.

A line with ten different banks and twelve active seconds can earn about 5.4 million points on a perfect landing. There is no gameplay score ceiling; only JavaScript's safe-integer storage limit applies.

## Waypoint courses (`waypoint-v1`)

New courses can contain up to 32 optional waypoints and at most one optional destination. At least one target is required. Waypoints can sit on fixed floors, walls or ceilings; moving surfaces require a future anchored-target format. The native worker validates the entire circular patch and records actual contacts with its face, including slow rolling contacts. Each waypoint scores once, in any order, with no streak timeout.

The first waypoint adds 10,000 base points, the second 20,000, the third 40,000, and so on. After `W` hits, the base is `10,000 × (2^W − 1)`. Multiply it by the same distinct-bank and active-time factors as classic courses. Banks continue throughout a waypoint shot, including after destination entry. The protocol's `waypointMultiplier = 2^W` describes the **next** waypoint award.

A supported rest in the optional destination adds a bonus equal to the multiplied waypoint score, or the multiplied 10,000 base when no waypoint was hit. Missing the destination preserves every earned waypoint point. A positive target score completes the course; destination completion is recorded separately. Recall, leaving the station and a missed required route still forfeit. Completion always waits for translation and spin to stop. Scores saturate only at JavaScript's safe-integer storage limit.

This family coexists with classic courses; it never rewrites their revisions, boards or archived replay bytes. New results include authoritative `personalBest` and `courseBest` flags for strict improvements on the exact course revision; ties and zero scores do not trigger a record. See [the waypoint specification](WAYPOINT-SCORING.md) for editor and presentation acceptance.

## Presentation

The live HUD shows the growing combo, bank/time multipliers, landing percentage and provisional cash-out. Banks pop the number and surface name. First target entry turns the floor target and HUD green with a single expanding ring and a rising chord. Reduced-motion settings remove number scaling and ring expansion.

Ball heat follows the versioned earned score: gold glow at100,000 points, orange fire at1million, white-lavender jackpot fire at10million. The three-draw-call effect uses a fixed72-particle pool, preserves physical size/spin marks and adds no dynamic lights. Reduced motion and slow frames retain the color/halo while disabling animated fire and embers. Recall, course changes and backward replay scrubs reset the effect.

Sound effects are original synthesized layers: rolling/air texture, a throw whoosh, distinct stone/metal/glass impacts, ascending bank cues, target stingers and result chords. Major cues briefly lower the music. The existing sound/music switches remain independent.

New replays preserve the authoritative score timeline alongside their full-rate trajectory, so the combo is visible during playback. Scoring is versioned as `combo-v5`; upgrading creates new course revisions. Earlier revisions, scores and replay records are not rewritten or mixed into the new boards. Archived `combo-v4` retains its original first-entry timer freeze and 0.35 m/s threshold when rescored.

## Verification

- `node web/tests/scoring.mjs`: archived accuracy-v3 behavior and historical replay preservation.
- `node web/tests/combo-scoring.mjs`: million-point lines, rings, swept targets, anti-farming rules, live/final parity, and idempotent revision/hint migration.
- `node web/tests/combo-runtime.mjs`: actual native perfect/near/tag shots, full-rest completion, authoritative power timing, score timelines, replay parity and score-spoof rejection. Set `KYOTO_TEST_ORIGIN` to an isolated local server and `KYOTO_TEST_OUTPUT` for a separate receipt.

- `node web/tests/waypoint-scoring.mjs`: waypoint arithmetic, destination retention/bonus, once-only awards, capability gating, strict records and version isolation.
- `node web/tests/waypoint-runtime.mjs` and `node web/tests/waypoint-oriented-runtime.mjs`: rebuilt native floor/wall/ceiling, slow contacts, misses, full rest, recall and replay parity on an isolated server.
