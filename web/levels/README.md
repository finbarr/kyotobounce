# K019 level source and proof handoff

`candidate-challenges.json` is the single integration input for root's canonical starter file; it is not loaded as a second production catalog. Preserve historical challenge bodies/replays. Catch the Lift is revision10 (historical7/8 and reserved9 remain intact). No deployment or gameplay/native/scoring edits are included.

| Course | Meaning | Verified locally |
|---|---|---|
| Staircase Special | First-flight cascade with three optional tread/plaza waypoints; no destination | Native8; actual keyboard completion, replay/scrub/retry |
| Catch the Lift10 | Required ascending escalator, optional static landing waypoint and destination bonus | Native8; keyboard completion within one retry, replay/scrub/retry; coordinator Mac accepted |
| Last Order | Real upper-deck descent through solid shop doorway/roof, optional interior waypoints and receiving-floor bonus | Native8 bonus feasibility; coordinator owns final Mac success/replay acceptance |

Browser completion means positive authoritative success, real waypoints/required route and zero translation/spin. A destination miss keeps earned waypoint points and must be reported as a bonus miss, not failure or bonus success. Native destination-attestation checks separately establish bonus feasibility. `verified-native.json` records five exact and three neighboring samples per course, authoritative release data, full-rest/waypoint evidence, hashes and raw receipt locations.

Final collision: `7dcbc8a4c2883d14b075f200a20afebda415ed5c2179e31cc2d6bf8f21396775`. Compatible read-only worker Assembly-CSharp SHA-256: `9a8f2f06a928fb15d42b799a093c95eb7bb62fbbc3afd5f03bb1eebf34025fef`. Native files and matching single-scene browser assets are under ignored `.local/final-station/`. Isolated service uses4284 and its own DB/log; public4173 is unchanged. Final raw proofs and browser receipts are compressed under `.local/handoff/`, with checksums. Root integrates assets and starter/archive data centrally.

## Reproduce

```sh
KYOTO_WORKER_EXECUTABLE=/absolute/compatible/Linux/worker \
KYOTO_LAYOUT=/absolute/final/station-layout.json \
node web/levels/native-proof.mjs fixture.json .local/proofs/fresh
node web/levels/check-proof.mjs .local/proofs/fresh
node web/levels/browser-proof.mjs 'Course name' .local/browser/fresh holdMs,retryHoldMs
```

Extract the exact fixture from the retained `summary.json`. Native authoring uses the existing worker protocol and real charge/release/full stepping; timeout is inconclusive and recalls the shot. Browser proof drives the complete local game through real keyboard/DOM controls, persists video/results, then verifies saved replay scrub and retry. At most one retry per run. Linux software rendering can delay actual charge input substantially; receipts report authoritative power, and are not Mac GPU performance measurements.

Lift's radius0.2 destination occupies actual clear stone between upper comb (ends x29.52) and tactile strip (starts x30.009), rather than the originally proposed larger disk beyond the strip. Last Order's radius1.8 destination remains at(-51.35,7.35,-18), with the native-proved29.65m/s hint. A wall-hugging stop may miss its optional bonus: native requires the whole ball inside the circle. No collision cuts, catch planes, target magnets or timer finishes are used.

## Standalone shop source

```sh
/opt/blender-5.2.1/blender -b --python web/levels/build-konbini.py -- --output .local/konbini/fresh
node web/levels/audit-konbini.mjs .local/konbini/fresh
```

The builder creates an independent scene, source blend, GLB, ten matching solid collider meshes, preview and checksums. It never opens the base station source. Its1.8m×2.25m central doorway is open; glass side panes, jambs/header, ceiling, floor and back/side walls are solid and visible. Audit maximum mesh/collider bounds difference is2.36µm; nine doorway ball-clearance samples pass. Physics integrated this source and a guarded gallery from the real landing edge into the single canonical atrium export. There is no overlay loader.

`konbini-registration.json` distinguishes evidence, model registration and gameplay adaptation. The operator's [West Exit store4828](https://www.dailyservice.co.jp/shop/detail/4828) and [July2026 index](https://www.dailyservice.co.jp/shop/map?type=kyoto) place Heart-in on2F outside gates. The [JR January31,2026 map](https://www.jr-odekake.net/station/img/premises/0610116.pdf), page2, places it north/east of West Gate by elevatorE/stair8, south/east of Kyo Navi. North points down on that sheet; a west-facing facade on the passage's east side is an inference. [Entrance photography](https://tabelog.com/kyoto/A2601/A260101/26033019/) informed framed glass and striped transom; photograph date is unverified. The threshold(-54,7.35,-18) is reasonable model registration, not surveyed coordinates. Held-open doorway, simplified empty interior, decorative mat and receiving marker are game adaptations. No research images/binaries are committed.
