# Preserving the current live scores

The current native game has ten accepted scores on unchanged campaign geometry.
Its recorded physics is `kyoto-p3-3`; new browser shots use `kyoto-browser-4`.
The migration preserves those authoritative scores, times, owners and complete
recordings. It does not resimulate old shots with a different solver or accept
client-reported scores. The imported results explicitly retain native-server
provenance and the original physics identifier.

## Preparation and trust boundary

`deploy/sites/native-export.mjs` reads the explicitly approved private consistent
SQLite backup and checks its compressed SHA-256 and SQLite integrity. Every
scored course must exactly match the current geometry, revision and scoring
rules. The exporter cross-checks each replay's result against its database row.
A changed course, mismatched score or changed backup fails closed.

The private output in `.local/native-migration/prepared/` contains bounded JSON
batches: player credential hashes, complete pose/contact/score-frame recordings,
and accepted results. Plaintext guest tokens never enter these batches, browser
assets, Git or the Site archive. The existing on-device random token derives a
new credential locally; only its hash is imported. This preserves the same
player on the original domain without an unauthenticated account-claim endpoint.
An existing browser profile is retained, and a failed network recovery preserves
the native identity for later reconnection without blocking offline gameplay.

The temporary importer is enabled only by an explicit build argument:

```sh
node deploy/sites/native-export.mjs
node deploy/sites/build.mjs --native-import .local/native-migration/prepared/manifest.json
```

That build embeds only the operator-prepared allowlist of exact payload hashes
and byte lengths in the server bundle. `/v1/native-import/<sha256>` accepts only
the corresponding immutable POST body. Normal builds omit the importer.
Neither the manifest nor arbitrary score admission is supplied by an HTTP client.
Schema changes are in `drizzle/0001_recorded_replays.sql`; data is not in migrations.

Each batch and its receipt commit atomically. Player identity conflicts abort.
A score becomes visible only after its player and every checksummed recording
chunk exist. Retries, process restarts and concurrent submissions cannot duplicate
scores or quotas. Completed receipts prevent an import retry from resurrecting
a recalled score. Existing retirement/recall cleanup also removes recordings and
refunds their storage quota.

## Playback and verification

New browser replays still reconstruct independently from verified input proofs.
Imported native replays stream their original samples through the same dedicated
worker and IndexedDB backpressure/cache path. Each downloaded chunk must match
the authoritative seed's SHA-256. The old physics runtime is never loaded.
The current course key keeps identical geometry ranked and cached correctly;
native physics and source-backup/replay hashes remain in the result provenance.

Checks completed locally against the approved snapshot:

- All ten scores, ranks and personal progress match the native data.
- All 58 recording chunks preserve every pose, contact and score frame exactly.
- Actual packaged Worker/D1 restart and repeated imports preserve exact counts.
- Headless Chrome plays all ten public replay links, including the 19,523-pose
  Clock In replay; mobile playback and cached offline replay pass.
- Returning-player authentication restores the original identity and name,
  without creating another player. Forged credentials and changed payloads fail.
- A concurrent new name choice is preserved during delayed identity recovery.

Reproducible checks:

```sh
npm run test:verification:d1
node web/tests/native-migration.mjs --snapshot
node web/tests/native-migration-browser.mjs
```

The first command uses synthetic local data and runs in CI. The last two require
the approved private snapshot; the browser check also requires the import-enabled
Site build. They use disposable local databases and never write hosted records.

## Remaining cutover work

This implementation has not yet imported production data. Recheck the live
native data before cutover and capture any new accepted scores or identities in
a final consistent snapshot. Publish the tested import-enabled version to the
existing private Site, import only the pinned batches, and compare hosted counts,
rankings, progress and complete recording checksums. Then publish a normal build
to remove the temporary import endpoint before making the replacement public.
Switch the domain only after those checks; retire the native host afterward.
The public native game and its database remain unchanged until that cutover.
