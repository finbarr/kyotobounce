"""Publish paired full-station gate captures and focused validation receipts."""
import json,hashlib,shutil
from pathlib import Path
root=Path(__file__).resolve().parents[1]
w=Path('./.local/station-realism')
out=root/'notes/gate-installed';out.mkdir(exist_ok=True)
files={
'before.png':w/'gate-installed-views-01/before/source.png',
'after.png':w/'gate-installed-views-01/front/source.png',
'inside.png':w/'gate-installed-views-01/inside/source.png',
'before-camera.json':w/'gate-installed-views-01/before/projection.json',
'after-camera.json':w/'gate-installed-views-01/front/projection.json',
'inside-camera.json':w/'gate-installed-views-01/inside/projection.json',
'install.json':w/'station-gate-architecture-01/gate-install.json',
'scope.json':w/'station-gate-architecture-01/scope-proof.json',
'walks.json':w/'full-station-gate-walk-01/report.json',
'course-placements.json':w/'gate-all-course-support-01/report.json',
'course-throws.json':w/'gate-carried-courses-01/summary.json',
'attributes.json':w/'gate-architecture-browser-02/attribute-proof.json',
'masks.json':w/'gate-architecture-browser-02/mask-verification.json',
'texture-parity.json':w/'gate-architecture-browser-02/texture-parity.json',
'texture-profile.json':w/'gate-architecture-browser-02/texture-profile-applied.json',
'compression.json':w/'gate-architecture-browser-02/compression.json'}
for name,p in files.items():shutil.copyfile(p,out/name)
manifest={name:hashlib.sha256((out/name).read_bytes()).hexdigest()for name in files}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Published',len(manifest),'hashed files')
