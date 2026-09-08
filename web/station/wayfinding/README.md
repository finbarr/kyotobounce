# K030 registered wayfinding

Original reproducible artwork and the runtime registration table live in
`web/public/station-details.js` (`paintWayfinding`, `wayfindingRegistrations`).
No downloaded pixels, logos, new collision geometry or runtime asset imports.
`node web/station/wayfinding/receipt.mjs` exports the full registration/placement
inventory with source and layout hashes to the task-local evidence directory.

## Reference register — checked 2026-09-08

| Key | Primary source | Date and certainty |
| --- | --- | --- |
| floor | https://www.kyoto-station-building.co.jp/floorguide/ | Accessed 2026-09-08; publication date unspecified. Theater entrance is east 2F, hotel reception 2F, Ramen Koji 10F. No evidence identifying the modeled ground-floor glazing bays as tenant entrances. |
| square | https://www.kyoto-station-building.co.jp/service/square/ | Accessed 2026-09-08; publication date unspecified. East Square 7F; West Exit Square and North–South Public Passage 2F; Skyway 10F. High certainty for these official floors, inferred game transforms. |
| jr | https://www.jr-odekake.net/station/img/premises/0610116.pdf | Retrieved 2026-09-08. K025 audit dates the flat map January 31, 2026; that map date is inherited, not independently verified here. Central Gate 1F and West Gate 2F. |
| shop | https://www.dailyservice.co.jp/shop/detail/4828 | Direct tool retrieval failed 2026-09-08. Branch identity/location inherited from K025 source d250b649, not claimed freshly verified. Generic Store direction targets its retained 2F threshold (-54,7.35,-18), not another branch. |
| model | runtime/station-layout.json; assets/atrium-detail.json | Installed assets-v2, accepted baseline 4ee2976. Geometry is authored interpretation, not a surveyed real station. |

## Location and arrow audit

Native axes: +X east, +Z north; browser reverses Z. A north-facing sign is read
looking south: east is left, west is right. Arrows are drawn with paths, not
font-dependent arrow glyphs.

| Registration | Modeled anchor / floor | Label and direction | Certainty / change |
| --- | --- | --- | --- |
| central-hall-central-gate-sign | Existing gate header, 1F hall | JR Central Gate, identity | High location; original bilingual interpretation |
| central-hall-information-board-structure | Existing 20 m board, 1F hall | Right/west: West Exit/Public Passage/Store 2F; left/east: East Square 7F via stairs; right/west: Ramen Koji 10F via stairs | Official floors; inferred modeled routes, not straight-line access on the current floor. West stair foot is west of hall; east stair foot x18.4 is east of hall. No invented train platform arrows. |
| east-frontage-north-sign-recess-0, -1, -2, -3 | East building ground frontage, south-facing | Omitted | Unknown tenant. No blanket Hotel Granvia assignment. |
| east-frontage-west-sign-recess-0, -1, -2, -3 | x31.93, ground frontage, west-facing | Omitted | These are EAST building surfaces, not the station west district. Their names do not establish Theater occupancy. |
| east-lower-display sign recess | x26.9, original glazed poster case | Kyoto Station Building, no arrow | Modeled original display; not a Theater entrance |
| east-lower-landing-door sign recess | x31.3, ground floor doorway | Omitted | Hotel entrance unverified; ground landing is not hotel 2F reception |
| east-lower-service-door sign recess | x24.575, ground service doorway | Omitted | Service doorway does not establish an information desk |
| wayfinding-west-2f | Flush north face of first-landing-west-tier-0-partition; y7.61–8.26, supported landing y7.35 | Right/west: West Exit/Public Passage/Store 2F | Inferred model route along open landing north of cafe; turn south along gallery to K025 west-facing shop. Not a second shop header. |
| wayfinding-east-ascent | Flush north face of east-passage-north-approach; y2.1–2.85, ground approach | Right/west: East Square 7F, back to stairs | Existing east stair foot is x18.4, WEST of this ground-level sign x37.5. Ascend via existing east circulation; do not direct into the hotel/service doors or imply this is 7F. |

The public passage is the retained west circulation interpretation; this does
not add a southern station district or promise an unmodeled through-route.
Ramen Koji is a floor-level destination cue; individual restaurant bays remain
unnamed. No new Theater/hotel tenant identity is assigned without location proof.
The two existing original posters remain in the glazed case (Skyway 10F is
source-backed); all overlays early-out on unregistered historical layout hashes.

## Integration boundaries

K025 d250b649 was fetched and inspected before edits. Its facade, threshold,
7-ELEVEN/Heart-in header and material channels are untouched. K026 branch was
not yet published when checked; no material/light hook is edited or depended on.
The local STATUS records this coordination contract; combined material and
shop candidate inspection remains with integration. No peer messaging channel
was available. K029 exhibits/4285 remain untouched.

There are five sign meshes (two on existing structural surfaces), two retained
posters and no new lights, RAF work, collision or floating supports. Ten
unverified text overlays are removed. New sign planes sit 8 mm from their
registered surface, within its extents. Japanese falls through to Noto Sans CJK
JP / Noto Sans JP. Optional fonts trigger one redraw using existing textures.
The layout hash guard deliberately fails closed: a future combined geometry
export requires a reviewed registration/hash update, not a wildcard bypass.

## Reproduction and review

Use the assignment's immutable worker, with Assembly-CSharp SHA256
`9a8f2f06a928fb15d42b799a093c95eb7bb62fbbc3afd5f03bb1eebf34025fef`.

```sh
KYOTO_WORKER_EXECUTABLE=/opt/boxhaven/workers/waypoint-timing-20260908/KyotoPhysicsWorker.x86_64 KYOTO_DATA_DIR="$PWD/.local/station-detail/data" KYOTO_WORKER_LOG="$PWD/.local/station-detail/worker.log" npm run dev -- 4286
node web/tests/station-wayfinding-registration.mjs
node web/tests/station-wayfinding-native.mjs
node web/tests/station-wayfinding-artwork.mjs
node web/tests/station-wayfinding-browser.mjs after
npm run build:web
node web/station/wayfinding/receipt.mjs
```

Native check creates three private local approach courses and verifies lateral
walking/support on the unchanged worker. Browser test uses real game controls,
normal rendering and live sockets. It never substitutes heartbeat handling or
request-only rendering. The artwork fixture is separately labeled, and cannot
establish normal-game readability or performance.

Hardware review: open `http://127.0.0.1:4286`, choose each `K030 hall/west/east sign
approach`, press LET'S BOUNCE, then Free exploration to walk out of the start
disk. Default southward aim faces each north-facing sign. Walk/orbit in both
directions; inspect Japanese and English from the hall at 9 m, west partition
at 2–4 m, east wall at 2–5 m. Verify no overlap, flicker, blocked sightlines or
shop-header duplication with the integrated K025/K026 candidates. Keep 2F and
7F visibly distinct. A Mac running the isolated service can run:

```sh
KYOTO_CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' KYOTO_WAYFINDING_APPROACH=hall node web/tests/station-wayfinding-browser.mjs hardware-hall
KYOTO_CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' KYOTO_WAYFINDING_APPROACH=west node web/tests/station-wayfinding-browser.mjs hardware-west
KYOTO_CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' KYOTO_WAYFINDING_APPROACH=east node web/tests/station-wayfinding-browser.mjs hardware-east
```

Linux software-rendering failures must remain failed in the receipt; do not
claim a smooth gameplay pass from the original-art contact sheet or stale stills.
