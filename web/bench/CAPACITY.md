# K004 native/service capacity benchmark

This benchmark uses an isolated local server and the real Linux dedicated physics worker. It sends normal WebSocket input/charge/release messages; it does not synthesize scores, shorten physics, or finish a moving ball. Browser GPU rendering and production WAN behavior are outside its scope.

## Reproduce

Run from a separate checkout with its own `npm ci` and `npm run assets:fetch`. Explicitly select a compatible existing Linux worker binary; it is read but never rebuilt or modified.

```sh
KYOTO_WORKER_EXECUTABLE=/absolute/path/to/KyotoPhysicsWorker.x86_64 \
CAPACITY_OUTPUT=.local/capacity/four-cpu \
node web/bench/capacity.mjs

node web/bench/summarize-capacity.mjs .local/capacity/four-cpu/summary.json
```

The script refuses an existing output directory or occupied port 4283, removes `KYOTO_PUBLIC_ORIGIN` only from its own child environment, and creates its database and worker/server logs under the ignored output directory. It stops only its own clients and child service. The reused worker executable's SHA-256 is checked before/after. Raw receipts are ignored and must not be committed.

Defaults: 1/4/8/16 independent sessions, two replicates each, five seconds of warmup and thirty seconds of observation. Each session selects First Bank, sends valid input at 30Hz, charges for 1.2 seconds in full range, and launches at 25° with alternating topspin/sidespin. It starts another throw only after a natural result or an authoritative cancellation; disconnecting at the observation boundary disposes the session without declaring a shot completed. Full station collision and native 180Hz stepping remain active. All sessions also exercise the service's live scoring/replay tracking.

A smoke run can use `CAPACITY_LEVELS=1 CAPACITY_REPS=1 CAPACITY_SECONDS=8 CAPACITY_WARMUP=2`. Counts are restricted to 1/4/8/16, replicates to 1–3, observation to 5–60 seconds, and warmup to 1–15 seconds.

## Measurements and stopping rules

- Per-session snapshot receive intervals, frequency, native station-time/wall-time ratio, flight fraction, real results, errors/notices/recoveries.
- Input-to-first-authoritative-matching-yaw in Aim only and charge-to-Charging latency when observable; release-to-Flight includes the existing native 120ms release animation. Aim cannot be probed during locked flight; sparse/no in-window samples are reported rather than invented. Warmup-inclusive samples are separately labeled.
- Opt-in preload observes Node CPU/RSS, event-loop delay/utilization, outstanding worker replies and transport writable bytes. It preserves the original calls and messages; shared source/contracts are not edited.
- `/proc` worker CPU/RSS and host available memory are sampled every second. CPU is percent of one logical core; 100% is one core, not the whole machine. RSS can retain allocator high-water across replicates and is not a per-session allocation estimate.
- The internal C# `ConcurrentQueue` and server's private per-connection queue are not exposed. Queue saturation is assessed through native pacing, snapshot age, latency, errors, outstanding replies and socket backpressure; zero transport backlog is not proof that the internal queue is empty.
- Stop further cohorts on any client error/disconnect or non-ready worker; or three consecutive one-second samples with native pacing below 0.8x, snapshot age above one second, event-loop p99 above 200ms, worker writable queue above 1MB, host available memory below 1GiB, or worker+Node RSS above 5.5GiB. SIGINT/SIGTERM also ends the owned run.
- The load generator shares the host; its event-loop delay is recorded as a validity check. No public service limit is altered.

## Results

Measured 2026-09-08 on this **4-vCPU, 7,941MiB RAM Linux VM**, CPU model `DO-Regular`, kernel 6.8.0-71-generic, Node 22.22.2. The coordinator's production audit describes a different 2-vCPU/4GB instance; this benchmark did not access it. Existing local preview services remained running and unchanged. No browser renderer ran in this benchmark.

Source base: `93c37c0637686101e6e5574d8c4690c9857d0179`. Reused worker SHA-256: `61c388a1cd661a6230c857fd66de0cec86a1ec497d5f6df1b7f1d585263be19f`; unchanged after every run. Native layout: `650fed69aa6ab63af523f8f8aa8819858672ffd3994a1be6c2e9ea1aaa7731d2`.

### Unrestricted four-CPU host

Two 30-second observations at each load, each preceded by five seconds of warmup. CPU numbers are peak one-second observations, one core = 100%. Node and worker maxima need not occur in the same second.

| Active sessions | Snapshot Hz range | Worst per-session gap p99 / max ms | Native pace | Node / worker peak CPU % | Node / worker peak RSS MiB | Worst 1s event-loop p99 ms |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 25.9–26.0 | 50.6 / 59.6 | 1.000–1.000 | 10.7 / 6.9 | 94.4 / 640.5 | 20.2 |
| 4 | 24.7–24.7 | 51.7 / 125.1 | 1.000–1.000 | 16.1 / 17.0 | 111.3 / 641.2 | 42.1 |
| 8 | 23.8–24.3 | 54.1 / 120.3 | 1.000–1.000 | 22.1 / 26.9 | 142.8 / 517.7 | 44.5 |
| 16 | 23.8–23.9 | 53.8 / 220.7 | 0.995–1.000 | 39.2 / 47.9 | 127.7 / 523.3 | 38.2 |

### Isolated two-CPU-budget ablation

A transient **benchmark-only** systemd unit used `CPUQuota=200%` (`cpu.max: 200000 100000`) for the driver, Node server and worker together. It retained the same four-vCPU host and 8GB memory availability, with **no memory quota**, so it is not an exact 2-vCPU/4GB machine simulation. No public service limit changed. Two 30-second observations each at 8 and 16 sessions:

| Active sessions | Snapshot Hz range | Worst per-session gap p99 / max ms | Native pace | Node / worker peak CPU % | Node / worker peak RSS MiB | Worst 1s event-loop p99 ms |
|---:|---:|---:|---:|---:|---:|---:|
| 8 | 24.5–24.7 | 57.1 / 196.4 | 0.999–1.000 | 25.9 / 31.9 | 137.2 / 634.6 | 57.0 |
| 16 | 23.8–24.1 | 69.5 / 182.3 | 0.998–1.000 | 38.2 / 57.6 | 132.8 / 527.0 | 58.8 |

The maximum combined sampled Node+worker CPU was 80.9% of one core under the two-CPU quota (87.1% unrestricted). The transient unit's total memory peak, including driver and child processes, was 815.8MiB, with zero swap peak. By the final observation it recorded only four throttled periods and 22.2ms cumulative cgroup throttle time, including startup; this was not sustained CPU-quota saturation.

Across both primary experiments:

- **Zero client errors, disconnects, worker failures/recoveries, or saturation stops.** Sampled outstanding worker replies and transport writable backlog stayed zero. Internal native/server queue depth is not directly observable.
- Each session spent at least **94.1%** of its observed snapshots in native Flight. Natural completions and rethrows occurred: 19 results unrestricted and 24 under quota. No contact-budget exhaustion or overlap recovery was reported. Actual input cadence stayed **29.9–30.1Hz per client**.
- Host available memory stayed above 5.2GiB. Worker RSS is affected by allocator/GC retention across sequential cohorts; the nonmonotonic table should not be interpreted as a linear per-session memory model.
- Driver event-loop p99 stayed at or below 15.3ms. Instrumentation and local loopback traffic are included; browser GPU, WAN delay, slow receivers, long-duration memory behavior, and diverse escalator/level collision workloads are not.

### Observable input latency

Pooled **warmup-plus-observation** transition samples are shown because most observation time is spent in Flight, when aim is intentionally locked. Release-to-Flight includes the native 120ms release animation and is not pure transport latency.

| CPU budget / sessions | Charge samples | Charge→Charging p95 / max ms | Release samples | Release→Flight p95 / max ms |
|---|---:|---:|---:|---:|
| unrestricted / 1 | 2 | 50.2 / 50.2 | 2 | 162.5 / 162.5 |
| unrestricted / 4 | 12 | 33.1 / 33.1 | 10 | 177.7 / 177.7 |
| unrestricted / 8 | 22 | 34.4 / 44.8 | 20 | 152.2 / 152.2 |
| unrestricted / 16 | 40 | 35.6 / 54.2 | 40 | 179.5 / 179.6 |
| two CPU / 8 | 24 | 39.3 / 43.4 | 24 | 181.8 / 182.0 |
| two CPU / 16 | 48 | 59.9 / 161.1 | 36 | 180.9 / 213.0 |

**Measurement correction:** the initial yaw probe could straddle Release/Result, where native aiming is deliberately frozen, producing invalid long “latencies.” Those yaw results are excluded from conclusions; raw receipts retain them for audit. The final script restricts yaw probes to Aim. A separate 1/4-session, eight-second validation checked the corrected probe: one initial-Aim observation per session, 11.2ms at one session and 40.8–41.0ms at four. Charge/release timing, native stepping and resource measurements above were unaffected by that classification issue. Source hashes for the original primary runs are retained with raw receipts; final probe eligibility is the narrow subsequent harness correction. The final harness also refuses existing output directories; its expected EEXIST failure was checked without starting a service.

## Capacity and code recommendations

1. **Retain the existing 16-active-session admission cap; do not raise it from these measurements.** Sixteen is a demonstrated operating point for this flight-heavy profile on this host and under a two-CPU budget, not a measured maximum: the service itself caps admission at 16. No capacity-driven VM resize is justified by this bounded run. Production 4GB headroom and other level mixes still need validation before treating this as a production SLO.
2. **Investigate publication cadence before treating jitter as resource exhaustion.** Even one session at low CPU delivered only ~26Hz, with frequent 33/50ms intervals. [BrowserPhysicsWorker.Update](../../KyotoRicochet/Assets/Kyoto/Scripts/BrowserPhysicsWorker.cs) sets `nextSend = now + 1/30` inside a nominal 60Hz Update loop. Inference: resetting the deadline makes frame/serialization jitter accumulate into skipped publication opportunities. A separate native task should measure Update spacing and test an advancing deadline with bounded catch-up, sending current snapshots rather than a burst of stale snapshots. Preserve station-time/scoring/replay semantics.
3. **Profile transient serialization/GC and result bursts, not just average CPU.** The unrestricted 16-session maximum snapshot gap was 220.7ms, while the nearby Node loop maximum was 38.5ms and transport backlog was zero. This narrows but does not identify the source; native scheduling/serialization and host scheduling remain candidates. Capture native publication duration, allocations and internal queue high-water in a separately authorized diagnostic change before optimizing. No native queue length can be inferred from zero socket backlog alone.
4. **Keep operational signals aligned with the actual failure modes:** per-session snapshot age/gap, native/wall-time ratio, transition latency, worker recovery count, Node loop delay and process/cgroup RSS. For future staged load tests, use the explicit stop thresholds above and include mixed escalator shots, joins/leaves, slow receivers and longer natural-result/persistence runs. No infrastructure or shared-code remediation was performed here.

## Receipts and verification

Ignored raw receipts on this machine:

- `/opt/boxhaven/performance/.local/capacity/smoke/`
- `/opt/boxhaven/performance/.local/capacity/four-cpu/`
- `/opt/boxhaven/performance/.local/capacity/two-cpu/`
- `/opt/boxhaven/performance/.local/capacity/aim-probe-validation/`
- `/opt/boxhaven/performance/.local/capacity/details.json`

Each primary directory contains `summary.json`, per-replicate `raw-N-R.json`, separate SQLite data, native worker log and server log. Quota limits/counters are included in ablation raw rows. `summarize-capacity.mjs` regenerates the resource/cadence tables from receipts.

Verified: `npm run typecheck`, `npm test`, `npm run build:web`, Node syntax checks, actual native smoke/full/quota runs and corrected-probe validation. No gameplay/UI/service/native/contracts/packages changed; only `web/bench/` scripts and this report are committed. Gameplay handoff through 93c37c0 remains owned by the coordinator/waypoint lane.

Optional ablation reproduction (requires permission to create a transient local unit):

```sh
sudo systemd-run --unit=kyoto-capacity-two --uid=boxhaven --gid=boxhaven \
  --property=WorkingDirectory=/opt/boxhaven/performance --property=CPUQuota=200% \
  --setenv=KYOTO_WORKER_EXECUTABLE=/absolute/path/to/KyotoPhysicsWorker.x86_64 \
  --setenv=CAPACITY_LEVELS=8,16 --setenv=CAPACITY_OUTPUT=.local/capacity/two-cpu \
  /usr/bin/node web/bench/capacity.mjs
```

Use a fresh output directory for each experiment; the unit and benchmark exit after their bounded runs. Never apply these settings to the public service.
