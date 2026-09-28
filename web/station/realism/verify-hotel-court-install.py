"""Independent scope and planar coverage checks for hotel facade installation."""
import json,hashlib,sys,collections,math
from pathlib import Path
from shapely.geometry import Polygon,box
from shapely.ops import unary_union
before,after,component,specPath,out=map(Path,sys.argv[1:]);load=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
a=load(before/'station-layout.json');b=load(after/'station-layout.json');n=load(component/'native-panels.json');s=load(specPath);proof=b['architecture']['hotelCourtFacade'];assert proof['inputLayoutSha256']==sha(before/'station-layout.json');assert proof['componentNativeSha256']==sha(component/'native-panels.json');assert proof['specSha256']==sha(specPath)
sourceIds={q['id'] for q in proof['sourceChanges']};assert sourceIds=={'municipal-station-wing-east-Untitled.203','municipal-station-court-east-Untitled.203'}
lookup={q['id']:q for q in b['panels']};assert len(lookup)==len(b['panels']);newIds={q['id'] for q in n['panels']};assert set(lookup)==set(q['id'] for q in a['panels'])|newIds
unchanged=0
for q in a['panels']:
 if q['id'] not in sourceIds:assert lookup[q['id']]==q,q['id'];unchanged+=1
for k in a:
 if k not in ['panels','authoredMaterials','architecture']:assert a[k]==b[k],k
assert b['authoredMaterials'][:len(a['authoredMaterials'])]==a['authoredMaterials'];aa=dict(b['architecture']);aa.pop('hotelCourtFacade');assert aa==a['architecture']
# Reconstruct projected coverage independently with polygon boolean operations.
clip=box(112.95,36.32,165.88,58.94);rows=[]
def triangles(q):
 vs=[[v['x'],v['y'],-v['z']] for v in q['vertices']]
 return [[vs[i] for i in q['triangles'][j:j+3]] for j in range(0,len(q['triangles']),3)]
def eligible(t):return all(abs(v[2]-s['plane']['zPerX']*v[0]-s['plane']['zIntercept'])<.065 for v in t) and Polygon([p[:2] for p in t]).area>1e-8
def key(t):return tuple(sorted(tuple(round(x,6) for x in p) for p in t))
for id in sorted(sourceIds):
 old=next(q for q in a['panels'] if q['id']==id);new=lookup[id];ot=triangles(old);nt=triangles(new);unaffected=collections.Counter(key(t) for t in ot if not eligible(t));actual=collections.Counter(key(t) for t in nt if not eligible(t));assert unaffected==actual,('Unchanged non-facade triangles differ',id)
 O=unary_union([Polygon([p[:2] for p in t]) for t in ot if eligible(t)]);N=unary_union([Polygon([p[:2] for p in t]) for t in nt if eligible(t)]);expected=O.difference(clip);error=expected.symmetric_difference(N).area;remaining=N.intersection(clip).area
 assert error<.001 and remaining<.001,(id,error,remaining)
 removed=O.intersection(clip).area;rows.append({'id':id,'unchangedNonFacadeTriangles':sum(unaffected.values()),'removedProjectedAreaM2':removed,'outsideCoverageErrorM2':error,'remainingInsidePatchM2':remaining})
assert abs(sum(q['removedProjectedAreaM2'] for q in rows)-s['patchAreaM2'])<.001
error=0
for q in n['panels']:
 installed=lookup[q['id']];assert all(installed[k]==q[k] for k in q if k not in ['browserMaterial','vertices']),q['id'];assert installed['appearance'].startswith('hotel-court-registered-material-');assert len(installed['vertices'])==len(q['vertices'])
 for x,y in zip(q['vertices'],installed['vertices']):error=max(error,math.dist(list(x.values()),list(y.values())))
assert error<1e-5
result={'inputLayoutSha256':sha(before/'station-layout.json'),'layoutSha256':sha(after/'station-layout.json'),'componentNativeSha256':sha(component/'native-panels.json'),'retainedNativePanels':unchanged,'newPanels':len(newIds),'newMaterials':len(b['authoredMaterials'])-len(a['authoredMaterials']),'sourceChecks':rows,'maximumComponentPositionErrorM':error,'allOtherNativeRecordsAndMaterialsUnchanged':True,'pass':True,'meaning':'Exact unaffected records, facade polygon coverage and component serialization. Not course or visual/performance acceptance.'}
out.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
