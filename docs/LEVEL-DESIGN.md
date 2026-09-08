# Station courses

This delivery contains three routes on the repaired station. Current course definitions and numerical hints belong in `web/starter-challenges.json`; historical entries remain immutable. Authoring tools and proof instructions are in `web/levels/README.md`.

| Course | Route | Scoring and completion |
| --- | --- | --- |
| Staircase Special | First Great Staircase flight into Muromachi plaza | Three optional surface waypoints, required staircase contact, no destination. Points are banked when translation and spin stop. |
| Catch the Lift, revision 10 | Lower east ascending escalator to its static upper landing | Required ascending-lane contact, optional dismount waypoint and one landing destination. |
| Last Order | Upper west landing through the station into the West Exit shop | Optional interior waypoints and one supported interior destination. The intermediate approach bank is optional. |

First Bank and Return Ticket remain the introductory courses, with native-proved revision 8 definitions on the repaired layout. Catch the Lift's revision 10 preserves production's existing revisions through 8 and avoids reusing a possible rule-migration revision 9. The two new course IDs start at revision 1.

## Station registration

The operator's [July 2026 Kyoto shop index](https://www.dailyservice.co.jp/shop/map?type=kyoto) and [West Exit shop entry](https://www.dailyservice.co.jp/shop/detail/4828) identify Seven-Eleven Heart-in JR Kyoto Station West Exit on 2F outside the gates. This is separate from the Central Gate 1F shop. The [JR station map](https://www.jr-odekake.net/station/img/premises/0610116.pdf), revised January 31, 2026, locates the West Exit store beside the West Gate passage. The [station squares guide](https://www.kyoto-station-building.co.jp/service/square/) identifies Muromachi Square and the Great Staircase.

The game's West Exit threshold is registered at (-54, 7.35, -18), facing west with its interior extending east. This is an inference from schematic references, not a surveyed coordinate. The simplified interior, held-open doorway and scoring markers are gameplay adaptations. The original cafe has not been relabeled as the shop.

The final source adds a guarded gallery from the actual west 2F landing edge to that threshold. Its floor, solid roof/walls, doorway and guards match the canonical collision export. Native traversal and ball-entry checks confirm continuous support. See `tools/SHOP-INTEGRATION.md` for source and geometry verification.

## Physical constraints

The first staircase landing supports a 0.25 m start disk; the earlier proposed 0.7 m disk did not fit. Staircase Special deliberately has no exact finishing target: collecting the optional tread/plaza chain is its purpose.

The escalator's upper comb ends near x29.52; raised tactile paving begins near x30.009. The clear static stone patch between them supports a 0.2 m-radius destination centered near x29.8. This is smaller than the original design sketch because a target disk must fit its actual fixed surface. The route retains the existing ascending lane and moving geometry.

Last Order starts on the existing upper west landing. The ball must pass through the real modeled opening; the doorway frame and roof remain solid. Its forgiving destination is contained by the actual shop floor. There is no hidden catch plane, target magnet, special friction or forced stop.

## Acceptance

All final proofs bind to collision SHA256 `7dcbc8a4c2883d14b075f200a20afebda415ed5c2179e31cc2d6bf8f21396775`, the matching browser assets, `kyoto-p3-2`, `robot-v4` and `waypoint-v1`.

Each authored hint is checked with five identical native shots and three small neighboring inputs. The records must show actual waypoint contacts, required architecture when specified, complete replays and supported rest with zero translation and spin. Destination attestation is required only when the course has a destination. These samples establish bounded repeatability, not human playtesting or a broad success rate.

Normal browser input must complete the course from its briefing, verify the saved replay and its scrub controls, and return to aiming through retry. No teleports, fabricated results or client-supplied scores count. General native suites separately verify recall forfeiture, once-only awards, retained waypoint points on a destination miss, route rejection and classic replay parity.

Before release, fresh and existing database startup must select the exact current revisions while preserving historical challenge/replay bytes. Completion status and outstanding checks are maintained once, in `docs/FLEET_QUEUE.md`. This pass does not add a campaign, alternate difficulty variants or further station phases.
