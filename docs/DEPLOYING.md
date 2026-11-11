# Deploying your own instance

## Browser static release

The browser migration can be packaged without Node, Unity or a gameplay API
running on the host. This is a local build/preview workflow; the migration has
not been deployed and its final integrated acceptance is still in progress.

```sh
npm run assets:fetch
npm run build:web
npm run assets:collision
npm run build:static
npm run test:browser:static
npm run preview:static -- 4431
```

`build:static` uses the validated current station in `web/v2/assets.json` and
requires a matching collision receipt. It builds the physics worker, includes
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

The currently deployed architecture uses a long-running Node service plus a
native Linux Unity dedicated-server worker. The instructions below maintain
that deployment until the browser migration is accepted and a replacement
deployment is explicitly authorized.

The supplied scripts target an Ubuntu 24.04 x86_64 server with systemd and Caddy. The initial deployment used 2 vCPUs and 4 GB RAM; capacity depends on concurrent physics sessions and needs load testing for your traffic.

The v2 layout has a much larger transient allocation while Unity parses the
station JSON. The November 2026 release was staged on the existing 4 GB host
with 4 GB of swap; a 2300 MB staging limit without swap killed the worker during
startup. Provision startup memory headroom before activation, and inspect both
resident memory and swap activity during real shots. Swap is startup headroom,
not a substitute for measuring sustained gameplay load. Preserve its boot
configuration when maintaining that host.

1. Install Unity 6000.3.23f1 with Linux dedicated-server build support on the build machine. Fetch assets, run the source checks, then `npm run build:worker -- --linux` and `npm run build:web`.
2. Provision a server with SSH key access. Review `deploy/bootstrap.sh` before running it as root on a **new server**; it installs packages, configures SSH and creates the `kyoto` service user.
3. Point your domain and `www` DNS records at the server, and allow ports 80/443 plus your SSH access through the firewall.
4. Set `KYOTO_SSH_TARGET`, `KYOTO_SSH_KEY` and `KYOTO_HOST` explicitly, then run `node deploy/package.mjs` and `node deploy/upload.mjs --stage-only`.

The packager uses the current station bundle pinned by `web/v2/assets.json`.
It verifies the source, geometry, hardware, moving-step metadata and all 30
course layout hashes before writing the release's canonical
`runtime/station-layout.json`. The tested exploration spawn is applied exactly
as in the local v2 preview. Only current delivery models ship; the older public
authoring pack is not a substitute for this station bundle. Original sources
remain in the private versioned authoring bundle, outside the runtime release.

`--stage-only` uploads without switching the live release. Install production
dependencies in the candidate, make it readable by the `kyoto` user, and run a
temporary service on a separate loopback port with a separate database and log.
After native and headless browser checks pass, preserve rollback configuration
and a consistent database backup, stop the temporary service, then invoke
`bash RELEASE_DIRECTORY/deploy/activate.sh RELEASE_DIRECTORY HOSTNAME` over SSH.

Example configuration (substitute your own values):

```sh
export KYOTO_SSH_TARGET=root@your-server
export KYOTO_SSH_KEY="$HOME/.ssh/your-key"
export KYOTO_HOST=game.example.com
node deploy/package.mjs
node deploy/upload.mjs --stage-only
```

A maintainer may keep those values in an ignored `.deploy.local.json` with `target`, `key`, and `hostname` fields. Never commit private keys or service data.

Activation installs the release under `/opt/kyoto/releases`, switches `/opt/kyoto/current`, configures HTTPS, restarts the service, and backs up existing SQLite data before migration. Persistent data lives outside releases under `/var/lib/kyoto/data`; the backup timer stores local backups under `/var/lib/kyoto/backups`. Arrange off-server backups separately.

Verify a real shot/replay against the staged release with a separate temporary database. After activation, check the HTTPS page, `/api/health`, public asset hashes, service logs and backup timer. Do not create test records in the production database by default. The upload script does not itself prove gameplay or automatically roll back a failed release. Keep the previous release and database backup available for a coordinated rollback.

Store protected rollback configuration and database snapshots under `/var/lib/kyoto/deployments/<release>`, outside `/var/lib/kyoto/backups`. The backup retention script runs as `kyoto` and must be able to traverse its backup directory. When staging manually, apply the release read/execute permissions from `activate.sh` before starting a temporary service as `kyoto`.

CI does not deploy. Production changes are an explicit maintainer action after reviewing the integrated game.

Live browser connections retry with bounded backoff and a heartbeat. A guest may
resume its existing native session for 30 seconds using both the session ID and
its saved guest token. In-flight simulation/scoring continues during that grace
period; an unreleased windup is cancelled. Explicitly leaving frees the slot.
After a service restart the client rejoins, and a changed station hash triggers
an asset reload. Commands, especially releases, are never replayed on reconnect.

Continuous inputs coalesce behind slow native requests, preserving discrete
command order. Congested sockets skip superseded state snapshots. The service
logs close code, duration and whether a session was resumable, without recording
guest credentials. Use those logs and host utilization when investigating online
lag; the client cannot repair an indefinitely unavailable network.
