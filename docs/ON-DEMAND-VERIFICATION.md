# On-demand score verification

The browser must submit legal controls, not a finished score or a claimed ball
trajectory. The verifier resolves the current course from its own catalog, loads
the pinned station collision pack and replays walking from that course's start.
It reconstructs hand clearance, launch velocity and spin, then runs the existing
solver and scoring rules until full physical rest or an actual forfeit.

## Input proof

`web/verification.mjs` accepts a versioned header and a stream of run-length
encoded walking controls. Headers bind the course ID/revision, layout, physics
and scoring versions. Controls contain only normal/sprint movement, heading,
bounded aim/spin/power, and station release/charge times. Unknown fields and
invalid ranges are rejected. A client cannot supply the launch position,
velocity, collisions, waypoint hits or score.

Walking includes stationary physics steps and the frozen-input steps during
charging/release. Its reconstruction uses the same initial grounding and the
same capsule, stair and escalator rules as the game. Release time binds the
moving-tread phase. Power remains a bounded control: the browser charges using
wall time while its station clock can advance more slowly during tab stalls.
Verification establishes a physically legal input sequence, not that a human
generated those controls in real time.

`ShotVerification.advance()` performs bounded work and returns replay chunks.
Yielding never finishes a shot. The caller continues until the status is
`verified`; a cancelled or failed job supplies no acceptable score. Walking
input and replay streams need not all live in memory. The online service saves
server-owned checkpoints between requests. A continuation supplied by a client
is never accepted as trusted physics or scoring state.

The browser now records each actual fixed-step walking control, including idle,
charging and release movement. Runs of identical controls are compressed, with
at most 128 runs in a pending chunk and 128 accumulating runs in the worker.
Storage acknowledgments apply backpressure; release waits for its final control
chunk to commit before launching. A storage error forfeits the pending attempt.

IndexedDB stores each walking route once. Attempts reference immutable prefixes;
consecutive throws do not copy the route. Returning home or selecting a course
starts a new route. Cleanup removes unused tails, abandoned routes and retired
course references, while browser locks protect other active tabs. Complete
replays carry the route reference and versioned input header. `inputProof()` and
the bounded `inputChunks()` iterator expose saved controls after reload. These
records remain untrusted until independently simulated. Design capture itself
is not a ranked attempt; playing a saved custom course records controls normally.

The authenticated HTTP service verifies and stores campaign scores, standings,
completion and public replay inputs. The browser synchronizes saved campaign
and published custom-course shots when a verifier is configured. Its creator
can queue a course for publication after saving a complete legal playthrough.
No verifier has been deployed.

## Compact collision world for Workers

The verifier imports the browser's actual `Walker` and `Shot` modules, including
their collision, motion, bounce, spin and scoring routines. It independently
reconstructs a shot from controls; it does not ask the browser to attest its score.

`web/verification-world-build.mjs` prepares a compact representation of the same
station at build time. It preserves the spatial tree and triangle visitation
order, shares only bit-identical vertices, bakes the triangle permutation into
the index buffer, uses 16-bit shape IDs where possible, and deduplicates surface
profiles. `VerificationWorld` inherits the existing collision routines. Primitive
and convex-solid coordinates retain their original precision, including signed
zero. Bounded caches reconstruct surface objects and walking faces on demand.
No render meshes, textures or renderer are loaded by verification.

The loader reads checksum-verified chunks of at most 4 MiB directly into final
arrays. It does not decode the original collision archive or build a spatial tree
inside a request. Output is disposable generated data in
`.local/verification/world/`, not a new station export or independent physics model.
The D1/Workers integration uses this loader. The earlier Node/Firestore reference
service still loads the original pack; it is not the selected hosting target.

November 12 local checks:

| Check | Result |
| --- | --- |
| Exact Node comparison | All 214 campaign samples and two regression shots match the original full-result hashes, including trajectories, contacts and scores. |
| Local Cloudflare workerd | All 30 course solutions match the existing independent verifier hashes; four concurrent requests also match. |
| Stored collision arrays | 76,302,170 bytes; metadata JSON is 7,039,893 bytes. |
| Constrained Node retained heap + buffers | About 103 MiB after explicit collection, with a 48 MiB old-space cap. |
| workerd retained heap + backing stores | About 87 MiB after heap snapshots; request-boundary samples before collection were about 102 MiB. |

These measurements demonstrate exact replay and a smaller retained footprint.
They do not capture every allocation peak during cold loading, prove CPU allowance,
or enforce the managed platform's 128 MB isolate limit. Taking a heap snapshot
collects garbage; it is a diagnostic test action, not a production requirement.
The local runtime test records raw and collected measurements separately and
includes reported embedder memory. Actual Sites acceptance is still required.
[Workers limits](https://developers.cloudflare.com/workers/platform/limits/).

After installing the current assets and building collision data, reproduce with:

```sh
node web/tests/browser-campaign.mjs
node web/tests/verification-station.mjs
npm run build:verification:world
npm run test:verification:world
npm run test:verification:worker
```

Receipts are `.local/verification/world-proof.json` and
`.local/verification/world-runtime-proof.json`. Portable fixture and corrupt-chunk
checks run in `npm test`; Miniflare/workerd are pinned development dependencies.

Further savings can come from caching independently verified results by canonical
inputs, course revision, layout, physics and scoring versions, and submitting only
attempts relevant to personal bests, completion or course publication. A matching
server-verified walking prefix can also be reused. Client-supplied checkpoints,
contact lists or subsets of the station cannot establish correctness: omitted
walls or contacts could otherwise fabricate a valid-looking result. These ideas
are not implemented by the compact-world change.

## D1 and Workers service

`web/online/d1-service.mjs` implements the browser's existing online protocol on
D1. `web/online/fetch.mjs` supplies Fetch-native HTTP routing, strict request
schemas, bounded JSON bodies, authentication, CORS and an isolate request gate.
The service includes immutable input uploads, resumable verification, authoritative
standings, independent completion, public replay inputs, creator publication and
revision promotion. It uses the same physics and scoring code as the Node service.
No D1 code accepts a client score, launch position, contacts or checkpoint.

The schema is `web/online/d1-schema.sql`; request handlers never create tables.
It is applied explicitly to isolated local test databases. Hosting integration
must package it as a schema-only Site migration before deploying this backend.
No hosted D1 database or Site deployment is claimed by these local checks.

D1 batches are atomic, but do not expose Firestore-style interactive transactions.
`d1-storage.mjs` reads through a primary-first D1 session and validates a shared
revision inside the commit batch. A named CHECK constraint aborts the whole batch
if another writer changed that revision. Only that conflict is retried; storage
outages remain retriable errors without fabricated scores. This keeps quotas,
leases, input chunks, accepted attempts and course promotion consistent across
isolates. The shared revision favors simple, strict consistency for this game's
traffic; managed-service contention and latency still need measurement.
[D1 batch and session APIs](https://developers.cloudflare.com/d1/worker-api/d1-database/).

Each advance request performs at most four batches of 180 fixed physics steps.
This hard work bound does not depend on a Workers clock advancing during pure CPU
work. A budget ends the request with a private checkpoint, never a completed shot.
Progress queries rank a whole page in SQL and fetch its custom courses together,
avoiding a separate set of database calls for every level. Recall immediately
removes an accepted attempt from standings and completion calculations.

The shared checkpoint codec now uses a compressed portable object graph rather
than Node V8 bytes. It retains Maps, Sets, undefined, infinities, signed zero,
shared references and support-contact state. Both runtimes reconstruct the same
walking/flight state, and a checkpoint remains bound to its player, attempt and
course definition. Retired development checkpoint bytes are not migrated.

Validation on November 12:

- `npm run test:verification:d1` runs the actual workerd Fetch handler and local
  D1 database. It covers strict inputs, authentication, duplicate/concurrent
  uploads, process restart, exact scores, replay, ranks, recall, publication,
  ownership, revision races, progress pagination, storage rollback, expired
  leases, quotas and bounded cleanup. Cleanup of a losing publication retains
  current accepted progress even when it shares the winning course's geometry.
- `npm run test:verification:d1:station` verifies all 30 real station courses.
  Each job saves a checkpoint, the entire workerd process exits, and a fresh
  process reopens the same D1 files and finishes with the exact independent Node
  result. Initial checkpoints were at most 1,815 bytes. The receipt is
  `.local/verification/d1-station-proof.json`.
- The existing Node checkpoint suite and Firestore integration suite also pass
  with the portable codec and shared quota arithmetic. Source CI runs both D1
  and reference-service integration checks.

Remaining integration work is the production Site entry/build, D1 migration
packaging, real browser synchronization against this backend, and managed-hosting
CPU/cold-load acceptance. The existing live native service remains unchanged.

## Browser synchronization

The static shell may set a `kyoto-verifier` meta tag to the HTTPS origin of the
service. Local preview accepts `KYOTO_VERIFY_URL=http://127.0.0.1:4432` before
`npm run dev -- 4430`. Without this configuration, the game remains
entirely local and sends no score-service requests. HTTP is accepted only for
loopback development origins; credentials cannot appear in the configured URL.

IndexedDB saves a banked shot and its outbox entry atomically. Merely finishing
compute-ahead does not queue a result: the player must reach the displayed result
without recalling. Uploads stream the saved control prefix, continue from the
server's acknowledged chunk count and retry the same immutable attempt ID.
Network failure cannot cancel gameplay, change the physics connection status or
delete a local result. Reload retains the queue and the per-endpoint credential;
browser locks serialize synchronization across tabs. Reconnection and bounded
retry backoff resume pending work. Custom courses stay local until their creator
chooses **Publish level** after clearing every waypoint and finish zone.

Publication requests persist separately from score submissions and reference
the already saved control stream. A reload or outage resumes the same immutable
job. A queued course cannot be revised, including through another database
connection, until that job finishes. Successful publication atomically replaces
the private draft with its public definition; it does not copy assets or replay
poses. Several offline draft edits become one next public revision. Scores from
retired draft revisions are discarded instead of migrated. Failed publication
leaves the local course and saved solution available for retry.

The browser fetches the public catalog without requiring a player registration,
caches compatible courses for offline play, and shows them alongside local
drafts under **Player-created courses**. A direct level link can load a course
that was never cached on that device. **Refresh shared levels**, reconnection
and page visibility resume synchronization. A catalog update never teleports
the robot or replaces the course underneath an active shot; selecting the level
again or returning to its start adopts the current revision. A retired active
revision cannot block verification of other current scores.

The scoreboard distinguishes **On this device** from **Online · Verified** and
lets the player switch between them. Offline online-board caches say **Last
sync**. Local progress remains available without a connection; online personal
ranks come from authoritative storage. A locally displayed result is labelled
verified only after acceptance, and a differing server score is shown explicitly.
Retired course caches and queued records are discarded with the retired course.

Public replay seeds are independently reconstructed by the existing browser
physics worker, reusing its collision buffers and spatial index. Bounded replay
batches are acknowledged only after IndexedDB storage. The reconstructed result
must match the server's result before it is displayed. A temporary recording
replaces an older cache transactionally; cancellation or failure leaves the
existing saved replay intact. An accepted cache works offline and does not
duplicate the collision asset. Direct replay links need no player registration
or name prompt, and wait for the physics worker to finish loading.

Downloaded public replays use a shared IndexedDB cache limited to eight entries
and 64 MiB of serialized replay payload. The worker measures each batch, keeping
that work off the rendering thread; IndexedDB's own storage overhead is additional.
Reads update recency. Imports return the complete replay before evicting older
entries, so a replay larger than the budget still plays fully but is not kept
offline. Imports and reads are serialized across tabs to avoid eviction during
assembly. Startup removes abandoned downloads and unmeasured old cache entries.
Saved player scores, queued verification and their control recordings are excluded
from cache eviction, including a player's own replay reconstructed from the verifier.

## Node reference service

`web/online-server.mjs` starts a Node HTTP process with no Unity, simulation
timer or background job poller. It loads collision data lazily on the first
verification request. Each `advance` request performs bounded simulation work
(normally up to one second), then saves a checkpoint or the independently
computed result. The client drives further requests while verification is
pending; interrupted jobs do not require a warm process or a scheduled task.

Firestore owns immutable input chunks, resumable job state, accepted scores and
per-player progress. An input chunk contains at most 128 walking runs; HTTP
JSON bodies are limited to 64 KiB. The verifier retains one input chunk and
one simulation/replay batch at a time. Replay data is the verified input seed
and result: replay poses are reconstructed, rather than stored a second time.

## Resource limits and cleanup

Firestore transactions enforce creation, input-storage and compute quotas across
processes. An idempotent retry does not consume another job or upload allocation;
an already leased or finished attempt does not consume another compute slice.
Publication geometry checks share the compute budget. Defaults are:

| Resource | Limit |
| --- | --- |
| New identities | 1,000 per UTC day; 50,000 retained identities |
| New verification/publication jobs | 200 per player and 2,000 globally per UTC day; 100,000 retained jobs |
| Compute slices / publication checks | 600 per player and 2,400 globally per minute; 5,000 per player and 20,000 globally per UTC day |
| Uploaded control payload | 512 MiB retained globally; 8 MiB and 2,048 chunks per job |
| Walking proof | At most 324,000 steps, approximately 30 minutes |
| Persisted checkpoint / result | 512 KiB / 256 KiB per job |
| HTTP process | 32 concurrent requests, burst of 120, refill of 40 requests per second; 64 KiB request bodies |

These are online verification limits. Browser gameplay keeps running locally.
Rate responses include `Retry-After` and a matching JSON delay; the browser keeps
the same queued proof and waits, including across reconnect events. A storage
capacity response is retriable. A recording that exceeds a per-job limit remains
local and is not labelled verified. Exhausting a compute allowance leaves the
job pending; it never finishes the ball or fabricates a score. Limits can be
overridden through validated `KYOTO_VERIFY_LIMITS_JSON` configuration.

Ordinary identity, submission and publication requests perform one bounded
cleanup pass. Inactive unaccepted jobs expire after seven days; cancelled,
forfeited and failed jobs after one day. A pass reclaims at most 32 input
documents from one job. A persistent deletion marker fences uploads and late
workers, so a restart resumes cleanup safely. Reclaimed input bytes and job
slots are refunded transactionally. The browser can re-upload an expired proof
under the same attempt ID after cleanup; deleting work is never an accepted result.
Live leases remain protected. A bounded cursor also finds retired course versions
and removes their attempts, progress and orphan course records. Current accepted
scores and published solutions have no expiry and are never removed to make room.

Personal progress is paginated in pages of at most 100 stored entries, with a
`next` cursor supplied as `?after=...`; the browser follows every page. Payload
limits exclude database/index overhead. These controls bound admitted work and
retained data, but are not a provider billing cap or protection against all HTTP
traffic costs. Deployment still needs explicit instance/concurrency limits.
There is no cleanup timer, scheduled worker or always-running simulation.
The shared admission counter favors a strict global cap over write throughput.
The emulator checks atomicity, not managed-database latency; an authorized cloud
smoke/load test must measure this counter in the deployment region. Firestore's
single-document throughput depends on workload and contention.
[Firestore best practices](https://firebase.google.com/docs/firestore/best-practices),
[transaction contention](https://firebase.google.com/docs/firestore/transaction-data-contention).

Checkpoints use the compressed portable graph codec to retain Maps, Sets, Infinity,
negative zero and support-contact state exactly. They are private database
bytes, never request fields or public responses, and bind the course, attempt
and authenticated player. Physics/world objects are reconstituted around the
saved state. Requests acquire transactional leases. Checkpoint/result writes
must still own that lease, so a recalled shot or replacement request fences a
late publisher. A storage outage leaves the last committed state recoverable
after lease expiry. Recall can also retract an already accepted owned attempt,
repairing its leaderboard and completion atomically.

Anonymous player credentials are a UUID and 32 cryptographically random bytes.
The browser must save them before registering, send them only in the HTTPS
Authorization header, and retain them for retries. Storage contains a SHA-256
hash of the full credential. Knowing a player UUID alone cannot authenticate or
replace its identity. Do not reuse a native service credential. The API rejects
foreign ownership, unexpected fields, replaced inputs and retired course
versions. Published standings always come from the verifier's calculation.

## Custom-course publication

`POST /v1/publications/:id` accepts exactly `{course, baseRevision, header}`.
The course contains its ID, next revision, name, current layout/physics/scoring/
throw-model versions, start, optional goal and waypoints. It cannot include a
creator, score, result, launch, claimed solution or client hint. Authentication
sets the creator; the input header supplies the independently verified hint.
The service validates every start/goal disk and waypoint against the canonical
collision world, including floor support, surface normals, capsule clearance,
fixed faces, radius bounds and unique targets.

A publication uses the same immutable control upload, seal, checkpoint and
bounded advance routes as a scored attempt. Its proposed course remains private
while the existing published revision remains playable. Only a legal throw that
hits every required waypoint, reaches the goal when present, and comes to full
translation/spin rest can publish. A design proof never enters the leaderboard
or completes the player's course progress. Its verified input seed is available
through the public replay API; separately playing the published course produces
a ranked attempt through the normal score-verification route.

Course IDs are reserved to their authenticated creator. Every update must name
the current base revision and propose exactly the next revision. Publication
and revision replacement are transactional: two competing candidates cannot
overwrite one another, and an old worker cannot publish after a newer candidate
wins. Repeated requests are idempotent. A cancelled or unsuccessful draft stays
private. A published course cannot be retracted by recalling its design proof.
Old revisions immediately stop accepting scores and replay requests; new
standings and completion use the new trusted course definition.

The public catalog returns the campaign plus at most 100 current custom courses
on its first page. A non-null `next` cursor is passed as `?after=...` to retrieve
more custom courses. Private drafts and retired station/physics versions are
excluded. The browser follows these pages and caches the current catalog.

| Method and path | Purpose |
| --- | --- |
| `GET /health`, `GET /v1/courses[?after=...]` | Process readiness and current public course catalog |
| `POST /v1/identity` | Register/retry/rename with credential and `{name}` |
| `POST /v1/publications/:id` | Reserve/revise an owned course with geometry and legal solution controls |
| `POST /v1/attempts/:id` | Create idempotently with `{header}` |
| `PUT /v1/attempts/:id/inputs/:sequence` | Append/retry immutable `{runs}` |
| `POST /v1/attempts/:id/seal` | Finish uploading the complete walking route |
| `POST /v1/attempts/:id/advance` | Verify another slice; 202 while unfinished |
| `POST /v1/attempts/:id/cancel` | Forfeit/retract the owned attempt |
| `GET /v1/attempts/:id`, `GET /v1/progress[?after=...]` | Authenticated status and bounded progress pages |
| `GET /v1/courses/:id/leaderboard` | Top ten and optional authenticated personal rank |
| `GET /v1/replays/:id[/inputs/:sequence]` | Public verified seed and bounded controls |

For local use, set `GOOGLE_CLOUD_PROJECT`, `FIRESTORE_EMULATOR_HOST`, and run
`npm run dev:verification`. The default HTTP port is 4432. `KYOTO_VERIFY_PORT`,
`KYOTO_COLLISION_PACK` and `KYOTO_ALLOWED_ORIGINS` override local defaults.
Managed environments supply `PORT` and Application Default Credentials through
the workload service account; no Google API key or exported account key belongs
in the source or browser. `/health` means the HTTP process is ready, not that
database access or an entire shot has passed.

The future deployment must install the indexes and deny direct browser access
with `deploy/verification/firestore.{indexes.json,rules}`. Large checkpoint,
input and result fields are excluded from indexing. Only the verifier's IAM
identity should access database records. The official emulator does not
enforce production composite indexes or every limit, so deployment acceptance
still needs real index readiness and an authorized end-to-end smoke test.
[Index configuration](https://firebase.google.com/docs/firestore/query-data/index-overview),
[emulator limits](https://docs.cloud.google.com/firestore/native/docs/emulator).

## Verification

`npm test` includes exact checkpoint/restart comparisons during walking and
flight, invalid state binding, and a moving shot beyond 240 simulated seconds
that remains pending. `npm run test:verification:service` starts the official
checksum-pinned Firestore emulator on a free loopback port, exercises the real
HTTP API and SDK, and cleans up its test namespace and processes. It requires
Java 21 or later and caches one emulator JAR in ignored `.local/verification/`.
It refuses a non-local or non-demo database. CI runs this portable service test.

`npm run test:browser:sync` exercises the browser outbox against the real local
HTTP service and Firestore emulator without rendering the station.
It also publishes 21 offline-created courses on one reconnect, crossing the
20-item queue page boundary and checking that draft promotion leaves no duplicates.
It checks a real rate-limit response, reconnect events during its retry delay,
and complete loading of 102 progress entries across pages.
`npm run test:browser:online` uses the running browser preview on port 4430 and
headless Chrome with the background-input guard. It covers desktop/touch throws,
recall, offline queueing, reload, independent verification, stable identity,
board switching, exact own-replay replacement, another player's replay and an
anonymous share link. It injects test configuration through an initialization
script: intercepting the main navigation would lose Chrome's loopback address
classification and prevent cross-origin local API requests.

`npm run test:browser:courses` runs the full rendered creator and sharing flow
against the local emulator: offline design and complete solution, publication
queueing, edit fencing, reload/reconnect, independently ranked play, a fresh
visitor's level link and public replay, offline mobile play/publication, multiple
draft edits becoming one public revision, and catalog refresh during a shot.
It uses the same headless/background-input guard and leaves its visual receipts
in ignored `.local/verification/course-sharing/`.

`npm run test:verification:service -- --station` additionally submits all 30
campaign solutions, restarts the HTTP service with a persisted mid-flight
checkpoint for each, verifies full clears and compares independently replayed
results exactly. `web/tests/verification-station.mjs` compares the complete
pose/contact stream against a run reconstructed from checkpoints after every
batch. These prove persistence across verifier process replacement against the
local emulator; they do not claim managed-cloud durability or deployment.

The service suite also covers private publication drafts, malformed geometry,
forged solution fields, creator ownership, restart and expired-lease recovery,
missed waypoints/goals, cancelled drafts, competing revision publication,
revision-scoped standings and bounded catalog pagination. With `--station` it
generates three courses using the real station's design recorder, publishes
them from independently verified controls, and exactly reconstructs their
public solutions, including a basement course with a full-rest finish target.
Resource checks race admissions and cleanup against the real emulator, restart
between cleanup pages, preserve current accepted scores and live leases, reclaim
retired publications, fence late workers, and reject oversized evidence without
creating a result. Browser replay checks delay an input request and require its
exact reconstruction after retry; portable tests also cancel a long retry wait.

The static browser package, pinned verifier image and scale-to-zero configuration
generator are documented in `docs/DEPLOYING.md`. Local implementation acceptance
and the remaining release gates are recorded in `docs/BROWSER-MIGRATION-AUDIT.md`.
Managed-cloud smoke/load checks and live cutover remain pending authorization.
No native score importer is implemented. Current live scores have not been
reset; preserving that authoritative data requires a verified consistent backup
and an accepted handling decision before retiring the native service. Existing
native results cannot be relabelled as verified browser-physics results.

The Linux amd64 container acceptance passed all 30 full clears with exact final
result agreement against independent host reconstruction, recovery from a
persisted mid-flight checkpoint after container replacement, four concurrent
verifications, and progress retention after shutdown. The image ran as a non-root
user on a read-only filesystem with one CPU and 1 GiB RAM. Its peak process RSS
was about 824 MiB, ending at 672 MiB after the concurrency check; the image size
was 360,169,672 bytes. Local container start-to-health took 4.49 seconds and the
measured graceful stops took 0.44–0.57 seconds. These include local runtime
overhead and amd64 emulation on this laptop, not Cloud Run latency or memory
measurements. Per-course comparison timings include both HTTP verification and
host reference simulation. Receipts are in `.local/verification/container/`.
The service suite also gates a live request during shutdown, proves its private
checkpoint was persisted, and resumes it to a real result in a replacement
process. No moving shot is finalized by shutdown or the request work budget.

## Hosting evidence, checked November 10, 2026

The current full-station collision pack is 58,843,636 bytes. The verifier's
30-course laptop runs measured 19–747 ms of computation per shot after
1.35–1.40 seconds of collision loading/indexing. Process RSS was 268–500 MiB at
the end of those runs, which also retained complete replays for exact comparisons;
this is not an isolated production memory benchmark. Individual queries or
garbage collection can exceed the nominal 8 ms yielding interval (observed
maximum batch: 103 ms). Verification runs outside the rendering thread.

- Cloudflare's free Workers tier lists 10 ms of CPU per HTTP request and a
  128 MB isolate memory limit. Its paid tier increases CPU allowance but adds a
  recurring plan. The measured verifier does not fit the free CPU allowance.
  [Workers limits](https://developers.cloudflare.com/workers/platform/limits/),
  [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/).
- Cloudflare Pages limits individual static assets to 25 MiB. The collision pack
  and any larger visual assets require chunking or separate object delivery;
  the current files cannot simply be uploaded unchanged to Pages.
  [Pages limits](https://developers.cloudflare.com/pages/platform/limits/).
- Cloud Run provides request-based, pay-per-use billing. Its documented monthly
  free allocation includes 180,000 vCPU-seconds, 360,000 GiB-seconds and two
  million requests. Configure minimum instances to zero and use request-based
  billing, with no warm-up schedule or committed-use purchase.
  [Pricing](https://cloud.google.com/run/pricing),
  [minimum instances](https://docs.cloud.google.com/run/docs/configuring/min-instances).

The working direction is static asset delivery plus a scale-to-zero verifier.
This removes the fixed compute subscription; it does not promise zero charges
for arbitrary traffic, storage, builds or egress. Storage and deployment
packaging still need their own measured selection. No cloud resources or
deployment are created by this component.
