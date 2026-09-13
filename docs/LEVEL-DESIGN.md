# Kyoto campaign

The campaign contains 30 stages in six chapters, with five stages per chapter. Suggested route length rises from 6.9 m to 270.7 m. Ten routes focus on wall and ceiling ricochets: inside the convenience store, around garden corners, across Skyway glass, under the gallery and down from the roof. They mix with deliveries, stair cascades and cross-station throws.

`web/starter-challenges.json` is the complete current station campaign. The service replaces retired station-authored definitions and their scores at startup. Unchanged campaign scores and player-created courses survive while their scoring rules remain current. This scoring revision resets development boards and retires old-rule courses and replays. There are no archived development campaigns or compatibility catalogs.

## Progression

All stages are available immediately. The chapter selector shows five numbered stages at a time; player-created courses have their own entry. Completing a stage keeps the existing Space-to-advance behavior, including chapter boundaries. Every stage has a brief, an overview and an H-key aim/charge hint.

The distance label is the measured length of the suggested native trajectory, including vertical travel, banks and returns. It is not the straight-line distance to the destination, which the overview reports separately. Difficulty labels describe the authored progression, not a measured human success rate.

| Stage | Chapter | Course | Suggested route | Waypoints |
| --- | --- | --- | ---: | ---: |
| 01 | First Departures | Snack Run | 6.9 m | 2 |
| 02 | First Departures | Corner Store | 10.5 m | 2 |
| 03 | First Departures | Ceiling Service | 15 m | 3 |
| 04 | First Departures | Ticket Trick | 15.3 m | 2 |
| 05 | First Departures | Garden Switchback | 18 m | 3 |
| 06 | Angles and Returns | Terrace Turnaround | 18.3 m | 2 |
| 07 | Angles and Returns | First Bank | 24.4 m | 0 |
| 08 | Angles and Returns | Platform Drift | 30.9 m | 3 |
| 09 | Angles and Returns | Lost and Found | 36.4 m | 3 |
| 10 | Angles and Returns | Sky Garden Shuffle | 37.3 m | 4 |
| 11 | Banking on Kyoto | Exact Change | 43.4 m | 2 |
| 12 | Banking on Kyoto | Fascia Flip | 46 m | 4 |
| 13 | Banking on Kyoto | Glass Pinball | 49.4 m | 4 |
| 14 | Banking on Kyoto | Locker Loop | 50.4 m | 4 |
| 15 | Banking on Kyoto | Café Delivery | 64.7 m | 5 |
| 16 | The Grand Climb | Pillar Carom | 69.8 m | 3 |
| 17 | The Grand Climb | Three Flights Down | 81.6 m | 6 |
| 18 | The Grand Climb | Café Carom | 83.7 m | 3 |
| 19 | The Grand Climb | Underpass Uppercut | 84.4 m | 3 |
| 20 | The Grand Climb | Concourse Cruiser | 93.8 m | 4 |
| 21 | Cross-Station Express | Balcony Express | 111.3 m | 5 |
| 22 | Cross-Station Express | Grand Stair Fever | 114.2 m | 5 |
| 23 | Cross-Station Express | Last Order | 149.6 m | 2 |
| 24 | Cross-Station Express | Escalator Relay | 157 m | 7 |
| 25 | Cross-Station Express | East-to-West Ricochet | 179.8 m | 8 |
| 26 | Jackpot Finale | Sculpture Square Slingshot | 182.3 m | 6 |
| 27 | Jackpot Finale | Roof-to-Terrace Special | 190.6 m | 3 |
| 28 | Jackpot Finale | Skyway Trapdoor | 222.6 m | 5 |
| 29 | Jackpot Finale | Roof Bank Cascade | 254.4 m | 3 |
| 30 | Jackpot Finale | The Kyoto Grand Slam | 270.7 m | 8 |

## Targets and physics

Twenty-nine stages use optional waypoint chains. Eleven stages include non-floor targets, and three of the new routes include overhead contacts. Each waypoint scores once, in any order. Destinations are optional bonuses; a destination miss keeps earned waypoint points. First Bank retains the classic landing-accuracy introduction. The later stages reward longer chains, narrower surfaces, multi-level routes and precise delivery through the shop doorway. The new lines place targets on actual collision faces at changes of direction, with intermediate floor patches only where a bounce connects the route. There are no long strings of new floor targets after the final bank. Nearby aiming variations can still bank a partial score.

All starts and targets are checked against the native collision model. A level changes only the start, targets and suggested input. It does not add catch planes, magnetic targets, special friction, forced stops or level-specific physics. A shot must stop translating and spinning before its score locks; recall forfeits.

The store delivery uses the existing modeled 2F convenience store at the west gallery, not a new storefront. Its doorway, shelves, ceiling and collision stay intact. Station source registration remains in `web/levels/konbini-registration.json` and the canonical layout.

The overview cuts just above the targets' upper edges so low shop ceilings do not cover wall patches. Numbered purple guides keep distant and overhead patches legible through station geometry. Connecting dashes indicate the target sequence, not a predicted flight path; waypoints remain optional and unordered.

## Verification

The campaign uses collision `b304c84aa1292e9e401c4abde9d305f754548d3b815fba8137802c9a2a385515`, physics `kyoto-p3-3`, throw model `robot-v4` and capability `waypoint-v3`. Station geometry is unchanged; floor contact uses the moderate grip described in [FLIGHT-CONTACT-FIXES.md](FLIGHT-CONTACT-FIXES.md). Targets, route lengths and stage ordering have been recalibrated for that response.

`web/levels/proof-inputs.json` pairs every current course with two repeated suggested shots and one nearby aim. The native proof requires all suggested waypoints, positive completion for neighboring shots, and full physical rest. Each of the ten redesigned routes also proves a turn of at least 45 degrees at a collected wall or ceiling target, measured from the native positions before and after impact. Optional destination results are reported separately. A timeout or a ball leaving the station fails the proof.

`npm test` checks campaign completeness, progression, hints, target data and replacement of the previous catalog. `npm run test:runtime` checks authoritative scores and saved replay parity on an isolated local service, including shop, garden, Skyway and finale routes. Browser verification covers the real chapter selector, stage overviews, visible hints and custom-course access. See `web/levels/README.md` for reproduction.

The ten changed routes are verified with repeated suggested shots and nearby positive completions. The isolated service checks classic scoring plus shop, garden, Skyway and finale score/replay parity. Browser checks cover course selection, overviews and the live movement counter; they do not establish a manual playthrough of every stage.
