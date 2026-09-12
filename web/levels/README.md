# Campaign authoring and verification

The current 30-stage campaign lives in `web/starter-challenges.json`. Its exact native sampling inputs live in `proof-inputs.json`; chapter design and route descriptions are in [LEVEL-DESIGN.md](../../docs/LEVEL-DESIGN.md). Do not maintain a second candidate or historical catalog.

## Native route proof

Select a compatible worker explicitly. A Mac worker or a dedicated Linux worker can run the same campaign. Every run gets a separate worker process and log; it does not connect to a running game or production database.

```sh
KYOTO_WORKER_EXECUTABLE=/absolute/path/to/compatible/worker \
  npm run test:campaign -- .local/campaign-proof-fresh
```

The runner uses four isolated native sessions, two repeated hints and one neighboring aim per stage. It requires every hint target to be collected, a positive neighboring completion, and zero movement/spin at full rest. Optional destination outcomes are recorded separately. A timeout or cancellation fails. The output includes the exact tested catalog, its hash and per-shot results.

To recheck only a changed route, provide a comma-separated list of current IDs:

```sh
KYOTO_WORKER_EXECUTABLE=/absolute/path/to/compatible/worker \
  npm run test:campaign -- .local/ticket-recheck kyoto-ticket
```

Use a new output directory for every run. Keep logs and exploratory trajectories under `.local/`; do not commit them. Native charge duration and launch speed are real service-to-worker inputs. They are not client-authorized scores or browser power overrides.

## Service and browser checks

```sh
KYOTO_WORKER_EXECUTABLE=/absolute/path/to/compatible/worker npm run dev -- 4302
KYOTO_TEST_ORIGIN=http://127.0.0.1:4302 npm run test:runtime
```

The runtime suite creates records only in this isolated development database. It checks authoritative scoring, once-only waypoint awards, full rest, saved replay parity and progression. The campaign runtime test rejects non-local hosts.

In the real browser, inspect every chapter, select short and long routes, open their overviews, apply the H-key hint, and check that returning from an overview retains the selected chapter. Player-created courses must remain reachable. Normal game completion still uses Space to advance to the next stage. Native proof does not establish a broad human success rate or remote-network performance.

## Existing shop source

`build-konbini.py`, `audit-konbini.mjs` and `konbini-registration.json` describe the modeled convenience store included in the station asset pack. The campaign uses its supported floor and real doorway. Research images and generated binaries stay outside Git; campaign development does not require rebuilding the shop or Unity worker.
