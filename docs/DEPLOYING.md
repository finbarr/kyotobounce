# Deploying your own instance

The game needs a long-running Node service plus a native Linux Unity dedicated-server worker. A static host alone cannot run its authoritative physics.

The supplied scripts target an Ubuntu 24.04 x86_64 server with systemd and Caddy. The initial deployment used 2 vCPUs and 4 GB RAM; capacity depends on concurrent physics sessions and needs load testing for your traffic.

1. Install Unity 6000.3.23f1 with Linux dedicated-server build support on the build machine. Fetch assets, run the source checks, then `npm run build:worker -- --linux` and `npm run build:web`.
2. Provision a server with SSH key access. Review `deploy/bootstrap.sh` before running it as root on a **new server**; it installs packages, configures SSH and creates the `kyoto` service user.
3. Point your domain and `www` DNS records at the server, and allow ports 80/443 plus your SSH access through the firewall.
4. Set `KYOTO_SSH_TARGET`, `KYOTO_SSH_KEY` and `KYOTO_HOST` explicitly, then run `node deploy/package.mjs` and `node deploy/upload.mjs`.

Example configuration (substitute your own values):

```sh
export KYOTO_SSH_TARGET=root@your-server
export KYOTO_SSH_KEY="$HOME/.ssh/your-key"
export KYOTO_HOST=game.example.com
node deploy/package.mjs
node deploy/upload.mjs
```

A maintainer may keep those values in an ignored `.deploy.local.json` with `target`, `key`, and `hostname` fields. Never commit private keys or service data.

Activation installs the release under `/opt/kyoto/releases`, switches `/opt/kyoto/current`, configures HTTPS, restarts the service, and backs up existing SQLite data before migration. Persistent data lives outside releases under `/var/lib/kyoto/data`; the backup timer stores local backups under `/var/lib/kyoto/backups`. Arrange off-server backups separately.

Verify the HTTPS page, `/api/health`, a real shot/replay, service logs and backup timer after deployment. The upload script does not itself prove gameplay or automatically roll back a failed release. Keep the previous release and database backup available for a coordinated rollback.

CI does not deploy. Production changes are an explicit maintainer action after reviewing the integrated game.
