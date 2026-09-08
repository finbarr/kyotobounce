# Production performance audit

Observed 2026-09-08 05:05–05:09 UTC (2026-09-07 evening Pacific), read-only, from the development machine and over SSH. No gameplay connections, game records, restarts, deployment, resizing or load tests were performed.

## Findings

The idle production snapshot does **not** justify resizing by itself. The host has 2 vCPUs and 3,915 MiB RAM; `vmstat 1 5` showed 99% idle CPU in interval samples, no I/O wait or steal, and no swapping. Load averages were 0.07 / 0.02 / 0.00. Available memory was 2,925 MiB; root disk used 5.8 GiB of 77 GiB (8%). There is no swap configured.

`kyoto.service` was active/running since 2026-09-07 23:03:47 UTC, with zero systemd restarts, 533 MiB current cgroup memory and 805 MiB peak. Its memory limit is 3 GiB, CPU quota unlimited, and file-descriptor limit 4,096. One Node process and one Unity worker were running; Unity RSS was about 508 MiB. Process CPU percentages are lifetime averages, not an active-game benchmark.

Public `/api/health` returned HTTP 200, `ready`, `worker:true`; one request took 101 ms total from the development machine. The same endpoint through loopback port 4173 had 1.1 ms TTFB. These are isolated HTTP measurements, not gameplay RTT or percentile estimates. No established player HTTPS connections appeared during the host sample, so these observations describe an idle service.

The last six hours of service journal contained no entries. An eight-hour window had 45 lines, no matches for errors, timeouts, failures, exceptions or disconnects. Ten warning lines were five SQLite experimental warnings and five associated trace-warning hints. Five readiness/start matches occurred in that longer window; zero systemd restarts applies to the current activation, not all historical activations. Kernel journal had no OOM matches in the six-hour window. The 29-line current worker log had no error/exception/failure/warning/timeout matches. Keyword checks are limited diagnostics, not proof of absence of every fault.

Active release: `/opt/kyoto/releases/2026-09-07T23-02-35-573Z`. Deployed `web/server.ts` and `web/worker.ts` SHA-256 hashes match the audited checkout at `bcd27c8`. The native binary was not rebuilt or checked for exact source equivalence.

## Architecture and likely sources of perceived lag

Source inspection shows a single `PhysicsWorker` child per Node service. Unity owns a dictionary of `BrowserSession` objects, stepping them serially on the main thread. It is not one OS worker per player. The server permits 16 authenticated play slots. Native physics uses a 180 Hz timestep, targets 60 update frames per second, and publishes state at up to 30 Hz. Shared main-thread work means concurrent sessions can exhaust a core before the whole two-core machine appears fully busy; this is a hypothesis requiring an active test.

The browser sends inputs at 30 Hz and deliberately renders its snapshot timeline roughly 80 ms behind the latest received state, with limited extrapolation. Input batching, network transit, worker scheduling, snapshot publication and interpolation can therefore add visible latency even without host resource pressure. This is source-derived behavior, not a measured end-to-end delay.

Client rendering is another independent candidate. The source uses antialiasing and a 4,096-square architectural shadow map, but already freezes that static shadow map, caps render resolution around 1.6 million pixels and adapts pixel ratio. Existing `window.kyotoState.render` and `window.kyotoArt.frameCost` expose frame and render-cost telemetry. No live browser/GPU diagnosis was conducted because opening the production game automatically starts session interaction. A larger server would not correct a client GPU bottleneck.

## Recommended next action

Keep the current production size while reproducing on an isolated Linux dedicated-server deployment with its own database, ports and logs. Measure 1, 4, 8 and 16 concurrent sessions, including moving players and active shots, collecting per-core CPU, RSS, Unity step/publish timing, pending-command backlog, snapshot interarrival gaps and browser frame-time p50/p95. Capture input-to-authoritative-state latency separately from rendering delay. Use an actual target device/browser as well as synthetic clients.

A bounded implementation follow-up is opt-in aggregate worker/server timing instrumentation and browser latency instrumentation, excluding credentials and player records. Acceptance: distinguish GPU frame stalls, snapshot/tick stalls and input/network delay under a reproduced lag scenario. If one worker core saturates, benchmark a faster-core machine or process sharding on the isolated environment; merely adding cores may not improve the serial main loop. If memory approaches the 3 GiB service cap, measure per-session growth before recommending RAM/cap changes. Do not alter authoritative scoring, historical replays or shot-completion rules for a performance shortcut.

## Read-only checks performed

- SSH host checks: `date -u`, `uptime`, `nproc`, `free -m`, `df -h / /var/lib/kyoto`, `vmstat 1 5`.
- `systemctl show kyoto` for state, PID, memory current/peak/limit, cumulative CPU, task count, start timestamp, restart count, CPU quota and file limit.
- `ps -eo comm,pcpu,pmem,rss,nlwp --sort=-pcpu`, socket counts via `ss -Htn state established`, and listening ports via `ss -Hltn`; no process environment or command arguments were printed.
- `journalctl -u kyoto` over six/eight-hour windows and kernel journal over six hours, reduced to counts/categories before output; worker log at `/var/log/kyoto/player.log` similarly reduced.
- GET `https://kyotobounce.com/api/health` and GET `http://127.0.0.1:4173/api/health` with curl timing. An initial loopback probe at port 3000 was refused; source inspection established the correct port.
- `readlink /opt/kyoto/current`, SHA-256 comparison of the two service source files, and local source review of `web/server.ts`, `web/worker.ts`, `web/public/game.js`, `web/public/station-look.js`, `BrowserPhysicsWorker.cs`, `BrowserSession.cs` and `BallBody.cs`.

This audit cannot establish active capacity, reproduce the reported lag, characterize peak traffic, or prove production browser frame rate. No production player credentials or game data were inspected.
