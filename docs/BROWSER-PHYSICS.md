# Browser physics migration

The end state keeps the current station, Three.js presentation and all 30 courses,
with gameplay in a dedicated browser worker. Online score verification will run
on demand using the same versioned simulation and collision assets; a browser's
claimed score is never authoritative. Gameplay must continue after disconnection.
Deployment is outside the current goal.

## Delivered: opening courses and moving escalators

Acceptance checks: First Bounce, Clock In and Upward Bound playable without Unity
or a WebSocket; exact surface waypoint collection, full translation/spin settling,
recall forfeiture, Skip and replay; persistent local progress; headless Chrome
checks with desktop pointer capture disabled; real moving tread contacts and
walking carry. Follow with the rest of the campaign, complete traversal, creator,
independent score verification and broader performance checks.

Run `npm run assets:collision` once for the current asset pack, then
`npm run dev:browser -- 4430`. This preview serves the existing game at
`http://127.0.0.1:4430`, with the opening proof courses and no Unity service,
WebSocket or gameplay HTTP API. It references the existing station files directly.
Upward Bound is also enabled to exercise the moving-escalator route. All 48
station escalators now have analytical moving tread collision, surface velocity,
support, incoming-tread wake-up and grounded walking carry. Sweeps split at rail
turns, include reverse travel and the hidden return chain, and retain the custom
ball contact/spin response. Each shot has its own station clock initialized from
its recorded release time. Throw clearance checks include the moving treads.
`npm run test:browser:local` exercises the real interface against that preview.
The regular native launcher remains available until the rest of the migration
has passed; the static preview selects the browser transport with an HTML marker.

The initial collision export and custom ball solver are in `web/public/physics/`.
Generate the single local collision asset with `node tools/browser-collision.mjs`.
The input must match the current campaign layout hash. The served v2 layout comes
from `web/v2/assets.json` with its configured spawn, not the retired root layout.
Exporting positions, triangles and physical properties removes render-only data:
the initial pack is 58,843,636 bytes versus a 512,444,053-byte layout.

The ball retains the native 180 Hz custom impulse/drag/spin model. Three Mesh BVH
indexes triangles; analytic swept sphere/triangle, box and capsule tests provide
contacts. A generic library's sphere casts failed sub-millimetre floor-clearance
checks for this 23 mm ball, so it was removed. No third-party rigid-body solver
applies another impulse. Runtime BVH construction belongs in the worker.

## Evidence and remaining work

- `node web/tests/browser-physics.mjs`: geometry, contact response, spin and rest,
  fixed-step repeatability, stair masks, compact format validation.
- `npm run test:physics:station`: full-station Node and headless Chrome worker
  proofs. Both run each opening shot twice, compare every recorded pose, contact
  and score byte for byte, require all waypoints and zero linear/angular velocity,
  and compare final scoring with the existing authoritative scoring module.
  Chrome runs disconnected after loading the worker/asset and checks recall
  forfeiture while the main thread continues receiving events. These are physics
  runtime checks, not yet proof of playable browser levels. Clock In's first
  three contact positions agree with the native recording within 0.1 mm.
- November 10 Chrome 157 check on this laptop: worker loading/indexing 1.071 s;
  First Bounce 34.084 simulated seconds in 306 ms, Clock In 26.823 seconds in
  106 ms. Main-thread heartbeat p95 17.0 ms, maximum 113.7 ms during the test.
  This isolated worker test does not establish full-game 60 FPS or audio quality.
  Small local receipts: `.local/browser-physics/{station,worker}-proof.json`.
- The full interface passes both courses while offline, including walking,
  Start, keyboard/desktop Skip, recall of an already computed shot, replay
  seeking, saved records after reload, touch hold/release and mobile Skip.
  Stored UI replays reproduce every pose, contact, target and score in Node.
  A complete unskipped Clock In flight at 1280×800 measured 1,610 frames:
  60.0 FPS average, 16.7 ms p95, 16.8 ms maximum, zero main-thread long tasks and
  zero skipped music steps. Audio's scheduler advanced 100 steps over the shot.
  This is a headless Chrome laptop result, not a physical-phone or whole-campaign
  benchmark. Receipt and current UI captures: `.local/browser-physics/game/`.
- The existing interface now uses worker states and trajectory chunks. Scores and
  full replays are saved atomically in IndexedDB only when playback presents the
  result. Recall discards a computed-but-unpresented result. The local board is
  labelled "On this device"; these records have not been independently verified.
  Existing native guest credentials and scores are not overwritten.
- Walking uses continuous full-capsule queries, wall sliding and ramp support.
  Portable tests cover a waist-height obstruction, sideways sliding, climbing a
  stair ramp and standing still on a slope. Full station traversal and small
  step-up behavior remain to be verified or completed.
- `npm run test:physics:motion` covers analytical tread contacts, support, wake-up,
  stationary-floor sleep, both rail directions, wrap and boundary crossings,
  exhaustive-versus-indexed sweep equivalence and walking carry. It is also part
  of `npm test`. Run `node web/tests/browser-escalators.mjs --station` for the real
  asset: all 48 lanes pass grounded idle carry, and 1,380 rendered-tread top
  comparisons at five phases differ from collision by at most 0.00000213 m.
  Receipt: `.local/browser-physics/motion-proof.json`.
- The full-station and offline Chrome worker proofs now include Upward Bound.
  Its authored input reaches the upper exit after real tread contact and settles
  in 30.990 simulated seconds, scoring 113,037. Node and Chrome match every pose,
  contact, target and score exactly. Chrome computed it in 348 ms in batches of
  at most 8.1 ms; the two opening-course proof hashes remain unchanged.
- The full interface also completes Upward Bound offline at its live release
  phase; its stored replay reproduces exactly in Node. Unskipped playback at
  1280×800 measured 1,768 frames, 59.93 FPS average, 16.8 ms p95 and 33.2 ms maximum,
  with zero main-thread long tasks and zero skipped music steps. The music
  scheduler's largest observed gap was 309 ms; this is measured headless Chrome
  behavior, not proof of physical-device audio quality. Desktop/mobile controls,
  recall, Skip and durable records pass in the same three-course interface run.
- Still required: convex solid overlap handling, all-course proof, creator,
  on-demand authority, cross-browser determinism and broader device/performance
  benchmarks. The browser preview
  does not provide course creation yet.
- Keep one generated collision pack under `.local/browser-physics/`; do not commit
  generated assets or make duplicate station bundles. Preserve unrelated local
  Unity package edits. Test the browser headlessly with `background-input.mjs`.

The browser worker is bundled with [esbuild](https://esbuild.github.io/api/#bundle),
including the existing scoring module. It uses the distinct `kyoto-browser-1`
physics version so its results cannot mix with native leaderboards. The worker
computes a shot in yielding batches. Its UI adapter preserves the existing
playback/Skip/rotation-sample interface and fences results by attempt ID.

## Next bounded task

Bound compute-ahead for shots that keep moving, without timing them out or
banking them early. Then prove all 30 authored routes and station traversal,
including small steps and convex solids; enable the complete campaign, finish
creation/editing and add independent on-demand score verification. Keep
integrating each finished task; the overall migration remains incomplete until
those requirements and the final performance checks pass.
