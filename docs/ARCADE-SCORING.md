# Kyoto Bounce: combo arcade update

The power gauge is 590 px wide on desktop and 36 px tall. Its primary number and tick labels show release speed in m/s. A full windup takes 2.8 seconds; speed increases evenly from 0.5 m/s to either 12 m/s (Precision) or 100 m/s (Robot). Press P or use the range buttons before winding up. Range locks at charge start, and server timing determines release speed without coarse power steps. The `robot-v4` rule creates fresh challenge revisions while preserving old boards and replays. Starter hints retain their previous launch speeds and select the appropriate range.

## Score

`10,000 × 1.75^banks × (1 + min(active seconds, 60) / 12) × landing accuracy`

- Each qualifying, distinct surface multiplies the combo by 1.75. Contacts need at least 1 m/s impact speed, 0.18 seconds between awarded banks, and 0.6 m separation. Repeated surfaces and a run of numbered stair/escalator treads count once. There is no five-bank cap.
- Active time counts trajectory segments moving at least 0.35 m/s. It tops out at ×6 after 60 active seconds. Slow creep, rest, and spinning in place do not add time.
- Banks and active time freeze at the first target entry. Further bounces can change the final landing but cannot farm the combo.
- A supported rest inside the target keeps 100%. Outside, accuracy falls linearly with distance from the usable target edge, including height. The falloff range is 35% of the start-to-target distance, clamped to 3–12 m. Outer rings mark 75%, 50%, 25%, and zero.
- Touching the target reserves at least 25% of the combo if the shot completes outside. A distant miss with no target visit earns zero. Required-route challenges still require that route. Recall and leaving the station forfeit the attempt.
- The final score is saved only after the native ball stops translating and rotating. Live numbers are provisional; there is no shot timer or early target finish.

A line with ten different banks and twelve active seconds can earn about 5.4 million points on a perfect landing. There is no gameplay score ceiling; only JavaScript's safe-integer storage limit applies.

## Presentation

The live HUD shows the growing combo, bank/time multipliers, landing percentage and provisional cash-out. Banks pop the number and surface name. First target entry turns the floor target and HUD green with a single expanding ring and a rising chord. Reduced-motion settings remove number scaling and ring expansion.

Sound effects are original synthesized layers: rolling/air texture, a throw whoosh, distinct stone/metal/glass impacts, ascending bank cues, target stingers and result chords. Major cues briefly lower the music. The existing sound/music switches remain independent.

New replays preserve the authoritative score timeline alongside their full-rate trajectory, so the combo is visible during playback. Scoring is versioned as `combo-v4`; upgrading creates new course revisions. Earlier revisions, scores and replay records are not rewritten or mixed into the new boards.

## Verification

- `node web/tests/scoring.mjs`: archived accuracy-v3 behavior and historical replay preservation.
- `node web/tests/combo-scoring.mjs`: million-point lines, rings, swept targets, anti-farming rules, live/final parity, and idempotent revision/hint migration.
- `node web/tests/combo-runtime.mjs`: actual native perfect/near/tag shots, full-rest completion, authoritative power timing, score timelines, replay parity and score-spoof rejection. Set `KYOTO_TEST_ORIGIN` to an isolated local server and `KYOTO_TEST_OUTPUT` for a separate receipt.
