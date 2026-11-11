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
recall, Skip, course creation/revision, local progress and replays. Local leaderboards are labelled
"On this device" and are unverified. Native credentials and scores remain
separate. Independent online verification and course publishing are still required.
The [verification core](ON-DEMAND-VERIFICATION.md) independently reconstructs
walking and shots from bounded controls against its own course catalog. All 30
campaign routes pass it; authenticated submission, durable online storage and
browser synchronization are not yet connected.
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
- Browser physics retains valid load-bearing support
  when a wall also contacts the ball. Each step rechecks proximity and separating
  velocity. This fixes indefinite floor/wall corner jitter without relaxing the
  quiet linear/angular thresholds or adding a shot timeout. The existing course
  key separates physics versions and discards retired local records.
- Version `kyoto-browser-3` adds the native controller's 22 cm step height while
  retaining its 48 degree slope limit, 1.8 m body, 24 cm radius and 2.5 cm skin.
  A step requires a reachable walkable top and clear full-capsule upward and
  forward sweeps. Low ceilings, taller ledges and airborne approaches cannot
  trigger it. When descending a rounded edge, the real contact normal lets the
  body move away and down instead of hanging in midair. No station geometry or
  ball contact response changes in this version. Contact timestamps now use the
  simulation clock's Float32 precision. A real timed escalator throw otherwise
  produced matching poses and scores but a 7e-15-second Chrome/Node timestamp
  difference. That exact launch and station phase are retained in the campaign
  replay regression; no comparison tolerance is used.
- Version `kyoto-browser-4` gives the 457 convex escalator casings solid
  interiors. Centered convex hulls use the same authored corners as native
  collision, indexed in a separate spatial tree. Interior overlap correction
  moves a penetrated ball outward and prevents release from inside a casing.
  Exterior casts still use the original triangles; ordinary open meshes stay
  open. No collision pack or visual asset changes are needed.
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
- The existing design-ball interface runs entirely offline. The worker derives
  up to eight spaced targets from actual contacts and validates every disk on
  its fixed surface. Floor support uses radial grids; a complete capsule query
  checks start clearance. Dedicated zero-radius ray branches retain surface
  normals without changing positive-radius ball sweeps. Design recording keeps
  at most 512 contact candidates and 2,001 preview points while normal replay
  chunks stream to storage. Design shots never enter local leaderboards.
- A captured route can be named, saved and revised on the same device. Worker
  checks reject changed geometry, forged capture tokens and edits to another
  creator's course. Current custom courses and their exact launch solutions
  survive reload; revisions discard retired local scores. These checks support
  local authoring, not online authority. A future service must independently
  verify submitted inputs against its own geometry and rules.

## Verification

Use headless Chrome with `web/tests/background-input.mjs`; never capture the
user's pointer. Receipts and captures stay in `.local/browser-physics/`.

| Check | What it establishes |
| --- | --- |
| `npm test` | Portable geometry, impulse/spin model, floor/wall settling, separation from former support, stair masks, moving treads, recording bounds, scoring and existing UI/service regressions |
| `npm run test:browser:campaign` | All 30 actual Walker release positions; every suggested shot repeated; 184 nearby throws; targets, destinations, authored route features, zero velocity/spin at rest, no collision-budget exhaustion, independent scoring; all 30 hints repeated offline in Chrome with exact Node replay hashes |
| `npm run test:browser:local` | Rendered game, walking/home, three representative complete shots, desktop and touch controls, offline recall/Skip/replay, reload persistence, exact replay re-simulation, all 30 course selections at desktop and mobile widths, unskipped rendering/audio measurement |
| `npm run test:browser:recording` | Real offline worker beyond 240 simulated seconds without a false finish; delayed writes, stale acknowledgments, storage failure, tab locks and interrupted recording cleanup |
| `npm run test:browser:designer` | Actual station design-route capture and full-clear re-simulation; rendered offline create/play/revise/reload, forged or changed capture rejection, foreign edit rejection, touch creation, cancellation/restart and retired-score cleanup |
| `npm run test:verification` | All 30 courses verified twice from controls; complete exact replay equality; real offline Chrome walking, sprint, charge and release independently reconstructed in Node; portable forged-result and cancellation checks also run in `npm test` |
| `npm run test:traversal` | 166 station walks: 33 public stair flights, all 48 escalators, connected east atrium stairs and the complete Grand Stair-to-garden route, each in both directions; six offline keyboard walks in rendered Chrome through the real UI/worker |
| `npm run test:physics:station` | Opening-course geometry checks, including Clock In's first three native contact positions within 0.1 mm, plus Node/Chrome replay equality |
| `npm run test:physics:solids` | All 457 authored convex casings: 5,941 interior samples, 5,484 exterior casts, outward recovery and contacts on the original visible surfaces; combined-world interior lookup |
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

Offline Chrome 157 on this laptop reproduces all 30 complete replay hashes and
both the timed-contact and solid-recovery regressions twice. Collision
loading/indexing took 1.203 seconds. These cases took 3.9–448.2 ms
of worker computation in yielding batches, with the largest observed batch
8.7 ms. The main-thread heartbeat p95 was 18.2 ms, maximum 118.3 ms including
loading and test result transfers. This isolated worker check is not a rendered
frame-rate or physical-phone benchmark. Receipts:
`.local/browser-physics/{campaign,campaign-worker}-proof.json`.

The rendered interface pass completes three representative shots offline and
reproduces their persisted replays exactly in Node. All 30 courses are selectable
with their current starts, targets and hints at 1280×800 and 390×664. Keyboard
hold timing is measured from keydown, avoiding a telemetry wait that overcharged
short throws. Level selection waits for the replacement physics state, including
First Bounce, whose immediate entry briefly clears readiness without an overview.
The earlier unskipped escalator flight averaged 59.97 FPS. Subsequent runs varied
from 49.51 to 57.11 FPS, with p95 frame times of 16.8–33.4 ms, maximum 66.7 ms,
and one 54–59 ms main-thread long task per run. Music skipped no beats during
those flights; maximum audio scheduler gap was 122.7 ms. A host check reported
7.85 GB of swap in use, no recorded thermal warning and no leftover headless
test processes; the cause of the performance variation is not established.
These are headless Chrome laptop measurements,
not physical-phone results or a guarantee of 60 FPS. Current receipts and captures
are under `.local/browser-physics/game/`.

The creator integration UI run passed all desktop/mobile course selections, exact
re-simulation of its three stored shots, offline controls and reload persistence.
Its 1,832-frame flight averaged 60.00 FPS, with 16.7 ms p95, 16.8 ms maximum,
no main-thread long tasks and no skipped music beats. Maximum audio scheduler
gap was 58.7 ms. The test now waits for responsive controls to finish switching
after a viewport resize before sending menu input.

The traversal fixtures cover 80 combinations of step height, speed, direction
and station-scale coordinates, plus oblique approaches, consecutive risers,
low ceilings, reversing away, steep slopes and airborne ledges. The station
proof follows an open lane beside central handrails, crosses the actual flight
entries/exits and verifies grounded exits at the intended elevation. It also
checks that the cafe seating's real coping remains solid; those seating tiers
are not a through stair. The connected Grand Stair check walks all 14 flights,
their intervening landings and the garden endpoint without resetting the walker.
Receipts are `.local/browser-physics/walking-proof.json` and
`.local/browser-physics/walking/receipt.json`. The Chrome check substitutes only
fixture course starts in its fetched catalog; movement uses the real keyboard
controls, current collision pack and built worker while offline.

The solid-casing proof measures a maximum contact-to-authored-surface distance
of 0.00000726 m for interior recovery and 0.00000525 m for exterior casts.
Portable checks also compare 600 exterior face/edge/corner casts with analytic
rotated boxes, reject a hand inside a solid and retain open-mesh behavior.
The campaign regression includes an initially penetrated ball in an actual
east concourse casing: its first physics step escapes, it reaches full rest,
and it does not claim the distant waypoint. The receipt is
`.local/browser-physics/solid-proof.json`.

The creator station proof derives four targets from First Bounce, six from
Clock In, and a destination-only course from Basement Upward Bound. Their exact
recorded launches clear every generated target and destination at full rest.
The rendered test creates a separate route through normal keyboard input,
plays it, revises it, reloads it and saves a third revision using touch input.
Node independently reproduces each saved solution. Captures and receipts are
under `.local/browser-physics/designer/`; fixed station cases are recorded in
`.local/browser-physics/designer-proof.json`.

## Remaining bounded tasks

1. Add independent on-demand online verification, course publishing and score storage. Reconstruct
   accepted shots from validated inputs; never accept a client's claimed score.
   Package static hosting and verification without an always-on physics process
   or a fixed monthly compute subscription.
2. Verify the complete integrated game, cross-browser replay behavior and broader
   desktop/mobile controls and performance. Remove remaining runtime dependence
   on the native worker when the replacement is proven. Investigate the observed
   audio scheduler gap of about 1.1 seconds during automated course/viewport
   changes; this occurred outside the flight benchmark and its cause is not yet
   isolated.

Keep one checkout and generated asset set, finish and integrate each bounded
change, and preserve unrelated Unity edits. No migration deployment is authorized.
