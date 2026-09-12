#!/bin/bash
set -euo pipefail
release=${1:?Usage: activate.sh RELEASE_DIRECTORY HOSTNAME}
hostname=${2:?Usage: activate.sh RELEASE_DIRECTORY HOSTNAME}
[[ "$release" == /opt/kyoto/releases/* && -f "$release/release.json" ]]
[[ "$hostname" =~ ^[a-zA-Z0-9.-]+$ ]]
test -f /var/lib/kyoto/bootstrap-ready
cd "$release"
npm ci --omit=dev --ignore-scripts --no-audit --no-fund
chmod -R a+rX "$release"
chmod +x Builds/PhysicsWorkerLinux/KyotoPhysicsWorker.x86_64 deploy/backup.sh
ldd Builds/PhysicsWorkerLinux/UnityPlayer.so
if test -f /var/lib/kyoto/data/kyoto.sqlite; then
    runuser -u kyoto -- "$release/deploy/backup.sh"
fi
cat > /etc/kyoto.env <<EOF
KYOTO_PUBLIC_ORIGIN=https://$hostname
KYOTO_DATA_DIR=/var/lib/kyoto/data
KYOTO_LAYOUT=/opt/kyoto/current/runtime/station-layout.json
KYOTO_WORKER_LOG=/var/log/kyoto/player.log
KYOTO_NATIVE_TIMING=1
EOF
chmod 600 /etc/kyoto.env
ln -sfn "$release" /opt/kyoto/next
mv -Tf /opt/kyoto/next /opt/kyoto/current
install -m 644 deploy/kyoto.service deploy/kyoto-backup.service deploy/kyoto-backup.timer /etc/systemd/system/
sed 's/{$KYOTO_HOST}/'"$hostname"'/g' deploy/Caddyfile > /etc/caddy/Caddyfile
caddy validate --config /etc/caddy/Caddyfile
systemctl daemon-reload
systemctl enable kyoto kyoto-backup.timer caddy
systemctl restart kyoto
systemctl reload caddy
systemctl start kyoto-backup.timer
