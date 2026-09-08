# K019 course implementation candidates

Worktree `fleet/levels-20260908`, based on coordination `889054d`. These new files own authoring and proof only. Root integrates shared challenge/layout/asset patches; gameplay and native timing remain with their assigned owners. No deployment. Port 4284 is reserved for the final isolated service, with its own database/log and dependencies/assets.

## Acceptance

Three distinct routes: lower Great Staircase to Muromachi plaza; ascending east escalator and clean static landing (Catch the Lift proposed revision 7); west top-deck descent through the real West Exit shop approach into a simplified receiving interior. Final scoring family is `waypoint-v1`, optional fixed-face waypoint chains plus destination extra. Existing IDs/revisions/replays remain immutable; the revision-7 candidate does not overwrite revision 3 or migrated revisions 4–6. Root must check actual history and choose a free higher revision if necessary.

No numerical player hint is published until native proof. Each final route needs five identical successes plus three neighboring successful input samples; full translational and rotational rest, route rejection, legitimate misses, recall forfeiture, replay preservation and actual browser completion/retry readability. Preliminary classic probes do not satisfy these gates. Root supplied `/opt/boxhaven/workers/waypoint-timing-20260908/KyotoPhysicsWorker.x86_64`; its Assembly-CSharp SHA-256 is `9a8f2f06a928fb15d42b799a093c95eb7bb62fbbc3afd5f03bb1eebf34025fef`. Capability and a real native waypoint/destination-rest smoke passed on the canonical base. Final layout-bound proofs still await the structural/garden handoff. No rebuild is requested here.

## Standalone konbini source

```sh
/opt/blender-5.2.1/blender -b --python web/levels/build-konbini.py -- --output .local/konbini/fresh
node web/levels/audit-konbini.mjs .local/konbini/fresh
```

The source creates a new scene and writes an independent blend, GLB, collider records, preview and checksums to an ignored fresh directory. It never opens the base station blend. Its ten blocking meshes use exactly their exported box dimensions/transforms. The central 1.8m × 2.25m doorway is open; closed side panes, metal jambs/header, real tile floor, side/back walls and ceiling remain visible and solid. The receiving mat is a thin visual finish on the supporting floor, not a catch plane. No target magnet or special friction is introduced. `audit-konbini.mjs` checks every blocking mesh's GLB bounds against native collider records and samples ball clearance across the doorway. Base geometry clearance is a separate integration gate.

`konbini-registration.json` separates evidence from registration inference and gameplay adaptation. Its current transform is provisional: threshold (-54,7.35,-18), inward east / facing west, on the existing West 2F region. This is not a surveyed coordinate or a proved top-deck route. Root/structural registration review is outstanding; do not publish this transform as geographically accepted. Source supports replacing that transform without moving unrelated architecture.

## Geography evidence

- Operator [shop 4828](https://www.dailyservice.co.jp/shop/detail/4828) and [July 2026 station index](https://www.dailyservice.co.jp/shop/map?type=kyoto): Heart-in JR Kyoto Station West Exit, 2F outside gates. Central Gate 1F is a different shop.
- [JR station map, January 31 2026](https://eki.jr-odekake.net/premises?id=0610116): independently downloaded and inspected the flat/perspective GIFs when the new PDF URL returned 403. The older stable [PDF URL](https://www.jr-odekake.net/station/img/premises/0610116.pdf) subsequently succeeded and contains the same January 31 2026 revision; its full-resolution second page was inspected. They locate the shop immediately north/east of West Gate, beside elevator E/stair 8 and south/east of Kyo Navi (north points down on this sheet). Its placement on the east side of the free passage supports a west-facing candidate facade as an inference; schematic icons do not establish doorway dimensions or surveyed coordinates.
- [West Exit entrance photograph](https://tabelog.com/kyoto/A2601/A260101/26033019/): inspected the photo ending `296a09a8450be46537281eed6daf9a04.jpg`. Metal-framed sliding entrance, striped transom, flush receiving-side floor and mat inform the simplified facade. Capture date is unverified; no claim that every current finish is represented.
- [Kyoto Tourist Information Center, December 2025](https://global.kyoto.travel/resource/global/download/164-pdf.pdf), confirms West Exit store on 2F. The same sheet's “opposite Kyo Navi” statement refers to Travelex, **not** this shop; do not use the search snippet as a shop anchor.

Local-only research images and receipts: `.local/fleet/research/`. No downloaded photograph, binary or research image is committed.

## Native authoring harness

```sh
KYOTO_WORKER_EXECUTABLE=/absolute/read-only/compatible/Linux/worker \
KYOTO_LAYOUT=/absolute/candidate/station-layout.json \
node web/levels/native-proof.mjs fixture.json .local/proofs/fresh
```

Fixture has `challenge`, `shots` and explicit `preliminary`. Each shot supplies `speed`, `range`, `input` (yaw/pitch/top/kick), optional release `phase`/`period`, and bounded `observeSeconds`. Direct-native charge/release uses the trusted service's power field derived from authored hold duration, with full native stepping. This is authoring feasibility, not a browser-input timing claim. Final proof refuses a worker lacking waypoint-v1 capability. Timeout is inconclusive and recalls that attempt; it never fabricates physical completion. Raw states, native events, final result/replay, versions, layout/worker hashes and input fixture are retained under ignored receipts. The harness owns its worker and never connects to a public service.

Early harness smoke `stairs-01` omitted trusted release.power and is invalid as a requested-speed test; it is excluded. Corrected `stairs-02` explicitly records the intended native power: 2m/s contacts the first flight then rests on Muromachi, while 3–4m/s overshoots toward 2F. Tuning continues; no numeric hint is yet approved.

## Current integration files and checks

`compose-candidate.mjs` reads a base layout/public station JSON plus the standalone shop directory and writes a fresh ignored combined layout, public station JSON, GLB and integration receipt. It does not alter the canonical source. `integration.patch` is an explicit proposed game-loader hook for root; it has **not** been applied to game.js. It appends the optional shop asset before station BVH/camera collision construction. Root's art exporter/asset manifest must include the reviewed source and matching collider records under a new asset/layout revision.

The exact Blender source object for shared floor coordination is `west-2f-landing`, confirmed by a read-only Blender query. The current shop interior spans x[-54,-49.5], z[-21,-15] with floor top y7.35. Root/structural must resolve coincident floor support and confirm registration before integration. No current cafe or base opening was edited.

Current retained candidate: `.local/konbini/current/`; composed review files: `.local/konbini-combined/`. Earlier generated versions were removed after the current GLB/collider audit passed. Superseded native searches are summarized in `.local/proofs/preliminary-summaries.json`; modern capability smoke, current proof runs and browser receipts remain. No binary or research image is committed.

On isolated port 4284 with the supplied waypoint/timing worker, `npm run test:runtime` and `node web/tests/waypoint-runtime.mjs` passed (set `KYOTO_TEST_ORIGIN=http://127.0.0.1:4284` and `KYOTO_TEST_OUTPUT` under `.local/`). This verifies classic compatibility and real waypoint-only/mixed scoring, slow once-only contact, destination miss/bonus, full rest, replay parity and spoof rejection. It is not acceptance of all three courses on the final structural layout.

`browser-proof.mjs` drives the complete local game through stage selection, briefing, hint key, real charge/release and recall/retry, with no developer teleport or fabricated result. At most one retry is allowed per run. Native waypoint points were earned in the first staircase trials, but destination acceptance failed: tiny input changes can alter the cascade significantly. Exact-repeat success alone is insufficient; tuning remains open. These failures are kept in `.local/browser/` rather than labeled passed.
