# Authoritative shot playback

Walking, aiming and wind-up use live snapshots. On release, the native worker
locks the launch state and advances the same 180 Hz contact solver ahead of
wall time. Each session has its own analytic station clock, including moving
escalators. The physics rules and timestep do not change.

The worker yields between batches of twelve steps, with an 8 ms shared budget
per update and rotating session priority. It computes up to sixty seconds ahead
so an endlessly moving ball cannot monopolize the service. Ordinary finite
shots finish computing well before playback; longer shots continue streaming.

Node scores those future samples and sends reliable `shot-chunk` messages.
The first frame goes immediately, then chunks contain about 200 ms of motion,
shared scene metadata, 180 Hz orientation samples and timestamped contacts.
The browser advances an independent playback clock through the buffer. Ball,
robot, escalators, live score and effects use that clock. Future results and
sounds are withheld until their playback time. Reconnecting does not discard
the current buffer; the server can also resend retained chunks for that session.

Native results require physical rest in both translation and rotation. A result
is held until its flight duration has elapsed in wall time before authoritative
scoring and persistence, so recalling during playback still forfeits even if
the complete successful trajectory has already been calculated. The browser
never supplies a score or trajectory. A reconnect never replays a release.

Diagnostics log `shot-computed` duration, computation time and transfer size,
server event-loop and native timing, disconnect causes, and browser frame cost,
buffer depth and buffer underruns. No names, credentials or control values are
logged. Shot Details exposes the current buffer and frame/network timings.

Run portable checks with `npm run typecheck`, `npm test`, `npm run build:web`.
After rebuilding the native worker, use an isolated local service for
`npm run test:runtime`, `web/tests/shot-stream-runtime.mjs`,
`web/tests/network-stall-runtime.mjs` and `web/tests/connection-runtime.mjs`.
Use `KYOTO_TEST_ORIGIN` for its URL. Never create test scores on production.

Browser/service protocol: `shot-stream-v1`. Old open pages receive a reload
message rather than silently waiting for snapshots that no longer arrive.
