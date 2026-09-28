"""Check exact scope of the private full-station basement integration."""
import json,hashlib,sys,math
from pathlib import Path
before,after,component,out=map(Path,sys.argv[1:]);load=lambda p:json.loads(p.read_bytes());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
a=load(before/'station-layout.json');b=load(after/'station-layout.json');n=load(component/'native-panels.json');p=b['architecture']['hallBasementIntegration']
assert p['inputLayoutSha256']==sha(before/'station-layout.json')
assert p['componentNativeSha256']==sha(component/'native-panels.json')
report=load(component/'report.json');assert p['componentGlbSha256']==sha(component/report['outputs']['glbFile'])
old={q['id']:q for q in a['panels']};new={q['id']:q for q in b['panels']};sel={q['id']:q for q in n['panels'] if q['id'] in p['selectedPanelIds']}
assert len(old)==len(a['panels']) and len(new)==len(b['panels']) and len(sel)==263
assert set(new)==set(old)|set(sel)
assert set(old)&set(sel)=={'concourse'}
for id in set(old)-{'concourse'}:assert old[id]==new[id],id
for k in a:
 if k not in ['panels','escalators','authoredMaterials','architecture']:assert a[k]==b[k],k
assert b['escalators']==a['escalators']+n['escalators']
arch=dict(b['architecture']);arch.pop('hallBasementIntegration');assert arch==a['architecture']
assert b['authoredMaterials'][:len(a['authoredMaterials'])]==a['authoredMaterials']
assert len({m['id'] for m in b['authoredMaterials']})==len(b['authoredMaterials'])
error=0
for id,source in sel.items():
 target=new[id]
 assert all(source[k]==target[k] for k in source if k not in ['browserMaterial','vertices','appearance'])
 assert len(source['vertices'])==len(target['vertices'])
 for x,y in zip(source['vertices'],target['vertices']):error=max(error,math.dist([x[k]for k in 'xyz'],[y[k]for k in 'xyz']))
assert error<1e-5
for k in ['id','appearance','material','role','collision']:assert new['concourse'][k]==old['concourse'][k]
assert p['componentCombSupports']==n['combSupports']
result={'pass':True,'inputLayoutSha256':sha(before/'station-layout.json'),'layoutSha256':sha(after/'station-layout.json'),'componentNativeSha256':sha(component/'native-panels.json'),'retainedNativePanels':len(old)-1,'replacedPanel':'concourse','selectedComponentPanels':len(sel),'additionalMovingLanes':len(n['escalators']),'newMaterials':len(b['authoredMaterials'])-len(a['authoredMaterials']),'maximumComponentPositionErrorM':error,'allOtherNativeRecordsUnchanged':True,'meaning':'Exact native record scope and serialization only. Known course conflicts, source interfaces, final visuals and full-game performance remain open.'}
out.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
