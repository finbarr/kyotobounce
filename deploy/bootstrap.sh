#!/bin/bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y caddy sqlite3 curl ca-certificates xz-utils libglib2.0-0t64 libx11-6 libxcursor1 libxrandr2 libxi6 unattended-upgrades
useradd --system --create-home --home-dir /var/lib/kyoto --shell /usr/sbin/nologin kyoto
install -d -o kyoto -g kyoto -m 700 /var/lib/kyoto/data /var/lib/kyoto/backups /var/log/kyoto
install -d -m 755 /opt/kyoto/releases
cd /tmp
curl --fail --retry 3 -O https://nodejs.org/dist/v22.23.2/node-v22.23.2-linux-x64.tar.xz
echo 'd60acfe00a2932254bb0ad20e01b0d74397a0875595de719654b214f4b03f307  node-v22.23.2-linux-x64.tar.xz' | sha256sum --check
tar -xJf node-v22.23.2-linux-x64.tar.xz -C /usr/local --strip-components=1
cat > /etc/ssh/sshd_config.d/kyoto.conf <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
EOF
sshd -t
systemctl reload ssh
touch /var/lib/kyoto/bootstrap-ready
