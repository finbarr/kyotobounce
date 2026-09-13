# Kyoto Bounce scoring

Only scoring actions build a combo. Elapsed time, airtime, rolling and spin add no points or multiplier. The native ball still finishes only when translation and rotation stop; recall forfeits.

## Classic courses (`combo-v6`)

`10,000 × 1.75^banks × landing accuracy`

Each qualifying distinct surface multiplies the combo by 1.75. Contacts need at least 1 m/s impact speed, 0.18 seconds between awarded banks and 0.6 m separation. Repeated surfaces and numbered stair/escalator treads count once. Banks freeze at first target entry.

Supported rest inside the target keeps 100%. Outside, accuracy falls linearly with distance from the usable target edge, including height. The falloff range is 35% of start-to-target distance, clamped to 3–12 m. A target visit secures at least 25% if the completed shot finishes outside. Required routes still apply; distant untagged misses score zero.

## Waypoint courses (`waypoint-v2`)

Courses have up to 32 optional waypoints and at most one optional destination; at least one target is required. Native contact with a waypoint's actual face collects it once, in any order. Waypoints can occupy fixed floors, walls and ceilings.

Each new waypoint doubles the next award: 10,000, 20,000, 40,000… After `W` hits, base points are `10,000 × (2^W − 1)`. Multiply by `1.75^banks`. Banks can continue throughout the shot, including after destination entry. The protocol's `waypointMultiplier = 2^W` describes the next award; hit celebrations show half that value, the award just earned.

Supported rest in the destination adds a bonus equal to the multiplied waypoint score, or the multiplied 10,000 base if no waypoint was collected. Missing it preserves waypoint points. A positive target score completes the course. Recall, leaving the station and missing a required route forfeit. Only JavaScript's safe-integer storage limit caps the score.

The server calculates live frames and final results from the same native records. Clients cannot submit a score. Pre-launch rule changes discard retired development courses, boards and replays; only the current rules remain.

## Presentation

A named trick chain links banks and waypoints. Earned score fills a special meter and changes the ball through these stages:

| Score | Stage | Ball effect |
| ---: | --- | --- |
| 25,000 | Spark | Mint glow and sparks |
| 100,000 | Gold Rush | Gold comet trail |
| 350,000 | On Fire | Orange fire flowing behind the ball |
| 1,000,000 | Thunderball | Electric blue with orbiting rings |
| 5,000,000 | Hyperdrive | Magenta plasma and multicolored sparks |
| 20,000,000 | Mega Jackpot | Cycling rainbow energy |

New banks, waypoints, target entry and earned stage changes trigger score stamps, medal/shard bursts, edge light chases and short original synthesized stingers. Repeated state frames and landing-accuracy changes produce no fanfares. Audio varies melody, rhythm and timbre within a bounded register. Particles and flame activity subside during uneventful rolling; the earned color remains.

The world effect uses a fixed 128-particle pool and at most six draw calls, without dynamic lights or changing physical ball size/spin marks. Screen medals use one canvas and a fixed 180-particle pool. Reduced motion keeps color and text while removing bursts, orbiting effects and number scaling. Slow frames suppress animated world effects. Recall, course changes and backward replay scrubs reset presentation.

Visual references: the named trick chain, special meter and italic score in [THPS2 gameplay](https://www.mobygames.com/game/2575/tony-hawks-pro-skater-2/screenshots/dreamcast/35031/); the mechanical rings, colored multiplier plaques, light chases and medal payout of [WINNING THE MEGA JACKPOT!!!](https://www.youtube.com/watch?v=i0OnmhhFk9g). All game graphics and audio are original code, with no copied media.

## Verification

`npm test` checks scoring arithmetic, no time/rolling/spin farming, once-only contacts, live/final parity, action-only feedback and bounded heat lifecycle. `npm run test:runtime` exercises the native worker, true rest, target collection, authoritative score/replay parity and rejection of forged scores. Visible effects also require a real browser check.
