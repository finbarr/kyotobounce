"""Freeze the exact replacement scope for a private gate bank candidate."""
import json,hashlib
from pathlib import Path
base=Path('.local/station-realism/station-gate-architecture-01/station-layout.json')
component=Path('.local/station-realism/central-gate-bank-assembly-02')
out=Path('.local/station-realism/gate-bank-install-spec-01');out.mkdir(exist_ok=False)
sha=lambda b:hashlib.sha256(b).hexdigest()
b=base.read_bytes();layout=json.loads(b)
assert sha(b)=='1d0f58ec47d797539f4644b991ce1e22ea7a5129cb43d2296a7fe39692b3b08d'
def reason(id):
 if id.startswith('central-gate-'):return 'Replace the previous eleven-cabinet bank and barriers with the photographed split seven-lane bank.'
 if id.startswith('central-hall-board-') or id in ['central-hall-information-board-structure','central-hall-central-gate-sign','central-hall-gate-title']:return 'Replace old six-board signage with the new eight-panel arrangement and notices.'
 if id=='add-central-gate-public-boundary':return 'Remove the obsolete boundary marker at the retired bank.'
retired={k:[{'id':r['id'],'recordSha256':sha(json.dumps(r,sort_keys=True,separators=(',',':')).encode()),'reason':reason(r['id'])}for r in layout[k]if reason(r['id'])]for k in ['panels','boxes','authoredLights']}
assert {k:len(v)for k,v in retired.items()}=={'panels':123,'boxes':1,'authoredLights':0}
assert not {r['id']for rows in retired.values()for r in rows}&{'concourse','hall-bay-floor-surface','central-hall-information-glazing'}
spec={'status':'Private gate bank installation. Cabinet count is photo-guided; dimensions, depths and office interfaces remain provisional.','inputs':{'layout':{'file':str(base),'sha256':sha(b)},'component':{'directory':str(component),'nativeSha256':sha((component/'native-panels.json').read_bytes()),'glbSha256':sha((component/'assembly.glb').read_bytes())}},'retired':retired,'preservedFloorIds':['concourse','hall-bay-floor-surface'],'limits':['Bridge dimensions remain provisional. Only short landing stubs exist; full wing connections are unfinished.','Old ticket offices and information glazing remain temporary and retain their existing collisions. The new bank uses inferred module widths and a provisional 8.3 m depth; it is not a surveyed registration.','Neighboring shop walls, upper facade and paid-area scenery remain inherited placeholders.','No courses or routes are changed to hide resulting failures. Full-station native and browser checks are required.']}
(out/'spec.json').write_text(json.dumps(spec,indent=2)+'\n');print({k:len(v)for k,v in retired.items()})
