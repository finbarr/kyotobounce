#!/bin/bash
set -euo pipefail
umask 077
backup="/var/lib/kyoto/backups/kyoto-$(date -u +%Y%m%dT%H%M%SZ).sqlite"
sqlite3 /var/lib/kyoto/data/kyoto.sqlite ".backup '$backup'"
test "$(sqlite3 "$backup" 'PRAGMA integrity_check;')" = ok
gzip "$backup"
# Only completed Kyoto backup files; keep fourteen days locally.
find /var/lib/kyoto/backups -name 'kyoto-*.sqlite.gz' -mtime +14 -delete
