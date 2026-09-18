# Kyoto Bounce scoring

Only scoring actions build a combo. Translating flight and rolling add **100 points per second**, linearly and outside every multiplier. Time at rest and spinning in place add nothing. Every shot that settles inside the station can bank its score, including a zero-target shot. Time alone cannot clear a course. The native ball still finishes only when translation and rotation stop; recall forfeits.

## Classic courses (`combo-v7`)

`10,000 × (1 + 0.5 × banks) × landing accuracy + movement points`

Each qualifying distinct surface adds +0.5× to the combo, independent of impact speed above the qualification threshold. Contacts need at least 1 m/s impact speed, 0.18 seconds between awarded banks and 0.6 m separation. Repeated surfaces and numbered stair/escalator treads count once. Banks freeze at first target entry.

Supported rest inside the target keeps 100%. Outside, accuracy falls linearly with distance from the usable target edge, including height. The falloff range is 35% of start-to-target distance, clamped to 3–12 m. A target visit secures at least 25% if the completed shot finishes outside. Distant untagged misses still bank movement points. Required routes affect course completion, not score eligibility.

## Waypoint courses (`waypoint-v3`)

Courses have up to 32 required waypoints and at most one optional destination; at least one target is required. Native contact with a waypoint's actual face collects it once, in any order. Waypoints can occupy fixed floors, walls and ceilings. One contact in an overlap collects every matching waypoint once; two collected waypoints produce ×4, or 40,000 target points before bank credit. The outer edge of each drawn ring matches its scoring radius.

The combined multiplier is **`2^W + 0.5 × B`**, where `W` is collected waypoints and `B` is qualifying distinct banks. Even with zero waypoints (×1), target points are **`10,000 × combined multiplier`**. This replaces the cumulative 10k/20k/40k award sum. Each waypoint doubles only the waypoint component; bank credit is always additive and never gets doubled by later waypoints. Order does not affect the final multiplier.

Example: waypoint → bank → waypoint → bank → bank → waypoint gives **2× → 2.5× → 4.5× → 5× → 5.5× → 9.5×**, or 95,000 target points. Three waypoints alone earn 80,000; three banks add 15,000 regardless of when they occurred. Twelve banks in classic mode produce 7×, instead of an exponential surface chain.

Banks can continue throughout waypoint shots, including after destination entry. `waypointMultiplier` is the current `2^W` component, `bankBonus` is `0.5 × B`, and `comboMultiplier` is their sum. `waypointBase` contains target points before bank credit; `bankMultiplier` is the surface-only `1 + bankBonus`, never a factor applied to waypoint points.

Supported rest in the destination adds a bonus equal to the target score. Missing targets preserves earned points: **every shot that settles inside the station ranks**, even with zero waypoint hits. Zero waypoints start at 10,000; banks add 5,000 each; movement adds 100 per second. A destination-only landing doubles its target score too.

Course completion is separate: every waypoint is needed for an all-clear and progression; a destination-only course needs a landing. A required route contact still applies to completion. Partial and zero-target shots retain their replay, score and overall rank. Recall or leaving the station forfeits all points. Only JavaScript's safe-integer storage limit caps the score.

Movement time is measured from consecutive authoritative 180 Hz positions, excluding numerical drift below 0.001 m/s. Fractional seconds accrue individual points (`floor(movingSeconds × 100)`). The bonus continues while the ball translates after a target hit, is added after landing accuracy and the destination bonus, and is forfeited on recall or leaving the station.

The server calculates live frames and final results from the same native records. Clients cannot submit a score. The game is pre-launch: current partial and complete records remain valid; retired station/course records are discarded. Courses keep their current IDs and revisions; no legacy scoring implementation or migration is retained.

## Launch position

Every level permits walking and throwing anywhere in the station. The cream-and-navy checkered START pad marks the spawn and suggested launch position, not a movement or scoring boundary. The Start button returns the robot to it. All shots still belong to the selected course and use its targets and leaderboard; moving farther away can create longer, more inventive bank shots. There is no separate free-exploration mode. Walking itself awards no points.

## Presentation

The current level’s top ten stays visible while aiming, flying, scouting, viewing the course and watching results. Your entries have teal backgrounds, matched by player ID rather than name. The board retains your latest shot rank below the top ten; before a shot it shows your best off-board placement. Custom courses have stable `/level/<id>` URLs and copy-link controls; the link opens the current saved revision.

A named trick chain links banks and waypoints. Earned score fills a special meter and changes the ball through these stages:

| Score | Stage | Ball effect |
| ---: | --- | --- |
| 25,000 | Spark | Mint glow and sparks |
| 100,000 | Gold Rush | Gold comet trail |
| 350,000 | On Fire | Orange fire flowing behind the ball |
| 1,000,000 | Thunderball | Electric blue with orbiting rings |
| 5,000,000 | Hyperdrive | Magenta plasma and multicolored sparks |
| 20,000,000 | Mega Jackpot | Cycling rainbow energy |

The HUD shows the combined multiplier and its separate waypoint and bank components. Bank popups show +0.50×; waypoint popups show the new combined multiplier. New banks, waypoints, target entry and earned stage changes trigger score stamps, medal/shard bursts, edge light chases and short original synthesized stingers. Repeated state frames and landing-accuracy changes produce no fanfares. Audio varies melody, rhythm and timbre within a bounded register. Particles and flame activity subside during uneventful rolling; the earned color remains.

The world effect uses a fixed 128-particle pool and at most six draw calls, without dynamic lights or changing physical ball size/spin marks. Screen medals use one canvas and a fixed 180-particle pool. Simultaneous collections show a double or multi-target popup even when they also trigger a heat stage. Reduced motion keeps color and text while removing bursts, orbiting effects and number scaling. Slow frames suppress animated world effects. Recall, course changes and backward replay scrubs reset presentation.

Visual references: the named trick chain, special meter and italic score in [THPS2 gameplay](https://www.mobygames.com/game/2575/tony-hawks-pro-skater-2/screenshots/dreamcast/35031/); the mechanical rings, colored multiplier plaques, light chases and medal payout of [WINNING THE MEGA JACKPOT!!!](https://www.youtube.com/watch?v=i0OnmhhFk9g). All game graphics and audio are original code, with no copied media.

## Verification

`npm test` checks scoring arithmetic, linear movement, rest/spin exclusion, unmultiplied bonuses, once-only contacts, live/final parity, action-only feedback and bounded heat lifecycle. `npm run test:runtime` exercises the native worker, true rest, target collection, authoritative score/replay parity and rejection of forged scores. Visible effects also require a real browser check.
