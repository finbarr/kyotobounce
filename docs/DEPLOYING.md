# Deploying your own instance

## Sites and D1 release

The selected replacement host is ChatGPT Sites with D1. The registered project
is in `.openai/hosting.json`; reuse it. `npm run build` builds the existing game
directly into `dist/client` and bundles the production Fetch handler at
`dist/server/index.js`. `dist/server/wrangler.json` declares the asset binding,
Node compatibility and D1 binding. The compact verifier geometry is served from
the same deployment's versioned assets and checked against its bundled manifest.
It is never rebuilt or fetched from a player-selected URL during verification.

The browser's `same-origin` verifier setting uses the current HTTPS origin (or
loopback in development), including a future custom domain. Static game requests
do not initialize collision geometry. Score requests use the existing strict
control-input API and lazily load one shared world per isolate.

`drizzle/0000_verifier.sql` and `drizzle/meta/_journal.json` are the initial,
schema-only D1 migration. Sites applies packaged migrations before the Worker.
Do not edit an applied migration or put player data into one. Local tests use
separate temporary databases, apply the packaged migration and remove the state
afterward; they never create production scores.

```sh
npm run build
npm run test:sites
npm run test:browser:sites
```

The package passes local workerd tests for real asset delivery, deep links,
same-origin scoring and restart through an exact station score. Headless Chrome
passes offline desktop/touch shots, reconnect/reload, verified public replays,
course creation/publication, creator ownership and revision adoption against the
actual production bundle and local D1. These checks do not establish managed
memory/CPU limits, successful hosted migrations or live cutover.

Publish this repository through the Sites source/build/archive workflow; keep
`dist/` and the archive ignored. The helper stages all tracked changes, so keep
unrelated local edits outside that staging step and restore them afterward.
Do not change the current domain or retire the native host before managed-runtime
acceptance and current-score handling are complete.

## Browser static release

The browser migration can be packaged without Node, Unity or a gameplay API
running on the host. Local implementation acceptance is recorded in
[the migration audit](BROWSER-MIGRATION-AUDIT.md). The pinned asset pack is public;
managed-cloud acceptance, existing-score handling and live cutover remain open;
the migration has not been deployed.

With the current station bundle installed (see [asset availability](ASSETS.md)):

```sh
npm run build:static
npm run test:browser:static
npm run preview:static -- 4431
```

`build:static` uses the validated current station in `web/v2/assets.json` and
builds or verifies the collision pack. It builds the physics worker, includes
all 30 courses and renderer dependencies, and replaces one generated directory:
`.local/browser-release`. It refuses to replace an unrelated directory. Do not
commit this output. No Unity editor, native worker, player database, research
archive, authoring layout, credential or server source belongs in the upload.
The local preview reads only this directory and exposes no gameplay API.

The station GLB and collision pack exceed [Cloudflare Pages' 25 MiB asset
limit](https://developers.cloudflare.com/pages/platform/limits/). They are split
into 16 MiB files with content-addressed paths. The browser verifies each part
and the complete SHA-256 before decoding the exact original bytes. This does
not simplify geometry or reduce texture quality, and the output does not retain
duplicate unsplit files. The packager checks the file size/count limits.

The directory includes Pages [`_redirects`](https://developers.cloudflare.com/pages/configuration/redirects/)
for level/replay links, a real 404 page, attribution and
[`_headers`](https://developers.cloudflare.com/pages/configuration/headers/)
for immutable chunks and revalidated mutable modules/manifests. On another
static host, configure equivalent rewrites of `/level/*` and `/replay/*` to
`/index.html`. Shared-link social metadata uses the game's generic static card.
Gameplay, local scores, replays and the creator work offline after assets load;
this does not promise a cold offline navigation before those files are loaded.

Omit `KYOTO_VERIFY_URL` for local-only scores. For a release with independently
verified online scores and published courses, set it to the public HTTPS origin
of the on-demand verifier **when building**. It is a public endpoint, not a
credential. The endpoint parser rejects credentials, queries, fragments and
non-HTTPS remote URLs. Configure the verifier's allowed browser origin as
described in `docs/ON-DEMAND-VERIFICATION.md`; gameplay remains local while it
is offline. Verifier hosting/scale-to-zero packaging is a separate migration
step. Neither this command nor its tests uploads or deploys anything.

`test:browser:static` checks the actual exported file hashes, size limits,
routes and absence of server files, then runs headless Chrome against only the
bundle. It asserts that the game downloads the chunks without oversized-file
fallbacks and runs the existing offline walking, throw/Skip, recall, replay,
saved-progress, mobile control and 30-course menu acceptance. A missing collision
chunk must show a visible Retry action instead of hanging at startup. The desktop
pointer is protected before navigation; receipts are in
`.local/browser-release-test`.

## On-demand verifier image

`npm run build:verifier` validates the current campaign/collision receipt and
bundles the server into `.local/verification/build`. `npm run build:verifier:image`
also builds `localhost/kyoto-verifier:local` with Podman; set
`KYOTO_CONTAINER_RUNTIME=docker` to use Docker for the image build. The build
streams an explicit set of files to the builder, including the existing collision
pack, with no second asset tree or repository-wide build context. It includes
attribution, uses a digest-pinned Linux amd64 Node base, installs only production
dependencies, and runs as the non-root `node` user. No credential file is copied.

`npm run test:verifier:container` requires a running local Podman machine and
Java 21+. It builds the image and uses an isolated, demo-only Firestore emulator.
On this laptop, keep the VM lifecycle in the same shell as the test so the tool
can clean it up reliably; reuse the existing machine rather than creating one:

```sh
podman machine start podman-machine-default &&
  (trap 'podman machine stop podman-machine-default' EXIT
   npm run test:verifier:container)
```

The test runs the real station and 30-course catalog in a read-only, one-CPU,
1 GiB Linux container. It checks authentication, forged-result rejection,
mid-flight checkpoint recovery after container replacement, independent host
agreement, four simultaneous verification requests, and retained scores/progress
after shutdown. Logs and receipts are in `.local/verification/container/`.
These are local emulation/container checks, not managed-cloud acceptance.

The image requires `GOOGLE_CLOUD_PROJECT` and exact `KYOTO_ALLOWED_ORIGINS`.
Application Default Credentials come from the assigned workload service account
in Cloud Run; do not export or embed a service-account key. A managed instance
rejects Firestore emulator configuration. It validates its release/campaign
receipt at startup and the collision checksum before simulation. The optional
`KYOTO_VERIFY_SLICE_MS` setting accepts 1–1000 ms (default 1000); reaching that
work limit saves a continuation and never finishes a moving ball. SIGTERM asks
active simulations to checkpoint and drains requests within the provider's
[ten-second shutdown window](https://docs.cloud.google.com/run/docs/container-contract).

`npm run configure:verifier` writes `.local/verification/cloud-run.json` from
`GOOGLE_CLOUD_PROJECT`, `KYOTO_VERIFY_IMAGE` (an Artifact Registry digest URL),
and `KYOTO_ALLOWED_ORIGINS`. Optional `KYOTO_VERIFY_SERVICE` and
`KYOTO_VERIFY_ACCOUNT` default to `kyoto-verifier`. This generates configuration
only. It specifies request-based billing, zero minimum instances, a service-wide
maximum of two, one CPU/1 GiB per instance, concurrency four, a 30-second request
timeout, a startup probe and no warm-up/background job. The service is publicly
reachable; its own authenticated API still validates player credentials and
independently calculates every accepted score.
[Billing](https://docs.cloud.google.com/run/docs/configuring/billing-settings),
[scaling](https://docs.cloud.google.com/run/docs/configuring/max-instances),
[public API access](https://docs.cloud.google.com/run/docs/authenticating/public).

For an explicitly authorized deployment, create a dedicated workload service
account, a colocated Firestore Native database and an Artifact Registry image
repository. Grant the account `roles/datastore.user` for the intended database,
not project editor/owner. Install the indexes and deny-browser rules in
`deploy/verification/`; server access uses IAM and bypasses client rules.
Push the tested amd64 image, generate configuration with its registry digest,
then apply it with `gcloud run services replace` for the chosen project/region.
No build/configuration command here provisions or deploys those resources.
[Firestore IAM](https://docs.cloud.google.com/firestore/native/docs/security/iam).

Before cutover, inspect the deployed scaling/billing settings, workload IAM,
index readiness and CORS; run an authorized real shot/restart/load check; then
build the static game with that verifier's HTTPS URL. Measure managed-database
contention and cold-start behavior in the chosen region. Instance limits are
capacity controls, not a hard bill cap; request, storage and egress usage can
cost money, though this setup requires no always-on compute subscription. Keep
only the current registry release and any explicitly required rollback image.
The existing live service must not be stopped until the replacement is accepted
and deployment/cutover is authorized.

## Existing native deployment

The existing live release uses a long-running Node service and a Linux Unity
dedicated-server worker. Current main builds the browser game and on-demand
verifier only. Its old native packaging scripts are not a supported deployment
path; maintain or roll back the native service using its existing deployed
release and matching instructions. No native service has been stopped by this
migration.

A replacement cutover requires explicit authorization after the browser game,
verifier and score handling are accepted. Preserve the current authoritative
scores and a consistent database backup for that decision. Only then retire the
old service and its compute allocation. CI never deploys.
