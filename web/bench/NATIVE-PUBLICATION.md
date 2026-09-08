# K004/K009 native publication timing

The worker now advances its 30 Hz publication deadline instead of resetting it
from each late Update. It publishes at most one current batch per Update. If a
whole additional period was missed, it discards those slots and rebases the next
deadline. No stale snapshot backlog is emitted. FixedUpdate, 180 Hz stepping,
station clocks, score poses, contacts and replay calculation are unchanged.

## Reproduction and observations

This is a paired local Mac experiment on Apple M2 / 24 GiB, Node 22.23.2,
Unity 6000.3.23f1, canonical layout 650fed69aa6a. Each version ran 1/16 sessions,
two 15-second observations each after 3 seconds of warmup, normal 30 Hz client inputs
and authoritative launches. Every measured snapshot was in Flight. Each run had
its own service/db/log on4195, and used the real built worker. No public service,
shared Unity Library or other worktree worker was modified.

The earlier independent Linux capacity experiment observed 24–26 Hz even at low
CPU. This experiment first reproduced that defect with the unchanged scheduler
and opt-in timing instrumentation, then rebuilt only the scheduling change.

| Sessions | Before Hz | After Hz | Before worst p99 / max gap ms | After worst p99 / max gap ms |
|---:|---:|---:|---:|---:|
|1|25.77–26.23|30.01–30.03|56.01 /61.24|36.67 /49.54|
|16|24.53–24.76|30.02–30.03|60.07 /79.96|51.73 /54.24|

Native station-time/wall-time ratio stayed 0.99994–1.00040 after the change
(before 1.00004–1.00029). There were no client/worker errors or socket backpressure
failures. The native Update loop already ran approximately 60 Hz before the fix;
steady 1-session publication batches averaged roughly 0.23–0.26ms. Resetting the
deadline therefore caused persistent underpublication without resource saturation.

Opt-in `KYOTO_NATIVE_TIMING=1` writes bounded 5-second summaries to the **local
worker log only**: Update gaps, full publication batch duration, JSON serialization,
socket writes, command-queue high-water, heap size, collection count and skipped
publication slots. Each metric retains at most 4096 samples per report. Timing
calls/sampling are disabled in normal execution.

Timing windows include joins/warmup/disposal. Across observed 16-session windows,
maximum individual serialization time was 4.07 ms before /4.01ms after; socket write
maxima were 7.01 ms /0.71ms. One fixed-run whole publication batch took 26.25 ms outside
its small measured JSON/write sections, in a window with a GC collection. The
measurements do **not** identify that delay as serialization or prove its precise
cause, so this change does not add a speculative serializer rewrite.

## Bounded late-frame behavior and limits

The harness suspended **only its own child worker** for 250 ms and resumed it.
The fixed run showed a 283.96 ms receive gap, followed by normal 33–35 ms delivery,
with zero sub-10 ms recovery gaps. The interruption remains visible; the worker
neither invents physics time nor masks starvation with stale publications.
Unity's existing maximum physics catch-up bound remains unchanged.

This fixes the demonstrated cadence loss, not every network delay. 16-session p99
still reached 51.73 ms. The earlier Linux 220 ms maximum was not reproduced locally;
WAN scheduling, slow receivers and host contention remain separate evidence gaps.
No admission-limit increase, smoothing change or production-capacity claim follows
from this experiment.

## Run the bounded benchmark

```sh
KYOTO_WORKER_EXECUTABLE='/absolute/path/to/compatible/native/worker' \
NATIVE_TIMING_OUTPUT=.local/native-timing/new-run \
NATIVE_TIMING_OVERLOAD=1 \
node web/bench/native-publication-bench.mjs
```

The harness refuses occupied 4195 and existing output directories. Defaults are
1/16sessions ×2 ×15 seconds; optional bounds are `NATIVE_TIMING_LEVELS=1,16`,
`NATIVE_TIMING_REPS=1|2`, `NATIVE_TIMING_SECONDS=5..30`. It checks the selected
worker launcher and code-assembly SHA before/after and cleans up only its owned service/clients. Overload
injection is explicit and optional. It measures driver receive cadence and native
station pace alongside service loop/queue metrics; it does not control physics
or submit scores. Raw receipts stay under `.local/` and are not committed.

Compact durable receipt in the timing worktree: `.local/fleet/timing-evidence.json`.
Temporary raw cohorts/databases were removed after aggregation, at user request.
Gameplay compatibility and dedicated Linux build receipts are summarized in
`.local/fleet/RESULT.md`.

The original paired receipts recorded the launcher checksum only; their code
provenance is the sequential instrumented-baseline/fixed builds and native logs
(the fixed logs additionally expose skippedPublication counts). The harness now
also hashes `Assembly-CSharp.dll`: Unity's launcher can remain byte-identical
across gameplay-code changes. Linux handoff includes an archive hash and runtime
manifest, not merely the launcher hash.
