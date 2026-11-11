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
Yielding never finishes a shot. The caller must durably consume each chunk and
continue until the status is `verified`; a cancelled or failed job supplies no
acceptable score. Walking input and replay streams need not all live in memory.
Server-owned resumable jobs will be necessary for requests that exceed one
invocation's execution allowance. A continuation supplied by a client must never
be accepted as trusted physics or scoring state.

This first component is not yet an online leaderboard. Browser input recording,
authenticated submission, durable job/result storage, idempotent acceptance,
course publishing and UI synchronization remain to be connected and verified.

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
