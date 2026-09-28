"""Verify the gate candidate changed only the pinned retirement and addition scope."""
import json,hashlib,math
from pathlib import Path
root=Path('.local/station-realism')
sha=lambda b:hashlib.sha256(b).hexdigest()
def read(path):
 b=path.read_bytes();return json.loads(b),sha(b)
before,bh=read(root/'station-gate-architecture-01/station-layout.json')
after,ah=read(root/'station-gate-bank-01/station-layout.json')
spec,sh=read(root/'gate-bank-install-spec-01/spec.json')
component,ch=read(root/'central-gate-bank-assembly-02/native-panels.json')
assert bh==spec['inputs']['layout']['sha256'] and ch==spec['inputs']['component']['nativeSha256']
added={p['id']:p for p in component['panels']};counts={};maximum=0
for kind in ['panels','boxes','authoredLights']:
 removed={r['id'] for r in spec['retired'][kind]}
 old={r['id']:r for r in before[kind]};new={r['id']:r for r in after[kind]}
 assert old.keys()-new.keys()==removed
 assert new.keys()-old.keys()==(added.keys() if kind=='panels' else set())
 for id in old.keys()&new.keys():assert old[id]==new[id],(kind,id)
 counts[kind]={'retired':len(removed),'retainedExact':len(old.keys()&new.keys())}
for k in before.keys()-{'panels','boxes','authoredLights','authoredMaterials','architecture'}:assert before[k]==after[k],k
assert after['authoredMaterials'][:len(before['authoredMaterials'])]==before['authoredMaterials']
assert {k:v for k,v in after['architecture'].items() if k!='gateBankIntegration'}==before['architecture']
rows={p['id']:p for p in after['panels']}
for id,p in added.items():
 q=rows[id]
 for k in p.keys()-{'browserMaterial','vertices'}:assert p[k]==q[k],(id,k)
 assert len(p['vertices'])==len(q['vertices'])
 for a,b in zip(p['vertices'],q['vertices']):maximum=max(maximum,math.dist(list(a.values()),list(b.values())))
assert maximum<1e-5
for id in spec['preservedFloorIds']:assert next(p for p in before['panels']if p['id']==id)==rows[id]
result={'pass':True,'beforeLayoutSha256':bh,'afterLayoutSha256':ah,'specSha256':sh,'componentNativeSha256':ch,'counts':counts,'newPanels':len(added),'newMaterials':len(after['authoredMaterials'])-len(before['authoredMaterials']),'maximumNewVertexErrorM':maximum,'preservedFloorIds':spec['preservedFloorIds'],'allOtherTopLevelRecordsExact':True,'limits':spec['limits']}
(root/'station-gate-bank-01/scope-proof.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items()if k not in ['limits']}))
