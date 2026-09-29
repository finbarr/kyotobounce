# Central elevator: destinations and missing landings

29 September 2026. Research for the unresolved Porta B2 lift connection.

## Evidence

The [firsthand elevator guide](https://kyoto-rys.com/facility/elevator/) identifies five central-elevator stops: B3 parking, B2 Porta, B1 at the Isetan frontage, ground level near JR Central Gate, and the second-floor north–south public passage. Its photograph shows a recessed entrance beside the Porta shops. The accompanying schematic places it west of the central atrium. Both image references were saved and visually inspected.

The [CRA Work Support Center accessibility survey](https://kyoto-aruite-sansaku-wsc.jimdofree.com/バリアフリー/京都駅ビルエリア/) corroborates the parking, shopping and upper public-route connections. Its text was read; its linked photographs returned HTTP 403 and were not inspected. Neither guide supplies surveyed dimensions or a verified current survey date.

The operator's [Porta South evacuation plan](https://www.porta.co.jp/common/pdf/company/evacuation.pdf), revised 1 April 2024, supplies more detailed drawings than the shop guide. PDF page 11 shows the ground-floor shop block and its S-1 lift/EV lobby; page 12 shows B2 shops, cores and circulation. Page 13 covers the B3 service/loading area, not the complete public car park. These drawings were visually inspected. The downloaded edition skips the advertised appendix 4 B1 drawing.

The [current Porta shop guide](https://www.porta.co.jp/common/pdf/floor/shopguide_jp.pdf), printed 29 May 2026, remains the reference for current retail arrangement and the B2 lift symbol. Treat the older evacuation drawings as structural evidence, checking shop boundaries against the newer guide.

Reference originals stay in the ignored research folders. Identities and provenance are recorded in `sources.json`; reference photographs are not game textures.

## Modeling decision

Build one lift with five independently guarded landings and explicit destination selection. The existing two-floor cars are insufficient for this connection. Do not turn the unverified central oval floor opening into this shaft: the photograph and plan point to the western shop block.

The current browser inspection also shows an incomplete western B1 approach. The station increment must include the receiving floors and usable routes, not only the car. Shaft registration, B3 receiving area, B1 enclosure, ground-floor recess and second-floor passage connection still need to be fitted and verified together. Exact dimensions, finish choices and the B3 datum remain unresolved.

## Implementation checks

The multi-stop mechanics use an authored height and label for each landing and a sampled acceleration path for every floor pair. Native physics accepts a destination only while the player is inside the car; landing calls use the player's actual floor. Closed doors protect every unoccupied landing. Existing two-floor lifts retain their current operation.

`web/tests/lift-stops-fixture.mjs` builds a small five-floor verification scene. Its dimensions are synthetic test values, not architectural measurements or approved central-lift coordinates. It exercises the actual service, worker, renderer and floor picker without copying the full station. `web/tests/lift-stops-browser.mjs` covers all five exits, floor selection, independent sessions and throw/recall while descending. The native fixture covers all twenty travel directions, rider support, ball contact/rest and door sensing.

The central station shaft and its landings are not delivered by these mechanics checks. Continue on that same connection after the worker and browser controls are verified.

## Verified mechanics

The rebuilt macOS worker passes 61 five-floor checks and 4,820 sampled poses, including all twenty travel directions, grounded entry/exit at every level, calls from intermediate landings, protected empty shafts, doorway sensing and a spinning ball reaching full rest after arrival. The existing two-floor native fixture also passes its fourteen checks.

The five-floor scene passes 32 Chrome checks with no page or service errors. These cover named floor selection, current-floor indication, keyboard cancellation, suspended movement while the picker is open, all five receiving floors, rendered landing-door positions, independent sessions and throw/recall during descent. The full station's native exploration, full translation/spin rest, recall and home check passes. `npm run typecheck`, `npm test` and `npm run build:web` pass.

The existing Porta west lift also passes all seven Chrome ride checks in the complete station, including doorway sensing, protected empty-shaft access and throw/recall during descent. The ride harness now waits for the rendered control to become available before requesting a return trip; a native arrival snapshot can precede the rendered door animation. The normal Chrome entry, movement, full throw, recall, menu and home check passes after the final preview restart.

The fixture has sixty static triangles and twenty-four moving lift parts. It replaces no station geometry and requires no full-station export. After verification, its local server was stopped and 638,666 bytes of generated fixture files were removed; small test reports and screenshots remain. The rebuilt worker and browser controls support the next station increment. The actual central elevator route remains to be constructed.

## Station construction

The [central elevator construction note](CENTRAL-LIFT-V2.md) records the delivered shaft, all five receiving routes, operator parking reference and verification. It supersedes the mechanics-only scope above. Parking ramps, service rooms, further building connections and detailed retail interiors remain unfinished.
