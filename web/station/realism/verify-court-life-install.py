"""Independently check courtyard installation scope and every serialized panel."""
import json,hashlib,sys,struct,math
from pathlib import Path
before,after,component,spec_path,out=map(Path,sys.argv[1:]);load=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
a=load(before/'station-layout.json');b=load(after/'station-layout.json');native=load(component/'native-panels.json');spec=load(spec_path);proof=b['architecture']['courtLife']
assert proof['inputLayoutSha256']==sha(before/'station-layout.json')==spec['parentLayoutSha256']
assert proof['componentNativeSha256']==sha(component/'native-panels.json') and proof['componentGlbSha256']==sha(component/'court-life.glb') and proof['specSha256']==sha(spec_path)
removed=set(spec['terrace']['removedPanelIds']);assert len(removed)==6
old={p['id']:p for p in a['panels']};new={p['id']:p for p in b['panels']};added={p['id']:p for p in native['panels']}
assert len(new)==len(b['panels']) and not set(old)&set(added)
assert set(new)==(set(old)-removed)|set(added)
for id in set(old)-removed:assert old[id]==new[id],id
for k in a:
 if k not in ['panels','authoredMaterials','architecture']:assert a[k]==b[k],k
arch=dict(b['architecture']);arch.pop('courtLife');assert arch==a['architecture']
assert b['authoredMaterials'][:len(a['authoredMaterials'])]==a['authoredMaterials']
assert len(b['authoredMaterials'])-len(a['authoredMaterials'])==7
assert len({m['id'] for m in b['authoredMaterials']})==len(b['authoredMaterials'])
glb=(component/'court-life.glb').read_bytes();size=struct.unpack_from('<I',glb,12)[0];g=json.loads(glb[20:20+size]);materials={m['label']:m['id'] for m in b['authoredMaterials']};error=0
for id,p in added.items():
 q=new[id];assert all(p[k]==q[k] for k in p if k not in ['browserMaterial','vertices'])
 assert q['appearance']==materials['Registered courtyard | '+g['materials'][p['browserMaterial']]['name']]
 assert len(p['vertices'])==len(q['vertices'])
 for x,y in zip(p['vertices'],q['vertices']):error=max(error,math.dist([x[k] for k in ['x','y','z']],[y[k] for k in ['x','y','z']]))
assert error<1e-5
result={'inputLayoutSha256':sha(before/'station-layout.json'),'layoutSha256':sha(after/'station-layout.json'),'componentNativeSha256':sha(component/'native-panels.json'),'retainedNativePanels':len(old)-len(removed),'removedPanels':sorted(removed),'newPanels':len(added),'collidingNewPanels':sum(p.get('collision',True) for p in added.values()),'newMaterials':7,'maximumComponentPositionErrorM':error,'allOtherRecordsAndMaterialsUnchanged':True,'pass':True,'meaning':'Native record, material and serialization scope only; route, runtime, exported attributes and performance require separate evidence.'}
out.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
