# Course completion audit — 13 September 2026

All **30 current courses** have a native solution that collects every waypoint and settles in the destination when one exists. The audit covers all **114 waypoints and 18 destinations**, using two authored shots per course on macOS and one on the actual production Linux dedicated worker: **90 complete solution runs**. A read-only production catalog check found 30 station courses and no additional player-created courses.

## Repairs and completion rules

- **Platform Drift:** reduced the suggested speed from 2.10 to 1.80 m/s and moved the destination to the actual landing. The 1.7 and 1.9 m/s tests also collected every waypoint and landed inside it. Its measured route is now 27.3 m.
- **Lost and Found / Locker Loop:** moved stale destinations onto their verified return-shot landings, keeping the 1 m radii. Native placement checks confirm that both full circles fit on unobstructed floor.
- **Ticket Trick:** moved the small ticket-machine target slightly down and widened it from 0.17 to 0.19 m. Both the hint and its +0.2° yaw variation now collect it.
- A waypoint course requires every target to pass and rank. Its destination remains a bonus. Partial routes show points in play, then finish unranked with the collected/required count. Landing in the destination cannot substitute for a missing waypoint. A course with only a destination still requires that landing to pass.
- The previous proof reported destination outcomes without requiring them on waypoint courses. The authored solution check now fails for any missed waypoint or retained destination. It also checks the proof against the actual displayed hint.

## Per-course results

“Destination” records the Linux solution's result; all retained destinations were also reached in both Mac solution runs. Nearby counts use the existing aim/power variations plus Platform Drift's two additional speed checks.

| Course | Waypoints | Destination | Mac solutions | Linux solution | Nearby full clears |
| --- | ---: | --- | ---: | ---: | ---: |
| 1. Snack Run | 2 | Reached | 2/2 | 1/1 | 1/1 |
| 2. Corner Store | 2 | None | 2/2 | 1/1 | 1/1 |
| 3. Ceiling Service | 3 | None | 2/2 | 1/1 | 1/1 |
| 4. Ticket Trick | 2 | None | 2/2 | 1/1 | 1/1 |
| 5. Garden Switchback | 3 | None | 2/2 | 1/1 | 1/1 |
| 6. Terrace Turnaround | 2 | Reached | 2/2 | 1/1 | 1/1 |
| 7. First Bank | 0 | Reached | 2/2 | 1/1 | 1/1 |
| 8. Platform Drift | 3 | Reached | 2/2 | 1/1 | 3/3 |
| 9. Lost and Found | 3 | Reached | 2/2 | 1/1 | 1/1 |
| 10. Sky Garden Shuffle | 4 | Reached | 2/2 | 1/1 | 1/1 |
| 11. Exact Change | 2 | Reached | 2/2 | 1/1 | 1/1 |
| 12. Fascia Flip | 4 | None | 2/2 | 1/1 | 0/1 |
| 13. Glass Pinball | 4 | None | 2/2 | 1/1 | 0/1 |
| 14. Locker Loop | 4 | Reached | 2/2 | 1/1 | 1/1 |
| 15. Café Delivery | 5 | Reached | 2/2 | 1/1 | 1/1 |
| 16. Pillar Carom | 3 | None | 2/2 | 1/1 | 1/1 |
| 17. Three Flights Down | 6 | Reached | 2/2 | 1/1 | 0/1 |
| 18. Café Carom | 3 | None | 2/2 | 1/1 | 2/2 |
| 19. Underpass Uppercut | 3 | None | 2/2 | 1/1 | 1/1 |
| 20. Concourse Cruiser | 4 | Reached | 2/2 | 1/1 | 1/1 |
| 21. Balcony Express | 5 | Reached | 2/2 | 1/1 | 1/1 |
| 22. Grand Stair Fever | 5 | Reached | 2/2 | 1/1 | 1/1 |
| 23. Last Order | 2 | Reached | 2/2 | 1/1 | 0/1 |
| 24. Escalator Relay | 7 | None | 2/2 | 1/1 | 0/1 |
| 25. East-to-West Ricochet | 8 | Reached | 2/2 | 1/1 | 1/1 |
| 26. Sculpture Square Slingshot | 6 | Reached | 2/2 | 1/1 | 1/1 |
| 27. Roof-to-Terrace Special | 3 | Reached | 2/2 | 1/1 | 1/1 |
| 28. Skyway Trapdoor | 5 | None | 2/2 | 1/1 | 0/2 |
| 29. Roof Bank Cascade | 3 | None | 2/2 | 1/1 | 1/2 |
| 30. The Kyoto Grand Slam | 8 | Reached | 2/2 | 1/1 | 0/1 |

## Precision sensitivity

**26/35 nearby inputs fully cleared.** Eight courses have a tested small aim/power variation that misses part of the route or its bonus landing. Their authored solutions are proven, but these tests do not establish a broad manual success rate. Partial nearby routes are reported as failures to full-clear, never as successful completions.

- **Fascia Flip:** yaw 110.2 collected 3/4.
- **Glass Pinball:** yaw 45.2 collected 1/4.
- **Three Flights Down:** yaw 76.55 collected 1/6, destination missed.
- **Last Order:** yaw 93.25 collected 2/2, destination missed.
- **Escalator Relay:** yaw 76.55 collected 1/7.
- **Skyway Trapdoor:** 29.8 m/s collected 4/5; pitch 35.2 collected 2/5.
- **Roof Bank Cascade:** pitch 19.8 collected 1/3.
- **The Kyoto Grand Slam:** yaw 90.05 collected 1/8, destination missed.

## Method and reproduction

The checks use the ordinary native launch, collision and rest rules. Each shot must finish with a sleeping ball, zero translation and zero spin. Target faces and the whole destination circle must pass native placement validation. No collision geometry, friction, magnets, timers or forced stop behavior changed. The ten authored ricochet routes also retain their required non-floor contacts and a turn of at least 45°.

Inputs are in [proof-inputs.json](../web/levels/proof-inputs.json). Run the current proof with a compatible worker:

```sh
KYOTO_WORKER_EXECUTABLE=/absolute/path/to/worker \
  npm run test:campaign -- .local/course-proof
```

The default runs repeated hints and reports nearby sensitivity. Add `KYOTO_PROOF_REQUIRE_NEIGHBORS=1` to make every nearby full clear mandatory; the present catalog does not pass that stronger tolerance test. `KYOTO_PROOF_HINTS_ONLY=1` runs one solution per course. The Linux check used the latter in a separate low-priority process with an isolated log and no database connection. Its temporary files were removed afterward; the live service remained ready with zero restarts.

Physics inputs SHA-256: `6ac2f79979fc3a8643cf9df9ee1412574e6d67f80635a615cb0ff4883b6f0060` (layout, rules, target geometry, start and actual hint inputs; excludes presentation text).

- Layout: `b304c84aa1292e9e401c4abde9d305f754548d3b815fba8137802c9a2a385515`
- Mac worker Assembly-CSharp SHA-256: `f369ecf8de8e75f60e6839ffb347c2b97a30ff2aa4a658d676af08145e4fb10d`
- Linux worker Assembly-CSharp SHA-256: `754321fad2560a4ca31e5d34ccb71c8d105f98ddea74ec5fa23efba9de1fcdc0`

The unit suite covers complete-route eligibility, duplicate/forged hits, provisional points, destination bypass rejection, old partial-record cleanup, rankings and replay parity. The isolated service test demonstrates a real native 2/3 route that lands in its destination and remains unranked, then a 2/2 route with no destination that passes, ranks and shares. Real Chrome checks cover the course briefing and result UI with those native result payloads, including the hidden/visible Next challenge and replay controls.
