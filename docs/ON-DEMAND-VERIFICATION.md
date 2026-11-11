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

## Browser synchronization

The static shell may set a `kyoto-verifier` meta tag to the HTTPS origin of the
service. Local preview accepts `KYOTO_VERIFY_URL=http://127.0.0.1:4432` before
`npm run dev:browser -- 4430`. Without this configuration, the game remains
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

## Request-driven service

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

Checkpoints use compressed Node V8 serialization to retain Maps, Sets, Infinity,
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

The static browser package and local hosting checks are documented in
`docs/DEPLOYING.md`. Before full migration acceptance, finish scale-to-zero
verifier deployment packaging, then run the complete integrated acceptance checks.
No compatibility archive or native score migration is planned.

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
