"""Freeze the exact replacement scope for a private gate architecture candidate."""
import json,hashlib
from pathlib import Path
base=Path('.local/station-realism/station-hall-basement-05/station-layout.json')
component=Path('.local/station-realism/central-gate-architecture-01')
out=Path('.local/station-realism/gate-install-spec-01');out.mkdir(exist_ok=False)
sha=lambda b:hashlib.sha256(b).hexdigest()
b=base.read_bytes();layout=json.loads(b)
assert sha(b)=='47693cafa1aa635c6ceb88cedc1794a1d53fff612ba022661a4c5b6d986ff341'
def reason(id):
 if id.startswith(('central-hall-balcony-handrail-','central-hall-curved-','central-hall-upper-','central-hall-column-')):return 'Replace the old bridge, railings, glazing and supports with the assembled passage bridge.'
 if id.startswith(('south-hall-mezzanine-lamp-','south-hall-ceiling-lamp-')):return 'Remove fixtures and lights attached to the retired bridge or soffit.'
 if id in ['south-concourse-hall-return-east','south-concourse-hall-return-west','south-concourse-hall-soffit']:return 'Replace the old 33 m opening returns and soffit with source-based gate architecture.'
retired={k:[{'id':r['id'],'recordSha256':sha(json.dumps(r,sort_keys=True,separators=(',',':')).encode()),'reason':reason(r['id'])}for r in layout[k]if reason(r['id'])]for k in ['panels','boxes','authoredLights']}
assert {k:len(v)for k,v in retired.items()}=={'panels':165,'boxes':2,'authoredLights':48}
assert not {r['id']for rows in retired.values()for r in rows}&{'concourse','hall-bay-floor-surface','central-hall-information-glazing'}
spec={'status':'Private architectural installation scope. Gate equipment and wing connections remain incomplete; not accepted for active game use.','inputs':{'layout':{'file':str(base),'sha256':sha(b)},'component':{'directory':str(component),'nativeSha256':sha((component/'native-panels.json').read_bytes()),'glbSha256':sha((component/'assembly.glb').read_bytes())}},'retired':retired,'preservedFloorIds':['concourse','hall-bay-floor-surface'],'limits':['Bridge dimensions remain provisional. Only short landing stubs exist; full wing connections are unfinished.','Old barrier bank, signs, ticket offices and information glazing are retained temporarily for a later coordinated equipment replacement. Their old placement is not accepted source evidence.','Neighboring shop walls, upper facade and paid-area scenery remain inherited placeholders.','No courses or routes are changed to hide resulting failures. Full-station native and browser checks are required.']}
(out/'spec.json').write_text(json.dumps(spec,indent=2)+'\n');print({k:len(v)for k,v in retired.items()})
