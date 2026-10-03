# Campaign authoring and verification

The current catalog is `web/starter-challenges.json`. The new campaign is delivered
one level at a time toward exactly 30; [progress](../../docs/CAMPAIGN-PROGRESS.md)
records the next unfinished level. `proof-inputs.json` contains the actual launch
inputs, repeated-solution count and required nearby full clears for each level.
Do not maintain old catalogs or migrate retired levels.

## Local station

```sh
npm run dev:v2 -- 4425
```

This serves the single current station bundle from `web/v2/assets.json`, with an
isolated database and worker log. Its spawn-only layout hash is pinned in the
catalog and proof fixture; a mismatch fails startup. Do not use the old canonical
asset pack to verify these levels or attempt a deployment.

## Native proof

```sh
KYOTO_WORKER_EXECUTABLE='/absolute/path/to/compatible/worker' \
  npm run test:campaign -- .local/campaign/proof
```

The runner uses two independent native sessions in one worker, with no server or
database writes. `KYOTO_LAYOUT` can select another copy of the exact pinned
layout; the default is `.local/v2/4425/station-layout.json`. Both repeated hints
must collect every waypoint and any retained destination, then stop translating
and spinning. Timeouts, recall and leaving the station fail. Neighbor results
are recorded separately and must meet that level's `minimumNeighborClears`.

Append a comma-separated list of course IDs to check just one increment:

```sh
KYOTO_WORKER_EXECUTABLE='/absolute/path/to/compatible/worker' \
  npm run test:campaign -- .local/campaign/opening-proof atrium-welcome
```

`KYOTO_PROOF_HINTS_ONLY=1` is a one-shot diagnostic, not final acceptance. Raw
traces, screenshots and logs stay under `.local/campaign/`, outside Git. Reuse
small proof directories when iterating; never duplicate the station per level.

## Service and Chrome

```sh
npm run typecheck
npm test
npm run build:web
KYOTO_TEST_ORIGIN=http://127.0.0.1:4425 npm run test:runtime
KYOTO_TEST_ORIGIN=http://127.0.0.1:4425 \
  node web/levels/browser-proof.mjs 'First Bounce' .local/campaign/opening-browser 560
```

Restart the v2 preview after catalog or service edits. Runtime checks cover fresh
entry, authoritative scores, replay parity, completion, recall, exploration and
player-created courses. `KYOTO_TEST_COURSES=id1,id2` selects additional campaign
routes for service checks. Chrome runs the real menu, overview, H hint, keyboard
charge/release, result and saved replay. Inspect its screenshots as well as the
receipt. It never submits an invented score or alters physics to clear a level.

For final catalog acceptance, `KYOTO_CAMPAIGN_COMPLETE=1 npm test` requires exactly
30 entries. Every level also needs a successful native proof and Chrome playthrough;
a passing data check alone does not establish a playable campaign.

Station source tools in this directory are retained only as architecture inputs;
this campaign does not require rebuilding or expanding the convenience store.
