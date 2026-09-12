# Kyoto campaign

The campaign contains 30 stages in six chapters, with five stages per chapter. Suggested route length rises from 6.9 m to 274 m. Routes range from a short convenience-store delivery to garden ricochets, stair cascades, an enclosed Skyway run and throws across the station.

`web/starter-challenges.json` is the complete current station campaign. The service replaces retired station-authored definitions and their scores at startup. Unchanged campaign scores and player-created courses survive. There are no archived development campaigns or compatibility catalogs.

## Progression

All stages are available immediately. The chapter selector shows five numbered stages at a time; player-created courses have their own entry. Completing a stage keeps the existing Space-to-advance behavior, including chapter boundaries. Every stage has a brief, an overview and an H-key aim/charge hint.

The distance label is the measured length of the suggested native trajectory, including vertical travel, banks and returns. It is not the straight-line distance to the destination, which the overview reports separately. Difficulty labels describe the authored progression, not a measured human success rate.

| Stage | Chapter | Course | Suggested route | Waypoints |
| --- | --- | --- | ---: | ---: |
| 01 | First Departures | Snack Run | 6.9 m | 2 |
| 02 | First Departures | Exact Change | 15.8 m | 2 |
| 03 | First Departures | Ticket Trick | 16.3 m | 2 |
| 04 | First Departures | First Bank | 18.3 m | 0 |
| 05 | First Departures | Terrace Turnaround | 18.3 m | 2 |
| 06 | Local Connections | Platform Drift | 20.8 m | 3 |
| 07 | Local Connections | Lost and Found | 21.1 m | 3 |
| 08 | Local Connections | Information Exchange | 25.8 m | 3 |
| 09 | Local Connections | Garden Party | 26.2 m | 3 |
| 10 | Local Connections | Window Shopping | 30.4 m | 3 |
| 11 | Banking on Kyoto | Double Step | 30.6 m | 4 |
| 12 | Banking on Kyoto | Locker Loop | 36.1 m | 4 |
| 13 | Banking on Kyoto | Under the Café | 36.4 m | 4 |
| 14 | Banking on Kyoto | Sky Garden Shuffle | 37.3 m | 4 |
| 15 | Banking on Kyoto | Concourse Cruiser | 49.6 m | 4 |
| 16 | The Grand Climb | East Square Encore | 59 m | 5 |
| 17 | The Grand Climb | Café Delivery | 64.7 m | 5 |
| 18 | The Grand Climb | Three Flights Down | 81.6 m | 6 |
| 19 | The Grand Climb | Balcony Express | 108.7 m | 5 |
| 20 | The Grand Climb | Grand Stair Fever | 114.2 m | 5 |
| 21 | Cross-Station Express | Skyway Speedway | 122.4 m | 6 |
| 22 | Cross-Station Express | Staircase Jackpot | 124.4 m | 5 |
| 23 | Cross-Station Express | Upper Deck Tumble | 146.3 m | 4 |
| 24 | Cross-Station Express | Last Order | 149.6 m | 2 |
| 25 | Cross-Station Express | Escalator Relay | 156.1 m | 7 |
| 26 | Jackpot Finale | Thirteen and Counting | 167.4 m | 4 |
| 27 | Jackpot Finale | Sculpture Square Slingshot | 180.7 m | 6 |
| 28 | Jackpot Finale | Roof-to-Terrace Special | 190.6 m | 3 |
| 29 | Jackpot Finale | East-to-West Ricochet | 195.8 m | 8 |
| 30 | Jackpot Finale | The Kyoto Grand Slam | 274 m | 8 |

## Targets and physics

Twenty-nine stages use optional waypoint chains. Each waypoint scores once, in any order. Destinations are optional bonuses; a destination miss keeps earned waypoint points. First Bank retains the classic landing-accuracy introduction. The later stages reward longer chains, narrower surfaces, multi-level routes and precise delivery through the shop doorway. Two stair cascades retain an early landing checkpoint so a small aiming error can still bank a partial score.

All starts and targets are checked against the native collision model. A level changes only the start, targets and suggested input. It does not add catch planes, magnetic targets, special friction, forced stops or level-specific physics. A shot must stop translating and spinning before its score locks; recall forfeits.

The store delivery uses the existing modeled 2F convenience store at the west gallery, not a new storefront. Its doorway, shelves, ceiling and collision stay intact. Station source registration remains in `web/levels/konbini-registration.json` and the canonical layout.

The overview cuts above the highest target by 1.8 m so low shop ceilings do not cover indoor targets. Numbered purple guides keep distant patches legible through station geometry. Connecting dashes indicate the target sequence, not a predicted flight path; waypoints remain optional and unordered.

## Verification

The campaign uses collision `b304c84aa1292e9e401c4abde9d305f754548d3b815fba8137802c9a2a385515`, physics `kyoto-p3-2`, throw model `robot-v4` and capability `waypoint-v1`. Scene assets and native collision were not changed in this campaign.

`web/levels/proof-inputs.json` pairs every current course with two repeated suggested shots and one nearby aim. The native proof requires all suggested waypoints, positive completion for neighboring shots, and full physical rest. Optional destination results are reported separately. A timeout or a ball leaving the station fails the proof.

`npm test` checks campaign completeness, progression, hints, target data and replacement of the previous catalog. `npm run test:runtime` checks authoritative scores and saved replay parity on an isolated local service, including shop, garden, Skyway and finale routes. Browser verification covers the real chapter selector, stage overviews, visible hints and custom-course access. See `web/levels/README.md` for reproduction.

The final local acceptance covered 90 passing native shots: 60 suggested shots and 30 nearby positive completions. The ticket-machine patch and two cascade checkpoints were adjusted and rechecked. The isolated service also passed classic scoring regressions plus shop, garden, Skyway and finale score/replay checks. Browser checks covered all six chapters, custom-course access, hints and short/long overviews. In-app mouse capture was unavailable, so these results do not claim a manual browser playthrough of every stage. The campaign has not been deployed.
