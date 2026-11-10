# Browser physics migration

The end state keeps the current station, Three.js presentation and all 30 courses,
with gameplay in a dedicated browser worker. Online score verification will run
on demand using the same versioned simulation and collision assets; a browser's
claimed score is never authoritative. Gameplay must continue after disconnection.
Deployment is outside the current goal.

## Current browser preview

Run `npm run assets:collision` once for the current asset pack, then
`npm run dev:browser -- 4430`. The preview at `http://127.0.0.1:4430` serves all
30 campaign courses without Unity, a WebSocket or a gameplay HTTP API. It uses
existing station files directly. The regular native launcher remains available
until the full migration passes; an HTML marker selects the browser transport.

The browser owns walking, throwing, target collection, scoring, full settling,
recall, Skip, local progress and replays. Local leaderboards are labelled
"On this device" and are unverified. Native credentials and scores remain
separate. Course creation and independent online verification are still required.
Selecting a level closes the mobile panel, including First Bounce, whose tutorial
does not open an automatic overview screen.

## Simulation and assets

- `web/public/physics/` retains the native 180 Hz custom gravity, drag, bounce,
  friction and spin response. Three Mesh BVH indexes station triangles;
  analytical sphere/triangle, box and capsule queries supply contacts. No second
  rigid-body solver applies impulses. BVH construction happens in the worker.
- The served layout comes from `web/v2/assets.json` and its configured spawn,
  matching the campaign hash, rather than the retired root layout. One generated
  collision pack lives under `.local/browser-physics/`. It contains 2,410,996
  triangles and 4,620 primitives in 58,843,636 bytes, versus the 512,444,053-byte
  source layout. Regenerate only when the canonical station changes.
- All 48 escalators have moving tread sweeps, contact velocity, load support,
  incoming-tread wake-up and grounded walking carry. Sweeps split at rail turns
  and cover reverse travel and the return chain. Each shot records its release
  time and owns an independent station clock. Hand clearance includes treads.
- Browser physics version `kyoto-browser-2` retains valid load-bearing support
  when a wall also contacts the ball. Each step rechecks proximity and separating
  velocity. This fixes indefinite floor/wall corner jitter without relaxing the
  quiet linear/angular thresholds or adding a shot timeout. The existing course
  key separates physics versions and discards retired local records.
- Quaternion integration uses fixed-order trigonometric polynomials, avoiding
  engine-specific `Math.sin`/`Math.cos` differences amplified by cancellation.
  A manually timed throw exposed the difference; the Chrome regression includes
  that exact case and 1,024 varied rotation inputs. Rotation retains the angular
  model, with approximation error checked against sin/cos over 40,001 angles.
- Physics computes at most 30 seconds ahead of acknowledged playback, with one
  step of numerical tolerance. Each recording chunk contains at most 180 new
  poses, 30 presentation frames and a bounded event batch. The worker waits for
  IndexedDB acknowledgment before continuing. Skip removes the playback lead
  limit, keeps storage backpressure and waits for physical rest. Recall forfeits
  even a computed result whose playback has not finished.
- Scores and complete replay headers commit atomically when the result is
  presented. Full pose/rotation/contact data stays in IndexedDB chunks; live
  scoring retains only necessary bank history. Full replay viewing still loads
  that replay into memory, and saved storage grows with actual shot duration.

## Verification

Use headless Chrome with `web/tests/background-input.mjs`; never capture the
user's pointer. Receipts and captures stay in `.local/browser-physics/`.

| Check | What it establishes |
| --- | --- |
| `npm test` | Portable geometry, impulse/spin model, floor/wall settling, separation from former support, stair masks, moving treads, recording bounds, scoring and existing UI/service regressions |
| `npm run test:browser:campaign` | All 30 actual Walker release positions; every suggested shot repeated; 184 nearby throws; targets, destinations, authored route features, zero velocity/spin at rest, no collision-budget exhaustion, independent scoring; all 30 hints repeated offline in Chrome with exact Node replay hashes |
| `npm run test:browser:local` | Rendered game, walking/home, three representative complete shots, desktop and touch controls, offline recall/Skip/replay, reload persistence, exact replay re-simulation, all 30 course selections at desktop and mobile widths, unskipped rendering/audio measurement |
| `npm run test:browser:recording` | Real offline worker beyond 240 simulated seconds without a false finish; delayed writes, stale acknowledgments, storage failure, tab locks and interrupted recording cleanup |
| `npm run test:physics:station` | Opening-course geometry checks, including Clock In's first three native contact positions within 0.1 mm, plus Node/Chrome replay equality |
| `node web/tests/browser-escalators.mjs --station` | All 48 actual lanes carry a grounded walker; 1,380 rendered-tread/collision comparisons at five phases, maximum measured difference 0.00000213 m |
| `npm run test:runtime` | Isolated native service campaign, full rest, walking, creator validation, replay, Skip/reconnect and recall regressions while the native path remains in use |

November 10 campaign proof: 30/30 suggested routes and 184/184 nearby throws
collected every required target/destination and reached true rest. Passage
Rebound's previously stuck nearby throw settles in 23.700 simulated seconds.
Bridge Pinball keeps its targets, charge and route; its suggested pitch changes
from 5 to 4.25 degrees. Both native and browser solvers pass all six nearby inputs
at that aim, and the suggested route remains approximately 63 metres. Its course
revision is incremented. Native proofs can use `KYOTO_PROOF_SKIP=1` to bypass
presentation through the existing Skip protocol while still requiring full rest.

Offline Chrome 157 on this laptop reproduces all 30 complete replay hashes twice.
Collision loading/indexing took 1.205 seconds. Authored shots took 15.9–547.0 ms
of worker computation in yielding batches, with the largest observed batch
14.8 ms. The main-thread heartbeat p95 was 17.4 ms, maximum 143.5 ms including
loading and test result transfers. This isolated worker check is not a rendered
frame-rate or physical-phone benchmark. Receipts:
`.local/browser-physics/{campaign,campaign-worker}-proof.json`.

The rendered interface pass completes three representative shots offline and
reproduces their persisted replays exactly in Node. All 30 courses are selectable
with their current starts, targets and hints at 1280×800 and 390×664. Keyboard
hold timing is measured from keydown, avoiding a telemetry wait that overcharged
short throws. During a full unskipped escalator flight, 1,728 frames averaged
59.97 FPS, with 16.7 ms p95, 33.3 ms maximum, no main-thread long tasks and no
skipped music steps. Maximum observed audio scheduler gap was 69.3 ms. These are
headless Chrome laptop measurements, not physical-phone results. The current
receipt and captures are under `.local/browser-physics/game/`.

## Remaining bounded tasks

1. Complete station traversal, small step-up behavior and solid convex overlap
   handling, and verify their collision against the visual station.
2. Implement browser course creation/editing, validation and durable saved
   courses using the existing interface.
3. Add independent on-demand online verification and score storage. Reconstruct
   accepted shots from validated inputs; never accept a client's claimed score.
   Package static hosting and verification without an always-on physics process
   or a fixed monthly compute subscription.
4. Verify the complete integrated game, cross-browser replay behavior and broader
   desktop/mobile controls and performance. Remove remaining runtime dependence
   on the native worker when the replacement is proven.

Keep one checkout and generated asset set, finish and integrate each bounded
change, and preserve unrelated Unity edits. No migration deployment is authorized.
