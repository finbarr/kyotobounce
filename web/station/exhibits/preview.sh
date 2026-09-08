#!/usr/bin/env bash
set -euo pipefail
TASK_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$TASK_ROOT/.local/station-detail/app"
export KYOTO_PORT=4285
export KYOTO_LAYOUT="$TASK_ROOT/.local/station-detail/candidate/station-layout.json"
TASK_LAYOUT_ID="$(sha256sum "$KYOTO_LAYOUT" | cut -c1-8)"
export KYOTO_DATA_DIR="$TASK_ROOT/.local/station-detail/data-$TASK_LAYOUT_ID"
export KYOTO_WORKER_LOG="$TASK_ROOT/.local/station-detail/candidate-worker.log"
export KYOTO_WORKER_EXECUTABLE=/opt/boxhaven/workers/waypoint-timing-20260908/KyotoPhysicsWorker.x86_64
TASK_ASSEMBLY_SHA="$(sha256sum "$(dirname "$KYOTO_WORKER_EXECUTABLE")/KyotoPhysicsWorker_Data/Managed/Assembly-CSharp.dll" | cut -d' ' -f1)"
[[ "$TASK_ASSEMBLY_SHA" == 9a8f2f06a928fb15d42b799a093c95eb7bb62fbbc3afd5f03bb1eebf34025fef ]] || { echo "Worker assembly does not match K029 contract" >&2; exit 1; }
exec node web/server.ts
