# Browser migration acceptance audit

This audit keeps the full migration objective. It is not a completion receipt.
The client cleanup removes the last shipped native connection fallback.
Current acceptance and the remaining gaps are recorded separately below.
The private Sites replacement is deployed; the public native game remains live.

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
| No always-on physics or fixed compute subscription | The private Sites/D1 deployment serves browser gameplay and on-demand score verification without a dedicated compute instance. Hosted delivery and D1 reads pass; managed verification resource acceptance remains. The old public native host has not been retired. |
| Replay determinism across browsers | Matching catalog/input hashes; Chrome, Firefox and WebKit each reproduce all 30 hints and two regressions twice offline against exact Node result hashes. Includes launch/rotation fixtures and real controller input reconstruction. |
| Desktop and mobile controls | Ten headless keyboard/native Chrome touch groups cover movement, aim, charge ownership, Cancel, spin, speed, Skip, recall, replay, scout, orientation and return to desktop. Six timed holds compare physical contacts, worker messages and final power; seven saved replays reconstruct exactly. This is browser/device emulation, not physical-phone testing. |
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

Rebuilding the verifier from `6cdc2a5` produced exactly the prior tested bundle,
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

## Native charge and Skip acceptance

The focused control check runs six more throws through Chrome's real touch
events: 600 ms and 1,900 ms partial holds, four 2,900 ms full holds, immediate
and 600 ms delayed Skip, and a charging finger dragged outside the button.
It observes pointer events, charge/release posts and the worker's first/last
charge states without injecting physics inputs or results. Every full hold
must reach power 1 and clear both Clock In waypoints. Every result must have
zero translation/spin, physical sleep and no exhausted collision budget.

Chrome 157.0.8103.52 passes all ten control groups. The actual partial holds were
617.6 and 1,917.2 ms, yielding powers 0.2205357 and 0.6847143; the largest
command-clock discrepancy was approximately 0.1 ms. All four full holds reached
power 1. The verifier independently reproduces all seven saved touch/spin and
timed-hold shots, including complete poses, contacts and scores. Music advances
from step 6 to 109 across 27.66 seconds without skipped beats; its maximum
recorded scheduling gap is 101.3 ms. All interactions after loading are offline.

The test reuses the integrated static package; its game, culling, quality,
touch and physics-session sources were checked against the current checkout.
No gameplay code or assets changed. Visible controls no longer request an
unnecessary scroll from the headless driver; actual touch contacts still target
their rendered positions. Evidence is in `.local/browser-release-test/controls/`.

## Release-readiness audit

The November 12 audit of `6cdc2a5` checks the current files against the receipts
above. Local implementation acceptance passes; the full migration remains
incomplete because public setup and the live replacement are not accepted.
The exact commit's [Source checks run](https://github.com/finbarr/kyotobounce/actions/runs/43277544067)
completed successfully. This audit changes documentation only.

- All 214 campaign receipts pass and reach rest. All 30 hints clear their
  complete course, and every course meets its authored neighbor-clear minimum.
  Their catalog/input hashes match the current files.
- All three browser workers match the 32 Node result hashes, including both
  regressions, and record a zero-score recall. The worker tests repeat each
  case twice offline; the audit inspected those assertions as well as the
  receipts. The independent verifier, HTTP/Firestore service and Linux
  container receipts each cover the exact current set of 30 course IDs and
  agree with the campaign scores.
- The walking proof covers 83 routes in both directions. Existing creator,
  online queue/public replay, sharing, startup, native-touch and rendering
  receipts pass within their documented scope. The latest rendering/audio
  evidence is the 1,902-frame flight and 130-operation transition run above.
- An in-memory rebuild produces the exact packaged physics-worker bytes.
  All 85 copied public source files match the checkout, accounting for the
  intentional static HTML configuration. All 122 package files satisfy the
  size limit; every manifest entry and chunk hash matches, and reassembled
  assets match their original byte count and SHA-256. No second asset tree is
  created. The package's older `sourceCommit` field alone was not treated as
  proof of its contents.
- `assets:verify` passes. The local six-file archive matches its pinned hash,
  and the source-only setup receipt matches the current asset manifest and
  regenerated collision checksum. Rebuilding the verifier also preserves the
  tested server hash, campaign and collision identities.

The current local audit receipt is
`.local/migration-audit/release-audit.json`. The older `core-receipts.json`
predates the renderer work and is not current performance acceptance. Likewise,
the rendered browser-matrix summary was overwritten by a Chrome-only run; it
does not prove a fresh rendered pass in all three engines. The separate physics
engine matrix does cover all three engines and its sources are unchanged.

### Remaining release gates

| Gate | Observed state and required next action |
| --- | --- |
| Public source setup | Complete: after explicit archive/destination approval on November 12, `assets-v8` was published and its public download streamed through SHA-256 verification. All 159,537,468 bytes match the pinned archive hash. The archive was also reopened and all six regular files checked against the manifest; there are no extra entries. Receipt: `.local/asset-pack/publication-receipt.json`. |
| Hosted verifier and browser | Private Sites version 1 is deployed with a same-origin D1 verifier. Its migration, read-only API and hosted/offline browser play pass. Actual managed score verification still needs the explicitly approved record-creating acceptance run. |
| Existing authoritative scores | No production scores have been imported, reset or deleted. The new verifier's restart tests prove its own score durability; they do not prove preservation of the current live database. Before cutover, obtain and verify a consistent backup and settle how current live scores are retained. Native results must not be relabelled as verified browser-physics results. |
| Retire fixed compute | A read-only request to `https://kyotobounce.com/api/health` still returns `status: ready`, `scope: online`, `worker: true`, `shotPlayback: true`. The native service remains live. Stop and release its compute allocation only after the replacement and score handling are accepted and retirement is authorized. |

The original local audit made no production changes. The asset release above
is now public; the live game remains unchanged. The user has authorized finishing
the migration and DNS changes, and selected Sites + D1 with independent score
verification. The compact collision-world experiment now reproduces all 216
campaign/regression results exactly, plus all 30 independent verifier receipts
inside local Cloudflare workerd. Retained workerd memory measured about 87 MiB;
cold-start allocation peaks and managed CPU/memory limits still require deployed
acceptance. See [the compact-world measurements](ON-DEMAND-VERIFICATION.md#compact-collision-world-for-workers).
The D1 implementation now passes local workerd integration for authentication,
immutable uploads, saved checkpoints, standings, replay, course publication,
quotas, cleanup and concurrency. All 30 real station courses survive a complete
workerd-process restart and finish with the independent Node result; see
`.local/verification/d1-station-proof.json`. The portable checkpoint codec also
passes the reference Node/Firestore integration. Browser physics assets are
unchanged; previous Node-verifier bundle hashes predate this backend change.

The actual browser now also passes offline desktop/touch shots, queued score
uploads after reconnect, reload with the verifier unavailable, retained identity,
verified rankings and public replay reconstruction/offline caching against local
workerd + D1. Two consecutive runs passed; the current receipt is
`.local/verification/browser-d1/receipt.json`. The first run's renderer-lighting
reload stall remains unexplained; test diagnostics were added without changing
product rendering behavior.

The production Site build now packages the existing game and compact verifier
with a schema-only D1 migration. Local workerd accepts the real packaged assets,
same-origin API and a process restart during station-score verification. The
packaged browser tests pass offline shots/reconnect/replays plus real creator
publication, ownership, multi-edit revisions and public catalog adoption on D1.
Receipts: `.local/verification/sites-runtime.json`,
`.local/verification/browser-sites/receipt.json` and
`.local/verification/course-sharing-sites/receipt.json`.

The first owner-private Sites deployment is version 1 from `ee3c4bf`, at
https://kyoto-bounce.finbarrtaylor.chatgpt.site. Hosted schema inspection confirms
all eight D1 tables. Authenticated read-only health, campaign and leaderboard
requests pass, as does a real headless browser shot after disconnecting from the
network. All write requests were blocked in that check; hosted player and attempt
tables remain empty. Receipt: `.local/sites/read-only-hosted.json`.

The initial archive exceeded Sites' 256 MiB expanded limit. Lossless per-chunk
gzip brings the deployment to about 242 MiB. The bounded decoder checks the
original raw hashes, and the packaged verifier still exactly matches a fresh
original-world simulation after cold load and process restart.

Managed verifier CPU/memory acceptance and current-score handling remain before
public cutover. The existing public domain and native service are unchanged.
The proposed Google Cloud project was not created. The Cloud Run package is
earlier implementation evidence, not the selected deployment target.

## Measurement limits and unresolved observations

- Viewport changes still cause occasional long frames (66.8 ms in the final
  transition run). The measured 60 FPS flight does not prove every camera,
  display density or physical phone meets that rate.
- One earlier native-touch full hold recorded only 25% power. It did not recur
  in the focused timed-hold/Skip check above. Pointer, command and worker-charge
  evidence now accompanies failures; the original cause is unexplained and no
  speculative gameplay fix is claimed.
- A real short key hold missed the escalator target. Independent simulation
  reproduced its score exactly; nearby timing/power samples can legitimately
  miss. The playback benchmark requires moving-tread contact, real rest and
  exact independent replay instead of presuming a clear from approximate wall
  time. The separate full campaign suite still requires every authored solution
  to clear and retains all neighbor-tolerance checks.
- Earlier intermittent audio gaps and a Skip timeout remain documented in
  BROWSER-PHYSICS.md. Subsequent successful measurements do not establish their
  cause or claim they are fixed.
