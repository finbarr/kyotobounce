# Browser migration acceptance audit

This audit keeps the full migration objective. It is not a completion receipt.
The client cleanup removes the last shipped native connection fallback.
Current acceptance and the remaining gaps are recorded separately below.
No live replacement has been deployed or native host stopped.

## Requirements and evidence

| Requirement | Evidence and scope |
| --- | --- |
| Keep the station, renderer, interface and audio | Current Three.js entry point, manifest-pinned station, existing UI and Web Audio modules; rendered offline gameplay and creator checks. No visual assets changed in the connection cleanup. |
| Start with two playable levels, then retain all 30 | Rendered First Bounce and Clock In checks, followed by campaign proof for all 30 current course IDs and revisions. Campaign menus exercise all 30 at desktop and mobile widths. |
| Dedicated browser physics; no gameplay server dependency | `game.js` always opens `browserConnection`; it creates the module worker. Native WebSocket client, session-reconnect logic and native level/replay fetch fallbacks are removed. Startup/static checks require the retired connection URL and gameplay APIs to return 404; browser tests reject WebSockets and gameplay API requests. |
| Canonical collision and visual agreement | Station release/configuration checks bind the same layout hash to visuals, catalog and 58,843,636-byte collision pack. Station contact proof, all 457 convex casings and 1,380 rendered-tread comparisons supplement the hashes. |
| Walking, stairs and escalators | Portable capsule/stair cases; 83 station routes in both directions (166 walks), all 48 moving lanes, and six rendered keyboard walks. Includes the connected Grand Stair route to the garden. |
| Custom bounce and spin | Existing impulse/material model, analytic contact fixtures, full spin/rest tests and comparison with opening native contact positions. The browser has its own physics version and scores. |
| Throwing, waypoints and scoring | 30 suggested solutions repeated exactly, 184 nearby samples, authored route-feature checks, real Walker release positions and independent score calculation. Every stored campaign receipt passes and rests; every hint clears its complete course. |
| Full physical settling | Solver checks both velocity and spin, with no timer-generated finish. Portable and worker tests keep a moving shot pending beyond 240 simulated seconds. Collision-budget exhaustion cannot yield a verified result. |
| Recall forfeits | Local intent and worker attempt fences, early/late recall tests, and rendered recall after compute-ahead but before presentation. No provisional result becomes a saved score. |
| Skip and full replays | Worker storage acknowledgments and real-rest completion; rendered desktop/touch Skip, replay seek, reload and exact independent reconstruction of saved controls, poses, contacts and scores. |
| Creator and saved progress | Actual station design capture plus rendered create/play/revise/reload/cancel; IndexedDB atomic results, selected course, completed courses and creator solutions. Online publication requires an independently verified complete solution. |
| Offline gameplay after loading | Real browser network disabled after loading for walking, throws, recall, Skip, local scores, replays, creator and all course selections. This does not claim cold offline navigation before assets are available. |
| Authoritative optional online scores | Strict control-only verifier schema; trusted catalog/collision data; independent walking, launch and complete flight reconstruction. Emulator tests cover forged results, authentication, restart/checkpoints, quotas, course revisions and atomic ranking. Browser tests cover queued uploads, reload, shared courses and public replay verification. |
| No always-on physics or fixed compute subscription | Static package has no gameplay service. The Linux verifier container passes all 30 course proofs and restart checks. Deployment configuration uses request billing and zero minimum instances; actual hosting would still have usage-based costs. No cloud deployment is claimed. |
| Replay determinism across browsers | Matching catalog/input hashes; Chrome, Firefox and WebKit each reproduce all 30 hints and two regressions twice offline against exact Node result hashes. Includes launch/rotation fixtures and real controller input reconstruction. |
| Desktop and mobile controls | Headless keyboard and native Chrome touch checks: movement, aim, charge ownership, Cancel, spin, speed, Skip, recall, replay, scout, orientation and return to desktop. This is browser/device emulation, not physical-phone testing. |
| Smooth Chrome rendering and audio | Phase-specific profiling led to static render culling and corrected resolution decisions. Fresh Chrome gameplay with an advancing audio clock records 60.00 FPS across 1,902 frames at pixel ratio 1, 16.8 ms p95/maximum, no long tasks and no skipped music steps. See rendering acceptance below for scope and limits. |
| Sequential integration without duplicates | One checkout and generated asset set; bounded commits merged into main. Source-only installation uses a disposable directory that is removed afterward. No new persistent project, model copies or Unity builds are required. |

## Evidence identity

The inspected core receipts are under `.local/browser-physics/` and
`.local/verification/`. They remain local; regenerate them with the commands in
[BROWSER-PHYSICS.md](BROWSER-PHYSICS.md). The audit also inspects the tests' actual
assertions; a receipt's existence alone is not a pass.

- Served layout: `7ff45a1d80a05733f86c46145022ed4f802cd0b1e276e1b6c1b42e559b9b3cd2`.
- Runtime physics: `kyoto-browser-4`.
- Catalog SHA-256: `e7111b906ae46d338b451a84e2aa5d01ce3d0d5d86cb819a73514b8157d1c28f`.
- Campaign input SHA-256: `21468313f52077c6cb323867298960246d9b3aa36da4907e0805d4b1b474e8e0`.
- Collision SHA-256: `62e0e5a0e623f0171ed06c282dc5ea1376b0bb03d48489d3a851e25c3fbbeb79`.
- Rebuilt verifier SHA-256: `e38c28890e9b2132fd769d5df12efabb810a6503e1b7f07063a7d8dbb0344107`.

Rebuilding the verifier from `fe12eca` produced exactly the prior tested bundle,
including matching catalog and collision identities. The source catalog still
contains the native physics label; every browser/verifier entry point applies
`BROWSER_PHYSICS`. This audit checks the served identity rather than treating
that source label as the browser runtime. Native source is operational reference
for the old deployed release, not a fallback for this game.

## Client cleanup acceptance

The source checks (`typecheck`, `npm test`) and browser build pass. Fresh normal
startup passes its seven command checks, six independently reproduced saved
shots, full rest, recall, repeated native-touch Skip, reload persistence and all
30 course menus at desktop and mobile widths.

The refreshed campaign proof clears all 30 repeated hints and all 184 nearby
inputs, with exact independent scoring and full rest. Chrome repeats all 32
campaign/regression cases twice offline against the Node hashes. The rebuilt
static package has 120 files and 224,931,464 bytes. Its checks verify the file
inventory, chunk hashes/limits, deep links, attribution and absence of native
API/connection routes. Packaged Chrome gameplay repeats the six exact saved
shots and all course menus; creator checks reproduce three saved revisions and
exercise native touch and cancellation. Missing collision data offers Retry.

Packaged online-score checks pass offline queueing, recall exclusion,
reconnect/reload, independently verified standings, local/online switching and
another player's public replay with an offline cache. No gameplay WebSocket is
opened. Screenshots of desktop/mobile results and creator review were inspected.

The publication test initially missed a generated route because its real
keyboard hold arrived 17 ms longer than the recorded design hold. That test now
uses capped full-power design throws, retaining every target/destination clear,
independent verification, revision and publication assertion. It also writes a
failed receipt before running, so an older success cannot survive a failed run.
The rerun passes publication, a fresh visitor, public custom-course replay,
offline multi-edit revision publication, atomic promotion and deliberate
adoption of a new revision without changing geometry during flight.

## Rendering acceptance

Fresh default-startup and packaged runs had measured 50.36 and 49.79 FPS,
both with 33.4 ms p95, despite a 60 FPS empty-page clock. A Chrome CPU profile
found flat station traversal and render submission dominating after the physics
worker had already finished. The renderer now partitions immutable architecture
under identity containers and rejects entire offscreen branches. It reuses all
meshes/materials and world transforms, preserves ray-query ordering, and restores
all casters if the static shadow map needs refreshing. Moving actors/escalators
remain outside this index.

The profiled comparison reduced average render CPU time from 6.83 to 4.66 ms;
roughly 1,236 objects per frame were skipped. Those profiled shots still ran
around 50 FPS. Their resolution telemetry exposed another defect: the median
frame time remained 16.7 ms during frequent missed refreshes, causing the old
controller to increase resolution even during a roughly 42 FPS interval.
Resolution decisions now use mean and p95 frame time, with sustained recovery
before raising quality. Increases wait for aiming; active shots keep a stable
quality level unless overloaded. Automatic changes wait through menus/overview
transitions, where canvas reallocations had caused 150–242 ms stalls. Regression
fixtures cover the misleading median, flight recovery and transient views.

An unprofiled packaged Chrome 157.0.8103.52 run passed six independently
reconstructed shots and measured 60 FPS at pixel ratio 1, but that run is not
valid combined rendering/audio evidence: music stayed at step 2 despite the
context reporting "running". The transition test correctly rejected the frozen
clock. An isolated empty-page probe reproduced it with the default output:
currentTime advanced only 0.0053 seconds over 1.5 seconds of wall time. Chrome's
supported silent sink advanced 1.5013 seconds over the same interval.

The test harness now uses that real-time silent sink when supported, retaining
real graph processing and note lifecycles without touching the user's audio
settings. The product audio code is unchanged. Gameplay checks now require
actual music-step advancement at the intended tempo, as well as zero skipped
beats, and reject a frozen clock at startup. The earlier profiles remain CPU
and rendering diagnostics, not proof of healthy audio.

With the real audio clock advancing, an intermediate flight measured 55.02 FPS.
It held 60 FPS for several seconds, then lost frames when the old recovery
policy raised resolution mid-shot. The final policy's unprofiled Chrome run
passes all six independently reconstructed shots, offline controls/recall/Skip/
replay, native-touch holds, saved progress, 60 course-menu selections and Retry.
At 1280×800 its 1,902-frame flight measured 60.00 FPS, 16.8 ms p95 and maximum,
zero long tasks and zero Long Animation Frames. Music advanced from step 57
to 176 at the expected tempo without skipped beats; the maximum recorded
scheduling gap was 40 ms. Pixel ratio remained 1, mean render CPU was 3.81 ms,
and roughly 1,249 static objects per frame were skipped. This is a measured
laptop sample, not a universal frame-rate or physical audio-device guarantee.

The final transition pass covers all 30 courses at desktop and mobile widths:
130 operations, 4,677 frames, 59.19 FPS mean, 16.8 ms p95 and 66.8 ms maximum.
Both longest frames occurred during actual viewport resizing. Music advances
through step 297 without skipped beats; maximum scheduling gap is 90.7 ms.
There are no new shader links or WebGL calls above 5 ms. Two earlier headless
pointer checks stalled in the driver's scroll-into-view command on visible
buttons. Overview entry and replay exit now use native keyboard activation,
with visible/enabled checks; gameplay assertions and native-touch throws remain.
This is not claimed as a product fix for that unexplained driver behavior.

Portable checks cover 366,591 visible vertex samples, transformed and nested
render groups, camera returns, authored visibility, dynamic exclusions, shadow
refresh and ray-query preservation. Typechecking, the repository suite and the
browser/static build pass. The package contains 122 files / 224,936,274 bytes.
Receipts: `.local/browser-flight-test/`, `.local/browser-flight-culling-test/`,
`.local/browser-flight-budget-test/` and `.local/browser-flight-transition-test/`;
no station assets were copied for these diagnostic directories.

## Outstanding acceptance

- Viewport changes still cause occasional long frames (66.8 ms in the final
  transition run). The measured 60 FPS flight does not prove every camera,
  display density or physical phone meets that rate.
- One native-touch full-hold check recorded only 25% power. The next run's three
  full holds passed. Bounded charge/release diagnostics now accompany failure
  receipts; the original discrepancy is unexplained, not a claimed product fix.
- A real short key hold missed the escalator target. Independent simulation
  reproduced its score exactly; nearby timing/power samples can legitimately
  miss. The playback benchmark requires moving-tread contact, real rest and
  exact independent replay instead of presuming a clear from approximate wall
  time. The separate full campaign suite still requires every authored solution
  to clear and retains all neighbor-tolerance checks.
- Earlier intermittent audio gaps and a Skip timeout remain documented in
  BROWSER-PHYSICS.md. Subsequent successful measurements do not establish their
  cause or claim they are fixed.
- The verified six-file `assets-v8` archive is local. Public upload awaits explicit
  permission after automatic approval review rejected it; a fresh default
  download cannot work until publication. The local-archive setup path has
  source-only installation and gameplay acceptance.
- Deployment and retirement of the live native host require separate explicit
  authorization. Local packaging and emulator/container tests are not production
  cutover evidence. Preserve current authoritative scores for that decision.
