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

Browser/service protocol: `shot-stream-v2` (action-only scoring). The native stream capability remains `shot-stream-v1`. Old open pages receive a reload
message rather than silently waiting for snapshots that no longer arrive.

## Sharing and results

Saved scoring shots have a public `/replay/<attempt UUID>` URL. `GET /api/replay/<id>` loads the saved authoritative record; neither route requires a guest token or allocates a native physics session. The viewer supports orbit, zoom, pause, scrubbing, quarter/half speed and a link to play the same level. Copy-link controls appear on the result and replay panels. Entering a result releases the mouse so these controls are immediately usable.

The record includes the native thrower's feet, yaw/pitch, power and spin settings, launch position/velocity/spin, charge/release times, station/rule versions and recorded poses and score frames. The moving station follows the recorded clock. We play the original authoritative trajectory instead of re-simulating on each view: this preserves the exact collisions and score while avoiding native-worker load or dependence on future physics determinism. The player's name and cosmetic robot choice are captured with the throw.

A bounded in-process LRU stores each full serialized replay plus its gzip response. Entries expire **24 hours after their last read**; API downloads, conditional requests, HEAD requests, share-page views and in-game replay reads all refresh that deadline. Saving a scoring shot warms the cache after its database transaction commits. A cold link loads the original sequence from SQLite, and concurrent readers share one compression job. There is no physics recomputation on either a cache hit or miss.

The cache defaults to 128 MiB, at most 512 entries, and 16 MiB per entry (including compressed data); least recently read entries are evicted under pressure. Oversized records remain playable from SQLite but bypass caching. Compression runs in at most two background jobs, with queued work removed on eviction. Expired entries are swept every minute. `KYOTO_REPLAY_CACHE_MB` adjusts the total byte limit. Restarting the service empties the cache; the next read refills it from the saved sequence. This cache is per service process; a future multi-instance deployment would benefit from a shared cache such as Redis.

The API serves cached gzip bytes and an ETag, so repeat downloads can return 304 while still refreshing the server cache. Revising or removing a level invalidates its cached replays. Server performance logs include aggregate hit/miss, byte, eviction, expiry and compression counters; `/api/debug/replay-cache` exposes the same counters only on an isolated local server. No replay IDs, names or contents are logged.

A score commit also captures the level's top ten before and after insertion. Each player occupies one slot, ordered by score descending, duration ascending, acceptance time and attempt ID. The reveal starts after the score count-up, cascades through rows, then moves the player's improved score into its server-ranked slot and ejects the displaced tenth entry. A lower attempt never displaces that player's best. Names can be entered on first connection and edited from the header; replay presentation remains the name used for that shot.

Five cosmetic celebration tiers range from a proud gesture through fist pumps, character-specific victory dances, podium poses and a jackpot routine. Earned score, personal best and leaderboard position select the tier. Poses still wait for authoritative translation and spin to stop; retries blend them away. Shared replays retain the same character and achievement. Reduced motion removes row movement and uses a shorter, still robot pose.
