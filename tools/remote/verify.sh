#!/usr/bin/env bash
set -euo pipefail
source /etc/profile.d/kyoto-tools.sh
cd /opt/boxhaven/project
out=.local/remote-prep/verification
mkdir -p "$out"
git rev-parse HEAD > "$out/commit.txt"
python3 tools/test_export_attributes.py
npm run typecheck
npm test
npm run build:web
python3 - <<'PY'
import hashlib,json
from pathlib import Path
root=Path('research/kyoto-station');rows=json.loads((root/'sources.json').read_text());count=0
for row in rows:
 if row.get('local_file'):
  p=root/row['local_file'];assert hashlib.sha256(p.read_bytes()).hexdigest()==row['sha256'],p;count+=1
print('Verified research files:',count)
PY
node --experimental-strip-types web/station/realism/verify-west-lower-landing.mjs "$out/landing-native"
node --experimental-strip-types web/station/realism/verify-carried-courses.mjs .local/station-realism/station-gate-bank-02/station-layout.json .local/station-realism/pillar-approach-02/catalog.json .local/station-realism/pillar-approach-02/proof-inputs.json "$out/carried-courses" kyoto-pillar-carom,kyoto-locker
xvfb-run -a node web/station/realism/project-source.mjs .local/station-realism/gate-bank-browser-02/atrium.runtime.glb .local/station-realism/gate-view-obstruction-01/view.json "$out/private-render"
blender --background --python tools/export_browser_art.py -- --source .local/station-realism/station-gate-bank-02/KyotoAtrium.blend --layout .local/station-realism/gate-bank-browser-input-02/station-layout.json --output "$out/browser-export" --restore-attributes-prefix 'Registered courtyard | hotel-' --restore-attributes-prefix 'Registered courtyard | court-' --restore-attributes-prefix 'Registered courtyard | niwa-white-gravel' --restore-attributes-prefix 'Registered hall |' --restore-attributes-prefix 'Gate architecture |' --restore-attributes-prefix 'Gate bank |'
node web/station/realism/verify-installed-hall-materials.mjs .local/station-realism/central-gate-bank-assembly-03/assembly.glb "$out/browser-export/atrium.glb" "$out/gate-attributes.json" 'Gate bank | '
node tools/dev.mjs 4173 > "$out/service.log" 2>&1 &
service_pid=$!
trap 'kill "$service_pid" 2>/dev/null || true; wait "$service_pid" 2>/dev/null || true' EXIT
for i in $(seq 1 90); do
 if curl -fsS http://127.0.0.1:4173/api/health > "$out/health.json"; then break; fi
 sleep 1
done
export KYOTO_TEST_ORIGIN=http://127.0.0.1:4173 KYOTO_URL=http://127.0.0.1:4173 KYOTO_EVIDENCE="$out/browser-game"
node --experimental-strip-types web/tests/level-entry-runtime.mjs
node --experimental-strip-types web/tests/tutorial-runtime.mjs
KYOTO_SMOKE_WIDTH=800 KYOTO_SMOKE_HEIGHT=600 node web/tests/browser-smoke.mjs
curl -fsS http://127.0.0.1:4173/api/health > "$out/health.json"
printf 'passed\n' > "$out/status.txt"
