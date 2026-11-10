# Browser physics migration

The end state keeps the current station, Three.js presentation and all 30 courses,
with gameplay in a dedicated browser worker. Online score verification will run
on demand using the same versioned simulation and collision assets; a browser's
claimed score is never authoritative. Gameplay must continue after disconnection.
Deployment is outside the current goal.

## Current bounded task: First Bounce and Clock In

Acceptance: both courses playable through the existing interface without Unity
or a WebSocket; exact surface waypoint collection, full translation/spin settling,
recall forfeiture, Skip and replay; persistent local progress; headless Chrome
checks with desktop pointer capture disabled. Follow with walking/escalators and
the rest of the campaign, creator, independent score verification and performance.

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
- November 10 Chrome 157 check on this laptop: worker loading/indexing 1.133 s;
  First Bounce 34.084 simulated seconds in 307 ms, Clock In 26.823 seconds in
  107 ms. Main-thread heartbeat p95 17.1 ms, maximum 102.1 ms during the test.
  This isolated worker test does not establish full-game 60 FPS or audio quality.
  Small local receipts: `.local/browser-physics/{station,worker}-proof.json`.
- Still required: browser worker/UI integration, walking, moving tread collision
  and wake-up, convex solid overlap handling, all-course proof, creator, saved
  progress, on-demand authority, cross-browser determinism and device benchmarks.
- Keep one generated collision pack under `.local/browser-physics/`; do not commit
  generated assets or make duplicate station bundles. Preserve unrelated local
  Unity package edits. Test the browser headlessly with `background-input.mjs`.

The browser worker is bundled with [esbuild](https://esbuild.github.io/api/#bundle),
including the existing scoring module. It uses the distinct `kyoto-browser-1`
physics version so its results cannot mix with native leaderboards. The worker
currently computes a shot in yielding batches; UI playback, persistent local
records and independent on-demand verification are the next integration work.
