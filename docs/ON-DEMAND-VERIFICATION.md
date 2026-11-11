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

The authenticated HTTP service now verifies and stores campaign scores,
standings, completion and public replay inputs. The game UI still uses its
local leaderboard; submission/synchronization and online course publishing
remain to be connected. No verifier has been deployed.

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

| Method and path | Purpose |
| --- | --- |
| `GET /health`, `GET /v1/courses` | Process readiness and trusted campaign catalog |
| `POST /v1/identity` | Register/retry/rename with credential and `{name}` |
| `POST /v1/attempts/:id` | Create idempotently with `{header}` |
| `PUT /v1/attempts/:id/inputs/:sequence` | Append/retry immutable `{runs}` |
| `POST /v1/attempts/:id/seal` | Finish uploading the complete walking route |
| `POST /v1/attempts/:id/advance` | Verify another slice; 202 while unfinished |
| `POST /v1/attempts/:id/cancel` | Forfeit/retract the owned attempt |
| `GET /v1/attempts/:id`, `GET /v1/progress` | Authenticated status and progress |
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

`npm run test:verification:service -- --station` additionally submits all 30
campaign solutions, restarts the HTTP service with a persisted mid-flight
checkpoint for each, verifies full clears and compares independently replayed
results exactly. `web/tests/verification-station.mjs` compares the complete
pose/contact stream against a run reconstructed from checkpoints after every
batch. These prove persistence across verifier process replacement against the
local emulator; they do not claim managed-cloud durability or deployment.

Before full migration acceptance, finish browser synchronization, course
publishing, request/storage abuse bounds and abandoned-data cleanup, then static
hosting and scale-to-zero deployment packaging. Per-course progress currently
returns completion and best score; individual leaderboard requests supply rank.
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
